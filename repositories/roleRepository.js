const db = require('../db');

/**
 * Get all roles.
 */
const getAllRoles = async () => {
  const [rows] = await db.query(
    `SELECT id, name, description, created_at, updated_at FROM roles ORDER BY id ASC`
  );
  return rows;
};

/**
 * Get role by ID.
 */
const getRoleById = async (id) => {
  const [rows] = await db.query(
    `SELECT id, name, description, created_at, updated_at FROM roles WHERE id = ?`,
    [id]
  );
  return rows[0] || null;
};

/**
 * Get role by Name.
 */
const getRoleByName = async (name) => {
  const [rows] = await db.query(
    `SELECT id, name, description, created_at, updated_at FROM roles WHERE name = ?`,
    [name]
  );
  return rows[0] || null;
};

/**
 * Create a new role.
 */
const createRole = async ({ name, description }) => {
  const [result] = await db.query(
    `INSERT INTO roles (name, description) VALUES (?, ?)`,
    [name, description]
  );
  return result.insertId;
};

/**
 * Update role details.
 */
const updateRole = async (id, { name, description }) => {
  const [result] = await db.query(
    `UPDATE roles SET name = ?, description = ? WHERE id = ?`,
    [name, description, id]
  );
  return result.affectedRows;
};

/**
 * Delete a role.
 */
const deleteRole = async (id) => {
  const [result] = await db.query(`DELETE FROM roles WHERE id = ?`, [id]);
  return result.affectedRows;
};

/**
 * Get roles assigned to a user.
 */
const getUserRoles = async (userId) => {
  const [rows] = await db.query(
    `
    SELECT r.id, r.name, r.description
    FROM roles r
    JOIN user_roles ur ON r.id = ur.role_id
    WHERE ur.user_id = ?
    ORDER BY r.id ASC
    `,
    [userId]
  );
  return rows;
};

/**
 * Replace user roles atomically in a transaction.
 */
const updateUserRolesTx = async (connection, userId, roleIds) => {
  await connection.query(`DELETE FROM user_roles WHERE user_id = ?`, [userId]);

  if (roleIds && roleIds.length > 0) {
    const values = roleIds.map((rId) => [userId, rId]);
    await connection.query(
      `INSERT INTO user_roles (user_id, role_id) VALUES ?`,
      [values]
    );
  }
};

module.exports = {
  getAllRoles,
  getRoleById,
  getRoleByName,
  createRole,
  updateRole,
  deleteRole,
  getUserRoles,
  updateUserRolesTx,
};
