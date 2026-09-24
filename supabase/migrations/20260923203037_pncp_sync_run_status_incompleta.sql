-- SEC-R1 / L6D PR#42 item 1: allow sync terminal status `incompleta`.
-- Capped page walks checkpoint remaining slices; status must persist without
-- CHECK violation. `falhou` stays transport/runtime failure.
-- Do not edit 202609180001_pncp_foundation.sql — recreate CHECK only.

ALTER TABLE private.pncp_sync_run
  DROP CONSTRAINT IF EXISTS pncp_sync_run_status_check;

ALTER TABLE private.pncp_sync_run
  ADD CONSTRAINT pncp_sync_run_status_check
  CHECK (status IN (
    'pendente',
    'executando',
    'concluida',
    'concluida_com_erros',
    'falhou',
    'cancelada',
    'incompleta'
  ));

COMMENT ON CONSTRAINT pncp_sync_run_status_check ON private.pncp_sync_run IS
  'Includes incompleta: continuation pending; not a success terminal.';
