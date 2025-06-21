const Shipment = require('../../models/Shipment');
const ShipmentUpdate = require('../../models/ShipmentUpdate');
const asyncHandler = require('express-async-handler');
const logger = require('../utils/logger');

// @desc    Get all shipments
// @route   GET /api/shipments
// @access  Private
exports.getShipments = asyncHandler(async (req, res) => {
  const shipments = await Shipment.find().sort('-createdAt');
  res.status(200).json({
    success: true,
    count: shipments.length,
    data: shipments
  });
});

// @desc    Get single shipment
// @route   GET /api/shipments/:trackingNumber
// @access  Public
exports.getShipment = asyncHandler(async (req, res) => {
  const shipment = await Shipment.findOne({ tracking_number: req.params.trackingNumber });

  if (!shipment) {
    res.status(404);
    throw new Error('Shipment not found');
  }

  const updates = await ShipmentUpdate.find({ shipment_id: shipment._id }).sort('-created_at');

  res.status(200).json({
    success: true,
    data: {
      ...shipment._doc,
      updates
    }
  });
});

// @desc    Create new shipment
// @route   POST /api/shipments
// @access  Private
exports.createShipment = asyncHandler(async (req, res) => {
  const {
    tracking_number,
    customer_name,
    customer_phone,
    origin,
    destination,
    status,
    current_city,
    shipment_details,
    weight
  } = req.body;

  if (!tracking_number.match(/^MCL\d{9}$/)) {
    res.status(400);
    throw new Error('Tracking number must start with MCL followed by 9 digits');
  }

  const shipment = await Shipment.create({
    tracking_number,
    customer_name,
    customer_phone,
    origin,
    destination,
    status,
    current_city,
    shipment_details,
    weight,
    created_by: req.user.id
  });

  await ShipmentUpdate.create({
    shipment_id: shipment._id,
    status: status,
    location: current_city,
    notes: 'Shipment created'
  });

  logger.info(`New shipment created: ${tracking_number} by user ${req.user.id}`);

  // 🔴 Real-time tracking update emit
  const io = req.app.get('io');
  io.to(tracking_number).emit('tracking-update', {
    action: 'updated',
    shipment: shipment
  });

  res.status(201).json({
    success: true,
    data: shipment
  });
});

// @desc    Update shipment
// @route   PUT /api/shipments/:trackingNumber
// @access  Private
exports.updateShipment = asyncHandler(async (req, res) => {
  let shipment = await Shipment.findOne({ tracking_number: req.params.trackingNumber });

  if (!shipment) {
    res.status(404);
    throw new Error('Shipment not found');
  }

  const { status, current_city, notes } = req.body;

  if (status !== shipment.status || current_city !== shipment.current_city) {
    await ShipmentUpdate.create({
      shipment_id: shipment._id,
      status: status || shipment.status,
      location: current_city || shipment.current_city,
      notes: notes || 'Status updated'
    });
  }

  shipment = await Shipment.findOneAndUpdate(
    { tracking_number: req.params.trackingNumber },
    req.body,
    { new: true, runValidators: true }
  );

  logger.info(`Shipment updated: ${req.params.trackingNumber} by user ${req.user.id}`);

  // 🔴 Real-time tracking update emit
  const io = req.app.get('io');
  io.to(req.params.trackingNumber).emit('tracking-update', {
    action: 'updated',
    shipment: shipment
  });

  res.status(200).json({
    success: true,
    data: shipment
  });
});

// @desc    Delete shipment
// @route   DELETE /api/shipments/:trackingNumber
// @access  Private
exports.deleteShipment = asyncHandler(async (req, res) => {
  const shipment = await Shipment.findOne({ tracking_number: req.params.trackingNumber });

  if (!shipment) {
    res.status(404);
    throw new Error('Shipment not found');
  }

  await shipment.remove();

  logger.info(`Shipment deleted: ${req.params.trackingNumber} by user ${req.user.id}`);

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get shipment rates
// @route   GET /api/shipments/rates
// @access  Public
exports.getRates = asyncHandler(async (req, res) => {
  const rates = await Rate.find();

  res.status(200).json({
    success: true,
    data: rates
  });
});
