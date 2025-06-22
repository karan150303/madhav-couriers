const express = require('express');
const router = express.Router();
const Shipment = require('../models/shipment');
const authMiddleware = require('../middleware/authMiddleware'); // If you have auth
const { validateShipment } = require('../validation/validation'); // If you have validation

// GET ALL SHIPMENTS (PROTECTED ROUTE)
router.get('/', authMiddleware, async (req, res) => {
    try {
        // Pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Sorting (default by lastUpdated descending)
        const sortField = req.query.sortBy || 'lastUpdated';
        const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

        // Search/filter capability
        const filter = {};
        if (req.query.status) filter.status = req.query.status;
        if (req.query.current_city) filter.current_city = req.query.current_city;

        const shipments = await Shipment.find(filter)
            .sort({ [sortField]: sortOrder })
            .skip(skip)
            .limit(limit);

        const total = await Shipment.countDocuments(filter);

        res.json({
            success: true,
            count: shipments.length,
            total,
            page,
            pages: Math.ceil(total / limit),
            shipments
        });

    } catch (err) {
        console.error('Error fetching shipments:', err);
        res.status(500).json({ 
            success: false,
            message: 'Server error while fetching shipments'
        });
    }
});

// CREATE NEW SHIPMENT (PROTECTED + VALIDATION)
router.post('/', authMiddleware, validateShipment, async (req, res) => {
    try {
        // Check if tracking number already exists
        const existingShipment = await Shipment.findOne({ 
            tracking_number: req.body.tracking_number 
        });
        
        if (existingShipment) {
            return res.status(400).json({
                success: false,
                message: 'Tracking number already exists'
            });
        }

        const newShipment = new Shipment({
            ...req.body,
            createdBy: req.user.id // If using authentication
        });

        await newShipment.save();

        res.status(201).json({
            success: true,
            message: 'Shipment created successfully',
            shipment: newShipment
        });

    } catch (err) {
        console.error('Error creating shipment:', err);
        res.status(500).json({
            success: false,
            message: 'Server error while creating shipment'
        });
    }
});

// GET SINGLE SHIPMENT BY ID
router.get('/:id', async (req, res) => {
    try {
        const shipment = await Shipment.findById(req.params.id);
        
        if (!shipment) {
            return res.status(404).json({
                success: false,
                message: 'Shipment not found'
            });
        }

        res.json({
            success: true,
            shipment
        });

    } catch (err) {
        console.error('Error fetching shipment:', err);
        if (err.kind === 'ObjectId') {
            return res.status(400).json({
                success: false,
                message: 'Invalid shipment ID format'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Server error while fetching shipment'
        });
    }
});

// UPDATE SHIPMENT (PROTECTED)
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const shipment = await Shipment.findById(req.params.id);
        
        if (!shipment) {
            return res.status(404).json({
                success: false,
                message: 'Shipment not found'
            });
        }

        // Prevent updating tracking number
        if (req.body.tracking_number && req.body.tracking_number !== shipment.tracking_number) {
            return res.status(400).json({
                success: false,
                message: 'Tracking number cannot be changed'
            });
        }

        const updatedShipment = await Shipment.findByIdAndUpdate(
            req.params.id,
            {
                ...req.body,
                lastUpdated: Date.now()
            },
            { new: true, runValidators: true }
        );

        res.json({
            success: true,
            message: 'Shipment updated successfully',
            shipment: updatedShipment
        });

    } catch (err) {
        console.error('Error updating shipment:', err);
        res.status(500).json({
            success: false,
            message: 'Server error while updating shipment'
        });
    }
});

// DELETE SHIPMENT (PROTECTED)
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const shipment = await Shipment.findById(req.params.id);
        
        if (!shipment) {
            return res.status(404).json({
                success: false,
                message: 'Shipment not found'
            });
        }

        await shipment.remove();

        res.json({
            success: true,
            message: 'Shipment deleted successfully'
        });

    } catch (err) {
        console.error('Error deleting shipment:', err);
        res.status(500).json({
            success: false,
            message: 'Server error while deleting shipment'
        });
    }
});

// TRACK SHIPMENT BY TRACKING NUMBER (PUBLIC)
router.get('/track/:tracking_number', async (req, res) => {
    try {
        const shipment = await Shipment.findOne({ 
            tracking_number: req.params.tracking_number 
        }).select('-__v'); // Exclude version key

        if (!shipment) {
            return res.status(404).json({
                success: false,
                message: 'No shipment found with that tracking number'
            });
        }

        res.json({
            success: true,
            shipment
        });

    } catch (err) {
        console.error('Error tracking shipment:', err);
        res.status(500).json({
            success: false,
            message: 'Server error while tracking shipment'
        });
    }
});

module.exports = router;
