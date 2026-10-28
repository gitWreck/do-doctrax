# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Static HTML5, Vanilla CSS3, ES6+ JavaScript, with a zero-dependency local Python 3.12 backend (`http.server` + `sqlite3`).

## Users

Administrative officers, clerks, and records custodians of the Dean's Office (DO) at the College of Forestry and Natural Resources (CFNR), University of the Philippines Los Baños (UPLB).

## Product Purpose

Track, search, update, and manage official university communications, physical document routing, university memoranda, personnel appointments (NOSA), and procurement plans passing through the Dean's Office, replacing a fragile 12-sheet Excel spreadsheet with an instant-access, local web dashboard.

## Positioning

A zero-install desktop web system that provides sub-millisecond database search, automated courier custody stamping, and seamless bidirectional Excel synchronization—eliminating Excel file locks and slow macros while preserving 100% data compatibility with university reports.

## Operating Context

A high-volume college administrative front desk where couriers and college unit representatives (`FDC`, `MCME`, `IRNR`, `FPPS`, etc.) frequently drop off and pick up physical papers, requiring immediate receipt logging, status tracking (`SIGNED`, `FOR REVIEW`, `FOR ACTION`), and rapid lookup of university `Doctrax` tracking codes.

## Capabilities and Constraints

- **Single-file SQLite storage (`doctrax.db`):** Zero database setup, ACID-compliant, stores all historical and active records safely.
- **Fast multi-sheet navigation:** Categorized views for Incoming/Outgoing Docs, Email Communications, University Memos, HR Appointments, Internal CFNR Memos, and Procurement.
- **One-click custody/pickup stamper:** Pre-populated staff shortcuts to eliminate manual typing of pickup notes.
- **Full Excel round-trip:** Imports from and exports directly to the office's exact multi-sheet `.xlsx` format.
- **Zero build requirement:** No npm build steps or external dependencies; runs natively on Windows with Python 3.12.

## Brand Commitments

Institutional UP Los Baños / College of Forestry and Natural Resources (CFNR) identity: forest greens (`#0F4D35`, `#166534`), warm parchment neutrals, crisp high-contrast data presentation, and clear institutional typography.

## Evidence on Hand

- `COMMUNICATIONS & DOCUMENTS RECEIVED 2025.xlsx`: Complete 2025 operational logbook containing 5,740 real records across 7 operational sheets.
- Controlled lookup tables in `Sheet1` defining 35 official document types, 13 college units, and standard review statuses.

## Product Principles

1. **Task-First Clarity (Operate Mode):** High scanability, rapid keyboard input, and dense, readable tables. The interface disappears into the daily administrative task.
2. **Zero File-Lock Headaches:** True database transactions prevent file conflicts and accidental data loss.
3. **Frictionless Handoff Logging:** One-click timestamps for physical courier releases.
4. **Permanent Excel Compatibility:** The team can export back to Excel at any time for compliance and external reporting.

## Accessibility & Inclusion

WCAG AA contrast compliance (minimum 4.5:1 for body and data cells), clear visible focus rings on all inputs, tabular numerals for dates and tracking codes, and responsive layout suited for both standard desktop monitors and laptops.
