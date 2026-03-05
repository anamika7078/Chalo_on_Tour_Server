const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');

const MARGIN = 40;
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const RIGHT_EDGE = PAGE_WIDTH - MARGIN;
const CONTENT_WIDTH = RIGHT_EDGE - MARGIN;

const LOGO_FILENAME = 'chalo-on-tour-e1766686260447.png';

function getLogoPath() {
  const candidates = [
    path.join(__dirname, '..', 'public', LOGO_FILENAME),
    path.join(process.cwd(), 'public', LOGO_FILENAME),
    path.join(process.cwd(), 'chaloontour_frontend', 'public', LOGO_FILENAME),
    path.join(__dirname, '..', '..', 'chaloontour_frontend', 'public', LOGO_FILENAME),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p; 
  }
  return null; 
}

/** Default hero image URLs (slot 1–6). Admin can override via lead.heroImageUrls. */
const DEFAULT_HERO_IMAGE_URLS = [
  'https://t4.ftcdn.net/jpg/00/65/48/25/360_F_65482539_C0ZozE5gUjCafz7Xq98WB4dW6LAhqKfs.jpg',
  'https://images.pexels.com/photos/1371360/pexels-photo-1371360.jpeg?cs=srgb&dl=pexels-te-lensfix-380994-1371360.jpg&fm=jpg',
  'https://img.freepik.com/free-photo/blue-villa-beautiful-sea-hotel_1203-5316.jpg?semt=ais_user_personalization&w=740&q=80',
  'https://img.freepik.com/free-photo/blue-villa-beautiful-sea-hotel_1203-5316.jpg?semt=ais_user_personalization&w=740&q=80',
  'https://e0.pxfuel.com/wallpapers/120/999/desktop-wallpaper-travel-travel-and-tourism.jpg',
  'https://images.unsplash.com/photo-1589211059547-2dc456fd0be0?fm=jpg&q=60&w=3000&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8a29oJTIwcGhpJTIwcGhpfGVufDB8fDB8fHww',
];

function getHeroImageUrls(lead) {
  if (Array.isArray(lead.heroImageUrls) && lead.heroImageUrls.length >= 6) return lead.heroImageUrls.slice(0, 6);
  return DEFAULT_HERO_IMAGE_URLS;
}

/** Fetch image from URL; returns Buffer or null. */
async function fetchImageBuffer(url, timeoutMs = 8000) {
  if (!url || typeof url !== 'string') return null;
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.length > 0 ? buf : null;
  } catch (_) {
    return null;
  }
}

/** Hero section: 6 slots. Prefer local files in pdf-hero (hero1.png–hero6.png), else use fetched buffers from URLs. */
async function getHeroImages(lead) {
  const dirs = [
    path.join(__dirname, '..', 'public', 'pdf-hero'),
    path.join(process.cwd(), 'public', 'pdf-hero'),
  ];
  const fileNames = ['hero1.png', 'hero2.png', 'hero3.png', 'hero4.png', 'hero5.png', 'hero6.png'];
  const out = [];
  for (let i = 0; i < 6; i++) {
    let localPath = null;
    for (const d of dirs) {
      const p = path.join(d, fileNames[i]);
      if (fs.existsSync(p)) { localPath = p; break; }
    }
    if (localPath) {
      out.push(localPath);
    } else {
      const urls = getHeroImageUrls(lead);
      const buf = await fetchImageBuffer(urls[i]);
      out.push(buf);
    }
  }
  return out;
}

