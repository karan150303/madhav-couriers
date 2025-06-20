const Joi = require('joi');

// Admin login validation
exports.loginValidation = (data) => {
    const schema = Joi.object({
        username: Joi.string().min(3).required(),
        password: Joi.string().min(6).required()
    });
    return schema.validate(data);
};

// Shipment validation
exports.shipmentValidation = (data) => {
    const schema = Joi.object({
        trackingNumber: Joi.string().min(8).max(20).required(),
        customerName: Joi.string().min(3).max(50).required(),
        customerPhone: Joi.string().min(10).max(15).required(),
        origin: Joi.string().min(3).max(50).required(),
        destination: Joi.string().min(3).max(50).required(),
        status: Joi.string().valid(
            'Booked', 
            'In Transit', 
            'Out for Delivery', 
            'Delivered',
            'Cancelled'
        ).required(),
        currentCity: Joi.string().min(2).max(50).required(),
        shipmentDetails: Joi.string().max(500),
        weight: Joi.number().min(0.1).required(),
        lastUpdated: Joi.date()
    });
    return schema.validate(data);
};
