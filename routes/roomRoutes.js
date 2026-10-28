const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');
const verifyToken = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

router.get('/', roomController.getAllRooms);
router.get('/:id', roomController.getRoomById);
router.post('/', verifyToken, requireRole(['admin']), roomController.createRoom);
router.put('/:id', verifyToken, requireRole(['admin']), roomController.updateRoom);
router.delete('/:id', verifyToken, requireRole(['admin']), roomController.deleteRoom);

module.exports = router;