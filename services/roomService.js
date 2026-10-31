const roomRepository = require("../repositories/roomRepository");
const { getPagination, getPaginationMetadata } = require("../utils/pagination");

const getAllRooms = async ({ page, limit, search = "" } = {}) => {
  const requestedPagination = getPagination({ page, limit });
  const trimmedSearch = (search || "").trim();
  const whereClause = trimmedSearch ? "WHERE r.room_number LIKE ?" : "";
  const whereParams = trimmedSearch ? [`%${trimmedSearch}%`] : [];

  const totalItems = await roomRepository.countRooms(whereClause, whereParams);
  const pagination = getPaginationMetadata(
    totalItems,
    requestedPagination.currentPage,
    requestedPagination.limit
  );
  const rows = await roomRepository.getRooms({
    whereClause,
    whereParams,
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

const getRoomById = async (id) => {
  return roomRepository.getRoomById(id);
};

const createRoom = async ({ room_number, room_type_id, status }) => {
  await roomRepository.createRoom({
    room_number,
    room_type_id,
    status: status || "available",
  });
};

const updateRoom = async ({ id, room_number, room_type_id, status }) => {
  await roomRepository.updateRoom({ id, room_number, room_type_id, status });
};

const deleteRoom = async (id) => {
  await roomRepository.deleteRoom(id);
};

module.exports = {
  getAllRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
};
