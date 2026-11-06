/**
 * chatbotRepository.js
 *
 * Truy cập dữ liệu cho chatbot:
 *   1. CRUD cho bảng chatbot_knowledge_chunks (knowledge base)
 *   2. Query dữ liệu động: thông tin loại phòng + tình trạng sẵn có
 */

const db = require('../db');

// ============================================================
// KNOWLEDGE BASE CHUNKS
// ============================================================

/**
 * Lấy tất cả chunks đã có embedding (dùng cho retrieval).
 *
 * @returns {Promise<Array>}
 */
const getAllChunks = async () => {
    const [rows] = await db.query(`
        SELECT chunk_id, category, title, content, embedding
        FROM chatbot_knowledge_chunks
        WHERE embedding IS NOT NULL
        ORDER BY category, id
    `);
    return rows;
};

/**
 * Lấy chunks theo danh sách category.
 *
 * @param {string[]} categories
 * @returns {Promise<Array>}
 */
const getChunksByCategories = async (categories) => {
    if (!categories || categories.length === 0) return getAllChunks();

    const placeholders = categories.map(() => '?').join(', ');
    const [rows] = await db.query(
        `
            SELECT chunk_id, category, title, content, embedding
            FROM chatbot_knowledge_chunks
            WHERE category IN (${placeholders})
              AND embedding IS NOT NULL
            ORDER BY category, id
        `,
        categories
    );
    return rows;
};

/**
 * Lấy chunk theo chunk_id để kiểm tra trùng lặp trước khi ingest.
 *
 * @param {string} chunkId
 * @returns {Promise<object|null>}
 */
const getChunkByIdFromDB = async (chunkId) => {
    const [rows] = await db.query(
        `SELECT id, chunk_id, content, updated_at
         FROM chatbot_knowledge_chunks
         WHERE chunk_id = ?`,
        [chunkId]
    );
    return rows[0] || null;
};

/**
 * Thêm mới hoặc cập nhật chunk (upsert theo chunk_id).
 * Tránh duplicate khi chạy ingest nhiều lần.
 *
 * @param {{ chunk_id, category, title, content, embedding }} chunk
 * @returns {Promise<{ isNew: boolean }>}
 */
const upsertKnowledgeChunk = async ({ chunk_id, category, title, content, embedding }) => {
    const embeddingJson = JSON.stringify(embedding);

    // Kiểm tra chunk đã tồn tại chưa
    const existing = await getChunkByIdFromDB(chunk_id);

    if (existing) {
        // Update: cập nhật content và embedding
        await db.query(
            `UPDATE chatbot_knowledge_chunks
             SET category = ?, title = ?, content = ?, embedding = ?, updated_at = NOW()
             WHERE chunk_id = ?`,
            [category, title, content, embeddingJson, chunk_id]
        );
        return { isNew: false };
    } else {
        // Insert mới
        await db.query(
            `INSERT INTO chatbot_knowledge_chunks
             (chunk_id, category, title, content, embedding)
             VALUES (?, ?, ?, ?, ?)`,
            [chunk_id, category, title, content, embeddingJson]
        );
        return { isNew: true };
    }
};

/**
 * Lấy số lượng chunks trong DB.
 *
 * @returns {Promise<number>}
 */
const getChunkCount = async () => {
    const [[{ total }]] = await db.query(
        `SELECT COUNT(*) AS total FROM chatbot_knowledge_chunks`
    );
    return Number(total);
};

// ============================================================
// DYNAMIC DATA: ROOM TYPES (Dữ liệu thực tế, real-time)
// ============================================================

/**
 * Lấy thông tin loại phòng kèm số phòng hiện đang khả dụng.
 * Dùng cho câu hỏi về giá, sức chứa, danh sách loại phòng.
 *
 * Lưu ý: "rooms_marked_available" là số phòng có status = 'available'
 * trong DB, KHÔNG tính đến booking theo ngày cụ thể.
 * Người dùng cần đặt phòng trên website để biết tình trạng chính xác.
 *
 * @returns {Promise<Array>}
 */
