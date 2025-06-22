module.exports = {
  validateShipment: (req, res, next) => {
    const { tracking_number, customer_name, origin, destination } = req.body;

    if (!tracking_number) {
      return res.status(400).json({
        success: false,
        message: 'Tracking number is required'
      });
    }

    if (!customer_name) {
      return res.status(400).json({
        success: false,
        message: 'Customer name is required'
      });
    }

    if (!origin) {
      return res.status(400).json({
        success: false,
        message: 'Origin is required'
      });
    }

    if (!destination) {
      return res.status(400).json({
        success: false,
        message: 'Destination is required'
      });
    }

    next();
  },

  loginValidation: (data) => {
    if (!data.username || !data.password) {
      return { error: { details: [{ message: 'Username and password are required' }] } };
    }
    return { error: null };
  }
};
