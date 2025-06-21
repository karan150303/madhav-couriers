const express = require('express');
const router = express.Router();
const Shipment = require('../models/shipment');

// Create new shipment
router.post('/', async (req, res) => {
  try {
    const newShipment = new Shipment({
      trackingNumber: req.body.trackingNumber,
      customerName: req.body.customerName,
      customerPhone: req.body.customerPhone,
      origin: req.body.origin,
      destination: req.body.destination,
      status: req.body.status || 'Booked',
      currentCity: req.body.currentCity,
      shipmentDetails: req.body.shipmentDetails,
      weight: req.body.weight,
      lastUpdated: new Date()
    });

    const savedShipment = await newShipment.save();

    // Emit to clients (real-time update)
    req.app.get('io').emit('shipment-update', {
      action: 'created',
      shipment: savedShipment.toObject()
    });

    res.status(201).json({
      success: true,
      shipment: savedShipment
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message
    });
  }
});

// Get all shipments
router.get('/', async (req, res) => {
  try {
    const shipments = await Shipment.find().sort({ lastUpdated: -1 }).lean();
    res.json({
      success: true,
      data: shipments
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Server error fetching shipments'
    });
  }
});

// Get shipment by tracking number
router.get('/track/:trackingNumber', async (req, res) => {
  try {
    const shipment = await Shipment.findOne({ trackingNumber: req.params.trackingNumber });

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: 'Shipment not found'
      });
    }

    res.json({
      success: true,
      data: shipment
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
