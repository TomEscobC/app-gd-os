/**
 * Servicio de generación de PDFs — APP-GD-OS
 * ------------------------------------------------------------------
 * Encapsula la creación de Actas de Instalación en PDF con
 * - datos del cliente y cotización
 * - dirección y coordenadas GPS
 * - foto de evidencia embebida (desde URL Cloudinary)
 * - firma digital del cliente (base64 PNG)
 * - metadatos: fecha, instalador, número de acta correlativo
 *
 * El PDF se sube a Cloudinary y la URL queda persistida en la BD.
 * ------------------------------------------------------------------
 */
const PDFDocument = require('pdfkit');
const axios = require('axios');
const { cloudinary } = require('../config/cloudinary');

const AZUL = '#1E3A8A';
const GRIS = '#64748B';

// ── Descarga una imagen remota como Buffer ────────────────────────
const fetchImagen = async (url) => {
  if (!url) return null;
  try {
    const { data } = await axios.get(url, { responseType: 'arraybuffer', timeout: 15000 });
    return Buffer.from(data);
  } catch (err) {
    console.error('[PDF] No se pudo descargar imagen:', err.message);
    return null;
  }
};

// ── Decodifica una firma base64 (formato data URL) ────────────────
const decodeFirma = (firmaBase64) => {
  if (!firmaBase64) return null;
  const match = firmaBase64.match(/^data:image\/\w+;base64,(.+)$/);
  const raw = match ? match[1] : firmaBase64;
  try {
    return Buffer.from(raw, 'base64');
  } catch {
    return null;
  }
};

// ── Sube un Buffer PDF a Cloudinary ───────────────────────────────
const subirPDFCloudinary = (buffer, nombre) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'raw',
        folder: 'app-gd-os/actas',
        public_id: nombre,
        format: 'pdf',
      },
      (err, result) => (err ? reject(err) : resolve(result.secure_url))
    );
    stream.end(buffer);
  });

/**
 * Genera el Acta de Instalación en PDF y la sube a Cloudinary.
 * @param {Object} datos
 * @param {Object} datos.instalacion   Fila completa de la tabla instalacion
 * @param {Object} datos.cliente       Fila de la tabla cliente
 * @param {Object} datos.cotizacion    Fila de la tabla cotizacion
 * @param {Object} datos.instalador    Fila del instalador (nombre)
 * @param {String} datos.foto_url      URL Cloudinary de la foto de evidencia
 * @param {String} datos.firma_base64  data:image/png;base64,...
 * @param {Number} datos.numero_acta   Correlativo del acta
 * @returns {Promise<String>}          URL Cloudinary del PDF generado
 */
