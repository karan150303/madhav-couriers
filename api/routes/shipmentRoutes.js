const express = require('express');
const router = express.Router();
const Shipment = require('../models/shipment');

// Get all shipments
router.get('/', async (req, res) => {
    try {
        const shipments = await Shipment.find();
        res.json(shipments);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Add new shipment
router.post('/', async (req, res) => {
    const shipment = new Shipment({
        trackingNumber: req.body.trackingNumber,
        customerName: req.body.customerName,
        // Add other fields from your form
    });

    try {
        const newShipment = await shipment.save();
        res.status(201).json(newShipment);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;
