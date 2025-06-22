const mongoose = require('mongoose');

const shipmentSchema = new mongoose.Schema({
  tracking_number: { type: String, required: true, unique: true, trim: true },
  customer_name: { type: String, required: true, trim: true },
  customer_phone: { type: String, trim: true },
  status: { type: String, required: true, default: 'Booked' },
  current_city: { type: String, required: true, trim: true },
  origin: { type: String, required: true, trim: true },
  destination: { type: String, required: true, trim: true },
  shipment_details: { type: String, trim: true },
  weight: { type: Number },

  statusHistory: [
    {
      status: String,
      location: String,
      updatedAt: { type: Date, default: Date.now }
    }
  ],

  lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Shipment', shipmentSchema);
