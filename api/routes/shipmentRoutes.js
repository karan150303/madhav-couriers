const express = require('express');
const router = express.Router();
const {
  getShipments,
  getShipment,
  createShipment,
  updateShipment,
  deleteShipment,
  getRates
} = require('../controllers/shipmentController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getShipments)
  .post(protect, createShipment);

router.route('/rates')
  .get(getRates);

router.route('/:trackingNumber')
  .get(getShipment)
  .put(protect, updateShipment)
  .delete(protect, admin, deleteShipment);

module.exports = router;