function formatDate(d) {
  if (!d) return '–';
  try {
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch (_) {
    return '–';
  }
}

function formatAmount(n) {
  if (n == null) return '–';
  return 'Rs.' + Number(n).toLocaleString('en-IN') + '/-';
}

function val(s) {
  return s != null && String(s).trim() !== '' ? String(s).trim() : '–';
}

function drawNavbar(doc, logoPath) {
  const barY = 0;
  const barH = 56;
  doc.rect(0, barY, PAGE_WIDTH, barH).fill('#ffffff').stroke('#e0e0e0');
  doc.fillColor('#000000').font('Helvetica-Bold').fontSize(18);
  const logoW = 120;
  doc.text('CHALO ON TOUR', MARGIN, barY + (barH - 22) / 2, { width: PAGE_WIDTH - MARGIN * 2 - logoW - 20 });
  if (logoPath) {
    try {
      doc.image(logoPath, PAGE_WIDTH - MARGIN - logoW, barY + 4, { width: logoW, height: barH - 8 });
    } catch (_) {}
  }
  doc.y = barY + barH + MARGIN;
  doc.fillColor('#000000');
}

function drawHeroImageGrid(doc, imagePaths) {
  const gridY = doc.y;
  const gap = 6;
  const cols = 3;
  const rows = 2;
  const colW = (CONTENT_WIDTH - gap * (cols - 1)) / cols;
  const rowH = 88;
  const radius = 6;

  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push({
        x: MARGIN + c * (colW + gap),
        y: gridY + r * (rowH + gap),
        w: colW,
        h: rowH,
      });
    }
  }

  const pad = 2;
  const images = Array.isArray(imagePaths) && imagePaths.length >= 6 ? imagePaths : Array(6).fill(null);
  cells.forEach((cell, i) => {
    doc.roundedRect(cell.x, cell.y, cell.w, cell.h, radius).fill('#e8e8e8').stroke('#ccc');
    const img = images[i];
    if (img) {
      try {
        const imgW = cell.w - pad * 2;
        const imgH = cell.h - pad * 2;
        const opts = { cover: [imgW, imgH], align: 'center', valign: 'center' };
        if (Buffer.isBuffer(img)) {
          doc.image(img, cell.x + pad, cell.y + pad, opts);
        } else if (typeof img === 'string' && fs.existsSync(img)) {
          doc.image(img, cell.x + pad, cell.y + pad, opts);
        }
      } catch (_) {}
    }
  });

  doc.y = gridY + rows * rowH + (rows - 1) * gap + 20;
}

function drawSectionHeading(doc, text, color = '#1565c0') {
  const y = doc.y;
  const paddingH = 18;
  const paddingV = 6;
  doc.font('Helvetica-Bold').fontSize(12);
  const textWidth = doc.widthOfString(text);
  const boxWidth = Math.min(textWidth + paddingH * 2, CONTENT_WIDTH);
  const boxHeight = 22;
  doc.rect(MARGIN, y, boxWidth, boxHeight).fill(color);
  doc.fillColor('#ffffff').text(text, MARGIN + paddingH, y + paddingV);
  doc.fillColor('#000000');
  doc.y = y + boxHeight + 10;
}

function drawTable(doc, headers, rows, colWidths) {
  const x = MARGIN;
  const rowH = 22;

  doc.font('Helvetica-Bold').fontSize(9);
  let y = doc.y;
  headers.forEach((h, i) => {
    const cw = colWidths[i] || 80;
    const xOff = colWidths.slice(0, i).reduce((a, b) => a + b, 0);
    doc.rect(x + xOff, y, cw, rowH).stroke('#000');
    doc.fillColor('#000').text(h, x + xOff + 6, y + 6, { width: cw - 12, lineBreak: false });
  });
  doc.y = y + rowH;
  doc.font('Helvetica').fontSize(9);

  rows.forEach((row) => {
    y = doc.y;
    if (y > PAGE_HEIGHT - 80) {
      doc.addPage();
      doc.y = MARGIN;
      y = doc.y;
    }
    row.forEach((cell, i) => {
      const cw = colWidths[i] || 80;
      const xOff = colWidths.slice(0, i).reduce((a, b) => a + b, 0);
      doc.rect(x + xOff, y, cw, rowH).stroke('#000');
      doc.fillColor('#000').text(val(cell), x + xOff + 6, y + 6, { width: cw - 12 });
    });
    doc.y = y + rowH;
  });
  doc.moveDown(0.5);
}

function drawSummaryTable(doc, rows) {
  const col1W = 40;
  const col2W = 180;
  const col3W = RIGHT_EDGE - MARGIN - col1W - col2W;
  drawTable(doc, ['#', 'Particular', 'Details'], rows.map(([label, value], i) => [(i + 1).toString(), label, value]), [col1W, col2W, col3W]);
}

function drawAccommodationTable(doc, accommodation) {
  const cols = [35, 100, 45, 90, 55, 90];
  const headers = ['Sr', 'Hotel Name', 'Night(s)', 'Room Category', 'Sharing', 'Destination'];
  const rows = (Array.isArray(accommodation) ? accommodation : []).map((a, i) => [
    (i + 1).toString(),
    val(a.hotelName),
    a.nights != null ? String(a.nights) : '–',
    val(a.roomType),
    val(a.sharing),
    val(a.destination),
  ]);
  if (rows.length === 0) {
    doc.font('Helvetica').fontSize(10).fillColor('#666').text('No accommodation details added.', MARGIN, doc.y);
    doc.moveDown(0.5);
    return;
  }
  drawTable(doc, headers, rows, cols);
}

