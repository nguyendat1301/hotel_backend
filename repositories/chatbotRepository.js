const db = require("../db");

const getRoomTypeKnowledge = async () => {
  const [rows] = await db.query(`
    SELECT
      rt.room_name,
      rt.price_per_night,
      rt.max_guests,
      rt.description,
      COUNT(DISTINCT CASE
        WHEN LOWER(COALESCE(r.status, 'available')) = 'available' THEN r.id
      END) AS rooms_marked_available
    FROM room_types rt
    LEFT JOIN room r ON r.room_type_id = rt.id
    GROUP BY
      rt.id,
      rt.room_name,
      rt.price_per_night,
      rt.max_guests,
      rt.description
    ORDER BY rt.price_per_night ASC, rt.room_name ASC
  `);

  return rows;
};

module.exports = { getRoomTypeKnowledge };
