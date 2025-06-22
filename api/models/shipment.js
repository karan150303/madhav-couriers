const mongoose = require('mongoose');

const shipmentSchema = new mongoose.Schema({
  tracking_number: { type: String, required: true, unique: true },
  customer_name: { type: String, required: true },
  status: { type: String, required: true, default: 'Booked' },
  current_city: { type: String, required: true },
  origin: { type: String, required: true },
  destination: { type: String, required: true },
  customer_phone: { type: String },
  shipment_details: { type: String },
  weight: { type: Number },
  lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true });

// Add any model methods or statics here if needed

module.exports = mongoose.model('Shipment', shipmentSchema);
// Get all shipments (with sorting by lastUpdated)
router.get('/', async (req, res) => {
    try {
        const shipments = await Shipment.find().sort({ lastUpdated: -1 });
        res.json(shipments);
    } catch (err) {
        res.status(500).json({ 
            success: false,
            message: 'Error fetching shipments',
            error: err.message 
        });
    }
});

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
        
        res.status(201).json({
            success: true,
            shipment: savedShipment
        });
    } catch (err) {
        res.status(400).json({
            success: false,
            message: 'Error creating shipment',
            error: err.message
        });
    }
});

// Update shipment
router.put('/:id', async (req, res) => {
    try {
        const updatedShipment = await Shipment.findByIdAndUpdate(
            req.params.id,
            {
                $set: req.body,
                lastUpdated: Date.now()
            },
            { new: true, runValidators: true }
        );

        if (!updatedShipment) {
            return res.status(404).json({
                success: false,
                message: 'Shipment not found'
            });
        }

        res.json({
            success: true,
            shipment: updatedShipment
        });
    } catch (err) {
        res.status(400).json({
            success: false,
            message: 'Error updating shipment',
            error: err.message
        });
    }
});

// Delete shipment
router.delete('/:id', async (req, res) => {
    try {
        const deletedShipment = await Shipment.findByIdAndDelete(req.params.id);
        
        if (!deletedShipment) {
            return res.status(404).json({
                success: false,
                message: 'Shipment not found'
            });
        }

        res.json({
            success: true,
            message: 'Shipment deleted successfully'
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Error deleting shipment',
            error: err.message
        });
    }
});

// Get single shipment by tracking number
router.get('/track/:trackingNumber', async (req, res) => {
    try {
        const shipment = await Shipment.findOne({ 
            trackingNumber: req.params.trackingNumber 
        });

        if (!shipment) {
            return res.status(404).json({
                success: false,
                message: 'Shipment not found'
            });
        }

        res.json({
            success: true,
            shipment: shipment
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Error finding shipment',
            error: err.message
        });
    }
});

module.exports = router;
