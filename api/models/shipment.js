const mongoose = require('mongoose');

const shipmentSchema = new mongoose.Schema({
  tracking_number: { type: String, required: true, unique: true },
  customer_name: { type: String, required: true },
  status: { type: String, required: true, default: 'Booked' },
  current_city: { type: String, required: true },
  origin: { type: String, required: true },
  destination: { type: String, required: true },
  customer_phone: { type: String },
  shipment_details: { type: String },
  weight: { type: Number },
  lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Shipment', shipmentSchema);
