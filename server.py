import os
import sys
import json
import sqlite3
import socket
import urllib.parse
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import datetime

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PUBLIC_DIR = os.path.join(BASE_DIR, "public")
DB_PATH = os.path.join(BASE_DIR, "doctrax.db")

sys.path.insert(0, os.path.join(BASE_DIR, "scripts"))
import export_sqlite_to_excel

def get_local_ip():
    """Discover the local LAN/Wi-Fi IP address of this machine."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(0.1)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

def get_db():
    conn = sqlite3.connect(DB_PATH, timeout=30.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA busy_timeout=5000;")
    return conn

# Category mappings
TABLE_MAP = {
    "incoming_outgoing": "incoming_outgoing_docs",
    "email": "email_logs",
    "memo_external": "memo_ao_external",
    "personnel": "personnel_appointments",
    "cfnr_memo": "cfnr_memos",
    "cfnr_ao": "cfnr_admin_orders",
    "ppmp": "ppmp_procurement"
}

SEARCH_COLS = {
    "incoming_outgoing": ["doctrax_no", "from_unit", "doc_type", "description", "status", "received_by", "remarks"],
    "email": ["sender", "doctrax_no", "description", "remarks"],
    "memo_external": ["sender", "doc_type", "memo_no", "subject", "remarks"],
    "personnel": ["doctrack_no", "from_office", "to_person", "unit", "doc_type", "description", "received_by", "received_by_units"],
    "cfnr_memo": ["memo_no", "recipient", "unit_for_oic", "description", "remarks"],
    "cfnr_ao": ["ao_no", "recipient", "description", "remarks"],
    "ppmp": ["description", "doctrack_no", "remarks"]
}

class DocTraxHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=PUBLIC_DIR, **kwargs)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        if path == "/api/lookups":
            self.handle_lookups()
        elif path == "/api/stats":
            self.handle_stats()
        elif path == "/api/documents":
            self.handle_list_documents(query)
        elif path == "/api/export":
            self.handle_export()
        elif path == "/api/network-info":
            self.handle_network_info()
        else:
            # Fallback to static file serving
            super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        content_length = int(self.headers.get("Content-Length", 0))
        post_data = self.rfile.read(content_length) if content_length > 0 else b"{}"

        try:
            body = json.loads(post_data.decode("utf-8")) if post_data else {}
        except Exception:
            body = {}

        if path == "/api/documents":
            self.handle_create_document(body)
        elif path.startswith("/api/documents/") and path.endswith("/custody"):
            # /api/documents/{id}/custody
            parts = path.strip("/").split("/")
            doc_id = int(parts[2])
            self.handle_stamp_custody(doc_id, body)
        else:
            self.send_error(404, "Endpoint not found")

    def do_PUT(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        content_length = int(self.headers.get("Content-Length", 0))
        post_data = self.rfile.read(content_length) if content_length > 0 else b"{}"
        try:
            body = json.loads(post_data.decode("utf-8"))
        except Exception:
            body = {}

        if path.startswith("/api/documents/"):
            parts = path.strip("/").split("/")
            doc_id = int(parts[2])
            self.handle_update_document(doc_id, body)
        else:
            self.send_error(404, "Endpoint not found")

    def do_DELETE(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)
        if path.startswith("/api/documents/"):
            parts = path.strip("/").split("/")
            doc_id = int(parts[2])
            category = query.get("category", ["incoming_outgoing"])[0]
            self.handle_delete_document(doc_id, category)
        else:
            self.send_error(404, "Endpoint not found")

    # JSON helper
    def send_json(self, data, status=200):
        response_bytes = json.dumps(data, default=str).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(response_bytes)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.end_headers()
        self.wfile.write(response_bytes)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.end_headers()

    # API HANDLERS
    def handle_network_info(self):
        local_ip = get_local_ip()
        self.send_json({
            "local_url": f"http://localhost:{self.server.server_port}",
            "network_url": f"http://{local_ip}:{self.server.server_port}" if local_ip != "127.0.0.1" else None,
            "ip": local_ip,
            "port": self.server.server_port
        })

    def handle_lookups(self):
        conn = get_db()
        cur = conn.cursor()
        cur.execute("SELECT category, value FROM lookup_values ORDER BY sort_order ASC, value ASC")
        rows = cur.fetchall()

        lookups = {
            "units": [],
            "doc_types": [],
            "statuses": [],
            "appointment_types": [],
            "memo_types": [],
            "couriers": [
                "Kuya Paolo", "Kuya Alberth", "Kuya Emeng", "Ms. April", "John Ryan", 
                "Ms. Glenda", "Ms. Barbie (RA)", "Ms. Nelia", "Kuya Willie", "Ryan Zafra (RA)"
            ]
        }

        for r in rows:
            cat = r["category"]
            val = r["value"]
            if cat == "unit" and val not in lookups["units"]:
                lookups["units"].append(val)
            elif cat == "doc_type" and val not in lookups["doc_types"]:
                lookups["doc_types"].append(val)
            elif cat == "status" and val not in lookups["statuses"]:
                lookups["statuses"].append(val)
            elif cat == "appointment_type" and val not in lookups["appointment_types"]:
                lookups["appointment_types"].append(val)
            elif cat == "memo_type" and val not in lookups["memo_types"]:
                lookups["memo_types"].append(val)

        conn.close()
        self.send_json(lookups)

    def handle_stats(self):
        conn = get_db()
        cur = conn.cursor()

        stats = {}
        for cat_key, table_name in TABLE_MAP.items():
            cur.execute(f"SELECT COUNT(*) as c FROM {table_name}")
            stats[cat_key] = cur.fetchone()["c"]

        # Status counts for incoming_outgoing
        cur.execute("SELECT status, COUNT(*) as c FROM incoming_outgoing_docs GROUP BY status")
        status_counts = {r["status"]: r["c"] for r in cur.fetchall()}

        # Top units
        cur.execute("SELECT from_unit, COUNT(*) as c FROM incoming_outgoing_docs WHERE from_unit IS NOT NULL AND from_unit != '' GROUP BY from_unit ORDER BY c DESC LIMIT 6")
        top_units = [{"unit": r["from_unit"], "count": r["c"]} for r in cur.fetchall()]

        # Top document types
        cur.execute("SELECT doc_type, COUNT(*) as c FROM incoming_outgoing_docs WHERE doc_type IS NOT NULL AND doc_type != '' GROUP BY doc_type ORDER BY c DESC LIMIT 5")
        top_types = [{"type": r["doc_type"], "count": r["c"]} for r in cur.fetchall()]

        conn.close()

        total_all = sum(stats.values())
        signed_count = status_counts.get("SIGNED", 0) + status_counts.get("APPROVED", 0)
        pending_count = status_counts.get("FOR REVIEW", 0) + status_counts.get("FOR APPROPRIATE ACTION", 0) + status_counts.get("FOR COMMENTS", 0)

        self.send_json({
            "total_all": total_all,
            "counts": stats,
            "signed_count": signed_count,
            "pending_count": pending_count,
            "top_units": top_units,
            "top_types": top_types,
            "status_counts": status_counts
        })

    def handle_list_documents(self, query):
        category = query.get("category", ["incoming_outgoing"])[0]
        table_name = TABLE_MAP.get(category, "incoming_outgoing_docs")
        search_cols = SEARCH_COLS.get(category, ["description"])

        search = query.get("search", [""])[0].strip()
        unit = query.get("unit", [""])[0].strip()
        status = query.get("status", [""])[0].strip()
        date_from = query.get("date_from", [""])[0].strip()
        date_to = query.get("date_to", [""])[0].strip()

        page = max(int(query.get("page", [1])[0]), 1)
        limit = max(min(int(query.get("limit", [25])[0]), 200), 5)
        offset = (page - 1) * limit

        conn = get_db()
        cur = conn.cursor()

        where_clauses = []
        params = []

        if search:
            col_likes = [f"{col} LIKE ?" for col in search_cols]
            where_clauses.append(f"({' OR '.join(col_likes)})")
            for _ in search_cols:
                params.append(f"%{search}%")

        if unit:
            if category == "incoming_outgoing":
                where_clauses.append("from_unit = ?")
                params.append(unit)
            elif category == "personnel":
                where_clauses.append("unit = ?")
                params.append(unit)
            elif category == "cfnr_memo":
                where_clauses.append("unit_for_oic = ?")
                params.append(unit)

        if status and category == "incoming_outgoing":
            where_clauses.append("status = ?")
            params.append(status)

        if date_from:
            where_clauses.append("date >= ?")
            params.append(date_from)
        if date_to:
            where_clauses.append("date <= ?")
            params.append(date_to)

        where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

        # Total count
        cur.execute(f"SELECT COUNT(*) as count FROM {table_name} {where_sql}", params)
        total_records = cur.fetchone()["count"]

        # Paginated results
        cur.execute(f"SELECT * FROM {table_name} {where_sql} ORDER BY id DESC LIMIT ? OFFSET ?", params + [limit, offset])
        records = [dict(r) for r in cur.fetchall()]

        conn.close()

        self.send_json({
            "category": category,
            "records": records,
            "total": total_records,
            "page": page,
            "limit": limit,
            "total_pages": (total_records + limit - 1) // limit if limit > 0 else 1
        })

    def handle_create_document(self, body):
        category = body.get("category", "incoming_outgoing")
        table_name = TABLE_MAP.get(category, "incoming_outgoing_docs")
        data = body.get("data", {})

        if not data:
            self.send_json({"error": "No data provided"}, 400)
            return

        conn = get_db()
        cur = conn.cursor()

        # If date is not provided, use today
        if not data.get("date"):
            data["date"] = datetime.date.today().strftime("%Y-%m-%d")

        keys = list(data.keys())
        placeholders = [":" + k for k in keys]
        sql = f"INSERT INTO {table_name} ({', '.join(keys)}) VALUES ({', '.join(placeholders)})"

        try:
            cur.execute(sql, data)
            conn.commit()
            new_id = cur.lastrowid
            conn.close()
            self.send_json({"success": True, "id": new_id, "message": "Document logged successfully!"})
        except Exception as e:
            conn.close()
            self.send_json({"error": str(e)}, 500)

    def handle_update_document(self, doc_id, body):
        category = body.get("category", "incoming_outgoing")
        table_name = TABLE_MAP.get(category, "incoming_outgoing_docs")
        data = body.get("data", {})

        if not data:
            self.send_json({"error": "No data provided"}, 400)
            return

        conn = get_db()
        cur = conn.cursor()

        set_clauses = [f"{k} = :{k}" for k in data.keys() if k != "id"]
        if "updated_at" in [col[1] for col in cur.execute(f"PRAGMA table_info({table_name})").fetchall()]:
            set_clauses.append("updated_at = CURRENT_TIMESTAMP")

        data["id"] = doc_id
        sql = f"UPDATE {table_name} SET {', '.join(set_clauses)} WHERE id = :id"

        try:
            cur.execute(sql, data)
            conn.commit()
            conn.close()
            self.send_json({"success": True, "message": "Document updated successfully!"})
        except Exception as e:
            conn.close()
            self.send_json({"error": str(e)}, 500)

    def handle_delete_document(self, doc_id, category):
        table_name = TABLE_MAP.get(category, "incoming_outgoing_docs")
        conn = get_db()
        cur = conn.cursor()
        try:
            cur.execute(f"DELETE FROM {table_name} WHERE id = ?", (doc_id,))
            conn.commit()
            conn.close()
            self.send_json({"success": True, "message": "Document deleted successfully!"})
        except Exception as e:
            conn.close()
            self.send_json({"error": str(e)}, 500)

    def handle_stamp_custody(self, doc_id, body):
        category = body.get("category", "incoming_outgoing")
        table_name = TABLE_MAP.get(category, "incoming_outgoing_docs")
        courier = body.get("courier", "Courier").strip()
        today_str = datetime.date.today().strftime("%m/%d/%Y")
        stamp_text = f"pick up by {courier} {today_str}"

        conn = get_db()
        cur = conn.cursor()

        try:
            if category == "personnel":
                cur.execute("UPDATE personnel_appointments SET received_by_units = ? WHERE id = ?", (stamp_text, doc_id))
            else:
                cur.execute("UPDATE incoming_outgoing_docs SET received_by = ?, status = 'SIGNED' WHERE id = ?", (stamp_text, doc_id))
            conn.commit()
            conn.close()
            self.send_json({"success": True, "stamp": stamp_text, "message": "Custody stamp applied!"})
        except Exception as e:
            conn.close()
            self.send_json({"error": str(e)}, 500)

    def handle_export(self):
        try:
            export_path = export_sqlite_to_excel.export_db_to_excel()
            filename = os.path.basename(export_path)
            with open(export_path, "rb") as f:
                content = f.read()

            self.send_response(200)
            self.send_header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
            self.send_header("Content-Disposition", f'attachment; filename="{filename}"')
            self.send_header("Content-Length", str(len(content)))
            self.end_headers()
            self.wfile.write(content)
        except Exception as e:
            self.send_json({"error": str(e)}, 500)

def run(port=8000):
    server_address = ("0.0.0.0", port)
    httpd = ThreadingHTTPServer(server_address, DocTraxHandler)
    local_ip = get_local_ip()
    print("==================================================")
    print("  DO-DocTrax: CFNR Document Tracking System")
    print(f"  Local Access:   http://localhost:{port}")
    if local_ip != "127.0.0.1":
        print(f"  Network Access: http://{local_ip}:{port}")
        print("  (Share Network Access link with colleagues on your Wi-Fi)")
    print("  Press Ctrl+C to stop.")
    print("==================================================")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server cleanly...")
        httpd.server_close()

if __name__ == "__main__":
    port = 8000
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            pass
    run(port)
