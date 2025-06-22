const express = require('express');
const router = express.Router();
const Shipment = require('../models/shipment');
const authMiddleware = require('../middleware/authMiddleware');
const { validateShipment } = require('../validation/validation');

// Utility function for error handling
const handleError = (res, err, defaultMessage = 'Server error') => {
  console.error(err);
  const statusCode = err.name === 'ValidationError' ? 400 : 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || defaultMessage
  });
};

// GET ALL SHIPMENTS (PROTECTED)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10,
      sortBy = 'lastUpdated',
      sortOrder = 'desc',
      status,
      current_city
    } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (current_city) filter.current_city = current_city;

    const [shipments, total] = await Promise.all([
      Shipment.find(filter)
        .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Shipment.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: {
        shipments,
        pagination: {
          total,
          pages: Math.ceil(total / limit),
          currentPage: page,
          perPage: limit
        }
      }
    });
  } catch (err) {
    handleError(res, err, 'Failed to fetch shipments');
  }
});

// CREATE SHIPMENT (PROTECTED + VALIDATED)
router.post('/', authMiddleware, validateShipment, async (req, res) => {
  try {
    const existingShipment = await Shipment.findOne({ 
      tracking_number: req.body.tracking_number 
    });
    
    if (existingShipment) {
      return res.status(409).json({
        success: false,
        message: 'Tracking number already exists'
      });
    }

    const newShipment = await Shipment.create({
      ...req.body,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      data: newShipment
    });
  } catch (err) {
    handleError(res, err, 'Failed to create shipment');
  }
});

// GET SHIPMENT BY ID
router.get('/:id', async (req, res) => {
  try {
    const shipment = await Shipment.findById(req.params.id);
    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: 'Shipment not found'
      });
    }
    res.json({ success: true, data: shipment });
  } catch (err) {
    handleError(res, err, 'Failed to fetch shipment');
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

    if (req.body.tracking_number && req.body.tracking_number !== shipment.tracking_number) {
      return res.status(400).json({
        success: false,
        message: 'Tracking number cannot be changed'
      });
    }

    const updatedShipment = await Shipment.findByIdAndUpdate(
      req.params.id,
      { ...req.body, lastUpdated: Date.now() },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      data: updatedShipment
    });
  } catch (err) {
    handleError(res, err, 'Failed to update shipment');
  }
});

// DELETE SHIPMENT (PROTECTED)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const shipment = await Shipment.findByIdAndDelete(req.params.id);
    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: 'Shipment not found'
      });
    }
    res.json({ success: true, message: 'Shipment deleted successfully' });
  } catch (err) {
    handleError(res, err, 'Failed to delete shipment');
  }
});

// TRACK SHIPMENT (PUBLIC)
router.get('/track/:tracking_number', async (req, res) => {
  try {
    const shipment = await Shipment.findOne(
      { tracking_number: req.params.tracking_number },
      '-__v -createdBy'
    );

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: 'Shipment not found'
      });
    }

    res.json({ success: true, data: shipment });
  } catch (err) {
    handleError(res, err, 'Failed to track shipment');
  }
});

module.exports = router;
