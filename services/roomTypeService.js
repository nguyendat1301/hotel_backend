const cloudinary = require("../cloudinary");
const roomTypeRepository = require("../repositories/roomTypeRepository");

const getPublicId = (url) => {
  if (!url) return null;
  try {
    const parts = url.split("/");
    const folderIndex = parts.indexOf("room_types");
    if (folderIndex === -1) return null;

    const publicIdWithExtension = parts.slice(folderIndex).join("/");
    return publicIdWithExtension.split(".")[0];
  } catch (error) {
    console.error("Lỗi tách public_id:", error);
    return null;
  }
};

const mapImages = (row) => ({
  ...row,
  images: [row.image1, row.image2].filter(Boolean),
});

const getAllRoomTypes = async () => {
  return roomTypeRepository.getAllRoomTypes();
};

const searchRoomTypes = async (filters) => {
  const {
    keyword,
    room_name,
    max_guests,
    min_price,
    max_price,
    sort,
  } = filters || {};

  const requestedPage = Number(filters?.page);
  const currentPage = Number.isSafeInteger(requestedPage) && requestedPage > 0
    ? requestedPage
    : 1;
  const requestedLimit = Number(filters?.limit);
  const limit = Number.isSafeInteger(requestedLimit) && requestedLimit > 0
    ? Math.min(requestedLimit, 50)
    : 9;

  let whereClauses = [];
  let params = [];

  // 1. Nếu có keyword (ô search chung)
  if (keyword && keyword.trim()) {
    const trimmed = keyword.trim();
    const num = Number(trimmed);
    const isNum = !isNaN(num) && trimmed !== "";

    if (isNum) {
      whereClauses.push("(rt.room_name LIKE ? OR rt.description LIKE ? OR rt.max_guests >= ? OR rt.price_per_night <= ?)");
      params.push(`%${trimmed}%`, `%${trimmed}%`, num, num);
    } else {
      whereClauses.push("(rt.room_name LIKE ? OR rt.description LIKE ?)");
      params.push(`%${trimmed}%`, `%${trimmed}%`);
    }
  }

  // 2. Nếu có các filter riêng lẻ (từ HomeSearch)
  if (room_name && room_name.trim()) {
    whereClauses.push("rt.room_name LIKE ?");
    params.push(`%${room_name.trim()}%`);
  }

  if (max_guests) {
    whereClauses.push("rt.max_guests >= ?");
    params.push(Number(max_guests));
  }

  if (min_price) {
    whereClauses.push("rt.price_per_night >= ?");
    params.push(Number(min_price));
  }

  if (max_price) {
    whereClauses.push("rt.price_per_night <= ?");
    params.push(Number(max_price));
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

  const result = await roomTypeRepository.searchRoomTypes({
    whereSql,
    params,
    sort,
    limit,
    page: currentPage,
  });

  return {
    data: result.rows.map(mapImages),
    pagination: result.pagination,
  };
};

const getRoomTypeById = async (id) => {
  return roomTypeRepository.getRoomTypeById(id);
};

const createRoomType = async ({ body, files }) => {
  const { room_name, price_per_night, max_guests, description } = body;
  const image1 = files?.image1?.[0]?.path || null;
  const image2 = files?.image2?.[0]?.path || null;

  await roomTypeRepository.createRoomType({
    room_name,
    price_per_night,
    max_guests,
    description,
    image1,
    image2,
  });
};

const updateRoomType = async ({ id, body, files }) => {
  const { room_name, price_per_night, max_guests, description } = body;
  const oldImages = await roomTypeRepository.getRoomTypeImagesById(id);

  if (!oldImages) {
    return { notFound: true };
  }

  let image1 = oldImages.image1;
  let image2 = oldImages.image2;

  if (files?.image1) {
    if (image1) {
      const publicId = getPublicId(image1);
      if (publicId) {
        await cloudinary.uploader.destroy(publicId);
      }
    }
    image1 = files.image1[0].path;
  }

  if (files?.image2) {
    if (image2) {
      const publicId = getPublicId(image2);
      if (publicId) {
        await cloudinary.uploader.destroy(publicId);
      }
    }
    image2 = files.image2[0].path;
  }

  await roomTypeRepository.updateRoomType({
    id,
    room_name,
    price_per_night,
    max_guests,
    description,
    image1,
    image2,
  });

  return { notFound: false };
};

const deleteRoomType = async (id) => {
  await roomTypeRepository.deleteRoomType(id);
};

module.exports = {
  getAllRoomTypes,
  searchRoomTypes,
  getRoomTypeById,
  createRoomType,
  updateRoomType,
  deleteRoomType,
};
