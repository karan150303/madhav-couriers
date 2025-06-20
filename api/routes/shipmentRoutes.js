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
      weight: req.body.weight
    });

    const savedShipment = await newShipment.save();
    
    // Emit real-time update
    req.app.get('io').emit('new-shipment', savedShipment);
    
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
    const shipments = await Shipment.find().sort({ lastUpdated: -1 });
    res.json(shipments);
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

module.exports = router;
