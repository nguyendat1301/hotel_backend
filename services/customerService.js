const customerRepository = require('../repositories/customerRepository');

const getAllCustomers = async ({ page = 1, limit = 6, search = "" }) => {
    const currentPage = parseInt(page, 10) || 1;
    const pageSize = parseInt(limit, 10) || 6;
    const trimmedSearch = (search || "").trim();
    const offset = (currentPage - 1) * pageSize;
    const whereClause = trimmedSearch
        ? "WHERE c.full_name LIKE ? OR c.phone LIKE ? OR c.id_card LIKE ? OR c.email LIKE ?"
        : "";
    const whereParams = trimmedSearch
        ? [`%${trimmedSearch}%`, `%${trimmedSearch}%`, `%${trimmedSearch}%`, `%${trimmedSearch}%`]
        : [];

    const total = await customerRepository.countCustomers(whereClause, whereParams);
    const rows = await customerRepository.getCustomers({
        whereClause,
        whereParams,
        limit: pageSize,
        offset,
    });

    return {
        data: rows,
        pagination: {
            totalItems: total,
            totalPages: Math.ceil(total / pageSize),
            currentPage,
            limit: pageSize,
        },
    };
};

const getCustomerById = async (id) => {
    return customerRepository.getCustomerById(id);
};

const createCustomer = async ({ full_name, phone, id_card, email }) => {
    await customerRepository.createCustomer({ full_name, phone, id_card, email });
};

const updateCustomer = async ({ id, full_name, phone, id_card, email }) => {
    await customerRepository.updateCustomer({ id, full_name, phone, id_card, email });
};

const deleteCustomer = async (id) => {
    await customerRepository.deleteCustomer(id);
};
module.exports = {
    getAllCustomers,
    getCustomerById,
    createCustomer,
    updateCustomer,
    deleteCustomer,
};