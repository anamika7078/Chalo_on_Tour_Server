const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const User = require('./models/User');
const Lead = require('./models/Lead');
const app = express();

// Required when behind Vercel/reverse proxy so express-rate-limit and req.ip work correctly
app.set('trust proxy', 1);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
const allowedOrigins = ['http://localhost:3000', 'http://localhost:3001'];
// Production: set CLIENT_URL to your Vercel URL(s), comma-separated for multiple (e.g. main + preview)
const clientUrls = process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',').map(u => u.trim()).filter(Boolean) : [];
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (clientUrls.length && clientUrls.some(url => origin === url || origin === url.replace(/\/$/, ''))) return callback(null, true);
    callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 1000 }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/superadmin_crm';
const SUPERADMIN_EMAIL = 'sadmin@gmail.com';
const SUPERADMIN_PASSWORD = '123456';
const STAFF_EMAIL = 'staff@gmail.com';
const STAFF_PASSWORD = '123456';

mongoose.connect(mongoUri).then(() => {
  console.log('MongoDB connected');
  (async () => {
    try {
      const superadmin = await User.findOne({ email: SUPERADMIN_EMAIL }).select('+password');
      if (!superadmin) {
        await User.create({
          firstName: 'Super',
          lastName: 'Admin',
          email: SUPERADMIN_EMAIL,
          password: SUPERADMIN_PASSWORD,
          role: 'superadmin'
        });
        console.log('Super admin user created:', SUPERADMIN_EMAIL);
      } else {
        if (superadmin.role === 'super_admin') superadmin.role = 'superadmin';
        superadmin.password = SUPERADMIN_PASSWORD;
        await superadmin.save();
        console.log('Super admin password synced:', SUPERADMIN_EMAIL);
      }

      const staffUser = await User.findOne({ email: STAFF_EMAIL }).select('+password');
      if (!staffUser) {
        await User.create({
          firstName: 'Staff',
          lastName: 'User',
          email: STAFF_EMAIL,
          password: STAFF_PASSWORD,
          role: 'staff'
        });
        console.log('Staff user created:', STAFF_EMAIL);
      } else {
        staffUser.password = STAFF_PASSWORD;
        await staffUser.save();
        console.log('Staff password synced:', STAFF_EMAIL);
      }
    } catch (e) {
      console.error('Seed users:', e.message);
    }
  })();

  // Start background scheduler for trip reminders once DB is connected
  startReminderScheduler();
}).catch(err => console.error('MongoDB error:', err.message));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/leads', require('./routes/leads'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/users', require('./routes/users'));
app.use('/api/agencies', require('./routes/agencies'));
app.use('/api/templates', require('./routes/templates'));

app.get('/api/health', (req, res) => res.json({ status: 'OK', timestamp: new Date().toISOString() }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!', error: process.env.NODE_ENV === 'development' ? err.message : undefined });
});
app.use('*', (req, res) => res.status(404).json({ message: 'Route not found' }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => console.log(`Super Admin backend running on port ${PORT}`));

module.exports = app;

/**
 * Reminder scheduler
 * - Runs periodically and finds all leads whose reminderDate is due
 * - Sends an admin notification with upcoming tour details
 */
async function sendAdminReminder(lead) {
  // Build message as per requirement
  const tripDate = lead.travel_date || lead.tourStartDate;
  const advance = Number(lead.advance_amount) || 0;
  const remaining = Number(lead.remaining_amount) || 0;
  const message = [
    'Upcoming Tour Reminder:',
    `Customer: ${lead.name}`,
    `Tour: ${lead.destination || 'N/A'}`,
    `Trip Date: ${tripDate ? new Date(tripDate).toDateString() : 'N/A'}`,
    `Advance Paid: ₹${advance}`,
    `Remaining Payment: ₹${remaining}`
  ].join('\n');

  // TODO: Integrate with actual notification channel (email/SMS/WhatsApp, etc.)
  // For now, log to server console so it is visible and testable.
  console.log('=== ADMIN TRIP REMINDER ===');
  console.log(message);
  console.log('============================');
}

async function processDueReminders() {
  const now = new Date();
  try {
    const dueLeads = await Lead.find({
      // Any reminderDate in the past or now, that hasn't been sent yet
      reminderDate: { $ne: null, $lte: now },
      reminderSent: { $ne: true }
    }).lean();

    if (!dueLeads.length) return;

    for (const leadData of dueLeads) {
      try {
        await sendAdminReminder(leadData);
        // Mark as sent
        await Lead.updateOne({ _id: leadData._id }, { $set: { reminderSent: true } });
      } catch (err) {
        console.error('Failed to process reminder for lead', leadData._id, err.message);
      }
    }
  } catch (err) {
    console.error('Error while checking due reminders:', err.message);
  }
}

function startReminderScheduler() {
  const intervalMs = 60 * 1000; // every 1 minute
  setInterval(() => {
    processDueReminders().catch((err) => {
      console.error('Reminder scheduler unexpected error:', err.message);
    });
  }, intervalMs);
}
