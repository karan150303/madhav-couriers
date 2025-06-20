const mongoose = require('mongoose');

const ShipmentSchema = new mongoose.Schema({
    trackingNumber: {
        type: String,
        required: true,
        unique: true,
        minlength: 8,
        maxlength: 20
    },
    customerName: {
        type: String,
        required: true,
        minlength: 3,
        maxlength: 50
    },
    customerPhone: {
        type: String,
        required: true,
        minlength: 10,
        maxlength: 15
    },
    origin: {
        type: String,
        required: true,
        minlength: 3,
        maxlength: 50
    },
    destination: {
        type: String,
        required: true,
        minlength: 3,
        maxlength: 50
    },
    status: {
        type: String,
        required: true,
        enum: ['Booked', 'In Transit', 'Out for Delivery', 'Delivered', 'Cancelled'],
        default: 'Booked'
    },
    currentCity: {
        type: String,
        required: true,
        minlength: 2,
        maxlength: 50
    },
    shipmentDetails: {
        type: String,
        maxlength: 500
    },
    weight: {
        type: Number,
        required: true,
        min: 0.1
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    },
    history: [{
        status: String,
        location: String,
        timestamp: {
            type: Date,
            default: Date.now
        },
        notes: String
    }]
}, {
    timestamps: true
});

// Add to history when status changes
ShipmentSchema.pre('save', function(next) {
    if (this.isModified('status') || this.isModified('currentCity')) {
        this.history.push({
            status: this.status,
            location: this.currentCity,
            notes: this.shipmentDetails || 'Status updated'
        });
    }
    next();
});

module.exports = mongoose.model('Shipment', ShipmentSchema);
