const path = require('path');
const fs = require('fs');

function getImageDataUri(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mime = ext === '.png'
    ? 'image/png'
    : ext === '.jpg' || ext === '.jpeg'
      ? 'image/jpeg'
      : 'application/octet-stream';
  return `data:${mime};base64,${fs.readFileSync(filePath).toString('base64')}`;
}

function getLogoBase64() {
  const candidates = [
    path.join(__dirname, '..', 'public', 'Chalo-on-tour.jpg.jpeg'),
    path.join(__dirname, '..', 'public', 'chalo-on-tour-e1766686260447.png'),
    path.join(__dirname, '..', '..', 'chaloontourclient', 'public', 'Chalo-on-tour.jpg.jpeg'),
    path.join(__dirname, '..', '..', 'chaloontourclient', 'public', 'chalo-on-tour-e1766686260447.png'),
    path.join(process.cwd(), 'public', 'Chalo-on-tour.jpg.jpeg'),
    path.join(process.cwd(), 'public', 'chalo-on-tour-e1766686260447.png'),
    path.join(process.cwd(), 'chaloontourclient', 'public', 'Chalo-on-tour.jpg.jpeg'),
    path.join(process.cwd(), 'chaloontourclient', 'public', 'chalo-on-tour-e1766686260447.png'),
    path.join(process.cwd(), '..', 'chaloontourclient', 'public', 'Chalo-on-tour.jpg.jpeg'),
    path.join(process.cwd(), '..', 'chaloontourclient', 'public', 'chalo-on-tour-e1766686260447.png'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      try {
        return getImageDataUri(p);
      } catch (_) {}
    }
  }
  return null;
}

