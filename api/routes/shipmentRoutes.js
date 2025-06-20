// Add this at the top
const mongoose = require('mongoose');

// Modify your POST route
router.post('/', async (req, res) => {
  try {
    const newShipment = new Shipment({
      ...req.body,
      lastUpdated: new Date()
    });

    const savedShipment = await newShipment.save();
    
    // Broadcast to all connected clients
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
