const express = require('express');
const router = express.Router();
const roleController = require('../controllers/roleController');
const verifyToken = require('../middleware/auth');
const { requirePermission } = require('../middleware/authorize');

router.use(verifyToken);

router.get('/', requirePermission('roles.read'), roleController.getAllRoles);
router.get('/:id', requirePermission('roles.read'), roleController.getRoleById);
router.post('/', requirePermission('roles.create'), roleController.createRole);
router.put('/:id', requirePermission('roles.update'), roleController.updateRole);
router.delete('/:id', requirePermission('roles.delete'), roleController.deleteRole);

router.get('/:id/permissions', requirePermission('roles.read'), roleController.getRolePermissions);
router.put('/:id/permissions', requirePermission('permissions.assign'), roleController.updateRolePermissions);

module.exports = router;
