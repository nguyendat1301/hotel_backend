const roleService = require('../services/roleService');
const permissionService = require('../services/permissionService');

// GET ALL ROLES
exports.getAllRoles = async (req, res) => {
  try {
    const roles = await roleService.getAllRoles();
    res.json(roles);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET ROLE BY ID
exports.getRoleById = async (req, res) => {
  try {
    const role = await roleService.getRoleById(req.params.id);
    if (!role) {
      return res.status(404).json({ message: 'Vai trò không tồn tại' });
    }
    res.json(role);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// CREATE ROLE
exports.createRole = async (req, res) => {
  try {
    const result = await roleService.createRole(req.body);
    res.status(201).json({ message: 'Tạo vai trò thành công', ...result });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// UPDATE ROLE
exports.updateRole = async (req, res) => {
  try {
    const result = await roleService.updateRole(req.params.id, req.body);
    res.json({ message: 'Cập nhật vai trò thành công', ...result });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// DELETE ROLE
exports.deleteRole = async (req, res) => {
  try {
    await roleService.deleteRole(req.params.id);
    res.json({ message: 'Xóa vai trò thành công' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// GET ROLE PERMISSIONS
exports.getRolePermissions = async (req, res) => {
  try {
    const permissions = await permissionService.getRolePermissions(req.params.id);
    res.json(permissions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// UPDATE ROLE PERMISSIONS (ATOMIC)
exports.updateRolePermissions = async (req, res) => {
  const { permissionIds } = req.body;
  if (!Array.isArray(permissionIds)) {
    return res.status(400).json({ message: 'permissionIds phải là một mảng ID' });
  }

  try {
    const result = await permissionService.updateRolePermissions(
      req.params.id,
      permissionIds
    );
    res.json({ message: 'Cập nhật quyền cho vai trò thành công', ...result });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET USER ROLES
exports.getUserRoles = async (req, res) => {
  try {
    const roles = await roleService.getUserRoles(req.params.id);
    res.json(roles);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// UPDATE USER ROLES (ATOMIC)
exports.updateUserRoles = async (req, res) => {
  const { roleIds } = req.body;
  if (!Array.isArray(roleIds)) {
    return res.status(400).json({ message: 'roleIds phải là một mảng ID' });
  }

  try {
    const result = await roleService.updateUserRoles(req.params.id, roleIds);
    res.json({ message: 'Cập nhật vai trò cho người dùng thành công', ...result });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
