const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');
const verifyToken = require('../middleware/auth');
const { requirePermission } = require('../middleware/authorize');

router.get('/', roomController.getAllRooms);
router.get('/:id', roomController.getRoomById);
router.post('/', verifyToken, requirePermission('rooms.create'), roomController.createRoom);
router.put('/:id', verifyToken, requirePermission('rooms.update'), roomController.updateRoom);
router.delete('/:id', verifyToken, requirePermission('rooms.delete'), roomController.deleteRoom);

module.exports = router;