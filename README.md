# DO-DocTrax: CFNR Dean's Office Document Tracking System

A zero-install, responsive document routing and communications tracking web application built for the **Dean's Office (DO) of the College of Forestry and Natural Resources (CFNR) at UP Los Baños (UPLB)**.

Designed to replace cumbersome multi-sheet Excel workbooks with a fast, reliable local web dashboard backed by **SQLite 3**.

---

## Features

- **Zero-Dependency Architecture:** Powered entirely by Python's standard library (`http.server` and `sqlite3`). No complex database installation, no Docker, and no Node.js build steps required.
- **Sub-Millisecond Search:** Instant full-text search and filtering across all 6,000+ historical records.
- **One-Click Custody Stamper:** Rapid shortcut button to record courier pickups (`pick up by [Staff] [Date]`) and mark documents as `SIGNED`.
- **Categorized Operational Modules:**
  - *Incoming & Outgoing Documents* (physical paper routing, endorsements, travel requests)
  - *Email Communications* (electronic correspondence, deadlines, links)
  - *University Memos & Admin Orders* (issuances from the Chancellor & Vice Chancellors)
  - *Appointments, NOSA & HR* (salary adjustments, temporary/permanent appointments, step increments)
  - *CFNR Internal Memos & Admin Orders* (OIC designations, college advisories, committee appointments)
  - *PPMP Procurement Plans* (purchase categories, amounts, BAC/BMO routing)
- **Bidirectional Excel Sync:** 1-click export generating formatted multi-sheet `.xlsx` files matching official university reporting formats.
- **Impeccable Design System:** High-contrast institutional typography (*Public Sans*), WCAG AA compliant contrast, tabular figures, and color-coded status badges.

---

## Quick Start (Windows)

### 1. Initial Migration (First Run Only)
To seed the SQLite database (`doctrax.db`) from `COMMUNICATIONS & DOCUMENTS RECEIVED 2025.xlsx`:
```bash
python scripts/migrate_excel_to_sqlite.py
```

### 2. Launch the Application
Simply double-click:
```bash
run.bat
```
Or start via terminal:
```bash
python server.py 8000
```
Then open your browser to [http://localhost:8000](http://localhost:8000).

---

## Project Structure

```
do-doctrax/
├── COMMUNICATIONS & DOCUMENTS RECEIVED 2025.xlsx  # 2025 Source Excel Workbook
├── doctrax.db                                    # Local SQLite database (auto-created)
├── server.py                                     # Zero-install Python HTTP & SQLite API
├── run.bat                                       # Windows double-click launcher
├── scripts/
│   ├── migrate_excel_to_sqlite.py                # Excel to SQLite migration script
│   └── export_sqlite_to_excel.py                 # Multi-sheet Excel export generator
├── public/                                       # Frontend Web UI
│   ├── index.html                                # Accessible semantic UI shell
│   ├── css/
│   │   └── style.css                             # CFNR Forest Green design system
│   └── js/
│       └── app.js                                # Client state, tables & custody stamper
├── PRODUCT.md                                    # Durable product specification
├── DESIGN.md                                     # Visual tokens and design guidelines
└── do_doctrax_specification.md                   # Technical specification & checklist
```
