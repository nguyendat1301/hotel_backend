const permissionRepository = require('../repositories/permissionRepository');
const cacheService = require('./cacheService');
const db = require('../db');

/**
 * Fetch permissions for a user (cached with fallback to DB).
 */
const getUserPermissions = async (userId) => {
  const cachedPerms = cacheService.get(userId);
  if (cachedPerms) {
    return cachedPerms;
  }

  const permissions = await permissionRepository.getUserPermissions(userId);
  cacheService.set(userId, permissions);
  return permissions;
};

/**
 * Get all permissions.
 */
const getAllPermissions = async () => {
  return await permissionRepository.getAllPermissions();
};

/**
 * Get permission by ID.
 */
const getPermissionById = async (id) => {
  return await permissionRepository.getPermissionById(id);
};

/**
 * Create permission.
 */
const createPermission = async ({ name, description }) => {
  if (!name) {
    throw new Error('Tên quyền không được để trống');
  }

  const existing = await permissionRepository.getPermissionByName(name);
  if (existing) {
    throw new Error(`Quyền ${name} đã tồn tại`);
  }

  const id = await permissionRepository.createPermission({ name, description });
  cacheService.invalidateAll();
  return { id, name, description };
};

/**
 * Update permission.
 */
const updatePermission = async (id, { name, description }) => {
  const existing = await permissionRepository.getPermissionById(id);
  if (!existing) {
    throw new Error('Quyền không tồn tại');
  }

  if (name && name !== existing.name) {
    const duplicate = await permissionRepository.getPermissionByName(name);
    if (duplicate) {
      throw new Error(`Quyền ${name} đã tồn tại`);
    }
  }

  await permissionRepository.updatePermission(id, {
    name: name || existing.name,
    description: description !== undefined ? description : existing.description,
  });

  cacheService.invalidateAll();
  return { id, name, description };
};

/**
 * Delete permission.
 */
const deletePermission = async (id) => {
  const affectedRows = await permissionRepository.deletePermission(id);
  if (affectedRows === 0) {
    throw new Error('Quyền không tồn tại');
  }
  cacheService.invalidateAll();
  return { success: true };
};

/**
 * Get permissions for a specific role.
 */
const getRolePermissions = async (roleId) => {
  return await permissionRepository.getRolePermissions(roleId);
};

/**
 * Update permissions for a specific role atomically using a database transaction.
 */
const updateRolePermissions = async (roleId, permissionIds) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    await permissionRepository.updateRolePermissionsTx(connection, roleId, permissionIds);

    await connection.commit();

    // Invalidate all user permissions in cache because role permissions changed
    cacheService.invalidateAll();

    return { success: true, roleId, permissionIds };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = {
  getUserPermissions,
  getAllPermissions,
  getPermissionById,
  createPermission,
  updatePermission,
  deletePermission,
  getRolePermissions,
  updateRolePermissions,
};