const generarActaInstalacion = async ({
  instalacion, cliente, cotizacion, instalador,
  foto_url, firma_base64, numero_acta,
}) => {
  const [fotoBuf, firmaBuf] = await Promise.all([
    fetchImagen(foto_url),
    Promise.resolve(decodeFirma(firma_base64)),
  ]);

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const chunks = [];
  doc.on('data', (c) => chunks.push(c));
  const done = new Promise((resolve) => doc.on('end', resolve));

  // ── Encabezado ──────────────────────────────────────────────────
  doc.fillColor(AZUL).fontSize(22).font('Helvetica-Bold')
     .text('GLOBAL DESIGN', 50, 50);
  doc.fillColor(GRIS).fontSize(10).font('Helvetica')
     .text('Sistema Operativo de Instalaciones — APP-GD-OS', 50, 75);

  doc.fillColor('#000').fontSize(16).font('Helvetica-Bold')
     .text(`ACTA DE INSTALACIÓN N° ${String(numero_acta).padStart(6, '0')}`, 50, 110);

  doc.moveTo(50, 140).lineTo(545, 140).strokeColor(AZUL).lineWidth(1.5).stroke();

  // ── Datos del cliente ───────────────────────────────────────────
  let y = 160;
  const seccion = (titulo) => {
    doc.fillColor(AZUL).fontSize(12).font('Helvetica-Bold').text(titulo, 50, y);
    y += 18;
    doc.fillColor('#000').fontSize(10).font('Helvetica');
  };

  const campo = (label, valor) => {
    doc.font('Helvetica-Bold').text(`${label}: `, 50, y, { continued: true });
    doc.font('Helvetica').text(valor || '—');
    y += 15;
  };

  seccion('CLIENTE');
  campo('Nombre',    cliente?.nombre);
  campo('Teléfono',  cliente?.telefono);
  campo('Email',     cliente?.email);

  y += 8;
  seccion('UBICACIÓN');
  campo('Dirección',   instalacion?.direccion || cliente?.direccion);
  campo('Latitud',     instalacion?.latitud);
  campo('Longitud',    instalacion?.longitud);

  y += 8;
  seccion('COTIZACIÓN ASOCIADA');
  campo('ID Cotización', cotizacion?.id ? `#${cotizacion.id}` : '—');
  campo('Monto total',   cotizacion?.total
    ? `$${Number(cotizacion.total).toLocaleString('es-CL')}`
    : '—');
  campo('Estado',        cotizacion?.estado);

  y += 8;
  seccion('EJECUCIÓN');
  campo('Instalador',  instalador?.nombre);
  campo('Fecha',       new Date(instalacion?.fecha || Date.now())
    .toLocaleString('es-CL', { dateStyle: 'long', timeStyle: 'short' }));

  // ── Foto de evidencia ───────────────────────────────────────────
  y += 12;
  doc.fillColor(AZUL).fontSize(12).font('Helvetica-Bold').text('FOTO DE EVIDENCIA', 50, y);
  y += 18;
  if (fotoBuf) {
    try {
      doc.image(fotoBuf, 50, y, { fit: [495, 250], align: 'center' });
      y += 260;
    } catch {
      doc.fillColor(GRIS).fontSize(10).font('Helvetica-Oblique')
         .text('(No fue posible incrustar la imagen)', 50, y);
      y += 20;
    }
  } else {
    doc.fillColor(GRIS).fontSize(10).font('Helvetica-Oblique')
       .text('Sin foto de evidencia registrada.', 50, y);
    y += 20;
  }

  // ── Firma digital ───────────────────────────────────────────────
  if (y > 680) { doc.addPage(); y = 60; }
  y += 10;
  doc.fillColor(AZUL).fontSize(12).font('Helvetica-Bold').text('FIRMA DEL CLIENTE', 50, y);
  y += 18;

  if (firmaBuf) {
    try {
      doc.image(firmaBuf, 50, y, { fit: [220, 90] });
    } catch {
      doc.fillColor(GRIS).fontSize(10).text('(Firma no embebible)', 50, y);
    }
  } else {
    doc.fillColor(GRIS).fontSize(10).font('Helvetica-Oblique')
       .text('Sin firma capturada.', 50, y);
  }

  doc.moveTo(50, y + 95).lineTo(280, y + 95).strokeColor('#000').lineWidth(0.5).stroke();
  doc.fillColor('#000').fontSize(9).font('Helvetica')
     .text(cliente?.nombre || 'Cliente', 50, y + 100);

  // ── Pie de página ──────────────────────────────────────────────
  doc.fillColor(GRIS).fontSize(8).font('Helvetica-Oblique')
     .text(
       `Documento generado automáticamente por APP-GD-OS — ${new Date().toLocaleString('es-CL')}`,
       50, 780, { width: 495, align: 'center' }
     );

  doc.end();
  await done;
  const buffer = Buffer.concat(chunks);

  const nombre = `acta-${String(numero_acta).padStart(6, '0')}-${Date.now()}`;
  return await subirPDFCloudinary(buffer, nombre);
};

module.exports = { generarActaInstalacion };
