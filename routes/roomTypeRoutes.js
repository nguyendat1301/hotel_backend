const express = require('express');
const router = express.Router();
const roomTypeController = require('../controllers/roomTypeController');
const upload = require("../middleware/upload");
const verifyToken = require('../middleware/auth');
const { requirePermission } = require('../middleware/authorize');

router.get('/', roomTypeController.getAllRoomTypes);
router.get('/search', roomTypeController.searchRoomTypes);
router.get('/:id', roomTypeController.getRoomTypeById);
router.post('/', verifyToken, requirePermission('room_types.create'), upload.fields([
        { name: "image1", maxCount: 1 },
        { name: "image2", maxCount: 1 },
    ]), roomTypeController.createRoomType);
router.put('/:id', verifyToken, requirePermission('room_types.update'), upload.fields([
        { name: "image1", maxCount: 1 },
        { name: "image2", maxCount: 1 },
    ]), roomTypeController.updateRoomType);
router.delete('/:id', verifyToken, requirePermission('room_types.delete'), roomTypeController.deleteRoomType);

module.exports = router;