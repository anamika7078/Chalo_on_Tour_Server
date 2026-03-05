const express = require('express');
const PackageTemplate = require('../models/PackageTemplate');
const { auth, checkModulePermission, requireSuperadmin } = require('../middleware/auth');

const router = express.Router();

/** List all package templates (any authenticated admin/staff). */
router.get('/', auth, checkModulePermission(), async (req, res) => {
  try {
    const templates = await PackageTemplate.find({}).sort({ updatedAt: -1 }).lean();
    res.json({ templates });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

/** Get one template by id. */
router.get('/:id', auth, checkModulePermission(), async (req, res) => {
  try {
    const template = await PackageTemplate.findById(req.params.id).lean();
    if (!template) return res.status(404).json({ message: 'Template not found' });
    res.json({ template });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

/** Create template (superadmin only). */
router.post('/', auth, requireSuperadmin(), async (req, res) => {
  try {
    const name = (req.body.name || '').trim();
    if (!name) return res.status(400).json({ message: 'Template name is required' });
    const template = new PackageTemplate({
      name,
      description: (req.body.description || '').trim(),
      paxType: (req.body.paxType || '').trim() || undefined,
      vehicleType: (req.body.vehicleType || '').trim() || undefined,
      hotelCategory: (req.body.hotelCategory || '').trim() || undefined,
      mealPlan: (req.body.mealPlan || '').trim() || undefined,
      tourNights: req.body.tourNights != null && req.body.tourNights !== '' ? Number(req.body.tourNights) : null,
      tourDays: req.body.tourDays != null && req.body.tourDays !== '' ? Number(req.body.tourDays) : null,
      pickupPoint: (req.body.pickupPoint || '').trim() || undefined,
      dropPoint: (req.body.dropPoint || '').trim() || undefined,
      destinations: Array.isArray(req.body.destinations) ? req.body.destinations.map((d) => String(d).trim()).filter(Boolean) : [],
      accommodation: Array.isArray(req.body.accommodation) ? req.body.accommodation.map((a) => ({
        hotelName: (a.hotelName || '').trim() || '',
        nights: a.nights != null && a.nights !== '' ? Number(a.nights) : null,
        roomType: (a.roomType || '').trim() || '',
        sharing: (a.sharing || '').trim() || '',
        destination: (a.destination || '').trim() || ''
      })) : [],
      itinerary: Array.isArray(req.body.itinerary) ? req.body.itinerary.map((item) => ({
        day: item.day != null && item.day !== '' ? Number(item.day) : null,
        route: (item.route || '').trim() || '',
        places: Array.isArray(item.places) ? item.places.map((p) => String(p).trim()).filter(Boolean) : []
      })) : [],
      inclusions: (req.body.inclusions || '').trim() || '',
      exclusions: (req.body.exclusions || '').trim() || '',
      payment_policy: (req.body.payment_policy || '').trim() || '',
      cancellation_policy: (req.body.cancellation_policy || '').trim() || ''
    });
    await template.save();
    res.status(201).json({ template: await PackageTemplate.findById(template._id).lean() });
  } catch (err) {
    if (err.name === 'ValidationError') return res.status(400).json({ message: 'Validation error', errors: Object.values(err.errors).map(e => ({ message: e.message })) });
    res.status(500).json({ message: 'Server error' });
  }
});

/** Update template (superadmin only). */
router.put('/:id', auth, requireSuperadmin(), async (req, res) => {
  try {
    const template = await PackageTemplate.findById(req.params.id);
    if (!template) return res.status(404).json({ message: 'Template not found' });
    if (req.body.name != null) template.name = String(req.body.name).trim();
    if (req.body.description != null) template.description = String(req.body.description).trim();
    if (req.body.paxType != null) template.paxType = String(req.body.paxType).trim();
    if (req.body.vehicleType != null) template.vehicleType = String(req.body.vehicleType).trim();
    if (req.body.hotelCategory != null) template.hotelCategory = String(req.body.hotelCategory).trim();
    if (req.body.mealPlan != null) template.mealPlan = String(req.body.mealPlan).trim();
    if (req.body.tourNights != null) template.tourNights = req.body.tourNights === '' ? null : Number(req.body.tourNights);
    if (req.body.tourDays != null) template.tourDays = req.body.tourDays === '' ? null : Number(req.body.tourDays);
    if (req.body.pickupPoint != null) template.pickupPoint = String(req.body.pickupPoint).trim();
    if (req.body.dropPoint != null) template.dropPoint = String(req.body.dropPoint).trim();
    if (Array.isArray(req.body.destinations)) template.destinations = req.body.destinations.map((d) => String(d).trim()).filter(Boolean);
    if (Array.isArray(req.body.accommodation)) {
      template.accommodation = req.body.accommodation.map((a) => ({
        hotelName: (a.hotelName || '').trim() || '',
        nights: a.nights != null && a.nights !== '' ? Number(a.nights) : null,
        roomType: (a.roomType || '').trim() || '',
        sharing: (a.sharing || '').trim() || '',
        destination: (a.destination || '').trim() || ''
      }));
    }
    if (Array.isArray(req.body.itinerary)) {
      template.itinerary = req.body.itinerary.map((item) => ({
        day: item.day != null && item.day !== '' ? Number(item.day) : null,
        route: (item.route || '').trim() || '',
        places: Array.isArray(item.places) ? item.places.map((p) => String(p).trim()).filter(Boolean) : []
      }));
    }
    if (req.body.inclusions != null) template.inclusions = String(req.body.inclusions).trim();
    if (req.body.exclusions != null) template.exclusions = String(req.body.exclusions).trim();
    if (req.body.payment_policy != null) template.payment_policy = String(req.body.payment_policy).trim();
    if (req.body.cancellation_policy != null) template.cancellation_policy = String(req.body.cancellation_policy).trim();
    await template.save();
    res.json({ template: await PackageTemplate.findById(template._id).lean() });
  } catch (err) {
    if (err.name === 'ValidationError') return res.status(400).json({ message: 'Validation error' });
    res.status(500).json({ message: 'Server error' });
  }
});

/** Delete template (superadmin only). */
router.delete('/:id', auth, requireSuperadmin(), async (req, res) => {
  try {
    const template = await PackageTemplate.findByIdAndDelete(req.params.id);
    if (!template) return res.status(404).json({ message: 'Template not found' });
    res.json({ message: 'Template deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
