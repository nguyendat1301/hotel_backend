const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const roleController = require("../controllers/roleController");
const verifyToken = require("../middleware/auth");
const { requirePermission } = require("../middleware/authorize");

router.use(verifyToken);

router.get("/", requirePermission("users.read"), userController.getUsers);
router.get("/:id/roles", requirePermission("users.read"), roleController.getUserRoles);
router.put("/:id/roles", requirePermission("roles.assign"), roleController.updateUserRoles);
router.get("/:id", requirePermission("users.read"), userController.getUserById);
router.post("/", requirePermission("users.create"), userController.createUser);
router.put("/:id", requirePermission("users.update"), userController.updateUser);
router.delete("/:id", requirePermission("users.delete"), userController.deleteUser);
router.delete("/:id/force", requirePermission("users.delete"), userController.deleteUsertrue); // Route để xóa vĩnh viễn
router.put("/:id/reset-password", requirePermission("users.reset_password"), userController.resetPassword);

module.exports = router;