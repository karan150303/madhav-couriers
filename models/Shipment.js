const mongoose = require('mongoose');

const ShipmentSchema = new mongoose.Schema({
  tracking_number: {
    type: String,
    required: [true, 'Please add a tracking number'],
    unique: true,
    trim: true,
    maxlength: [20, 'Tracking number cannot be more than 20 characters'],
    match: [/^MCL\d{9}$/, 'Tracking number must start with MCL followed by 9 digits']
  },
  customer_name: {
    type: String,
    required: [true, 'Please add customer name'],
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters']
  },
  customer_phone: {
    type: String,
    required: [true, 'Please add customer phone number'],
    maxlength: [15, 'Phone number cannot be more than 15 characters']
  },
  origin: {
    type: String,
    required: [true, 'Please add origin'],
    trim: true,
    maxlength: [100, 'Origin cannot be more than 100 characters']
  },
  destination: {
    type: String,
    required: [true, 'Please add destination'],
    trim: true,
    maxlength: [100, 'Destination cannot be more than 100 characters']
  },
  status: {
    type: String,
    enum: ['Booked', 'In Transit', 'Out for Delivery', 'Delivered', 'Cancelled'],
    default: 'Booked'
  },
  current_city: {
    type: String,
    required: [true, 'Please add current city'],
    trim: true,
    maxlength: [50, 'City cannot be more than 50 characters']
  },
  shipment_details: {
    type: String,
    trim: true
  },
  weight: {
    type: Number,
    default: 0
  },
  estimated_delivery: {
    type: Date
  },
  actual_delivery: {
    type: Date
  },
  created_by: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Update timestamp on save
ShipmentSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

// Reverse populate with virtuals
ShipmentSchema.virtual('updates', {
  ref: 'ShipmentUpdate',
  localField: '_id',
  foreignField: 'shipment_id',
  justOne: false
});

module.exports = mongoose.model('Shipment', ShipmentSchema);