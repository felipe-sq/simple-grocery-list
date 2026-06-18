-- Add barcode column to grocery_items so scanned products can be stored
-- and future lookup can identify the item without re-scanning Open Food Facts.
ALTER TABLE grocery_items ADD COLUMN barcode TEXT;