function esc(value) {
  if (value == null || value === '') return '–';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function textOrDash(value) {
  return value != null && String(value).trim() !== '' ? String(value).trim() : '–';
}

function formatDate(value) {
  if (!value) return '–';
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return textOrDash(value);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch (_) {
    return textOrDash(value);
  }
}

function formatAmount(value) {
  if (value == null || value === '') return '—';
  const amount = Number(value);
  if (Number.isNaN(amount)) return textOrDash(value);
  return amount.toLocaleString('en-IN');
}

function formatCurrency(value) {
  if (value == null || value === '') return '–';
  return `Rs. ${formatAmount(value)} /-`;
}

function calculateBalance(totalValue, advanceValue) {
  if (totalValue == null || totalValue === '') return null;
  const total = Number(totalValue);
  const advance = advanceValue == null || advanceValue === '' ? 0 : Number(advanceValue);
  if (Number.isNaN(total) || Number.isNaN(advance)) return null;
  return Math.max(0, total - advance);
}

function buildPaxLabel(lead) {
  if (Array.isArray(lead?.paxBreakup) && lead.paxBreakup.length > 0) {
    return lead.paxBreakup
      .map((item) => [item?.count != null ? item.count : null, item?.type].filter(Boolean).join(' ').trim())
      .filter(Boolean)
      .join(', ');
  }
  if (lead?.paxCount != null && lead?.paxType) {
    return `${lead.paxCount} ${lead.paxType}`.trim();
  }
  if (lead?.paxCount != null) {
    return String(lead.paxCount);
  }
  return '';
}

function buildTourDuration(lead) {
  return [
    lead?.tourNights != null && `${lead.tourNights} Nights`,
    lead?.tourDays != null && `${lead.tourDays} Days`,
  ].filter(Boolean).join(' / ');
}

function buildDestinations(lead) {
  if (Array.isArray(lead?.destinations) && lead.destinations.length > 0) {
    return lead.destinations.filter(Boolean).join(', ');
  }
  return lead?.destination || '';
}

function getTripImages(lead) {
  return Array.isArray(lead?.tripImages) ? lead.tripImages.filter(Boolean).slice(0, 3) : [];
}

function getListItems(value) {
  if (!value || !String(value).trim()) return [];
  return String(value)
    .split(/\r?\n/)
    .map((item) => item.replace(/^[\s•\-➢]+/, '').trim())
    .filter(Boolean);
}

function renderBulletIcon() {
  return `
    <span class="icon-wrapper" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="#c62828" class="bullet-icon" width="16" height="16">
        <path d="M21,7.24a3,3,0,0,0-5.64-1.41l-3.32,6.64A3,3,0,1,1,6.72,9.72L12,4.44l1.41,1.41-5.28,5.28a1,1,0,1,0,1.41,1.41l5.29-5.29A3,3,0,0,1,21,7.24Z" />
        <path d="M18,13a1,1,0,0,1-1-1V8.5a1,1,0,0,1,2,0V12A1,1,0,0,1,18,13Z" />
        <path d="M15,14a1,1,0,0,1-1-1V10.5a1,1,0,0,1,2,0V13A1,1,0,0,1,15,14Z" />
        <path d="M12,15a1,1,0,0,1-1-1V12.5a1,1,0,0,1,2,0V14A1,1,0,0,1,12,15Z" />
      </svg>
    </span>
  `;
}

function renderBulletSection(title, items) {
  if (!items.length) return '';
  return `
    <div class="optional-section">
      <div class="optional-heading">${esc(title)}</div>
      <ul class="optional-list">
        ${items.map((item) => `
          <li class="optional-list-item">
            ${renderBulletIcon()}
            <span>${esc(item)}</span>
          </li>
        `).join('')}
      </ul>
    </div>
  `;
}

function renderImageSection(images) {
  if (!images.length) return '';
  if (images.length === 1) {
    return `
      <div class="image-section">
        <div class="single-image-wrap">
          <img src="${esc(images[0])}" alt="Tour Image" class="tour-img" />
        </div>
      </div>
    `;
  }

  return `
    <div class="image-section">
      <div class="main-image-wrap">
        <img src="${esc(images[0])}" alt="Main Tour Image" class="tour-img" />
      </div>
      <div class="sub-images-grid">
        ${images.slice(1).map((img, index) => `
          <div class="sub-image-wrap">
            <img src="${esc(img)}" alt="Secondary Tour Image ${index + 1}" class="tour-img" />
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderItineraryItems(items, startIndex) {
  if (!items.length) return '';
  return items.map((item, index) => {
    const dayLabel = item?.day != null ? `Day ${item.day}` : `Day ${startIndex + index}`;
    const dayTitle = item?.route || item?.title || '';
    const dayDate = item?.date ? formatDate(item.date) : '';
    const places = Array.isArray(item?.places) ? item.places.filter(Boolean) : [];
    return `
      <div class="itinerary-content">
        <div class="day-label">${esc(dayLabel)} :– ${esc(dayTitle || 'Tour Plan')}${dayDate ? ` (${esc(dayDate)})` : ''}</div>
        ${item?.description ? `<p class="itinerary-desc">${esc(item.description)}</p>` : ''}
        ${places.length ? `
          <div class="places-title">Places to Visit: -</div>
          <ul class="places-list">
            ${places.map((place) => `
              <li class="place-item">
                ${renderBulletIcon()}
                <span>${esc(place)}</span>
              </li>
            `).join('')}
          </ul>
        ` : ''}
      </div>
    `;
  }).join('');
}

function renderHotelPaymentSection(rows) {
  if (!rows.length) return '';
  return `
    <div class="section-header">
      <div class="heading-box blue"><span class="heading-box-text">Hotel Payment Details: -</span></div>
    </div>

    <table class="payment-table">
      <thead>
        <tr>
          <th>Hotel Name</th>
          <th>Advance Payment</th>
          <th>Balance Payment</th>
          <th>Balance Due Date</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map((hotel, index) => {
          const advance = hotel?.hotelPaidAmount;
          const balance = calculateBalance(hotel?.hotelTotalAmount, hotel?.hotelPaidAmount);
          const showRow = hotel?.hotelName || hotel?.destination || advance != null || balance != null || hotel?.hotelBalanceDueDate;
          if (!showRow) return '';
          return `
            <tr>
              <td>${esc(textOrDash(hotel?.hotelName || hotel?.destination || `Hotel ${index + 1}`))}</td>
              <td>${esc(formatCurrency(advance))}</td>
              <td>${esc(formatCurrency(balance))}</td>
              <td>${esc(formatDate(hotel?.hotelBalanceDueDate))}</td>
            </tr>
          `;
        }).join('') || `
          <tr>
            <td colspan="4" class="empty-row">No hotel payment details provided.</td>
          </tr>
        `}
      </tbody>
    </table>
  `;
}

function renderVehiclePaymentSection(rows) {
  if (!rows.length) return '';
  return `
    <div class="section-header">
      <div class="heading-box blue"><span class="heading-box-text">Vehicle Payment Details: -</span></div>
    </div>

    <table class="payment-table">
      <thead>
        <tr>
          <th>Vehicle Name</th>
          <th>Vehicle Type</th>
          <th>Advance Payment Done</th>
          <th>Balance Amount</th>
          <th>Balance Due Date</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map((vehicle, index) => {
          const advance = vehicle?.vehicleAdvanceAmount;
          const balance = calculateBalance(vehicle?.vehicleTotalAmount, vehicle?.vehicleAdvanceAmount);
          const showRow = vehicle?.vehicleName || vehicle?.vehicleType || advance != null || balance != null || vehicle?.vehicleBalanceDueDate;
          if (!showRow) return '';
          return `
            <tr>
              <td>${esc(textOrDash(vehicle?.vehicleName || `Vehicle ${index + 1}`))}</td>
              <td>${esc(textOrDash(vehicle?.vehicleType))}</td>
              <td>${esc(formatCurrency(advance))}</td>
              <td>${esc(formatCurrency(balance))}</td>
              <td>${esc(formatDate(vehicle?.vehicleBalanceDueDate))}</td>
            </tr>
          `;
        }).join('') || `
          <tr>
            <td colspan="5" class="empty-row">No vehicle payment details provided.</td>
          </tr>
        `}
      </tbody>
    </table>
  `;
}

function buildTourSummaryHtml(lead) {
  const leadId = lead.leadId || lead._id?.toString() || 'lead';
  const logoData = getLogoBase64();
  const logoImg = logoData ? `<img src="${logoData}" alt="Chalo On Tour" class="logo-img" />` : '';
  const watermark = logoData ? `<img src="${logoData}" alt="" class="watermark" />` : '';
  const tripImages = getTripImages(lead);
  const destinations = buildDestinations(lead);
  const tripTitle = destinations ? `Let's Explore ${destinations}` : "Let's Explore Your Trip";
  const totalPax = buildPaxLabel(lead);
  const summaryRows = [
    ['Per Person Cost', `Rs. ${formatAmount(lead.packageCostPerPerson != null ? lead.packageCostPerPerson : lead.total_amount)} /- Per Person`],
    ['Total No. of Pax', totalPax ? `Approx. ${totalPax}` : 'Approx. —'],
    ['Vehicle Type', textOrDash(lead.vehicleType)],
    ['Hotel Category', textOrDash(lead.hotelCategory)],
    ['Meal Plan', textOrDash(lead.mealPlan)],
    ['Tour Duration', textOrDash(buildTourDuration(lead))],
    ['Tour Date', lead.tourStartDate || lead.tourEndDate ? `${formatDate(lead.tourStartDate || lead.travel_date)} to ${formatDate(lead.tourEndDate || lead.travel_date)}` : formatDate(lead.travel_date)],
    ['Pick up', textOrDash(lead.pickupPoint)],
    ['Drop', textOrDash(lead.dropPoint)],
    ['Destinations', textOrDash(destinations)],
  ];

  const accRows = Array.isArray(lead.accommodation) ? lead.accommodation : [];
  const vehicleRows = Array.isArray(lead.vehicles) ? lead.vehicles : [];
  const flightRows = Array.isArray(lead.flights) ? lead.flights : [];
  const itineraryItems = Array.isArray(lead.itinerary) ? lead.itinerary : [];
  const itineraryStart = itineraryItems.slice(0, 3);
  const itineraryRemaining = itineraryItems.slice(3);
  const hasExtraSections = (
    itineraryRemaining.length > 0
    || getListItems(lead.inclusions).length > 0
    || getListItems(lead.exclusions).length > 0
    || getListItems(lead.payment_policy).length > 0
    || getListItems(lead.cancellation_policy).length > 0
    || getListItems(lead.termsAndConditions).length > 0
    || (lead.memorableTrip && String(lead.memorableTrip).trim())
  );
  const assigned = lead.assigned_to;
  const assignedName = assigned && typeof assigned === 'object'
    ? [assigned.firstName, assigned.lastName].filter(Boolean).join(' ').trim() || assigned.email || 'Mr. Utkarsh Kale (C.E.O.)'
    : 'Mr. Utkarsh Kale (C.E.O.)';
  const footerHtml = `
    <div class="footer">
      <p class="text-blue" style="font-weight:700;">Thank You</p>
      <p class="footer-note">
        Let's stay connected via email, phone, WhatsApp, Facebook, Instagram, and more. We look forward to seeing you again on another memorable Chalo On Tour Trip.
      </p>
      <div style="height: 32px;"></div>
      <div class="company-info-footer">
        <div class="regards">Thanks &amp; Regards</div>
        <div class="company-link">CHALO ON TOUR</div>
        <div class="ceo-name">${esc(assignedName)}</div>
        <div class="contact-line">Cell: - 9960625167 / 9136549898</div>
        <div class="contact-line">Mail ID: - <span class="contact-link">bookings@chaloontour.com</span></div>
        <div class="contact-line">Website: - <span class="contact-link">www.chaloontour.com</span></div>
      </div>
    </div>
  `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Tour Quotation - ${esc(leadId)}</title>
  <style>
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #000000;
      font-family: "Times New Roman", Times, serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      font-size: 11pt;
    }
    .pdf-root {
      width: 210mm;
      margin: 0 auto;
      background: #ffffff;
    }
    .page {
      position: relative;
      width: 210mm;
      min-height: 297mm;
      padding: 10px 12px;
      box-sizing: border-box;
      background: #ffffff;
      // page-break-after: always;
      break-after: page;
      overflow: hidden;
    }
    .page:last-child {
      // page-break-after: auto;
      break-after: auto;
    }
    .page-body {
      border: none;
      height: 100%;
      min-height: calc(297mm - 20px);
      padding: 0;
      position: relative;
      z-index: 1;
    }
    .watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-30deg);
      opacity: 0.08;
      z-index: 0;
      width: 400px;
      pointer-events: none;
      user-select: none;
    }
    .header {
      text-align: center;
      margin-bottom: 12px;
    }
    .logo-box {
      display: flex;
      justify-content: center;
      margin-bottom: 4px;
    }
    .logo-img {
      max-width: 220px;
      height: auto;
    }
    .main-title {
      color: #c62828;
      font-size: 22pt;
      font-weight: 700;
      font-style: italic;
      margin: 4px 0 0;
      line-height: 1.25;
      text-align: center;
    }
    .image-section {
      margin-bottom: 14px;
    }
    .single-image-wrap,
    .main-image-wrap,
    .sub-image-wrap {
      border: 1px solid #dddddd;
      border-radius: 8px;
      overflow: hidden;
    }
    .single-image-wrap {
      width: 100%;
      height: 320px;
      margin-bottom: 10px;
    }
    .main-image-wrap {
      width: 100%;
      height: 300px;
      margin-bottom: 10px;
    }
    .sub-images-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    .sub-image-wrap {
      height: 180px;
    }
    .tour-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .section-header {
      display: flex;
      justify-content: center;
      margin: 16px 0 10px;
    }
    .section-header.left {
      justify-content: flex-start;
    }
    .heading-box {
      display: inline-flex;
      min-width: 210px;
      max-width: 100%;
      min-height: 44px;
      padding: 10px 24px;
      font-size: 14pt;
      font-weight: 700;
      color: #ffffff;
      border-radius: 4px;
      box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.1);
      text-transform: uppercase;
      letter-spacing: 1px;
      text-align: center;
      align-items: center;
      justify-content: center;
      line-height: 1.2;
      vertical-align: middle;
      white-space: nowrap;
    }
    .heading-box-text {
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 1.2;
    }
    .heading-box.blue {
      background-color: #1565c0;
    }
    .heading-box.red {
      background-color: #c62828;
    }
    table {
      width: 100%;
      table-layout: fixed;
      border-collapse: collapse;
      margin-bottom: 12px;
      border: 2px solid #000000;
      background: #ffffff;
    }
    th, td {
      border: 1px solid #000000;
      padding: 6px 8px;
      text-align: left;
      vertical-align: top;
      font-size: 9.5pt;
      line-height: 1.45;
      word-break: break-word;
    }
    th {
      background: #f5f5f5;
      text-align: center;
      font-weight: 700;
    }
    .summary-table td:first-child {
      width: 8%;
      text-align: center;
    }
    .summary-table td:nth-child(2) {
      width: 34%;
      font-weight: 700;
    }
    .summary-table td:nth-child(3) {
      width: 58%;
    }
    .accommodation-table th:nth-child(1),
    .accommodation-table td:nth-child(1) { width: 9%; text-align: center; }
    .accommodation-table th:nth-child(2),
    .accommodation-table td:nth-child(2) { width: 24%; }
    .accommodation-table th:nth-child(3),
    .accommodation-table td:nth-child(3) { width: 16%; }
    .accommodation-table th:nth-child(4),
    .accommodation-table td:nth-child(4) { width: 19%; }
    .accommodation-table th:nth-child(5),
    .accommodation-table td:nth-child(5) { width: 17%; }
    .accommodation-table th:nth-child(6),
    .accommodation-table td:nth-child(6) { width: 15%; }
    .flight-table th:nth-child(1),
    .flight-table td:nth-child(1) { width: 9%; text-align: center; }
    .flight-table th:nth-child(2),
    .flight-table td:nth-child(2) { width: 28%; }
    .flight-table th:nth-child(3),
    .flight-table td:nth-child(3) { width: 28%; }
    .flight-table th:nth-child(4),
    .flight-table td:nth-child(4) { width: 20%; }
    .flight-table th:nth-child(5),
    .flight-table td:nth-child(5) { width: 15%; }
    .payment-table th,
    .payment-table td {
      font-size: 9pt;
    }
    .empty-row {
      text-align: center;
      color: #666666;
    }
    .note-box {
      margin-top: 8px;
      margin-bottom: 18px;
      font-size: 10pt;
      font-style: italic;
      line-height: 1.45;
    }
    .itinerary-content {
      margin-bottom: 15px;
      line-height: 1.5;
    }
    .day-label {
      display: inline-flex;
      background: #ffeb3b;
      font-weight: 700;
      height: 34px;
      padding: 0 10px;
      margin-bottom: 5px;
      line-height: 1;
      align-items: center;
      justify-content: center;
      text-align: center;
      vertical-align: middle;
    }
    .itinerary-desc {
      margin: 0 0 10px;
      font-size: 10.5pt;
      line-height: 1.5;
      text-align: justify;
    }
    .places-title,
    .optional-heading {
      color: #c62828;
      font-weight: 700;
      text-decoration: underline;
      margin-top: 10px;
      margin-bottom: 6px;
      font-size: 12pt;
    }
    .places-list,
    .optional-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .place-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 6px;
      font-size: 10.5pt;
      line-height: 1.4;
    }
    .optional-list-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      margin-bottom: 6px;
      font-size: 10.5pt;
      line-height: 1.4;
    }
    .bullet-icon {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
      margin-top: 2px;
    }
    .icon-wrapper {
      width: 18px;
      height: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .optional-section {
      margin-top: 18px;
    }
    .memorable-trip-box {
      margin-top: 20px;
      padding: 12px 14px;
      border: 1px solid #1565c0;
      background: #f4f8ff;
    }
    .memorable-trip-heading {
      color: #1565c0;
      font-weight: 700;
      font-size: 12pt;
      margin-bottom: 6px;
    }
    .memorable-trip-text {
      margin: 0;
      font-size: 10.5pt;
      line-height: 1.5;
    }
    .footer {
      margin-top: 30px;
      text-align: left;
    }
    .footer-note {
      text-align: left;
      font-size: 9pt;
      margin-bottom: 20px;
      font-style: italic;
    }
    .text-blue {
      color: #1565c0;
    }
    .company-info-footer {
      text-align: left;
    }
    .regards {
      font-weight: 700;
    }
    .company-link {
      color: #0d47a1;
      font-weight: 700;
      text-decoration: underline;
      font-size: 13pt;
    }
    .ceo-name {
      margin-top: 5px;
      font-weight: 700;
    }
    .contact-line {
      margin-top: 4px;
      color: #c62828;
      font-weight: 700;
    }
    .contact-link {
      color: #0d47a1;
      text-decoration: underline;
    }
    .pnr-cell {
      font-weight: 700;
    }
    @page {
      size: A4;
      margin: 0;
    }
  </style>
</head>
<body>
  <div class="pdf-root">
    <section class="page">
      ${watermark}
      <div class="page-body">
        <div class="header">
          <div class="logo-box">${logoImg}</div>
          <h1 class="main-title">${esc(tripTitle)}</h1>
        </div>

        ${renderImageSection(tripImages)}

        <div class="section-header">
          <div class="heading-box blue"><span class="heading-box-text">Tour Summary: -</span></div>
        </div>

        <table class="summary-table">
          <tbody>
            ${summaryRows.map(([label, value], index) => `
              <tr>
                <td>${String(index + 1).padStart(2, '0')}.</td>
                <td>${esc(label)}</td>
                <td>${esc(value)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </section>

    <section class="page">
      ${watermark}
      <div class="page-body">
        <div class="section-header">
          <div class="heading-box blue"><span class="heading-box-text">Accommodation: -</span></div>
        </div>

        <table class="accommodation-table">
          <thead>
            <tr>
              <th>Sr.No</th>
              <th>Hotel Name</th>
              <th>No. of Nights</th>
              <th>Room Category</th>
              <th>Room Sharing</th>
              <th>Destination</th>
            </tr>
          </thead>
          <tbody>
            ${accRows.length ? accRows.map((hotel, index) => `
              <tr>
                <td style="text-align:center">${String(index + 1).padStart(2, '0')}.</td>
                <td>${esc(textOrDash(hotel?.hotelName))}</td>
                <td>${esc(hotel?.nights != null ? `${hotel.nights} Night${Number(hotel.nights) === 1 ? '' : 's'}` : '–')}</td>
                <td>${esc(textOrDash(hotel?.roomType))}</td>
                <td>${esc(textOrDash(hotel?.sharing))}</td>
                <td>${esc(textOrDash(hotel?.destination))}</td>
              </tr>
            `).join('') : `
              <tr>
                <td colspan="6" class="empty-row">No accommodation details provided.</td>
              </tr>
            `}
          </tbody>
        </table>

        ${renderHotelPaymentSection(accRows)}

        ${renderVehiclePaymentSection(vehicleRows)}

        <div class="section-header">
          <div class="heading-box blue"><span class="heading-box-text">Flight Details: -</span></div>
        </div>

        <table class="flight-table">
          <thead>
            <tr>
              <th>Sr.No</th>
              <th>From</th>
              <th>To</th>
              <th>Airline</th>
              <th>PNR Details</th>
            </tr>
          </thead>
          <tbody>
            ${flightRows.length ? flightRows.map((flight, index) => `
              <tr>
                <td style="text-align:center">${String(index + 1).padStart(2, '0')}.</td>
                <td>${esc([flight?.from, flight?.depDate ? formatDate(flight.depDate) : '', textOrDash(flight?.depTime) !== '–' ? flight.depTime : ''].filter(Boolean).join(' ').trim() || textOrDash(flight?.from))}</td>
                <td>${esc([flight?.to, flight?.arrDate ? formatDate(flight.arrDate) : '', textOrDash(flight?.arrTime) !== '–' ? flight.arrTime : ''].filter(Boolean).join(' ').trim() || textOrDash(flight?.to))}</td>
                <td>${esc([flight?.airline, flight?.flightNo].filter(Boolean).join(' ').trim() || textOrDash(flight?.airline))}</td>
                <td class="pnr-cell">${esc(textOrDash(flight?.pnr))}</td>
              </tr>
            `).join('') : `
              <tr>
                <td colspan="5" class="empty-row">No flight details provided.</td>
              </tr>
            `}
          </tbody>
        </table>

        <div class="section-header left">
          <div class="heading-box red"><span class="heading-box-text">Tour Itinerary: -</span></div>
        </div>

        ${itineraryStart.length
          ? renderItineraryItems(itineraryStart, 1)
          : '<p class="itinerary-desc">Itinerary will be shared shortly.</p>'}
        ${hasExtraSections ? '' : footerHtml}
      </div>
    </section>

    ${hasExtraSections ? `
    <section class="page">
      ${watermark}
      <div class="page-body">
        ${renderItineraryItems(itineraryRemaining, 4)}

        ${renderBulletSection('Package Inclusions', getListItems(lead.inclusions))}
        ${renderBulletSection('Package Exclusions', getListItems(lead.exclusions))}
        ${renderBulletSection('Payment Policy', getListItems(lead.payment_policy))}
        ${renderBulletSection('Cancellation Policy', getListItems(lead.cancellation_policy))}
        ${renderBulletSection('Terms And Conditions', getListItems(lead.termsAndConditions))}

        ${lead.memorableTrip && String(lead.memorableTrip).trim() ? `
          <div class="memorable-trip-box">
            <div class="memorable-trip-heading">Tip For Memorable Trip</div>
            <p class="memorable-trip-text">${esc(String(lead.memorableTrip).trim())}</p>
          </div>
        ` : ''}
        ${footerHtml}
      </div>
    </section>
    ` : ''}
  </div>
</body>
</html>`;
}

module.exports = { buildTourSummaryHtml, getLogoBase64 };
