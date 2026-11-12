# DO-DocTrax: Communications and Documents Received

- **Initialized / Created:** October 29, 2026
- **Last Updated:** November 12, 2026
- **Live Deployment:** https://cfnr-do-dashboard.vercel.app/
- **Institution:** College of Forestry and Natural Resources (CFNR) — Dean's Office, UP Los Baños (UPLB)

A web-based document routing, communications tracking, and analytics dashboard built for the **CFNR Dean's Office**. Replaced legacy multi-sheet Excel logbooks and local SQLite hosting with a static frontend deployed on **Vercel** and backed by **Supabase Authentication (Google OAuth)** + **Supabase PostgreSQL** with Row-Level Security (RLS).

---

## Key Features

* **Analytics Dashboard (Default Landing Tab):**
  * Interactive **Start Date**, **End Date**, and **Trend Year** filters plus quick **All Dates**, **Reset**, and **Refresh** actions.
  * Category KPI cards (clicking any card opens its logbook tab), **Summary by Category** table, **Monthly Trend (`Jan`–`Dec`)** stacked chart, **Top 10 Document Types** bar chart, **Status Mix** doughnut chart, and 5 category breakdown tables.
* **Chronological Document Logs:**
  * Covers **Incoming & Outgoing Docs**, **Email Received**, **University Memos & AO**, **Appointments, NOSA & HR**, **CFNR Internal Memos**, and **CFNR Admin Orders**.
  * Always sorted newest first by `date` (`YYYY-MM-DD`, rendered cleanly as `DD Month YYYY`).
* **Real-Time Search & Typable Filters:**
  * Instant search across tracking numbers, personnel names, subjects, and remarks, paired with typable **Unit**, **Status**, and **Year** dropdown filters.
* **Fast Entry, Batching & Custody Stamping:**
  * Dynamic modals with auto-expanding textareas, typable lookup fields, **Clone / Batch Entry**, and 1-click **Quick Custody Pick-up Stamp** (`"pick up by [Courier] [MM/DD/YYYY]"` + status update to `SIGNED`).
* **Filtered Excel Export (`.xlsx`):**
  * Browser-side multi-sheet or active-tab export via SheetJS with **Export Scope**, **Year**, **Date From / Date To**, **Keyword Search**, and tab-specific filters.
* **Role-Based Access & User Management (`users.html`):**
  * Google OAuth sign-in gated by `public.allowed_users` (`admin`, `staff`, `viewer`) enforced at the database level via Postgres RLS.
  * Admin-only **Users** page for adding, editing, activating/deactivating, or removing Google / UP email accounts.

---

## Running Locally

Because the application is pure static HTML/CSS/JS inside `public/`, no build step is required:

1. Clone or open the repository folder:
   ```powershell
   cd c:\devs\do-doctrax
   ```
2. Start a local HTTP server pointing to `public`:
   ```powershell
   python -m http.server 8000 -d public
   ```
3. Open http://localhost:8000 in your browser.
   *(Ensure `http://localhost:8000` is listed under **Supabase Dashboard → Authentication → URL Configuration → Redirect URLs**.)*

---

## Deploying to Vercel (CLI, No GitHub Link Required)

Deploy only the `public/` folder so local workbooks, databases, and OAuth client files are never uploaded:

```powershell
cd c:\devs\do-doctrax\public
npx.cmd vercel --prod
```
*(In PowerShell, `npx.cmd` avoids execution-policy blocks on `npx.ps1`. Accept default static settings without overriding build/output commands.)*

### Required Auth URLs in Supabase Dashboard
Under **Authentication → URL Configuration**:
* **Site URL:** `https://cfnr-do-dashboard.vercel.app`
* **Redirect URLs:**
  * `https://cfnr-do-dashboard.vercel.app`
  * `https://cfnr-do-dashboard.vercel.app/**`
  * `http://localhost:8000`

---

## Database Schema & Maintenance

* **[supabase_schema.sql](supabase_schema.sql):** Creates `allowed_users`, security helper functions (`current_user_email`, `is_allowed_user`, `can_write`, `is_admin`), operational tables, `lookup_values`, RLS policies, and `updated_at` triggers.
* **[supabase_normalize_dates.sql](supabase_normalize_dates.sql):** Idempotent SQL script to normalize legacy `MM/DD/YYYY` / `Month DD, YYYY` strings into `YYYY-MM-DD` and remove imported Excel header/total rows.

---

## Project Structure

```text
do-doctrax/
├── public/                              # Static web app deployed to Vercel
│   ├── index.html                       # Dashboard + document logbook UI & modals
│   ├── users.html                       # Admin-only authorized users management page
│   ├── css/
│   │   └── style.css                    # CFNR Forest Green design system & responsive layouts
│   ├── icons/
│   │   └── cfnr-logo.png                # Official UPLB CFNR seal & favicon
│   └── js/
│       ├── config.js                    # Supabase project URL & publishable key
│       ├── auth.js                      # Google OAuth (PKCE) & allowed_users access gate
│       ├── dashboard.js                 # Live dashboard aggregations & Chart.js charts
│       ├── app.js                       # Logbook CRUD, filters, custody stamp & Excel export
│       └── users.js                     # Admin user whitelist CRUD controller
├── scripts/
│   ├── migrate_sqlite_to_supabase.py    # One-time SQLite -> Supabase REST migration utility
│   └── export_supabase_to_excel.py      # Standalone Python backup/export script
├── mds/
│   ├── login_architecture.md            # Supabase Auth & RLS architecture notes
│   └── login_implementation_checklist.md
├── supabase_schema.sql                  # Postgres schema, RLS policies & seed admins
├── supabase_normalize_dates.sql         # Date format normalization migration SQL
├── PRODUCT.md                           # Durable product specification
├── DESIGN.md                            # Design tokens & visual guidelines
├── do_doctrax_specification.md          # Original system specification
└── README.md
```
