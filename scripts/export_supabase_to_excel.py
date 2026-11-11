"""
Export all DO-DocTrax tables from Supabase PostgreSQL to the official multi-sheet .xlsx format.

Usage (PowerShell):
  $env:SUPABASE_SECRET_KEY = "sb_secret_..."
  python scripts/export_supabase_to_excel.py
"""

import datetime
import getpass
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request

import openpyxl
from openpyxl.styles import Alignment, Font, PatternFill

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONFIG_JS_PATH = os.path.join(BASE_DIR, "public", "js", "config.js")
PAGE_SIZE = 1000

SHEETS = [
    (
        "INCOMING-OUTGOING DOCS",
        "incoming_outgoing_docs",
        ["ID", "Date", "Doctrax", "From", "Document Type", "Description", "Status", "Received by", "Remarks"],
        ["id", "date", "doctrax_no", "from_unit", "doc_type", "description", "status", "received_by", "remarks"],
    ),
    (
        "EMAIL RECEIVED",
        "email_logs",
        ["ID", "Date", "From", "Doctrax", "Description", "Deadline/Link", "Remarks"],
        ["id", "date", "sender", "doctrax_no", "description", "deadline_link", "remarks"],
    ),
    (
        "MEMO, AO RECEIVED IN EMAIL",
        "memo_ao_external",
        ["ID", "Date", "From", "Document Type", "Memo No.", "Description / Subject", "Remarks"],
        ["id", "date", "sender", "doc_type", "memo_no", "subject", "remarks"],
    ),
    (
        "APPOINTMENT, NOSA, ETC.",
        "personnel_appointments",
        ["ID", "Date", "Doctrack", "From", "To", "Unit", "Document Type", "Description", "Received by", "Received by UNITS", "Remarks"],
        ["id", "date", "doctrack_no", "from_office", "to_person", "unit", "doc_type", "description", "received_by", "received_by_units", "remarks"],
    ),
    (
        "CFNR MEMO",
        "cfnr_memos",
        ["ID", "Date", "CFNR Memo No.", "To", "UNIT FOR OIC", "Document Description", "Remarks"],
        ["id", "date", "memo_no", "recipient", "unit_for_oic", "description", "remarks"],
    ),
    (
        "CFNR ADMIN ORDER",
        "cfnr_admin_orders",
        ["ID", "Date", "CFNR AO No.", "To", "Document Description", "Remarks"],
        ["id", "date", "ao_no", "recipient", "description", "remarks"],
    ),
    (
        "OUT PPMP",
        "ppmp_procurement",
        ["ID", "Date", "Document Type/Description", "Doctrack No.", "Amount", "Remarks"],
        ["id", "date", "description", "doctrack_no", "amount", "remarks"],
    ),
]


def read_supabase_url_from_config():
    env_url = os.environ.get("SUPABASE_URL", "").strip()
    if env_url:
        return env_url.rstrip("/")
    if os.path.exists(CONFIG_JS_PATH):
        with open(CONFIG_JS_PATH, "r", encoding="utf-8") as f:
            match = re.search(r"SUPABASE_URL\s*=\s*['\"]([^'\"]+)['\"]", f.read())
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


def fetch_all_rows(supabase_url, secret_key, table, columns):
    rows = []
    offset = 0
    cols_param = urllib.parse.quote(",".join(columns))
    headers = {"apikey": secret_key}
    if not secret_key.startswith("sb_secret_"):
        headers["Authorization"] = f"Bearer {secret_key}"

    while True:
        url = f"{supabase_url}/rest/v1/{table}?select={cols_param}&order=id.desc"
        req_headers = dict(headers)
        req_headers["Range"] = f"{offset}-{offset + PAGE_SIZE - 1}"
        req = urllib.request.Request(url, headers=req_headers, method="GET")
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                batch = json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"HTTP {e.code} fetching {table}: {err_body}") from e

        if not batch:
            break
        rows.extend(batch)
        if len(batch) < PAGE_SIZE:
            break
        offset += PAGE_SIZE

    return rows


def export_supabase_to_excel(output_path=None):
    supabase_url = read_supabase_url_from_config()
    secret_key = get_secret_key()
    if not secret_key:
        print("ERROR: Secret key is required.", file=sys.stderr)
        sys.exit(1)

    if not output_path:
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        output_path = os.path.join(BASE_DIR, f"DOCTRAX_EXPORT_{timestamp}.xlsx")

    wb = openpyxl.Workbook()
    wb.remove(wb.active)

    header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="145335", end_color="145335", fill_type="solid")

    for sheet_title, table, headers, columns in SHEETS:
        ws = wb.create_sheet(title=sheet_title)
        ws.append(headers)
        for col_idx in range(1, len(headers) + 1):
            cell = ws.cell(row=1, column=col_idx)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

        records = fetch_all_rows(supabase_url, secret_key, table, columns)
        for rec in records:
            ws.append([rec.get(col) for col in columns])

        for col in ws.columns:
            max_len = max(len(str(cell.value or "")) for cell in col[:50])
            col_letter = openpyxl.utils.get_column_letter(col[0].column)
            ws.column_dimensions[col_letter].width = min(max(max_len + 3, 12), 60)
        print(f"Exported {len(records)} rows -> {sheet_title}")

    wb.save(output_path)
    print(f"\nExported successfully to: {output_path}")
    return output_path


if __name__ == "__main__":
    export_supabase_to_excel()

