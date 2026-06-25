-- ============================================================
-- Migration 004: Transport charges on bookings
-- ------------------------------------------------------------
-- Safe to run multiple times (idempotent). Run with: npm run db:migrate
--
-- Why:
--  Mandap jobs almost always carry a transport / delivery cost
--  (trucks, loading, fuel) that is billed to the customer on top
--  of the inventory rent. It now lives on the booking itself so it
--  flows automatically into the financial summary, the estimate PDF
--  and the invoice PDF without a separate quotation/invoice record.
--
--  Math (kept consistent everywhere):
--    base   = subtotal - discount + transport_charges
--    gst    = base * gst_percent / 100
--    total  = base + gst
-- ============================================================

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS transport_charges NUMERIC(10,2) DEFAULT 0;

-- Backfill any NULLs left by older rows to a concrete 0.
UPDATE bookings SET transport_charges = 0 WHERE transport_charges IS NULL;
