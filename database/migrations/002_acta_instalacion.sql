-- Migración: campos para Acta de Instalación digital
-- ------------------------------------------------------------------
-- Agrega persistencia de firma digital del cliente y URL del PDF
-- generado automáticamente al completar una instalación.
-- ------------------------------------------------------------------

ALTER TABLE instalacion
  ADD COLUMN IF NOT EXISTS firma_cliente TEXT;

ALTER TABLE instalacion
  ADD COLUMN IF NOT EXISTS pdf_acta_url TEXT;

COMMENT ON COLUMN instalacion.firma_cliente IS
  'Firma digital del cliente capturada en terreno, formato data:image/png;base64,...';

COMMENT ON COLUMN instalacion.pdf_acta_url IS
  'URL Cloudinary del Acta de Instalación generada automáticamente al completar.';
