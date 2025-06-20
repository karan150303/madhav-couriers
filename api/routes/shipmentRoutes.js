// Update the POST /api/shipments route
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
    
    // Enhanced real-time emission to all clients
    req.app.get('io').emit('shipment-update', {
      action: 'created',
      shipment: savedShipment.toObject()
    });
    
    // Also emit to the specific tracking number room
    req.app.get('io').to(savedShipment.trackingNumber).emit('tracking-update', {
      action: 'updated',
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

// Update the tracking endpoint
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
    
    // Subscribe the client to tracking updates
    if (req.app.get('io')) {
      const socket = req.app.get('io').sockets.sockets.get(req.query.socketId);
      if (socket) {
        socket.join(req.params.trackingNumber);
      }
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
