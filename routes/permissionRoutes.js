const express = require('express');
const router = express.Router();
const permissionController = require('../controllers/permissionController');
const verifyToken = require('../middleware/auth');
const { requirePermission } = require('../middleware/authorize');

router.use(verifyToken);

router.get('/', requirePermission('permissions.read'), permissionController.getAllPermissions);
router.get('/:id', requirePermission('permissions.read'), permissionController.getPermissionById);
router.post('/', requirePermission('permissions.create'), permissionController.createPermission);
router.put('/:id', requirePermission('permissions.update'), permissionController.updatePermission);
router.delete('/:id', requirePermission('permissions.delete'), permissionController.deletePermission);

module.exports = router;
