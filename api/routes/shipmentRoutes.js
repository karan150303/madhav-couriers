const express = require('express');
const router = express.Router();
const Shipment = require('../models/shipment');

// Create new shipment (with enhanced real-time updates)
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
      lastUpdated: new Date() // Ensure timestamp is set
    });

    const savedShipment = await newShipment.save();
    
    // Enhanced real-time emission
    req.app.get('io').emit('shipment-update', {
      action: 'created',
      shipment: savedShipment.toObject() // Convert to plain object
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

// Get all shipments (optimized query)
router.get('/', async (req, res) => {
  try {
    const shipments = await Shipment.find()
      .sort({ lastUpdated: -1 })
      .lean(); // Faster response
    
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

// Add this new endpoint for tracking page
router.get('/track/:trackingNumber', async (req, res) => {
  try {
    const shipment = await Shipment.findOne({ 
      trackingNumber: req.params.trackingNumber 
    }).lean();
    
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
