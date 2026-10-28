# DO-DocTrax: CFNR Dean's Office Document Tracking System

A zero-install, responsive document routing and communications tracking web application built for the **Dean's Office (DO) of the College of Forestry and Natural Resources (CFNR) at UP Los Baños (UPLB)**.

Designed to replace cumbersome multi-sheet Excel workbooks with a fast, reliable local web dashboard backed by **SQLite 3**.

---

## Simple Setup Instructions (Beginner-Friendly)

Follow these **4 simple steps** to set up and run DO-DocTrax on any Windows computer:

### Step 1: Install Python (If not already installed)
1. Download Python for Windows from [python.org](https://www.python.org/downloads/).
2. During installation, **make sure to check the box:** `"Add Python to PATH"`.

---

### Step 2: Install Excel Support (1 command)
Open Command Prompt (`cmd`) or PowerShell, and run:
```bash
pip install openpyxl
```
*(This is the only package needed so the app can read and write Excel files).*

---

### Step 3: Load the 2025 Excel Data (One-Time Setup)
In your terminal, navigate to the project folder and run:
```bash
python scripts/migrate_excel_to_sqlite.py
```
* In about 2 seconds, all **5,742 records** from `COMMUNICATIONS & DOCUMENTS RECEIVED 2025.xlsx` will be imported into your local `doctrax.db` database.

---

### Step 4: Create Desktop App Icon (One-Time Setup)
Run:
```bash
python scripts/create_desktop_shortcut.py
```
* This creates a **DO-DocTrax** icon right on your Windows Desktop.

---

## Daily Use

### How to Start the App
* **Simply double-click the "DO-DocTrax" icon on your Desktop.**
* It starts the system invisibly in the background and opens your browser directly to:
  **`http://localhost:8000`**

*(Alternatively, you can double-click `run.bat` inside the folder).*

### How to Stop the App
* Double-click **`stop.bat`** in the project folder to cleanly shut down the server.

---

## Key Features & How to Use

* **Search Anything Instantly:** Type any keyword, tracking number (`Doctrax`), personnel name, or unit in the top search bar. Search results update in real-time.
* **1-Click Pick-up / Custody Stamp:** On any document, click **"Stamp"**, select the courier name (`Kuya Paolo`, `Kuya Alberth`, etc.), and click **"Apply Stamp & Sign"**. It automatically logs `"pick up by [Courier] [Date]"` and marks the record as **SIGNED**.
* **Rapid Batch Entry (Clone):** Click the **Clone** icon on any record to duplicate it with today's date—ideal for quickly logging batches of travel requests or appointments.
* **Export to Excel:** Click **"Export Excel (.xlsx)"** in the top-right header anytime to download an updated, multi-sheet Excel file matching the official university format.

---

## Project Structure

```
do-doctrax/
├── COMMUNICATIONS & DOCUMENTS RECEIVED 2025.xlsx  # 2025 Source Excel Workbook
├── doctrax.db                                    # Local SQLite database (auto-created)
├── launch.vbs                                    # Silent background launcher
├── run.bat                                       # Standard Windows launcher
├── stop.bat                                      # 1-click shutdown script
├── server.py                                     # Zero-install Python HTTP & SQLite API
├── scripts/
│   ├── migrate_excel_to_sqlite.py                # Excel to SQLite migration script
│   ├── export_sqlite_to_excel.py                 # Multi-sheet Excel export generator
│   └── create_desktop_shortcut.py                # Desktop shortcut generator
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
