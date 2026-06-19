const db = require("../db");

const getCustomers = async ({ whereClause, whereParams, limit, offset }) => {
    const [rows] = await db.query(`
    SELECT c.*, COUNT(b.id) as total_bookings
    FROM customers c
    LEFT JOIN bookings b ON c.id = b.customer_id
    ${whereClause}
    GROUP BY c.id
    ORDER BY c.id DESC
    LIMIT ? OFFSET ?`,
        [...whereParams, limit, offset]
    );
    return rows;
};

const getCustomerById = async (id) => {
    const [rows] = await db.query("Select * from Customers where id = ?", [id]);
    return rows[0] || null;
};



const createCustomer = async ({ full_name, phone, id_card, email }) => {
    await db.query(
        `
        insert into customers (full_name, phone, id_card, email)
        values (?, ?, ?, ?)
        `,
        [full_name, phone, id_card, email]
    );
};

const createCustomerTransaction = async (connection, { full_name, phone, id_card, email, user_id = null }) => {
    const [result] = await connection.query(
        `INSERT INTO customers (full_name, phone, id_card, email, user_id)
         VALUES (?, ?, ?, ?, ?)`,
        [full_name, phone, id_card, email, user_id]
    );
    return result.insertId;
};


const updateCustomer = async ({ id, full_name, phone, id_card, email }) => {
    await db.query(
        `update customers
        set full_name=?, phone=?, id_card=?, email=?
        where id=?`,
        [full_name, phone, id_card, email, id]
    );
};

const countCustomers = async (whereClause, whereParams) => {
    const [[{ total }]] = await db.query(
        `SELECT COUNT(*) as total FROM customers c
      ${whereClause}`,
        whereParams
    );
    return total;
};

const findCustomerIdByUserId = async (connection, userId) => {
    const [rows] = await connection.query(
        "SELECT id FROM customers WHERE user_id = ?",
        [userId]
    );
    return rows[0]?.id || null;
};

const findCustomerIdByEmail = async (connection, email) => {
    const [rows] = await connection.query("SELECT id FROM customers WHERE email = ?", [email]);
    return rows[0]?.id || null;
};

const deleteCustomer = async (id) => {
    // Delete payments and bookings associated with the customer to avoid foreign key errors
    await db.query("DELETE FROM payments WHERE booking_id IN (SELECT id FROM bookings WHERE customer_id = ?)", [id]);
    await db.query("DELETE FROM bookings WHERE customer_id = ?", [id]);
    await db.query("DELETE FROM customers WHERE id = ?", [id]);
};

module.exports = {
    getCustomers,
    getCustomerById,
    createCustomer,
    createCustomerTransaction,
    updateCustomer,
    countCustomers,
    findCustomerIdByUserId,
    findCustomerIdByEmail,
    deleteCustomer,
};