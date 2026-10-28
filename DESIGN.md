# Design System: DO-DocTrax

<!-- impeccable:design-tokens 1 -->

## Design Philosophy (Operate Mode)
DO-DocTrax is an administrative productivity tool for the CFNR Dean's Office. In Operate mode:
- The design **serves the task**—dense, scanable, familiar, and responsive.
- High contrast and clear hierarchy outrank decorative fluff.
- Tabular figures and fixed rem scale ensure numbers and dates line up perfectly.
- State-rich semantics: every button and control has distinct default, hover, focus-visible, active, and disabled states.

## Color Palette

### Primary (CFNR Heritage Green)
- `--primary-900`: `#082819` (Deep forest)
- `--primary-800`: `#0e3d27` (Header & brand anchors)
- `--primary-700`: `#145335` (Primary buttons, active tabs)
- `--primary-600`: `#1c734b` (Hover states)
- `--primary-100`: `#e2f4ea` (Light brand highlights)
- `--primary-50`:  `#f0f9f4` (Selected row background)

### Neutrals
- `--bg-canvas`:    `#f8fafc` (Page background)
- `--bg-surface`:   `#ffffff` (Card, table, and modal surfaces)
- `--bg-subtle`:    `#f1f5f9` (Table headers, input backgrounds)
- `--border-subtle`: `#e2e8f0` (Dividers and structural borders)
- `--border-strong`: `#cbd5e1` (Input borders)
- `--text-main`:    `#0f172a` (Headings, primary data values)
- `--text-muted`:   `#475569` (Labels, secondary metadata, remarks)
- `--text-faint`:   `#94a3b8` (Placeholders, inactive indicators)

### Semantic Status Badges
- **SIGNED / APPROVED:**
  - Background: `#dcfce7`
  - Text: `#166534`
  - Border: `#bbf7d0`
- **FOR REVIEW / PENDING:**
  - Background: `#fef9c3`
  - Text: `#854d0e`
  - Border: `#fef08a`
- **FOR ACTION / COMMENTS:**
  - Background: `#dbeafe`
  - Text: `#1e40af`
  - Border: `#bfdbfe`
- **RETURNED / DISAPPROVED:**
  - Background: `#fee2e2`
  - Text: `#991b1b`
  - Border: `#fecaca`

## Typography

- **Font Family:** `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- **Monospace / Tabular Font:** `"SF Mono", "Cascadia Code", "Consolas", monospace` (used for Doctrax IDs, amounts, and dates)
- **Tabular Figures:** `font-variant-numeric: tabular-nums;` enabled on all data tables.
- **Scale:**
  - Display / Title: `1.25rem` (20px), weight 600
  - Section Header: `1.125rem` (18px), weight 600
  - Body & Table Text: `0.875rem` (14px), weight 400 / 500
  - Secondary / Badges / Meta: `0.75rem` (12px), weight 500 / 600
  - Micro / Timestamps: `0.6875rem` (11px)

## Components & Affordances

### 1. Navigation / Category Tabs
- Clean segmented tabs representing the 6 operational streams.
- Active tab indicated by bold label, subtle background tint, and solid indicator bar.

### 2. KPI Summary Cards
- Compact metric cards at the top of each view showing: Total Records, Signed/Processed, Pending Review, and Recent Pickups.
- High-contrast figures with clear contextual labels.

### 3. Data Grid / Table
- Sticky table header with subtle contrast background (`--bg-subtle`).
- Row hover highlight (`--primary-50`) for effortless tracking across wide monitors.
- Ellipsis with tooltip for lengthy descriptions and remarks.
- Fixed action buttons (Edit, Stamp Pickup, Clone).

### 4. Interactive Dialogs & Modals
- Native accessible `<dialog>` elements or overlay containers with backdrop blur.
- Focus trap and Escape key dismissal.
- Structured form fields with clear error validation and pre-populated dropdowns.

### 5. Accessibility & Motion
- All interactive elements carry visible `outline: 2px solid var(--primary-600)` with `outline-offset: 2px` on `:focus-visible`.
- Transitions capped at `150ms–200ms ease-out` for snappy, responsive feel.
- Custom styled scrollbars matching the color system.
