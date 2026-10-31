const customerRepository = require('../repositories/customerRepository');
const { getPagination, getPaginationMetadata } = require("../utils/pagination");

const getAllCustomers = async ({ page, limit, search = "" } = {}) => {
    const requestedPagination = getPagination({ page, limit });
    const trimmedSearch = (search || "").trim();
    const whereClause = trimmedSearch
        ? "WHERE c.full_name LIKE ? OR c.phone LIKE ? OR c.id_card LIKE ? OR c.email LIKE ?"
        : "";
    const whereParams = trimmedSearch
        ? [`%${trimmedSearch}%`, `%${trimmedSearch}%`, `%${trimmedSearch}%`, `%${trimmedSearch}%`]
        : [];

    const totalItems = await customerRepository.countCustomers(whereClause, whereParams);
    const pagination = getPaginationMetadata(
        totalItems,
        requestedPagination.currentPage,
        requestedPagination.limit
    );
    const rows = await customerRepository.getCustomers({
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