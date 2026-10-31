const db = require("../db");

const getAllRoomTypes = async () => {
  const [rows] = await db.query("SELECT * FROM room_types ORDER BY id DESC");
  return rows;
};

const searchRoomTypes = async ({ whereSql, params, sort }) => {
  const orderBy = sort === "price_asc"
    ? "rt.price_per_night ASC, rt.id DESC"
    : sort === "price_desc"
      ? "rt.price_per_night DESC, rt.id DESC"
      : "rt.id DESC";

  const [rows] = await db.query(
    `
      SELECT
        rt.id,
        rt.room_name,
        rt.price_per_night,
        rt.max_guests,
        rt.description,
        rt.image1,
        rt.image2,
        COUNT(DISTINCT CASE WHEN r.status = 'available' THEN r.id END) AS available_rooms
      FROM room_types rt
      LEFT JOIN room r ON r.room_type_id = rt.id
      ${whereSql}
      GROUP BY rt.id
      ORDER BY ${orderBy}
    `,
    params
  );
  return rows;
};

const getRoomTypeById = async (id) => {
  const [rows] = await db.query("SELECT * FROM room_types WHERE id = ?", [id]);
  return rows[0] || null;
};

const getRoomTypeImagesById = async (id) => {
  const [rows] = await db.query(
    "SELECT image1, image2 FROM room_types WHERE id=?",
    [id]
  );
  return rows[0] || null;
};

const createRoomType = async ({
  room_name,
  price_per_night,
  max_guests,
  description,
  image1,
  image2,
}) => {
  await db.query(
    `INSERT INTO room_types
     (room_name, price_per_night, max_guests, description, image1, image2)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [room_name, price_per_night, max_guests, description, image1, image2]
  );
};

const updateRoomType = async ({
  id,
  room_name,
  price_per_night,
  max_guests,
  description,
  image1,
  image2,
}) => {
  await db.query(
    `UPDATE room_types
     SET room_name=?, price_per_night=?, max_guests=?, description=?, image1=?, image2=?
     WHERE id=?`,
    [room_name, price_per_night, max_guests, description, image1, image2, id]
  );
};

const deleteRoomType = async (id) => {
  await db.query("DELETE FROM room_types WHERE id=?", [id]);
};

module.exports = {
  getAllRoomTypes,
  searchRoomTypes,
  getRoomTypeById,
  getRoomTypeImagesById,
  createRoomType,
  updateRoomType,
  deleteRoomType,
};
