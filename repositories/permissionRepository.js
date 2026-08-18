const db = require('../db');

/**
 * Get distinct permission names assigned to a user through their roles.
 */
const getUserPermissions = async (userId) => {
  const [rows] = await db.query(
    `
    SELECT DISTINCT p.name
    FROM permissions p
    JOIN role_permissions rp ON p.id = rp.permission_id
    JOIN user_roles ur ON rp.role_id = ur.role_id
    WHERE ur.user_id = ?
    `,
    [userId]
  );
  return rows.map((r) => r.name);
};

/**
 * Get all permissions.
 */
const getAllPermissions = async () => {
  const [rows] = await db.query(
    `SELECT id, name, description, created_at, updated_at FROM permissions ORDER BY id ASC`
  );
  return rows;
};

/**
 * Get permission by ID.
 */
const getPermissionById = async (id) => {
  const [rows] = await db.query(
    `SELECT id, name, description, created_at, updated_at FROM permissions WHERE id = ?`,
    [id]
  );
  return rows[0] || null;
};

/**
 * Get permission by Name.
 */
const getPermissionByName = async (name) => {
  const [rows] = await db.query(
    `SELECT id, name, description, created_at, updated_at FROM permissions WHERE name = ?`,
    [name]
  );
  return rows[0] || null;
};

/**
 * Create a new permission.
 */
const createPermission = async ({ name, description }) => {
  const [result] = await db.query(
    `INSERT INTO permissions (name, description) VALUES (?, ?)`,
    [name, description]
  );
  return result.insertId;
};

/**
 * Update an existing permission.
 */
const updatePermission = async (id, { name, description }) => {
  const [result] = await db.query(
    `UPDATE permissions SET name = ?, description = ? WHERE id = ?`,
    [name, description, id]
  );
  return result.affectedRows;
};

/**
 * Delete a permission by ID.
 */
const deletePermission = async (id) => {
  const [result] = await db.query(`DELETE FROM permissions WHERE id = ?`, [id]);
  return result.affectedRows;
};

/**
 * Get permissions assigned to a role.
 */
const getRolePermissions = async (roleId) => {
  const [rows] = await db.query(
    `
    SELECT p.id, p.name, p.description
    FROM permissions p
    JOIN role_permissions rp ON p.id = rp.permission_id
    WHERE rp.role_id = ?
    ORDER BY p.id ASC
    `,
    [roleId]
  );
  return rows;
};

/**
 * Replace all permissions for a role using a transaction connection.
 */
const updateRolePermissionsTx = async (connection, roleId, permissionIds) => {
  await connection.query(`DELETE FROM role_permissions WHERE role_id = ?`, [roleId]);

  if (permissionIds && permissionIds.length > 0) {
    const values = permissionIds.map((pId) => [roleId, pId]);
    await connection.query(
      `INSERT INTO role_permissions (role_id, permission_id) VALUES ?`,
      [values]
    );
  }
};

module.exports = {
  getUserPermissions,
  getAllPermissions,
  getPermissionById,
  getPermissionByName,
  createPermission,
  updatePermission,
  deletePermission,
  getRolePermissions,
  updateRolePermissionsTx,
};
