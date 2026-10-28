import os
import sqlite3
import openpyxl
import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "doctrax.db")
EXCEL_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "COMMUNICATIONS & DOCUMENTS RECEIVED 2025.xlsx")

def format_date(val):
    if val is None:
        return ""
    if isinstance(val, (datetime.date, datetime.datetime)):
        return val.strftime("%Y-%m-%d")
    return str(val).strip()

def clean_str(val):
    if val is None:
        return ""
    return str(val).strip()

def init_db(conn):
    cur = conn.cursor()
    
    # 1. Incoming & Outgoing Docs
    cur.execute("""
    CREATE TABLE IF NOT EXISTS incoming_outgoing_docs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT,
        doctrax_no TEXT,
        from_unit TEXT,
        doc_type TEXT,
        description TEXT,
        status TEXT,
        received_by TEXT,
        remarks TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_in_out_date ON incoming_outgoing_docs(date);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_in_out_doctrax ON incoming_outgoing_docs(doctrax_no);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_in_out_unit ON incoming_outgoing_docs(from_unit);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_in_out_status ON incoming_outgoing_docs(status);")

    # 2. Email Logs
    cur.execute("""
    CREATE TABLE IF NOT EXISTS email_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT,
        sender TEXT,
        doctrax_no TEXT,
        description TEXT,
        deadline_link TEXT,
        remarks TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_email_date ON email_logs(date);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_email_sender ON email_logs(sender);")

    # 3. External Memos & Admin Orders
    cur.execute("""
    CREATE TABLE IF NOT EXISTS memo_ao_external (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT,
        sender TEXT,
        doc_type TEXT,
        memo_no TEXT,
        subject TEXT,
        remarks TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_memo_ext_date ON memo_ao_external(date);")

    # 4. Personnel & Appointments
    cur.execute("""
    CREATE TABLE IF NOT EXISTS personnel_appointments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT,
        doctrack_no TEXT,
        from_office TEXT,
        to_person TEXT,
        unit TEXT,
        doc_type TEXT,
        description TEXT,
        received_by TEXT,
        received_by_units TEXT,
        remarks TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_appt_to ON personnel_appointments(to_person);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_appt_unit ON personnel_appointments(unit);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_appt_type ON personnel_appointments(doc_type);")

    # 5. CFNR Internal Memos
    cur.execute("""
    CREATE TABLE IF NOT EXISTS cfnr_memos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT,
        memo_no TEXT,
        recipient TEXT,
        unit_for_oic TEXT,
        description TEXT,
        remarks TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 6. CFNR Internal Admin Orders
    cur.execute("""
    CREATE TABLE IF NOT EXISTS cfnr_admin_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT,
        ao_no TEXT,
        recipient TEXT,
        description TEXT,
        remarks TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 7. Outgoing PPMP
    cur.execute("""
    CREATE TABLE IF NOT EXISTS ppmp_procurement (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT,
        description TEXT,
        doctrack_no TEXT,
        amount TEXT,
        remarks TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 8. Controlled Vocabulary Lookups
    cur.execute("""
    CREATE TABLE IF NOT EXISTS lookup_values (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT,
        value TEXT,
        sort_order INTEGER DEFAULT 0
    );
    """)
    conn.commit()

def iterate_valid_rows(ws, start_row=1, max_empty=60):
    empty_count = 0
    for idx, r in enumerate(ws.iter_rows(min_row=start_row, values_only=True), start=start_row):
        is_empty = not any(c is not None and str(c).strip() != '' for c in r)
        if is_empty:
            empty_count += 1
            if empty_count >= max_empty:
                break
            continue
        empty_count = 0
        yield r

def migrate():
    print(f"Opening database: {DB_PATH}")
    if os.path.exists(DB_PATH):
        try:
            os.remove(DB_PATH)
            print("Removed existing database to perform clean seed.")
        except Exception as e:
            print(f"Notice: {e}")

    conn = sqlite3.connect(DB_PATH)
    init_db(conn)
    cur = conn.cursor()

    print(f"Loading Excel file (read-only stream): {EXCEL_PATH}")
    wb = openpyxl.load_workbook(EXCEL_PATH, read_only=True, data_only=True)

    # 1. Sheet1 -> lookup_values
    if "Sheet1" in wb.sheetnames:
        ws = wb["Sheet1"]
        doc_types = []
        appt_types = []
        memo_types = []
        statuses = []
        units = []
        
        for row in iterate_valid_rows(ws, start_row=1):
            if row[0]: doc_types.append(clean_str(row[0]))
            if len(row) > 1 and row[1]:
                val = clean_str(row[1])
                if val in ["DO", "OCS", "OCREL", "LIB", "SFFG", "FBS", "FPPS", "IRNR", "FDC", "IAF", "MCME", "TREES", "INREM", "N/A"]:
                    units.append(val)
                else:
                    appt_types.append(val)
            if len(row) > 2 and row[2]: memo_types.append(clean_str(row[2]))
            if len(row) > 3 and row[3]: statuses.append(clean_str(row[3]))

        for i, val in enumerate(doc_types):
            cur.execute("INSERT INTO lookup_values (category, value, sort_order) VALUES ('doc_type', ?, ?)", (val, i))
        for i, val in enumerate(appt_types):
            cur.execute("INSERT INTO lookup_values (category, value, sort_order) VALUES ('appointment_type', ?, ?)", (val, i))
        for i, val in enumerate(units):
            cur.execute("INSERT INTO lookup_values (category, value, sort_order) VALUES ('unit', ?, ?)", (val, i))
        for i, val in enumerate(statuses):
            cur.execute("INSERT INTO lookup_values (category, value, sort_order) VALUES ('status', ?, ?)", (val, i))
        for i, val in enumerate(memo_types):
            cur.execute("INSERT INTO lookup_values (category, value, sort_order) VALUES ('memo_type', ?, ?)", (val, i))

        print(f"Lookup values seeded: {len(doc_types)} doc types, {len(units)} units, {len(statuses)} statuses, {len(appt_types)} appt types.")

    # 2. INCOMING-OUTGOING DOCS 2025
    if "INCOMING-OUTGOING DOCS 2025" in wb.sheetnames:
        ws = wb["INCOMING-OUTGOING DOCS 2025"]
        count = 0
        for r in iterate_valid_rows(ws, start_row=3):
            # Col 1: Date, Col 2: Doctrax, Col 3: From, Col 4: Type, Col 5: Desc, Col 6: Status, Col 7: Received by, Col 8: Remarks
            date_val = format_date(r[1])
            doctrax_val = clean_str(r[2])
            from_val = clean_str(r[3])
            type_val = clean_str(r[4])
            desc_val = clean_str(r[5])
            status_val = clean_str(r[6])
            rec_val = clean_str(r[7]) if len(r) > 7 else ""
            rem_val = clean_str(r[8]) if len(r) > 8 else ""

            # Check if this is the header row
            if date_val.lower() == 'date' and from_val.lower() == 'from':
                continue

            cur.execute("""
            INSERT INTO incoming_outgoing_docs (date, doctrax_no, from_unit, doc_type, description, status, received_by, remarks)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (date_val, doctrax_val, from_val, type_val, desc_val, status_val or 'SIGNED', rec_val, rem_val))
            count += 1
        print(f"Migrated INCOMING-OUTGOING DOCS: {count} records")

    # 3. EMAIL RECEIVED 2025
    if "EMAIL RECEIVED 2025" in wb.sheetnames:
        ws = wb["EMAIL RECEIVED 2025"]
        count = 0
        for r in iterate_valid_rows(ws, start_row=3):
            # Col 1: Date, Col 2: From, Col 3: Doctrax, Col 4: Desc, Col 5: Deadline/Link, Col 6: Remarks
            date_val = format_date(r[1])
            sender_val = clean_str(r[2])
            doctrax_val = clean_str(r[3])
            desc_val = clean_str(r[4])
            deadline_val = clean_str(r[5]) if len(r) > 5 else ""
            rem_val = clean_str(r[6]) if len(r) > 6 else ""

            if date_val.lower() == 'date' and sender_val.lower() == 'from':
                continue

            cur.execute("""
            INSERT INTO email_logs (date, sender, doctrax_no, description, deadline_link, remarks)
            VALUES (?, ?, ?, ?, ?, ?)
            """, (date_val, sender_val, doctrax_val, desc_val, deadline_val, rem_val))
            count += 1
        print(f"Migrated EMAIL RECEIVED: {count} records")

    # 4. MEMO, AO RECEIVED IN EMAIL 2025
    if "MEMO, AO RECEIVED IN EMAIL 2025" in wb.sheetnames:
        ws = wb["MEMO, AO RECEIVED IN EMAIL 2025"]
        count = 0
        for r in iterate_valid_rows(ws, start_row=3):
            date_val = format_date(r[1])
            from_val = clean_str(r[2])
            type_val = clean_str(r[3])
            memo_no_val = clean_str(r[4]) if len(r) > 4 else ""
            subj_val = clean_str(r[5]) if len(r) > 5 else ""
            rem_val = clean_str(r[6]) if len(r) > 6 else ""

            if date_val.lower() == 'date' and from_val.lower() == 'from':
                continue

            cur.execute("""
            INSERT INTO memo_ao_external (date, sender, doc_type, memo_no, subject, remarks)
            VALUES (?, ?, ?, ?, ?, ?)
            """, (date_val, from_val, type_val, memo_no_val, subj_val, rem_val))
            count += 1
        print(f"Migrated MEMO, AO RECEIVED IN EMAIL: {count} records")

    # 5. APPOINTMENT, NOSA, ETC. 2025
    if "APPOINTMENT, NOSA, ETC. 2025" in wb.sheetnames:
        ws = wb["APPOINTMENT, NOSA, ETC. 2025"]
        count = 0
        for r in iterate_valid_rows(ws, start_row=2):
            date_val = format_date(r[0])
            doctrack_val = clean_str(r[1])
            from_val = clean_str(r[2])
            to_val = clean_str(r[3])
            unit_val = clean_str(r[4])
            type_val = clean_str(r[5])
            desc_val = clean_str(r[6])
            rec_val = clean_str(r[7]) if len(r) > 7 else ""
            rec_unit_val = clean_str(r[8]) if len(r) > 8 else ""
            rem_val = clean_str(r[9]) if len(r) > 9 else ""

            if date_val.lower() == 'date' and from_val.lower() == 'from':
                continue

            cur.execute("""
            INSERT INTO personnel_appointments (date, doctrack_no, from_office, to_person, unit, doc_type, description, received_by, received_by_units, remarks)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (date_val, doctrack_val, from_val, to_val, unit_val, type_val, desc_val, rec_val, rec_unit_val, rem_val))
            count += 1
        print(f"Migrated APPOINTMENT, NOSA, ETC.: {count} records")

    # 6. CFNR MEMO 2025
    if "CFNR MEMO 2025" in wb.sheetnames:
        ws = wb["CFNR MEMO 2025"]
        count = 0
        for r in iterate_valid_rows(ws, start_row=2):
            date_val = format_date(r[0])
            memo_no_val = clean_str(r[1])
            to_val = clean_str(r[2])
            unit_val = clean_str(r[3]) if len(r) > 3 else ""
            desc_val = clean_str(r[4]) if len(r) > 4 else ""
            rem_val = clean_str(r[5]) if len(r) > 5 else ""

            if date_val.lower() == 'date' and memo_no_val.lower().startswith('cfnr'):
                continue

            cur.execute("""
            INSERT INTO cfnr_memos (date, memo_no, recipient, unit_for_oic, description, remarks)
            VALUES (?, ?, ?, ?, ?, ?)
            """, (date_val, memo_no_val, to_val, unit_val, desc_val, rem_val))
            count += 1
        print(f"Migrated CFNR MEMO: {count} records")

    # 7. CFNR ADMIN ORDER 2025
    if "CFNR ADMIN ORDER 2025" in wb.sheetnames:
        ws = wb["CFNR ADMIN ORDER 2025"]
        count = 0
        for r in iterate_valid_rows(ws, start_row=2):
            date_val = format_date(r[0])
            ao_no_val = clean_str(r[1])
            to_val = clean_str(r[2])
            desc_val = clean_str(r[3]) if len(r) > 3 else ""
            rem_val = clean_str(r[4]) if len(r) > 4 else ""

            if date_val.lower() == 'date' and ao_no_val.lower().startswith('cfnr'):
                continue

            cur.execute("""
            INSERT INTO cfnr_admin_orders (date, ao_no, recipient, description, remarks)
            VALUES (?, ?, ?, ?, ?)
            """, (date_val, ao_no_val, to_val, desc_val, rem_val))
            count += 1
        print(f"Migrated CFNR ADMIN ORDER: {count} records")

    # 8. OUT PPMP 2025
    if "OUT PPMP 2025" in wb.sheetnames:
        ws = wb["OUT PPMP 2025"]
        count = 0
        for r in iterate_valid_rows(ws, start_row=2):
            date_val = format_date(r[0])
            desc_val = clean_str(r[1])
            doctrack_val = clean_str(r[2]) if len(r) > 2 else ""
            rem_val = clean_str(r[3]) if len(r) > 3 else ""

            if date_val.lower() == 'date':
                continue

            cur.execute("""
            INSERT INTO ppmp_procurement (date, description, doctrack_no, amount, remarks)
            VALUES (?, ?, ?, ?, ?)
            """, (date_val, desc_val, doctrack_val, "", rem_val))
            count += 1
        print(f"Migrated OUT PPMP: {count} records")

    conn.commit()
    conn.close()
    wb.close()
    print("ALL MIGRATIONS FINISHED SUCCESSFULLY!")

if __name__ == "__main__":
    migrate()
