const bcrypt = require("bcryptjs");
const userRepository = require("../repositories/userRepository");
const { getPagination, getPaginationMetadata } = require("../utils/pagination");

const getUsers = async ({ page, limit } = {}) => {
  const requestedPagination = getPagination({ page, limit });

  const totalItems = await userRepository.countUsers();
  const pagination = getPaginationMetadata(
    totalItems,
    requestedPagination.currentPage,
    requestedPagination.limit
  );
  const rows = await userRepository.getUsers({
    limit: pagination.limit,
    offset: pagination.offset,
  });

  return {
    data: rows,
    pagination: {
      totalItems: pagination.totalItems,
      totalPages: pagination.totalPages,
      currentPage: pagination.currentPage,
      limit: pagination.limit,
    },
  };
};

const getUserById = async (id) => {
  return userRepository.getUserById(id);
};

const createUser = async ({ user_name, email, password }) => {
  if (!user_name || !email || !password) {
    return { badRequest: "Missing required fields" };
  }

  const existingUser = await userRepository.getUserByEmail(email);
  if (existingUser) {
    return { badRequest: "Email already exists" };
  }

  const password_hash = await bcrypt.hash(password, 10);
  const id = await userRepository.createUser({
    user_name,
    email,
    role_user: "user",
    password: password_hash,
  });

  return { id };
};

const updateUser = async ({ id, user_name, email, role_user, status_user }) => {
  const affectedRows = await userRepository.updateUser({
    id,
    user_name,
    email,
    role_user,
    status_user,
  });
  return { notFound: affectedRows === 0 };
};

const deleteUsertrue = async (id) => {
  const affectedRows = await userRepository.deleteUserHard(id);
  return { notFound: affectedRows === 0 };
};

const deleteUser = async (id) => {
  const affectedRows = await userRepository.deleteUserSoft(id);
  return { notFound: affectedRows === 0 };
};

const resetPassword = async ({ id, newPassword }) => {
  const password_hash = await bcrypt.hash(newPassword, 10);
  const affectedRows = await userRepository.updatePassword({
    id,
    password: password_hash,
  });
  return { notFound: affectedRows === 0 };
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUsertrue,
  deleteUser,
  resetPassword,
};