function drawFlightTable(doc, flights) {
  const cols = [35, 80, 80, 120, 100];
  const headers = ['Sr', 'From', 'To', 'Airline Info', 'PNR / Booking'];
  const rows = (Array.isArray(flights) ? flights : []).map((f, i) => [
    (i + 1).toString(),
    val(f.from),
    val(f.to),
    val(f.airline),
    val(f.pnr),
  ]);
  if (rows.length === 0) {
    doc.font('Helvetica').fontSize(10).fillColor('#666').text('No flight details added.', MARGIN, doc.y);
    doc.moveDown(0.5);
    return;
  }
  drawTable(doc, headers, rows, cols);
}

function drawItineraryDay(doc, item, index) {
  const dayNum = item.day != null ? item.day : index + 1;
  const dayTitle = `Day ${dayNum} :– ${val(item.route) || 'Tour'} ${item.date ? '(' + formatDate(item.date) + ')' : ''}`;
  if (doc.y > PAGE_HEIGHT - 100) doc.addPage();

  doc.rect(MARGIN, doc.y, RIGHT_EDGE - MARGIN, 24).fillAndStroke('#ffeb3b', '#000');
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#000').text(dayTitle, MARGIN + 10, doc.y + 6);
  doc.y += 30;

  if (item.description) {
    doc.font('Helvetica').fontSize(10).fillColor('#000').text(val(item.description), { align: 'justify', lineGap: 2 });
    doc.moveDown(0.5);
  }

  if (Array.isArray(item.places) && item.places.length > 0) {
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#c62828').text('Places can be visit: -', { underline: true });
    doc.moveDown(0.3);
    item.places.forEach((p) => {
      doc.font('Helvetica').fillColor('#000').text('• ' + val(p), { indent: 15 });
    });
    doc.moveDown(0.5);
  }
}

async function buildTourSummaryPdf(lead, res) {
  const doc = new PDFDocument({ margin: 0, size: 'A4' });
  const leadId = lead.leadId || lead._id?.toString() || 'lead';
  res.setHeader('Content-Disposition', `attachment; filename="tour-summary-${leadId}.pdf"`);
  res.setHeader('Content-Type', 'application/pdf');
  doc.pipe(res);

  const logoPath = getLogoPath();
  const heroImages = await getHeroImages(lead);

  drawNavbar(doc, logoPath);
  drawHeroImageGrid(doc, heroImages);

  drawSectionHeading(doc, 'Tour Summary: -', '#1565c0');
  const summaryRows = [
    ['Total Package Cost', formatAmount(lead.total_amount)],
    ['Total No of Pax', [lead.paxCount, lead.paxType].filter(Boolean).join(' ') || '–'],
    ['Vehicle Type', val(lead.vehicleType)],
    ['Hotel Category', val(lead.hotelCategory)],
    ['Meal Plan', val(lead.mealPlan)],
    ['Tour Duration', [lead.tourNights != null && `${lead.tourNights} Nights`, lead.tourDays != null && `${lead.tourDays} Days`].filter(Boolean).join(' / ') || '–'],
    ['Tour Date', lead.tourStartDate && lead.tourEndDate ? `${formatDate(lead.tourStartDate)} to ${formatDate(lead.tourEndDate)}` : formatDate(lead.travel_date)],
    ['Pick up', val(lead.pickupPoint)],
    ['Drop', val(lead.dropPoint)],
    ['Destinations', Array.isArray(lead.destinations) && lead.destinations.length ? lead.destinations.map((d) => val(d)).join(', ') : val(lead.destination)],
  ];
  drawSummaryTable(doc, summaryRows);

  drawSectionHeading(doc, 'Accommodation: -', '#1565c0');
  drawAccommodationTable(doc, lead.accommodation);

  drawSectionHeading(doc, 'Flight Details: -', '#1565c0');
  drawFlightTable(doc, lead.flights);

  drawSectionHeading(doc, 'Tour Itinerary: -', '#c62828');
  if (Array.isArray(lead.itinerary) && lead.itinerary.length > 0) {
    lead.itinerary.forEach((item, i) => drawItineraryDay(doc, item, i));
  } else {
    doc.font('Helvetica').fontSize(10).fillColor('#666').text('Itinerary will be shared shortly.', MARGIN, doc.y);
  }

  doc.end();
}

module.exports = { buildTourSummaryPdf };
