const express = require('express');
const router = express.Router();
const Shipment = require('../models/shipment');
const authMiddleware = require('../middleware/authMiddleware');
const { validateShipment } = require('../validation/validation');

// Enhanced error handler with logging
const handleError = (res, err, operation = 'operation') => {
  console.error(`Error during ${operation}:`, err);
  
  const statusCode = err.name === 'ValidationError' ? 400 : 
                    err.name === 'NotFoundError' ? 404 : 
                    err.code === 11000 ? 409 : 500;
  
  const message = err.name === 'ValidationError' ? 'Validation failed' :
                 err.name === 'NotFoundError' ? 'Resource not found' :
                 err.code === 11000 ? 'Duplicate key error' :
                 'Internal server error';

  res.status(statusCode).json({
    success: false,
    message: `${message}: ${err.message || operation} failed`,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

// GET ALL SHIPMENTS (PROTECTED)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20,
      sortBy = '-createdAt',
      status,
      current_city,
      origin,
      destination
    } = req.query;

    // Build filter object
    const filter = {};
    if (status) filter.status = { $in: status.split(',') };
    if (current_city) filter.current_city = new RegExp(current_city, 'i');
    if (origin) filter.origin = new RegExp(origin, 'i');
    if (destination) filter.destination = new RegExp(destination, 'i');

    // Execute parallel queries
    const [shipments, total] = await Promise.all([
      Shipment.find(filter)
        .sort(sortBy)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Shipment.countDocuments(filter)
    ]);

    // Set response headers
    res.set('X-Total-Count', total);
    res.set('X-Page', page);
    res.set('X-Per-Page', limit);

    res.json({
      success: true,
      data: shipments,
      meta: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit
      }
    });

  } catch (err) {
    handleError(res, err, 'fetching shipments');
  }
});

// CREATE SHIPMENT (PROTECTED + VALIDATED)
router.post('/', authMiddleware, validateShipment, async (req, res) => {
  try {
    // Check for existing tracking number
    const exists = await Shipment.exists({ tracking_number: req.body.tracking_number });
    if (exists) {
      const error = new Error('Tracking number already in use');
      error.code = 11000;
      throw error;
    }

    const newShipment = await Shipment.create({
     ...req.body,
    createdBy: req.admin._id,
    status: req.body.status || 'Booked'  // default fallback status
  });

   // Emit to dashboard
   req.app.get('io').emit('shipment-update', { action: 'created', shipment: newShipment });


    res.status(201).json({
      success: true,
      data: newShipment
    });

  } catch (err) {
    handleError(res, err, 'creating shipment');
  }
});

// GET SHIPMENT BY ID
router.get('/:id', async (req, res) => {
  try {
    const shipment = await Shipment.findById(req.params.id).lean();
    if (!shipment) {
      const error = new Error('Shipment not found');
      error.name = 'NotFoundError';
      throw error;
    }
    res.json({ success: true, data: shipment });
  } catch (err) {
    handleError(res, err, 'fetching shipment');
  }
});

// UPDATE SHIPMENT (PROTECTED)
router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    if (req.body.tracking_number) {
      delete req.body.tracking_number;
    }

    const updatedShipment = await Shipment.findByIdAndUpdate(
      req.params.id,
      { 
        ...req.body,
        lastUpdated: Date.now(),
        updatedBy: req.admin._id // ✅ fixed line
      },
      { new: true, runValidators: true }
    ).lean();

    if (!updatedShipment) {
      const error = new Error('Shipment not found');
      error.name = 'NotFoundError';
      throw error;
    }

    req.app.get('io')
      .to(`tracking:${updatedShipment.tracking_number}`)
      .emit('shipment-updated', updatedShipment);

    res.json({
      success: true,
      data: updatedShipment
    });

  } catch (err) {
    handleError(res, err, 'updating shipment');
  }
});

    // Broadcast update
    req.app.get('io').to(`tracking:${updatedShipment.tracking_number}`)
                   .emit('shipment-updated', updatedShipment);

    res.json({
      success: true,
      data: updatedShipment
    });

  } catch (err) {
    handleError(res, err, 'updating shipment');
  }
});

// DELETE SHIPMENT (PROTECTED)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const shipment = await Shipment.findByIdAndDelete(req.params.id).lean();
    if (!shipment) {
      const error = new Error('Shipment not found');
      error.name = 'NotFoundError';
      throw error;
    }

    // Notify subscribers
    req.app.get('io').to(`tracking:${shipment.tracking_number}`)
                   .emit('shipment-deleted', { id: req.params.id });

    res.json({ 
      success: true, 
      data: { id: req.params.id },
      message: 'Shipment deleted successfully'
    });

  } catch (err) {
    handleError(res, err, 'deleting shipment');
  }
});

// TRACK SHIPMENT (PUBLIC)
router.get('/track/:tracking_number', async (req, res) => {
  try {
    const shipment = await Shipment.findOne(
      { tracking_number: req.params.tracking_number },
      '-__v -createdBy -updatedBy'
    ).lean();

    if (!shipment) {
      const error = new Error('Shipment not found');
      error.name = 'NotFoundError';
      throw error;
    }

    res.json({ 
      success: true, 
      data: shipment,
      trackingUrl: `${req.protocol}://${req.get('host')}/track/${req.params.tracking_number}`
    });

  } catch (err) {
    handleError(res, err, 'tracking shipment');
  }
});

// SHIPMENT STATUS HISTORY (PROTECTED)
router.get('/:id/history', authMiddleware, async (req, res) => {
  try {
    const shipment = await Shipment.findById(req.params.id, 'statusHistory').lean();
    if (!shipment) {
      const error = new Error('Shipment not found');
      error.name = 'NotFoundError';
      throw error;
    }

    res.json({
      success: true,
      data: shipment.statusHistory || []
    });

  } catch (err) {
    handleError(res, err, 'fetching shipment history');
  }
});

module.exports = router;
