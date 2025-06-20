const Shipment = require('../../models/shipment');
const express = require('express');
const router = express.Router();
const Shipment = require('../models/Shipment');
const authMiddleware = require('../middleware/authMiddleware');
const { shipmentValidation } = require('../validation');

// Get all shipments (with search and pagination)
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { search, page = 1, limit = 10 } = req.query;
        
        let query = {};
        
        // Search functionality
        if (search) {
            query = {
                $or: [
                    { trackingNumber: { $regex: search, $options: 'i' } },
                    { customerName: { $regex: search, $options: 'i' } },
                    { currentCity: { $regex: search, $options: 'i' } }
                ]
            };
        }

        const shipments = await Shipment.find(query)
            .sort({ lastUpdated: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec();

        const count = await Shipment.countDocuments(query);

        res.json({
            shipments,
            totalPages: Math.ceil(count / limit),
            currentPage: page
        });
    } catch (err) {
        console.error('Error fetching shipments:', err);
        res.status(500).json({ message: 'Server error fetching shipments' });
    }
});

// Create new shipment
router.post('/', authMiddleware, async (req, res) => {
    // Validate data
    const { error } = shipmentValidation(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    try {
        // Check if tracking number exists
        const trackingExists = await Shipment.findOne({ trackingNumber: req.body.trackingNumber });
        if (trackingExists) {
            return res.status(400).json({ message: 'Tracking number already exists' });
        }

        const newShipment = new Shipment({
            ...req.body,
            lastUpdated: new Date()
        });

        const savedShipment = await newShipment.save();
        res.status(201).json(savedShipment);
    } catch (err) {
        console.error('Error creating shipment:', err);
        res.status(500).json({ message: 'Server error creating shipment' });
    }
});

// Update shipment
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const updatedShipment = await Shipment.findByIdAndUpdate(
            req.params.id,
            { 
                ...req.body,
                lastUpdated: new Date() 
            },
            { new: true, runValidators: true }
        );

        if (!updatedShipment) {
            return res.status(404).json({ message: 'Shipment not found' });
        }

        res.json(updatedShipment);
    } catch (err) {
        console.error('Error updating shipment:', err);
        res.status(500).json({ message: 'Server error updating shipment' });
    }
});

// Delete shipment
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const deletedShipment = await Shipment.findByIdAndDelete(req.params.id);
        
        if (!deletedShipment) {
            return res.status(404).json({ message: 'Shipment not found' });
        }

        res.json({ message: 'Shipment deleted successfully' });
    } catch (err) {
        console.error('Error deleting shipment:', err);
        res.status(500).json({ message: 'Server error deleting shipment' });
    }
});

// Get single shipment by tracking number (public)
router.get('/track/:trackingNumber', async (req, res) => {
    try {
        const shipment = await Shipment.findOne({ 
            trackingNumber: req.params.trackingNumber 
        }).select('-__v');

        if (!shipment) {
            return res.status(404).json({ message: 'Shipment not found' });
        }

        res.json(shipment);
    } catch (err) {
        console.error('Error tracking shipment:', err);
        res.status(500).json({ message: 'Server error tracking shipment' });
    }
});

module.exports = router;
