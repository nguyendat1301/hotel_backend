const roleRepository = require('../repositories/roleRepository');
const cacheService = require('./cacheService');
const db = require('../db');

/**
 * Get all roles.
 */
const getAllRoles = async () => {
  return await roleRepository.getAllRoles();
};

/**
 * Get role by ID.
 */
const getRoleById = async (id) => {
  return await roleRepository.getRoleById(id);
};

/**
 * Create role.
 */
const createRole = async ({ name, description }) => {
  if (!name) {
    throw new Error('Tên vai trò không được để trống');
  }

  const existing = await roleRepository.getRoleByName(name);
  if (existing) {
    throw new Error(`Vai trò ${name} đã tồn tại`);
  }

  const id = await roleRepository.createRole({ name, description });
  return { id, name, description };
};

/**
 * Update role.
 */
const updateRole = async (id, { name, description }) => {
  const existing = await roleRepository.getRoleById(id);
  if (!existing) {
    throw new Error('Vai trò không tồn tại');
  }

  if (name && name !== existing.name) {
    const duplicate = await roleRepository.getRoleByName(name);
    if (duplicate) {
      throw new Error(`Vai trò ${name} đã tồn tại`);
    }
  }

  await roleRepository.updateRole(id, {
    name: name || existing.name,
    description: description !== undefined ? description : existing.description,
  });

  return { id, name, description };
};

/**
 * Delete role.
 */
const deleteRole = async (id) => {
  const affectedRows = await roleRepository.deleteRole(id);
  if (affectedRows === 0) {
    throw new Error('Vai trò không tồn tại');
  }
  cacheService.invalidateAll();
  return { success: true };
};

/**
 * Get roles for a specific user.
 */
const getUserRoles = async (userId) => {
  return await roleRepository.getUserRoles(userId);
};

/**
 * Update roles for a user atomically using a database transaction.
 */
const updateUserRoles = async (userId, roleIds) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    await roleRepository.updateUserRolesTx(connection, userId, roleIds);

    await connection.commit();

    // Invalidate permission cache for this specific user
    cacheService.invalidateUser(userId);

    return { success: true, userId, roleIds };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = {
  getAllRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  getUserRoles,
  updateUserRoles,
};
