const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const { body, validationResult, query } = require('express-validator');
const Lead = require('../models/Lead');
const { auth, checkModulePermission, requireSuperadmin } = require('../middleware/auth');
const { buildTourSummaryPdf } = require('../lib/tourSummaryPdf');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const VALID_STATUSES = ['new', 'contacted', 'qualified', 'booked', 'lost'];

function getLeadFilter(req) {
  const filter = {};
  if (req.user.role === 'staff') {
    filter.assigned_to = req.user.id;
  }
  return filter;
}

router.get('/', auth, checkModulePermission(), [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 500 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const filter = getLeadFilter(req);
    if (req.query.status) filter.status = req.query.status;
    if (req.query.source) filter.source = req.query.source;
    if (req.query.startDate || req.query.endDate) {
      filter.createdAt = {};
      if (req.query.startDate) filter.createdAt.$gte = new Date(req.query.startDate);
      if (req.query.endDate) { const d = new Date(req.query.endDate); d.setHours(23, 59, 59, 999); filter.createdAt.$lte = d; }
    }
    if (req.query.missed === '1') {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      filter.followups = { $elemMatch: { date: { $lt: startOfToday } } };
    }
    if (req.query.search) {
      const raw = req.query.search.trim();
      const words = raw.split(/\s+/).filter(Boolean);
      const escapeRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const fields = ['name', 'email', 'phone', 'leadId'];
      if (words.length === 1) {
        const term = escapeRe(words[0]);
        if (term) filter.$or = fields.map((f) => ({ [f]: new RegExp(term, 'i') }));
      } else if (words.length > 1) {
        filter.$and = words.map((word) => ({
          $or: fields.map((f) => ({ [f]: new RegExp(escapeRe(word), 'i') }))
        }));
      }
    }
    const sortOrder = req.query.recent === '1' ? '-updatedAt' : '-createdAt';
    const leads = await Lead.find(filter).sort(sortOrder).skip(skip).limit(limit).populate('assigned_to', 'firstName lastName email').lean();
    const total = await Lead.countDocuments(filter);
    res.json({ leads, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/recent-activity', auth, checkModulePermission(), async (req, res) => {
  try {
    const filter = getLeadFilter(req);
    const limit = Math.min(parseInt(req.query.limit) || 15, 25);
    const activities = await Lead.find(filter)
      .sort('-updatedAt')
      .limit(limit)
      .populate('assigned_to', 'firstName lastName')
      .select('leadId name status updatedAt createdAt assigned_to')
      .lean();
    res.json({ activities });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/analytics/dashboard-metrics', auth, checkModulePermission(), async (req, res) => {
  try {
    const filter = getLeadFilter(req);
    if (req.query.source) filter.source = req.query.source;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.startDate || req.query.endDate) {
      filter.createdAt = {};
      if (req.query.startDate) filter.createdAt.$gte = new Date(req.query.startDate);
      if (req.query.endDate) {
        const endDate = new Date(req.query.endDate);
        endDate.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = endDate;
      }
    }
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

    const activeStatuses = ['new', 'contacted', 'qualified'];
    const todaysFollowUpsFilter = { ...filter, followups: { $elemMatch: { date: { $gte: startOfToday, $lte: endOfToday } } } };
    const missedFollowUpsFilter = { ...filter, status: { $in: activeStatuses }, followups: { $elemMatch: { date: { $lt: startOfToday } } } };

    const [statusCounts, totalLeads, newToday, newThisMonth, bookedCount, todaysFollowUpsCount, missedFollowUpsCount] = await Promise.all([
      Lead.aggregate([{ $match: filter }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      Lead.countDocuments(filter),
      Lead.countDocuments({ ...filter, createdAt: { $gte: startOfToday, $lte: endOfToday } }),
      Lead.countDocuments({ ...filter, createdAt: { $gte: startOfMonth } }),
      Lead.countDocuments({ ...filter, status: 'booked' }),
      Lead.countDocuments(todaysFollowUpsFilter),
      Lead.countDocuments(missedFollowUpsFilter)
    ]);
    const countsMap = {};
    statusCounts.forEach(s => { countsMap[s._id] = s.count; });
    const conversionRate = totalLeads > 0 ? ((bookedCount / totalLeads) * 100).toFixed(2) : 0;

    res.json({
      metrics: {
        totalLeads,
        newLeadsToday: newToday,
        newLeadsThisMonth: newThisMonth,
        conversionRate,
        missedFollowUps: missedFollowUpsCount,
        statusCounts: countsMap,
        todaysFollowUps: { total: todaysFollowUpsCount, completed: 0, pending: todaysFollowUpsCount, completionRate: todaysFollowUpsCount > 0 ? 0 : 100 }
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/upload', auth, requireSuperadmin(), upload.single('file'), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) return res.status(400).json({ message: 'No file uploaded' });
    const ext = (req.file.originalname || '').toLowerCase().split('.').pop();
    let rows = [];
    if (ext === 'csv') {
      const csv = req.file.buffer.toString('utf8');
      const lines = csv.split(/\r?\n/).filter(Boolean);
      const header = lines[0].split(',').map(h => (h || '').trim().toLowerCase().replace(/\s/g, '_'));
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => (v || '').trim());
        const row = {};
        header.forEach((h, j) => { row[h] = values[j] || ''; });
        rows.push(row);
      }
    } else if (ext === 'xlsx' || ext === 'xls') {
      const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
      const firstSheet = wb.SheetNames[0];
      const ws = wb.Sheets[firstSheet];
      rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
      rows = rows.map(r => {
        const out = {};
        for (const [k, v] of Object.entries(r)) {
          const key = String(k).toLowerCase().trim().replace(/\s/g, '_');
          out[key] = v != null ? String(v).trim() : '';
        }
        return out;
      });
    } else {
      return res.status(400).json({ message: 'Only .xlsx or .csv files are allowed' });
    }
    const required = ['name', 'phone', 'email'];
    const statusMap = { new: 'new', contacted: 'contacted', qualified: 'qualified', booked: 'booked', lost: 'lost' };
    const created = [];
    const errors = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const name = (r.name || '').trim();
      const phone = (r.phone || '').trim();
      const email = (r.email || '').trim().toLowerCase();
      const destination = (r.destination || '').trim();
      const travelDateRaw = r.travel_date || r.traveldate || '';
      const travel_date = travelDateRaw && !isNaN(Date.parse(travelDateRaw)) ? new Date(travelDateRaw) : undefined;
      const budgetRaw = r.budget;
      const budget = budgetRaw != null && budgetRaw !== '' ? String(budgetRaw).trim() : undefined;
      const missing = required.filter(f => {
        if (f === 'name') return !name;
        if (f === 'phone') return !phone;
        if (f === 'email') return !email;
        return false;
      });
      if (missing.length) {
        errors.push({ row: i + 1, error: `Missing required: ${missing.join(', ')}` });
        continue;
      }
      const statusRaw = (r.status || 'new').toString().toLowerCase().trim().replace(/\s+/g, '_');
      const status = statusMap[statusRaw] || statusMap[statusRaw.replace(/_/g, '')] || 'new';
      const notes = (r.notes || '').trim() || undefined;
      const packageCost = r.package_cost != null && r.package_cost !== '' ? Number(r.package_cost) : undefined;
      const total_amount = Number.isFinite(packageCost) ? packageCost : undefined;
      const noOfPax = r.no_of_pax != null && r.no_of_pax !== '' ? Number(r.no_of_pax) : undefined;
      const paxCount = Number.isFinite(noOfPax) && noOfPax > 0 ? noOfPax : undefined;
      const paxType = (r.pax_type || '').trim() || undefined;
      const vehicleType = (r.vehicle_type || '').trim() || undefined;
      const hotelCategory = (r.hotel_category || '').trim() || undefined;
      const mealPlan = (r.meal_plan || '').trim() || undefined;
      const tourNightsRaw = r.tour_nights;
      const tourNights = tourNightsRaw != null && tourNightsRaw !== '' && Number(tourNightsRaw) >= 0 ? Number(tourNightsRaw) : undefined;
      const tourDaysRaw = r.tour_days;
      const tourDays = tourDaysRaw != null && tourDaysRaw !== '' && Number(tourDaysRaw) >= 0 ? Number(tourDaysRaw) : undefined;
      const tourStartRaw = r.tour_start_date || '';
      const tourStartDate = tourStartRaw && !isNaN(Date.parse(tourStartRaw)) ? new Date(tourStartRaw) : undefined;
      const tourEndRaw = r.tour_end_date || '';
      const tourEndDate = tourEndRaw && !isNaN(Date.parse(tourEndRaw)) ? new Date(tourEndRaw) : undefined;
      const pickupPoint = (r.pick_up || '').trim() || undefined;
      const dropPoint = (r.drop || '').trim() || undefined;
      const destinationsStr = (r.destinations || '').trim();
      const destinations = destinationsStr ? destinationsStr.split(',').map(s => s.trim()).filter(Boolean) : undefined;
      const inclusions = (r.package_inclusions || '').trim() || undefined;
      const exclusions = (r.package_exclusions || '').trim() || undefined;
      const payment_policy = (r.payment_policy || '').trim() || undefined;
      const cancellation_policy = (r.cancellation_policy || '').trim() || undefined;
      try {
        const lead = new Lead({
          name,
          phone,
          email,
          destination: destination || undefined,
          travel_date,
          budget: budget || undefined,
          status,
          source: 'excel',
          notes,
          total_amount,
          paxCount,
          paxType,
          vehicleType,
          hotelCategory,
          mealPlan,
          tourNights,
          tourDays,
          tourStartDate,
          tourEndDate,
          pickupPoint,
          dropPoint,
          destinations,
          inclusions,
          exclusions,
          payment_policy,
          cancellation_policy
        });
        await lead.save();
        created.push(lead._id);
      } catch (e) {
        errors.push({ row: i + 1, error: e.message || 'Failed to create lead' });
      }
    }
    res.status(201).json({
      message: `Created ${created.length} of ${rows.length} leads`,
      created: created.length,
      failed: errors.length,
      total: rows.length,
      errors: errors.length ? errors : undefined
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Server error' });
  }
});

  /** Reminders: upcoming follow-ups + payment-pending leads + upcoming trip reminders. */
router.get('/reminders', auth, checkModulePermission(), async (req, res) => {
  try {
    const filter = getLeadFilter(req);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const daysAhead = parseInt(req.query.days) || 30;
    const endDate = new Date(todayStart);
    endDate.setDate(endDate.getDate() + daysAhead);

    const leads = await Lead.find(filter)
      .select('leadId name destination followups total_amount advance_amount remaining_amount payment_status reminderDate travel_date tourStartDate')
      .lean();
    const followupReminders = [];
    const paymentReminders = [];
    const tripReminders = [];

    for (const lead of leads) {
      if (lead.followups && lead.followups.length) {
        for (const fu of lead.followups) {
          const d = new Date(fu.date);
          d.setHours(0, 0, 0, 0);
          if (d >= todayStart && d <= endDate) {
            followupReminders.push({
              date: fu.date,
              note: fu.note || '',
              leadId: lead._id,
              leadCode: lead.leadId,
              leadName: lead.name,
              destination: lead.destination
            });
          }
        }
      }
      // Trip reminder based on reminderDate within selected window
      if (lead.reminderDate) {
        const rd = new Date(lead.reminderDate);
        rd.setHours(0, 0, 0, 0);
        if (rd >= todayStart && rd <= endDate) {
          const tripDate = lead.travel_date || lead.tourStartDate || null;
          tripReminders.push({
            date: lead.reminderDate,
            tripDate,
            leadId: lead._id,
            leadCode: lead.leadId,
            leadName: lead.name,
            destination: lead.destination,
            total_amount: lead.total_amount,
            advance_amount: lead.advance_amount,
            remaining_amount: lead.remaining_amount
          });
        }
      }
      const isPaymentPending = lead.payment_status !== 'paid' || (Number(lead.remaining_amount) > 0);
      if (isPaymentPending && (lead.total_amount > 0 || lead.advance_amount > 0)) {
        paymentReminders.push({
          leadId: lead._id,
          leadCode: lead.leadId,
          leadName: lead.name,
          total_amount: lead.total_amount,
          advance_amount: lead.advance_amount,
          remaining_amount: lead.remaining_amount,
          payment_status: lead.payment_status
        });
      }
    }

    followupReminders.sort((a, b) => new Date(a.date) - new Date(b.date));
    tripReminders.sort((a, b) => new Date(a.date) - new Date(b.date));
    res.json({ followupReminders, paymentReminders, tripReminders });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

/** Distinct destinations for trip plans filter (leads with travel_date only). */
router.get('/trips/destinations', auth, checkModulePermission(), async (req, res) => {
  try {
    const filter = getLeadFilter(req);
    filter.travel_date = { $exists: true, $ne: null };
    filter.destination = { $exists: true, $nin: [null, ''] };
    const list = await Lead.distinct('destination', filter);
    const destinations = list.map((d) => (d || '').trim()).filter(Boolean).sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
    res.json({ destinations });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

/** Trip plans: all leads with travel_date, sorted by travel_date. */
router.get('/trips', auth, checkModulePermission(), [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 200 })
], async (req, res) => {
  try {
    const filter = getLeadFilter(req);
    filter.travel_date = { $exists: true, $ne: null };
    if (req.query.from) filter.travel_date = { ...filter.travel_date, $gte: new Date(req.query.from) };
    if (req.query.to) {
      const to = new Date(req.query.to);
      to.setHours(23, 59, 59, 999);
      filter.travel_date = { ...filter.travel_date, $lte: to };
    }
    if (req.query.destination && String(req.query.destination).trim()) {
      const dest = String(req.query.destination).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.destination = { $regex: new RegExp('^' + dest + '$', 'i') };
    }
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    const [trips, total] = await Promise.all([
      Lead.find(filter).sort({ travel_date: 1 }).skip(skip).limit(limit).populate('assigned_to', 'firstName lastName email').lean(),
      Lead.countDocuments(filter)
    ]);
    res.json({ trips, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:id', auth, checkModulePermission(), async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id).populate('assigned_to', 'firstName lastName email').lean();
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    const assignedId = lead.assigned_to && (lead.assigned_to._id ? lead.assigned_to._id.toString() : lead.assigned_to.toString());
    if (req.user.role === 'staff' && assignedId !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    res.json({ lead });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

/** GET /leads/:id/tour-summary-pdf — stream PDF of tour summary for the lead (HTML/CSS via Puppeteer) */
router.get('/:id/tour-summary-pdf', auth, checkModulePermission(), async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id).populate('assigned_to', 'firstName lastName email').lean();
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    const assignedId = lead.assigned_to && (lead.assigned_to._id ? lead.assigned_to._id.toString() : lead.assigned_to.toString());
    if (req.user.role === 'staff' && assignedId !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    await buildTourSummaryPdf(lead, res);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', auth, requireSuperadmin(), [
  body('name').trim().notEmpty(),
  body('email').isEmail(),
  body('phone').trim().notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    const status = VALID_STATUSES.includes((req.body.status || '').toLowerCase()) ? req.body.status.toLowerCase() : 'new';
    const lead = new Lead({
      name: req.body.name.trim(),
      phone: req.body.phone.trim(),
      email: req.body.email.trim().toLowerCase(),
      destination: req.body.destination?.trim() || undefined,
      travel_date: req.body.travel_date ? new Date(req.body.travel_date) : undefined,
      budget: req.body.budget?.trim() || undefined,
      status,
      assigned_to: req.body.assigned_to || undefined,
      total_amount: Number(req.body.total_amount) || 0,
      advance_amount: Number(req.body.advance_amount) || 0,
      payment_status: ['unpaid', 'partial', 'paid'].includes(req.body.payment_status) ? req.body.payment_status : 'unpaid',
      source: 'manual',
      notes: req.body.notes?.trim() || '',
      paxCount: req.body.paxCount != null ? Number(req.body.paxCount) : undefined,
      paxType: req.body.paxType?.trim() || undefined,
      vehicleType: req.body.vehicleType?.trim() || undefined,
      hotelCategory: req.body.hotelCategory?.trim() || undefined,
      mealPlan: req.body.mealPlan?.trim() || undefined,
      tourNights: req.body.tourNights != null ? Number(req.body.tourNights) : undefined,
      tourDays: req.body.tourDays != null ? Number(req.body.tourDays) : undefined,
      tourStartDate: req.body.tourStartDate ? new Date(req.body.tourStartDate) : undefined,
      tourEndDate: req.body.tourEndDate ? new Date(req.body.tourEndDate) : undefined,
      pickupPoint: req.body.pickupPoint?.trim() || undefined,
      dropPoint: req.body.dropPoint?.trim() || undefined,
      destinations: Array.isArray(req.body.destinations) ? req.body.destinations.map((d) => String(d).trim()).filter(Boolean) : undefined,
      accommodation: Array.isArray(req.body.accommodation) ? req.body.accommodation.map((a) => ({
        hotelName: (a.hotelName || '').trim() || '',
        nights: a.nights != null && a.nights !== '' ? Number(a.nights) : null,
        roomType: (a.roomType || '').trim() || '',
        sharing: (a.sharing || '').trim() || '',
        destination: (a.destination || '').trim() || '',
        hotelTotalAmount: a.hotelTotalAmount != null && a.hotelTotalAmount !== '' ? Number(a.hotelTotalAmount) : null,
        hotelPaidAmount: a.hotelPaidAmount != null && a.hotelPaidAmount !== '' ? Number(a.hotelPaidAmount) : null
      })).filter((a) => a.hotelName || a.destination) : undefined,
      flights: Array.isArray(req.body.flights) ? req.body.flights.map((f) => ({
        from: (f.from || '').trim() || '',
        to: (f.to || '').trim() || '',
        airline: (f.airline || '').trim() || '',
        pnr: (f.pnr || '').trim() || ''
      })).filter((f) => f.from || f.to || f.airline || f.pnr) : undefined,
      itinerary: Array.isArray(req.body.itinerary) ? req.body.itinerary.map((item) => ({
        day: item.day != null && item.day !== '' ? Number(item.day) : null,
        route: (item.route || '').trim() || '',
        places: Array.isArray(item.places) ? item.places.map((p) => String(p).trim()).filter(Boolean) : []
      })).filter((item) => item.day != null || item.route || (item.places && item.places.length)) : undefined,
      inclusions: req.body.inclusions != null ? String(req.body.inclusions).trim() : undefined,
      exclusions: req.body.exclusions != null ? String(req.body.exclusions).trim() : undefined,
      payment_policy: req.body.payment_policy != null ? String(req.body.payment_policy).trim() : undefined,
      cancellation_policy: req.body.cancellation_policy != null ? String(req.body.cancellation_policy).trim() : undefined
    });
    await lead.save();
    const leadObj = await Lead.findById(lead._id).populate('assigned_to', 'firstName lastName email').lean();
    res.status(201).json({ lead: leadObj });
  } catch (err) {
    if (err.name === 'ValidationError') return res.status(400).json({ message: 'Validation error', errors: Object.values(err.errors).map(e => ({ message: e.message })) });
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id', auth, checkModulePermission(), async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    if (req.user.role === 'staff') {
      const assignedId = lead.assigned_to ? lead.assigned_to.toString() : null;
      if (assignedId !== req.user.id) return res.status(403).json({ message: 'Access denied' });
      const allowed = ['status', 'notes', 'followups'];
      const body = {};
      allowed.forEach(f => { if (req.body[f] !== undefined) body[f] = req.body[f]; });
      if (Array.isArray(body.followups)) lead.followups = body.followups;
      if (body.status !== undefined) lead.status = VALID_STATUSES.includes(body.status) ? body.status : lead.status;
      if (body.notes !== undefined) lead.notes = body.notes;
    } else {
      const allowed = ['name', 'phone', 'email', 'destination', 'travel_date', 'budget', 'status', 'assigned_to', 'total_amount', 'advance_amount', 'payment_status', 'notes', 'followups',
        'paxCount', 'paxType', 'vehicleType', 'hotelCategory', 'mealPlan', 'tourNights', 'tourDays', 'tourStartDate', 'tourEndDate', 'pickupPoint', 'dropPoint', 'destinations', 'accommodation', 'flights', 'itinerary', 'inclusions', 'exclusions', 'payment_policy', 'cancellation_policy'];
      allowed.forEach(f => {
        if (req.body[f] === undefined) return;
        if (f === 'travel_date') lead.travel_date = req.body[f] ? new Date(req.body[f]) : undefined;
        else if (f === 'tourStartDate') lead.tourStartDate = req.body[f] ? new Date(req.body[f]) : undefined;
        else if (f === 'tourEndDate') lead.tourEndDate = req.body[f] ? new Date(req.body[f]) : undefined;
        else if (f === 'followups' && Array.isArray(req.body[f])) lead.followups = req.body[f];
        else if (f === 'destinations' && Array.isArray(req.body[f])) lead.destinations = req.body[f].map((d) => String(d).trim()).filter(Boolean);
        else if (f === 'accommodation' && Array.isArray(req.body[f])) {
          lead.accommodation = req.body[f]
            .map((a) => ({
              hotelName: (a.hotelName || '').trim() || '',
              nights: a.nights != null && a.nights !== '' ? Number(a.nights) : null,
              roomType: (a.roomType || '').trim() || '',
              sharing: (a.sharing || '').trim() || '',
              destination: (a.destination || '').trim() || '',
              hotelTotalAmount: a.hotelTotalAmount != null && a.hotelTotalAmount !== '' ? Number(a.hotelTotalAmount) : null,
              hotelPaidAmount: a.hotelPaidAmount != null && a.hotelPaidAmount !== '' ? Number(a.hotelPaidAmount) : null
            }))
            .filter((a) => a.hotelName || a.destination);
        } else if (f === 'flights' && Array.isArray(req.body[f])) {
          lead.flights = req.body[f]
            .map((fl) => ({
              from: (fl.from || '').trim() || '',
              to: (fl.to || '').trim() || '',
              airline: (fl.airline || '').trim() || '',
              pnr: (fl.pnr || '').trim() || ''
            }))
            .filter((fl) => fl.from || fl.to || fl.airline || fl.pnr);
        } else if (f === 'itinerary' && Array.isArray(req.body[f])) {
          lead.itinerary = req.body[f]
            .map((item) => ({
              day: item.day != null && item.day !== '' ? Number(item.day) : null,
              route: (item.route || '').trim() || '',
              places: Array.isArray(item.places) ? item.places.map((p) => String(p).trim()).filter(Boolean) : []
            }))
            .filter((item) => item.day != null || item.route || (item.places && item.places.length));
        } else if (f === 'paxCount' || f === 'tourNights' || f === 'tourDays') lead[f] = req.body[f] != null && req.body[f] !== '' ? Number(req.body[f]) : null;
        else lead[f] = req.body[f];
      });
    }
    await lead.save();
    const leadObj = await Lead.findById(lead._id).populate('assigned_to', 'firstName lastName email').lean();
    res.json({ lead: leadObj });
  } catch (err) {
    if (err.name === 'ValidationError') return res.status(400).json({ message: 'Validation error' });
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', auth, requireSuperadmin(), async (req, res) => {
  try {
    const lead = await Lead.findByIdAndDelete(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    res.json({ message: 'Lead deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/bulk', auth, requireSuperadmin(), async (req, res) => {
  try {
    const { leads } = req.body;
    if (!leads || !Array.isArray(leads) || leads.length === 0) return res.status(400).json({ message: 'No leads data provided' });
    const created = [];
    const errors = [];
    for (let i = 0; i < leads.length; i++) {
      const d = leads[i];
      const name = (d.name || '').trim();
      const phone = (d.phone || '').trim();
      const email = (d.email || '').trim().toLowerCase();
      if (!name || !phone || !email) {
        errors.push({ row: i + 1, error: 'Missing required fields: name, phone, email' });
        continue;
      }
      try {
        const lead = new Lead({
          name,
          phone,
          email,
          destination: (d.destination || '').trim() || undefined,
          travel_date: d.travel_date ? new Date(d.travel_date) : undefined,
          budget: (d.budget || '').trim() || undefined,
          status: 'new',
          source: 'excel'
        });
        await lead.save();
        created.push(lead._id);
      } catch (e) {
        errors.push({ row: i + 1, error: e.message || 'Failed to create lead' });
      }
    }
    res.status(201).json({
      message: `Created ${created.length} of ${leads.length} leads`,
      created: created.length,
      failed: errors.length,
      total: leads.length,
      errors: errors.length ? errors : undefined
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id/assign', auth, requireSuperadmin(), async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    lead.assigned_to = req.body.assigned_to || null;
    await lead.save();
    const leadObj = await Lead.findById(lead._id).populate('assigned_to', 'firstName lastName email').lean();
    res.json({ lead: leadObj });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
