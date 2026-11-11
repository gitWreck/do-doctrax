"""
One-time migration script: local SQLite (doctrax.db) -> Supabase PostgreSQL.

Usage (PowerShell):
  $env:SUPABASE_SECRET_KEY = "sb_secret_..."
  python scripts/migrate_sqlite_to_supabase.py

Or run without setting the env var and paste the secret key securely when prompted.
Use --dry-run to inspect counts without writing to Supabase.
Use --verify-only to compare doctrax.db row counts against Supabase.
"""

import argparse
import getpass
import json
import os
import re
import sqlite3
import sys
import urllib.error
import urllib.parse
import urllib.request

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "doctrax.db")
CONFIG_JS_PATH = os.path.join(BASE_DIR, "public", "js", "config.js")

TABLES = [
    "incoming_outgoing_docs",
    "email_logs",
    "memo_ao_external",
    "personnel_appointments",
    "cfnr_memos",
    "cfnr_admin_orders",
    "ppmp_procurement",
    "lookup_values",
]

BATCH_SIZE = 500


def read_supabase_url_from_config():
    env_url = os.environ.get("SUPABASE_URL", "").strip()
    if env_url:
        return env_url.rstrip("/")

    if os.path.exists(CONFIG_JS_PATH):
        with open(CONFIG_JS_PATH, "r", encoding="utf-8") as f:
            content = f.read()
        match = re.search(r"SUPABASE_URL\s*=\s*['\"]([^'\"]+)['\"]", content)
        if match:
            return match.group(1).strip().rstrip("/")

    raise RuntimeError("Could not determine SUPABASE_URL from env or public/js/config.js")


def get_secret_key():
    key = (
        os.environ.get("SUPABASE_SECRET_KEY")
        or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        or ""
    ).strip()
    if key:
        return key
    return getpass.getpass("Paste Supabase Secret Key (sb_secret_... or service_role): ").strip()


def build_headers(secret_key, extra=None):
    headers = {
        "apikey": secret_key,
        "Content-Type": "application/json",
    }
    # Only legacy JWT service_role keys belong in Authorization: Bearer.
    # Modern sb_secret_ keys must ONLY be sent in the apikey header.
    if not secret_key.startswith("sb_secret_"):
        headers["Authorization"] = f"Bearer {secret_key}"
    if extra:
        headers.update(extra)
    return headers


def format_timestamp(val):
    if val is None:
        return None
    s = str(val).strip()
    if not s:
        return None
    # SQLite CURRENT_TIMESTAMP uses "YYYY-MM-DD HH:MM:SS"
    if re.match(r"^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$", s):
        return s.replace(" ", "T") + "Z"
    return s


def normalize_row(table, row_dict):
    cleaned = {}
    for k, v in row_dict.items():
        if k in ("created_at", "updated_at"):
            ts = format_timestamp(v)
            if ts is not None:
                cleaned[k] = ts
        else:
            cleaned[k] = v
    return cleaned


def upsert_batch(supabase_url, secret_key, table, rows):
    url = f"{supabase_url}/rest/v1/{urllib.parse.quote(table)}?on_conflict=id"
    payload = json.dumps(rows, ensure_ascii=False).encode("utf-8")
    headers = build_headers(
        secret_key,
        {"Prefer": "resolution=merge-duplicates,return=minimal"},
    )
    req = urllib.request.Request(url, data=payload, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            if resp.status not in (200, 201, 204):
                raise RuntimeError(f"Unexpected HTTP {resp.status} for {table}")
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {e.code} on {table}: {err_body}") from e


def get_supabase_count(supabase_url, secret_key, table):
    url = f"{supabase_url}/rest/v1/{urllib.parse.quote(table)}?select=id&limit=1"
    headers = build_headers(secret_key, {"Prefer": "count=exact"})
    req = urllib.request.Request(url, headers=headers, method="HEAD")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            content_range = resp.headers.get("Content-Range", "")
            # Format: "0-0/3588" or "*/0"
            if "/" in content_range:
                total_str = content_range.split("/")[-1]
                return int(total_str)
            return 0
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Count failed on {table} (HTTP {e.code}): {err_body}") from e


def print_sequence_sync_sql():
    print("\n--- IMPORTANT: Run this in Supabase SQL Editor after migration ---")
    print("-- Syncs auto-increment IDs so new records won't collide with migrated IDs:")
    for tbl in TABLES:
        print(
            f"select setval(pg_get_serial_sequence('public.{tbl}', 'id'), "
            f"coalesce((select max(id) from public.{tbl}), 1), true);"
        )


def main():
    parser = argparse.ArgumentParser(description="Migrate doctrax.db to Supabase PostgreSQL")
    parser.add_argument("--dry-run", action="store_true", help="Print SQLite counts without uploading")
    parser.add_argument("--verify-only", action="store_true", help="Compare SQLite vs Supabase row counts")
    args = parser.parse_args()

    if not os.path.exists(DB_PATH):
        print(f"ERROR: Database not found at {DB_PATH}", file=sys.stderr)
        sys.exit(1)

    supabase_url = read_supabase_url_from_config()
    print(f"Target Supabase URL: {supabase_url}")
    print(f"Source SQLite DB:    {DB_PATH}\n")

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    sqlite_counts = {}
    for tbl in TABLES:
        sqlite_counts[tbl] = cur.execute(f"SELECT COUNT(*) FROM {tbl}").fetchone()[0]

    if args.dry_run:
        print("DRY RUN — SQLite row counts ready to migrate:")
        for tbl, count in sqlite_counts.items():
            print(f"  {tbl:<26} {count:>6}")
        conn.close()
        return

    secret_key = get_secret_key()
    if not secret_key:
        print("ERROR: Secret key is required.", file=sys.stderr)
        conn.close()
        sys.exit(1)

    if not args.verify_only:
        for tbl in TABLES:
            total = sqlite_counts[tbl]
            print(f"Migrating {tbl} ({total} rows)...")
            rows = [normalize_row(tbl, dict(r)) for r in cur.execute(f"SELECT * FROM {tbl} ORDER BY id ASC")]
            for i in range(0, len(rows), BATCH_SIZE):
                batch = rows[i : i + BATCH_SIZE]
                upsert_batch(supabase_url, secret_key, tbl, batch)
                done = min(i + len(batch), total)
                print(f"  {done}/{total} uploaded")

    print("\nVerifying row counts (SQLite vs Supabase):")
    all_match = True
    for tbl in TABLES:
        local_count = sqlite_counts[tbl]
        remote_count = get_supabase_count(supabase_url, secret_key, tbl)
        status = "OK" if local_count == remote_count else "MISMATCH"
        if status != "OK":
            all_match = False
        print(f"  {tbl:<26} SQLite={local_count:>6}  Supabase={remote_count:>6}  [{status}]")

    conn.close()

    if not args.verify_only:
        print_sequence_sync_sql()

    if not all_match:
        print("\nWARNING: One or more tables have mismatched counts!", file=sys.stderr)
        sys.exit(1)

    print("\nAll table counts match!")


if __name__ == "__main__":
    main()