const getRoomTypeKnowledge = async () => {
    const [rows] = await db.query(`
        SELECT
            rt.id,
            rt.room_name,
            rt.price_per_night,
            rt.max_guests,
            rt.description,
            COUNT(DISTINCT CASE
                WHEN LOWER(COALESCE(r.status, 'available')) = 'available'
                THEN r.id
            END) AS rooms_marked_available,
            COUNT(DISTINCT r.id) AS total_rooms
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

/**
 * Lấy tình trạng chi tiết của tất cả các loại phòng trong khoảng ngày cụ thể.
 * Trả về danh sách từng loại phòng kèm số phòng còn trống và tổng số phòng.
 *
 * @param {string} checkIn  - Ngày nhận phòng (YYYY-MM-DD)
 * @param {string} checkOut - Ngày trả phòng (YYYY-MM-DD)
 * @returns {Promise<Array<{ id, room_name, price_per_night, max_guests, description, total_rooms, available_rooms }>>}
 */
const getRoomAvailabilityByDate = async (checkIn, checkOut) => {
    const [rows] = await db.query(
        `
        SELECT
            rt.id,
            rt.room_name,
            rt.price_per_night,
            rt.max_guests,
            rt.description,
            COUNT(r.id) AS total_rooms,
            COUNT(CASE
                WHEN LOWER(COALESCE(r.status, 'available')) != 'maintenance'
                 AND NOT EXISTS (
                     SELECT 1 FROM booking_details bd
                     JOIN bookings b ON bd.booking_id = b.id
                     WHERE bd.room_id = r.id
                       AND LOWER(b.status) IN ('booked', 'checked_in')
                       AND b.check_in_date < ?
                       AND b.check_out_date > ?
                 )
                 AND NOT EXISTS (
                     SELECT 1 FROM bookings b
                     WHERE b.room_id = r.id
                       AND LOWER(b.status) IN ('booked', 'checked_in')
                       AND b.check_in_date < ?
                       AND b.check_out_date > ?
                 )
                THEN 1
            END) AS available_rooms
        FROM room_types rt
        LEFT JOIN room r ON r.room_type_id = rt.id
        GROUP BY rt.id, rt.room_name, rt.price_per_night, rt.max_guests, rt.description
        ORDER BY rt.price_per_night ASC, rt.room_name ASC
        `,
        [checkOut, checkIn, checkOut, checkIn]
    );
    return rows;
};

/**
 * Lấy số lượng loại phòng còn trống trong khoảng ngày cụ thể.
 * Dùng getAvailableRooms từ roomRepository để tính chính xác.
 * Trả về tóm tắt theo room_type để chatbot có thể thông báo.
 *
 * @param {string} checkIn  - Ngày nhận phòng (YYYY-MM-DD)
 * @param {string} checkOut - Ngày trả phòng (YYYY-MM-DD)
 * @returns {Promise<Array>}
 */
const getAvailableRoomTypesByDate = async (checkIn, checkOut) => {
    const [rows] = await db.query(
        `
        SELECT
            rt.room_name,
            rt.price_per_night,
            rt.max_guests,
            COUNT(r.id) AS available_rooms
        FROM room_types rt
        JOIN room r ON r.room_type_id = rt.id
        WHERE LOWER(COALESCE(r.status, 'available')) != 'maintenance'
          AND NOT EXISTS (
              SELECT 1 FROM booking_details bd
              JOIN bookings b ON bd.booking_id = b.id
              WHERE bd.room_id = r.id
                AND LOWER(b.status) IN ('booked', 'checked_in')
                AND b.check_in_date < ?
                AND b.check_out_date > ?
          )
          AND NOT EXISTS (
              SELECT 1 FROM bookings b
              WHERE b.room_id = r.id
                AND LOWER(b.status) IN ('booked', 'checked_in')
                AND b.check_in_date < ?
                AND b.check_out_date > ?
          )
        GROUP BY rt.id, rt.room_name, rt.price_per_night, rt.max_guests
        HAVING available_rooms > 0
        ORDER BY rt.price_per_night ASC
        `,
        [checkOut, checkIn, checkOut, checkIn]
    );
    return rows;
};

module.exports = {
    // Knowledge base
    getAllChunks,
    getChunksByCategories,
    getChunkByIdFromDB,
    upsertKnowledgeChunk,
    getChunkCount,
    // Dynamic data
    getRoomTypeKnowledge,
    getAvailableRoomTypesByDate,
    getRoomAvailabilityByDate,
};
