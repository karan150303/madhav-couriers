const express = require('express');
const router = express.Router();
const Shipment = require('../models/Shipment');
const authMiddleware = require('../middleware/authMiddleware');

// Get all shipments (for admin dashboard and frontend)
router.get('/', async (req, res) => {
  try {
    const shipments = await Shipment.find().sort({ lastUpdated: -1 });
    res.json(shipments);
  } catch (err) {
    console.error('Error fetching shipments:', err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Add new shipment (from admin dashboard)
router.post('/', authMiddleware, async (req, res) => {
  try {
    // Add current timestamp
    req.body.lastUpdated = new Date();
    
    const newShipment = new Shipment(req.body);
    const savedShipment = await newShipment.save();
    
    // Return the complete saved shipment
    res.status(201).json(savedShipment);
  } catch (err) {
    console.error('Error adding shipment:', err);
    res.status(400).json({ message: 'Error adding shipment', error: err.message });
  }
});

// Update shipment (from admin dashboard)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    // Update the lastUpdated timestamp
    req.body.lastUpdated = new Date();
    
    const updatedShipment = await Shipment.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!updatedShipment) {
      return res.status(404).json({ message: 'Shipment not found' });
    }
    
    res.json(updatedShipment);
  } catch (err) {
    console.error('Error updating shipment:', err);
    res.status(400).json({ message: 'Error updating shipment', error: err.message });
  }
});

// Delete shipment (from admin dashboard)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const deletedShipment = await Shipment.findByIdAndDelete(req.params.id);
    
    if (!deletedShipment) {
      return res.status(404).json({ message: 'Shipment not found' });
    }
    
    res.json({ message: 'Shipment deleted successfully' });
  } catch (err) {
    console.error('Error deleting shipment:', err);
    res.status(400).json({ message: 'Error deleting shipment', error: err.message });
  }
});

// Get single shipment by tracking number (for frontend tracking)
router.get('/track/:trackingNumber', async (req, res) => {
  try {
    const shipment = await Shipment.findOne({ 
      trackingNumber: req.params.trackingNumber 
    });
    
    if (!shipment) {
      return res.status(404).json({ message: 'Shipment not found' });
    }
    
    res.json(shipment);
  } catch (err) {
    console.error('Error fetching shipment:', err);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
