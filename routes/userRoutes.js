const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const verifyToken = require("../middleware/auth");
const requireRole = require("../middleware/authorize");


router.get("/", verifyToken, requireRole(['admin']), userController.getUsers);
router.get("/:id", verifyToken, requireRole(['admin']), userController.getUserById);
router.post("/", verifyToken, requireRole(['admin']), userController.createUser);
router.put("/:id", verifyToken, requireRole(['admin']), userController.updateUser);
router.delete("/:id", verifyToken, requireRole(['admin']), userController.deleteUser);
router.delete("/:id/force", verifyToken, requireRole(['admin']), userController.deleteUsertrue); // Route để xóa vĩnh viễn
router.put("/:id/reset-password", verifyToken, requireRole(['admin']), userController.resetPassword);

module.exports = router;