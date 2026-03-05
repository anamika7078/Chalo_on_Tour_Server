const mongoose = require('mongoose');

const packageTemplateSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '', trim: true },
  // Tour summary defaults
  paxType: { type: String, trim: true, default: 'Adults' },
  vehicleType: { type: String, trim: true, default: '' },
  hotelCategory: { type: String, trim: true, default: '' },
  mealPlan: { type: String, trim: true, default: '' },
  tourNights: { type: Number, default: null },
  tourDays: { type: Number, default: null },
  pickupPoint: { type: String, trim: true, default: '' },
  dropPoint: { type: String, trim: true, default: '' },
  destinations: [{ type: String, trim: true }],
  accommodation: [{
    hotelName: { type: String, trim: true, default: '' },
    nights: { type: Number, default: null },
    roomType: { type: String, trim: true, default: '' },
    sharing: { type: String, trim: true, default: '' },
    destination: { type: String, trim: true, default: '' }
  }],
  itinerary: [{
    day: { type: Number, default: null },
    route: { type: String, trim: true, default: '' },
    places: [{ type: String, trim: true }]
  }],
  inclusions: { type: String, default: '' },
  exclusions: { type: String, default: '' },
  payment_policy: { type: String, default: '' },
  cancellation_policy: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('PackageTemplate', packageTemplateSchema);
