const db = require("../db");

const hasBookingConflict = async (connection, { roomIds, checkInDate, checkOutDate }) => {
  const ids = Array.isArray(roomIds) ? roomIds : [roomIds];
  if (ids.length === 0) return null;

  const [rows] = await connection.query(
    `
      SELECT 
        COALESCE(bd.room_id, b.room_id) AS room_id,
        r.room_number
      FROM bookings b
      LEFT JOIN booking_details bd ON bd.booking_id = b.id
      JOIN room r ON (r.id = bd.room_id OR r.id = b.room_id)
      WHERE (bd.room_id IN (?) OR b.room_id IN (?))
        AND LOWER(b.status) IN ('booked', 'checked_in')
        AND (b.check_in_date < ? AND b.check_out_date > ?)
      LIMIT 1
    `,
    [ids, ids, checkOutDate, checkInDate]
  );
  return rows.length > 0 ? rows[0] : null;
};

const createBooking = async (
  connection,
  { customerId, roomId = null, checkInDate, checkOutDate, totalPrice, status = "BOOKED" }
) => {
  const [result] = await connection.query(
    `
      INSERT INTO bookings
      (customer_id, room_id, check_in_date, check_out_date, total_price, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    [customerId, roomId, checkInDate, checkOutDate, totalPrice, status]
  );
  return result.insertId;
};

const createBookingDetails = async (connection, bookingId, roomDetails) => {
  if (!roomDetails || roomDetails.length === 0) return;
  const values = roomDetails.map((rd) => [
    bookingId,
    rd.roomId,
    rd.pricePerNight,
    rd.nights,
    rd.subtotal,
    rd.guestCount || 1,
  ]);

  await connection.query(
    `
      INSERT INTO booking_details
      (booking_id, room_id, price_per_night, nights, subtotal, guest_count)
      VALUES ?
    `,
    [values]
  );
};

const getBookingDetailsByBookingIds = async (bookingIds) => {
  if (!bookingIds || bookingIds.length === 0) return [];
  const [rows] = await db.query(
    `
      SELECT 
        bd.*,
        r.room_number,
        rt.room_name,
        rt.image1,
        rt.max_guests
      FROM booking_details bd
      JOIN room r ON bd.room_id = r.id
      JOIN room_types rt ON r.room_type_id = rt.id
      WHERE bd.booking_id IN (?)
      ORDER BY r.room_number ASC
    `,
    [bookingIds]
  );
  return rows;
};

const getBookings = async ({ whereSql, params, limit, offset }) => {
  const [rows] = await db.query(
    `
      SELECT
        b.*,
        c.full_name,
        c.phone,
        c.email,
        GROUP_CONCAT(DISTINCT r.room_number ORDER BY r.room_number ASC SEPARATOR ', ') AS room_numbers,
        COALESCE(p.paid_amount, 0) AS paid_amount,
        COALESCE(MAX(rt.image1), '') AS image1,
        COUNT(DISTINCT bd.room_id) AS total_rooms_count
      FROM bookings b
      JOIN customers c ON b.customer_id = c.id
      LEFT JOIN booking_details bd ON bd.booking_id = b.id
      LEFT JOIN room r ON (r.id = bd.room_id OR (bd.room_id IS NULL AND r.id = b.room_id))
      LEFT JOIN room_types rt ON r.room_type_id = rt.id
      LEFT JOIN (
        SELECT booking_id, SUM(amount) AS paid_amount
        FROM payments
        GROUP BY booking_id
      ) p ON p.booking_id = b.id
      ${whereSql}
      GROUP BY b.id, c.full_name, c.phone, c.email, p.paid_amount
      ORDER BY b.created_at DESC
      LIMIT ? OFFSET ?
    `,
    [...params, parseInt(limit, 10), parseInt(offset, 10)]
  );

  if (rows.length === 0) return [];

  const bookingIds = rows.map((r) => r.id);
  const allDetails = await getBookingDetailsByBookingIds(bookingIds);

  return rows.map((row) => {
    const details = allDetails.filter((d) => d.booking_id === row.id);
    return {
      ...row,
      room_number: row.room_numbers || row.room_number || "Chưa gán",
      rooms: details,
    };
  });
};

const countBookings = async ({ whereSql, params }) => {
  const [[{ total }]] = await db.query(
    `
      SELECT COUNT(DISTINCT b.id) as total
      FROM bookings b
      JOIN customers c ON b.customer_id = c.id
      LEFT JOIN booking_details bd ON bd.booking_id = b.id
      LEFT JOIN room r ON (r.id = bd.room_id OR (bd.room_id IS NULL AND r.id = b.room_id))
      ${whereSql}
    `,
    params
  );
  return total;
};

const updateBookingStatus = async ({ id, status }) => {
  await db.query(`UPDATE bookings SET status = ? WHERE id = ?`, [status, id]);
};

const getBookingOwnerUserId = async (id) => {
  const [[booking]] = await db.query(
    `
      SELECT c.user_id
      FROM bookings b
      JOIN customers c ON c.id = b.customer_id
      WHERE b.id = ?
    `,
    [id]
  );
  return booking || null;
};

const getBookingTotalById = async (connection, id) => {
  const [[booking]] = await connection.query(
    `
      SELECT b.id, b.total_price, c.user_id AS owner_user_id
      FROM bookings b
      JOIN customers c ON c.id = b.customer_id
      WHERE b.id = ?
    `,
    [id]
  );
  return booking || null;
};

const getBookingDetailsForEmail = async (connection, id) => {
  const [[booking]] = await connection.query(
    `
    SELECT 
      b.id as bookingId,
      b.check_in_date as checkInDate,
      b.check_out_date as checkOutDate,
      b.total_price as totalPrice,
      b.status,
      c.email,
      c.full_name as customerName
    FROM bookings b
    JOIN customers c ON b.customer_id = c.id
    WHERE b.id = ?
    `,
    [id]
  );
  if (!booking) return null;

  const [rooms] = await connection.query(
    `
    SELECT 
      bd.room_id,
      bd.price_per_night as pricePerNight,
      bd.nights,
      bd.subtotal,
      bd.guest_count as guestCount,
      r.room_number as roomNumber,
      rt.room_name as roomName
    FROM booking_details bd
    JOIN room r ON bd.room_id = r.id
    JOIN room_types rt ON r.room_type_id = rt.id
    WHERE bd.booking_id = ?
    ORDER BY r.room_number ASC
    `,
    [id]
  );

  return {
    ...booking,
    rooms,
    totalRooms: rooms.length,
  };
};

const deleteBooking = async (id) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    await connection.query(
      `DELETE FROM payments WHERE booking_id = ?`,
      [id]
    );

    await connection.query(
      `DELETE FROM booking_details WHERE booking_id = ?`,
      [id]
    );

    await connection.query(
      `DELETE FROM bookings WHERE id = ?`,
      [id]
    );

    await connection.commit();

  } catch (error) {
    await connection.rollback();
    throw error;

  } finally {
    connection.release();
  }
};

module.exports = {
  hasBookingConflict,
  createBooking,
  createBookingDetails,
  getBookingDetailsByBookingIds,
  getBookings,
  countBookings,
  updateBookingStatus,
  getBookingOwnerUserId,
  getBookingTotalById,
  getBookingDetailsForEmail,
  deleteBooking,
};
