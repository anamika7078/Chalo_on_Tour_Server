const puppeteer = require('puppeteer');
const { buildTourSummaryHtml } = require('./tourSummaryHtml');

async function launchBrowser() {
  return puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
    ],
  });
}

async function buildTourSummaryPdf(lead, res) {
  const html = buildTourSummaryHtml(lead);
  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: '0',
        right: '0',
        bottom: '0',
        left: '0',
      },
    });

    const leadId = lead?.leadId || lead?._id?.toString?.() || 'lead';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="tour-summary-${leadId}.pdf"`);
    res.send(pdfBuffer);
  } finally {
    await browser.close();
  }
}

module.exports = { buildTourSummaryPdf };
