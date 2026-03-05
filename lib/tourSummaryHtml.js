const path = require('path');
const fs = require('fs');

function getLogoBase64() {
  const candidates = [
    path.join(__dirname, '..', 'public', 'chalo-on-tour-e1766686260447.png'),
    path.join(process.cwd(), 'public', 'chalo-on-tour-e1766686260447.png'),
    path.join(process.cwd(), 'chaloontour_frontend', 'public', 'chalo-on-tour-e1766686260447.png'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      try {
        return 'data:image/png;base64,' + fs.readFileSync(p).toString('base64');
      } catch (_) { }
    }
  }
  return null;
}

function esc(s) {
  if (s == null || s === '') return '–';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(d) {
  if (!d) return '–';
  try {
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch (_) {
    return '–';
  }
}

function formatAmount(n) {
  if (n == null) return '–';
  return 'Rs.' + Number(n).toLocaleString('en-IN') + '/-';
}

const FingerIcon = `<svg viewBox="0 0 24 24" fill="#c62828" width="14" height="14" style="margin-right:8px; flex-shrink:0; margin-top:3px;">
    <path d="M21,7.24a3,3,0,0,0-5.64-1.41l-3.32,6.64A3,3,0,1,1,6.72,9.72L12,4.44l1.41,1.41-5.28,5.28a1,1,0,1,0,1.41,1.41l5.29-5.29A3,3,0,0,1,21,7.24Z" />
    <path d="M18,13a1,1,0,0,1-1-1V8.5a1,1,0,0,1,2,0V12A1,1,0,0,1,18,13Z" />
    <path d="M15,14a1,1,0,0,1-1-1V10.5a1,1,0,0,1,2,0V13A1,1,0,0,1,15,14Z" />
    <path d="M12,15a1,1,0,0,1-1-1V12.5a1,1,0,0,1,2,0V14A1,1,0,0,1,12,15Z" />
</svg>`;

const NamasteIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="50" height="50">
    <path d="M12 2a10 10 0 0 1 10 10c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2z" />
    <path d="M12 6v6l4 2" />
</svg>`;

function buildTourSummaryHtml(lead) {
  const leadId = lead.leadId || lead._id?.toString() || 'lead';
  const logoData = getLogoBase64();
  const logoImg = logoData ? `<img src="${logoData}" alt="Chalo On Tour" class="logo" />` : '';

  const assigned = lead.assigned_to;
  const assignedName = assigned && typeof assigned === 'object'
    ? [assigned.firstName, assigned.lastName].filter(Boolean).join(' ').trim() || assigned.email || '–'
    : 'Mr. Utkarsh Kale';

  const summaryRows = [
    ['01. Total Package Cost', formatAmount(lead.total_amount)],
    ['02. Total No of Pax', [lead.paxCount, lead.paxType].filter(Boolean).join(' ') || '–'],
    ['03. Vehicle Type', lead.vehicleType || '–'],
    ['04. Hotel Category', lead.hotelCategory || '–'],
    ['05. Meal Plan', lead.mealPlan || '–'],
    ['06. Tour Duration', [lead.tourNights != null && `${lead.tourNights} Nights`, lead.tourDays != null && `${lead.tourDays} Days`].filter(Boolean).join(' / ') || '–'],
    ['07. Tour Date', lead.tourStartDate && lead.tourEndDate ? `${formatDate(lead.tourStartDate)} to ${formatDate(lead.tourEndDate)}` : formatDate(lead.travel_date)],
    ['08. Pick up', lead.pickupPoint || '–'],
    ['09. Drop', lead.dropPoint || '–'],
    ['10. Destinations', Array.isArray(lead.destinations) && lead.destinations.length ? esc(lead.destinations.join(', ')) : (lead.destination || '–')],
  ];

  const accRows = Array.isArray(lead.accommodation) && lead.accommodation.length ? lead.accommodation : [];
  const flightRows = Array.isArray(lead.flights) && lead.flights.length ? lead.flights : [];
  const itineraryItems = Array.isArray(lead.itinerary) && lead.itinerary.length ? lead.itinerary : [];

  const mainImageUrl = "https://images.unsplash.com/photo-1594911772125-07fc7a2d8d9f?q=80&w=2070&auto=format&fit=crop";
  const subImageUrl1 = "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?q=80&w=1974&auto=format&fit=crop";
  const subImageUrl2 = "https://images.unsplash.com/photo-1621840212003-7f287e0767ce?q=80&w=2070&auto=format&fit=crop";

  const listLines = (text) => {
    if (!text || !String(text).trim()) return [];
    return String(text).trim().split(/\r?\n/).filter(Boolean).map((line) => line.replace(/^[\s•-➢]+/, '').trim() || line);
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Tour Quotation - ${esc(leadId)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,700&display=swap');
    
    * { box-sizing: border-box; }
    body {
      font-family: 'Times New Roman', serif;
      margin: 0;
      padding: 0;
      background: #fff;
      color: #000;
      -webkit-print-color-adjust: exact;
    }
    .page {
      position: relative;
      width: 210mm;
      min-height: 297mm;
      padding: 12mm;
      margin: 0 auto;
      page-break-after: always;
      overflow: hidden;
    }
    .page-body {
      border: 1.5px solid #000;
      padding: 25px;
      min-height: calc(297mm - 24mm - 2px);
      position: relative;
      z-index: 1;
    }
    .watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-30deg);
      opacity: 0.06;
      z-index: 0;
      width: 550px;
      pointer-events: none;
    }
    .header {
      text-align: center;
      margin-bottom: 25px;
    }
    .logo {
      height: 85px;
      width: auto;
      margin-bottom: 15px;
    }
    .main-title {
      font-family: 'Playfair Display', serif;
      font-size: 30pt;
      color: #c62828;
      font-style: italic;
      margin: 5px 0;
      text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
      font-weight: bold;
    }
    .image-grid {
      display: flex;
      gap: 15px;
      margin-bottom: 30px;
    }
    .main-img-box {
      flex: 2;
      height: 280px;
      background: #eee;
      border: 1px solid #ddd;
      overflow: hidden;
      border-radius: 6px;
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    }
    .sub-imgs-box {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 15px;
    }
    .sub-img-box {
      height: 132px;
      background: #eee;
      border: 1px solid #ddd;
      overflow: hidden;
      border-radius: 6px;
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    }
    img.tour-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .section-header {
      margin: 25px 0 15px;
    }
    .heading-box {
      display: inline-block;
      padding: 10px 35px;
      font-size: 17pt;
      font-weight: bold;
      color: #fff;
      border-radius: 4px;
      text-transform: uppercase;
      box-shadow: 3px 3px 6px rgba(0,0,0,0.15);
      letter-spacing: 0.5px;
    }
    .blue-bg { background-color: #1565c0; }
    .red-bg { background-color: #c62828; }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 25px;
      font-size: 12pt;
    }
    table th, table td {
      border: 1.5px solid #000;
      padding: 12px 14px;
      text-align: left;
    }
    th {
      background: #f8f8f8;
      font-weight: bold;
      text-align: center;
      text-transform: uppercase;
      font-size: 10.5pt;
    }
    .summary-table td:nth-child(1) { width: 55px; text-align: center; }
    .summary-table td:nth-child(2) { width: 45%; font-weight: bold; }
    
    .day-label {
      background: #ffeb3b;
      display: inline-block;
      padding: 6px 18px;
      font-weight: bold;
      margin: 20px 0 12px;
      border: 1.5px solid #000;
      font-size: 12.5pt;
      box-shadow: 2px 2px 0 #000;
    }
    .itinerary-desc {
      margin: 0 0 18px;
      text-align: justify;
      line-height: 1.6;
      font-size: 11.5pt;
    }
    .places-title {
      color: #c62828;
      font-weight: bold;
      margin: 18px 0 10px;
      text-decoration: underline;
      font-size: 12.5pt;
    }
    .places-list {
      list-style: none;
      padding: 0;
      margin: 0 0 25px;
    }
    .place-item {
      display: flex;
      align-items: flex-start;
      margin-bottom: 10px;
      line-height: 1.5;
      font-size: 11.5pt;
    }
    .footer {
      margin-top: 50px;
      padding-top: 30px;
      border-top: 2.5px dashed #bbb;
    }
    .closing-msg {
      color: #1565c0;
      font-weight: bold;
      margin-bottom: 30px;
      font-size: 16pt;
      text-align: center;
      letter-spacing: 0.5px;
      font-style: italic;
    }
    .signature-grid {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding: 0 35px;
    }
    .company-regards {
      font-weight: bold;
      line-height: 1.6;
      text-align: right;
    }
    .company-name-large {
      color: #1565c0;
      font-size: 20pt;
      margin: 5px 0;
      text-decoration: underline;
      font-family: 'Playfair Display', serif;
    }
    @media print {
      .page { margin: 0; padding: 12mm; width: 210mm; }
    }
  </style>
</head>
<body>
  <!-- PAGE 1: IMAGES & TOUR SUMMARY -->
  <div class="page">
    ${logoData ? `<img src="${logoData}" class="watermark" />` : ''}
    <div class="page-body">
      <div class="header">
        ${logoImg}
        <h1 class="main-title">Let's Explore ${esc(lead.destination || 'Beautiful India')}</h1>
      </div>

      <!-- IMAGES AT TOP AS REQUESTED -->
      <div class="image-grid">
        <div class="main-img-box"><img src="${mainImageUrl}" class="tour-img" /></div>
        <div class="sub-imgs-box">
          <div class="sub-img-box"><img src="${subImageUrl1}" class="tour-img" /></div>
          <div class="sub-img-box"><img src="${subImageUrl2}" class="tour-img" /></div>
        </div>
      </div>

      <!-- TOUR SUMMARY BELOW IMAGES -->
      <div class="section-header">
        <div class="heading-box blue-bg">Tour Summary: -</div>
      </div>

      <table class="summary-table">
        <tbody>
          ${summaryRows.map(([label, val], i) => `
            <tr>
              <td>${i + 1 < 10 ? '0' + (i + 1) : i + 1}.</td>
              <td>${esc(label)}</td>
              <td>${esc(val)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  </div>

  <!-- PAGE 2: ACCOMMODATION & FLIGHTS -->
  <div class="page">
    ${logoData ? `<img src="${logoData}" class="watermark" />` : ''}
    <div class="page-body">
      <!-- ACCOMMODATION DETAILS -->
      <div class="section-header">
        <div class="heading-box blue-bg">Accommodation Details: -</div>
      </div>
      ${accRows.length ? `
        <table>
          <thead>
            <tr>
              <th>Sr.No</th>
              <th>Hotel Name</th>
              <th>Night(s)</th>
              <th>Room Category</th>
              <th>Sharing</th>
              <th>Destination</th>
            </tr>
          </thead>
          <tbody>
            ${accRows.map((a, i) => `
              <tr>
                <td style="text-align:center">0${i + 1}.</td>
                <td style="font-weight:bold">${esc(a.hotelName)}</td>
                <td style="text-align:center">${esc(String(a.nights))}</td>
                <td>${esc(a.roomType)}</td>
                <td>${esc(a.sharing)}</td>
                <td>${esc(a.destination)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : `<p style="text-align:center; padding:20px; border:1px dashed #ccc;">No accommodation details selected.</p>`}

      <!-- FLIGHT DETAILS -->
      <div class="section-header" style="margin-top:40px;">
        <div class="heading-box blue-bg">Flight Journey Details: -</div>
      </div>
      ${flightRows.length ? `
        <table>
          <thead>
            <tr>
              <th>Sr.No</th>
              <th>From</th>
              <th>To</th>
              <th>Airline Info</th>
              <th>PNR / Booking</th>
            </tr>
          </thead>
          <tbody>
            ${flightRows.map((f, i) => `
              <tr>
                <td style="text-align:center">0${i + 1}.</td>
                <td>${esc(f.from)}</td>
                <td>${esc(f.to)}</td>
                <td>${esc(f.airline)}</td>
                <td style="text-align:center"><strong>${esc(f.pnr)}</strong></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : `<p style="text-align:center; padding:20px; border:1px dashed #ccc;">No flight details selected.</p>`}
    </div>
  </div>

  <!-- PAGE 3: TOUR ITINERARY START -->
  <div class="page">
    ${logoData ? `<img src="${logoData}" class="watermark" />` : ''}
    <div class="page-body">
      <div class="section-header">
        <div class="heading-box red-bg">Tour Itinerary: -</div>
      </div>

      ${itineraryItems.length ? itineraryItems.slice(0, 3).map((item, i) => `
        <div class="itinerary-content">
          <div class="day-label">
            Day ${item.day || i + 1} :– ${esc(item.route || 'Proceed to Destination')} ${item.date ? '(' + formatDate(item.date) + ')' : ''}
          </div>
          ${item.description ? `<p class="itinerary-desc">${esc(item.description)}</p>` : ''}
          ${Array.isArray(item.places) && item.places.length ? `
            <div class="places-title">Places can be visit: -</div>
            <ul class="places-list">
              ${item.places.map(p => `
                <li class="place-item">
                  ${FingerIcon}
                  <span>${esc(p)}</span>
                </li>
              `).join('')}
            </ul>
          ` : ''}
        </div>
      `).join('') : `<p style="text-align:center; padding:40px; color:#777">Itinerary will be shared shortly.</p>`}
    </div>
  </div>

  <!-- PAGE 4+: ITINERARY CONTINUED & FOOTER -->
  ${itineraryItems.length > 3 || true ? `
  <div class="page">
    ${logoData ? `<img src="${logoData}" class="watermark" />` : ''}
    <div class="page-body">
      ${itineraryItems.slice(3).map((item, i) => `
        <div class="itinerary-content">
          <div class="day-label">
            Day ${item.day || i + 4} :– ${esc(item.route || 'Proceed to Destination')} ${item.date ? '(' + formatDate(item.date) + ')' : ''}
          </div>
          ${item.description ? `<p class="itinerary-desc">${esc(item.description)}</p>` : ''}
          ${Array.isArray(item.places) && item.places.length ? `
            <div class="places-title">Places can be visit: -</div>
            <ul class="places-list">
              ${item.places.map(p => `
                <li class="place-item">
                  ${FingerIcon}
                  <span>${esc(p)}</span>
                </li>
              `).join('')}
            </ul>
          ` : ''}
        </div>
      `).join('')}

      <div class="footer">
        <div class="closing-msg">
          It's time to say goodbye — Phir Milenge!!!
        </div>
        <div class="signature-grid">
          <div class="namaste-box" style="text-align:center">
            ${NamasteIcon}
            <div style="font-size:15pt; color:#2563eb; font-weight:bold; margin-top:10px; letter-spacing:2px">NAMASTE</div>
          </div>
          <div class="company-regards">
            <div>Warm Regards,</div>
            <div class="company-name-large">CHALO ON TOUR</div>
            <div style="font-size:13pt; margin-top:8px">${esc(assignedName)}</div>
            <div style="font-size:12pt; color:#c62828; font-weight:bold; margin-top:5px">Cell: 99606 25167 / 91365 49898</div>
          </div>
        </div>
      </div>
    </div>
  </div>
  ` : ''}
</body>
</html>`;
}

module.exports = { buildTourSummaryHtml, getLogoBase64 };
