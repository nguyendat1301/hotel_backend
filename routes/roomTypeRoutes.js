const express = require('express');
const router = express.Router();
const roomTypeController = require('../controllers/roomTypeController');
const upload = require("../middleware/upload");
const verifyToken = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');   

router.get('/', roomTypeController.getAllRoomTypes);
router.get('/search', roomTypeController.searchRoomTypes);
router.get('/:id', roomTypeController.getRoomTypeById);
router.post('/', verifyToken, requireRole(['admin']), upload.fields([
    { name: "image1", maxCount: 1 },
    { name: "image2", maxCount: 1 },
]), roomTypeController.createRoomType);
router.put('/:id', verifyToken, requireRole(['admin']), upload.fields([
    { name: "image1", maxCount: 1 },
    { name: "image2", maxCount: 1 },
]), roomTypeController.updateRoomType);
router.delete('/:id', verifyToken, requireRole(['admin']), roomTypeController.deleteRoomType);

module.exports = router;