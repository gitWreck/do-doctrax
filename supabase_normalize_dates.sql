-- =============================================================================
-- DO-DocTrax: Normalize legacy date strings to ISO YYYY-MM-DD
-- Run once in Supabase SQL Editor (postgres role) so server-side
-- ORDER BY date DESC NULLS LAST, id DESC sorts chronologically across all rows.
-- Safe & idempotent: already-ISO dates (YYYY-MM-DD) are left untouched.
-- =============================================================================

BEGIN;

-- 1. Remove the 2 Excel header/total artifact rows imported during initial migration
DELETE FROM public.incoming_outgoing_docs
WHERE date = 'INCOMING AND OUTGOING DOCUMENTS';

DELETE FROM public.email_logs
WHERE date = 'Email Received';

-- 2. Normalize MM/DD/YYYY and Month DD, YYYY -> YYYY-MM-DD (and '' -> NULL)
DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'incoming_outgoing_docs',
    'email_logs',
    'memo_ao_external',
    'personnel_appointments',
    'cfnr_memos',
    'cfnr_admin_orders',
    'ppmp_procurement'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format(
      $sql$
      UPDATE public.%I
      SET date = CASE
        WHEN trim(date) = '' THEN NULL
        WHEN trim(date) ~ '^\d{1,2}/\d{1,2}/\d{4}$'
          THEN to_char(to_date(trim(date), 'MM/DD/YYYY'), 'YYYY-MM-DD')
        WHEN trim(date) ~ '^[A-Za-z]+\s+\d{1,2},\s*\d{4}$'
          THEN to_char(to_date(regexp_replace(trim(date), '\s+', ' ', 'g'), 'FMMonth FMDD, YYYY'), 'YYYY-MM-DD')
        ELSE trim(date)
      END
      WHERE date IS NOT NULL
        AND date !~ '^\d{4}-\d{2}-\d{2}$';
      $sql$,
      tbl
    );
  END LOOP;
END $$;

COMMIT;

