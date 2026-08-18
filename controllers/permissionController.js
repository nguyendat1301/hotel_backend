const permissionService = require('../services/permissionService');

// GET ALL PERMISSIONS
exports.getAllPermissions = async (req, res) => {
  try {
    const permissions = await permissionService.getAllPermissions();
    res.json(permissions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET PERMISSION BY ID
exports.getPermissionById = async (req, res) => {
  try {
    const permission = await permissionService.getPermissionById(req.params.id);
    if (!permission) {
      return res.status(404).json({ message: 'Quyền không tồn tại' });
    }
    res.json(permission);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// CREATE PERMISSION
exports.createPermission = async (req, res) => {
  try {
    const result = await permissionService.createPermission(req.body);
    res.status(201).json({ message: 'Tạo quyền thành công', ...result });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// UPDATE PERMISSION
exports.updatePermission = async (req, res) => {
  try {
    const result = await permissionService.updatePermission(req.params.id, req.body);
    res.json({ message: 'Cập nhật quyền thành công', ...result });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// DELETE PERMISSION
exports.deletePermission = async (req, res) => {
  try {
    await permissionService.deletePermission(req.params.id);
    res.json({ message: 'Xóa quyền thành công' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
