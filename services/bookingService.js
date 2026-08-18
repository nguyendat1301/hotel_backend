const db = require("../db");
const bookingRepository = require("../repositories/bookingRepository");
const customerRepository = require("../repositories/customerRepository");
const roomRepository = require("../repositories/roomRepository");
const paymentRepository = require("../repositories/paymentRepository");
const dashboardRepository = require("../repositories/dashboardRepository");
const emailService = require("./emailService");

const normalizePayment = ({ totalPrice, paymentAmount }) => {
  const totalPriceNum = Number(totalPrice) || 0;
  const paymentAmountNum = Number(paymentAmount) || 0;
  const paidAmount = Math.max(0, Math.min(paymentAmountNum, totalPriceNum));
  const remainingAmount = Math.max(0, totalPriceNum - paidAmount);
  const paymentStatus = remainingAmount > 0 ? "PARTIAL_PAID" : "PAID";

  return { totalPriceNum, paidAmount, remainingAmount, paymentStatus };
};

const ensureCustomer = async (connection, bookingPayload, user) => {
  if (user) {
    const byUserId = await customerRepository.findCustomerIdByUserId(connection, user.id);
    if (byUserId) return byUserId;
    return customerRepository.createCustomerTransaction(connection, {
      full_name: bookingPayload.full_name,
      phone: bookingPayload.phone,
      email: bookingPayload.email,
      id_card: bookingPayload.id_card,
      user_id: user.id,
    });
  }

  const byEmail = await customerRepository.findCustomerIdByEmail(connection, bookingPayload.email);
  if (byEmail) return byEmail;
  return customerRepository.createCustomerTransaction(connection, {
    full_name: bookingPayload.full_name,
    phone: bookingPayload.phone,
    email: bookingPayload.email,
    id_card: bookingPayload.id_card,
  });
};

const getAvailableRooms = async ({ check_in, check_out, room_type_id }) => {
  return roomRepository.getAvailableRooms({
    checkIn: check_in,
    checkOut: check_out,
    roomTypeId: room_type_id,
  });
};

const createBooking = async ({ payload, user }) => {
  const connection = await db.getConnection();
  try {
    const payment = normalizePayment({
      totalPrice: payload.total_price,
      paymentAmount: payload.payment_amount,
    });

    await connection.beginTransaction();

    const customerId = await ensureCustomer(connection, payload, user);
    const hasConflict = await bookingRepository.hasBookingConflict(connection, {
      roomId: payload.room_id,
      checkInDate: payload.check_in_date,
      checkOutDate: payload.check_out_date,
    });

    if (hasConflict) {
      throw new Error("Phòng đã được đặt trong khoảng thời gian này");
    }

    const bookingId = await bookingRepository.createBooking(connection, {
      customerId,
      roomId: payload.room_id,
      checkInDate: payload.check_in_date,
      checkOutDate: payload.check_out_date,
      totalPrice: payment.totalPriceNum,
    });

    await paymentRepository.createPayment(connection, {
      bookingId,
      amount: payment.paidAmount,
      paymentMethod: payload.payment_method,
      status: payment.paymentStatus,
    });

    await connection.commit();

    // Send confirmation email if paid
    if (payment.paidAmount > 0) {
      emailService.sendBookingConfirmation(payload.email, {
        bookingId,
        checkInDate: payload.check_in_date,
        checkOutDate: payload.check_out_date,
        totalPrice: payment.totalPriceNum,
        paymentStatus: payment.paymentStatus,
      });
    }

    return {
      bookingId,
      payment_status: payment.paymentStatus,
      remaining_amount: payment.remainingAmount,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const getBookings = async ({ page = 1, limit = 6, status, search, check_in, check_out, userId }) => {
  const offset = (page - 1) * limit;
  const where = [];
  const params = [];

  if (userId) {
    where.push("c.user_id = ?");
    params.push(userId);
  }

  if (status) {
    where.push("LOWER(b.status) = LOWER(?)");
    params.push(status);
  }

  if (search) {
    let searchConditions = `
    c.full_name LIKE ? OR
    r.room_number LIKE ? OR
    c.id_card LIKE ?
  `;

    const searchParams = [
      `%${search}%`,
      `%${search}%`,
      `%${search}%`
    ];

    if (!isNaN(search) && search.trim() !== "") {
      searchConditions += " OR b.id = ?";
      searchParams.push(Number(search));
    }

    where.push(`(${searchConditions})`);
    params.push(...searchParams);
  }

  if (check_in) {
    where.push("b.check_in_date >= ?");
    params.push(check_in);
  }

  if (check_out) {
    where.push("b.check_out_date <= ?");
    params.push(check_out);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const rows = await bookingRepository.getBookings({ whereSql, params, limit, offset });
  const total = await bookingRepository.countBookings({ whereSql, params });

  const normalizedRows = rows.map((row) => {
    const totalPrice = Number(row.total_price) || 0;
    const paidAmount = Number(row.paid_amount) || 0;
    const remainingAmount = Math.max(0, totalPrice - paidAmount);
    return {
      ...row,
      paid_amount: paidAmount,
      remaining_amount: remainingAmount,
      payment_status: remainingAmount > 0 ? "PARTIAL_PAID" : "PAID",
    };
  });

  return {
    data: normalizedRows,
    pagination: {
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page, 10),
    },
  };
};

const updateBookingStatus = async ({ id, status }) => {
  await bookingRepository.updateBookingStatus({ id, status });

  const lowerStatus = status.toLowerCase();

  if (lowerStatus === "checked_in") {
    await roomRepository.updateRoomStatusByBookingId({
      bookingId: id,
      roomStatus: "occupied",
    });
  }

  if (lowerStatus === "checked_out" || lowerStatus === "cancelled") {
    await roomRepository.updateRoomStatusByBookingId({
      bookingId: id,
      roomStatus: "available",
    });
  }
};

const payFullRemaining = async ({ id, payment_method = "cash" }) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const booking = await bookingRepository.getBookingTotalById(connection, id);
    if (!booking) {
      await connection.rollback();
      return { notFound: true };
    }

    const paidAmount = await paymentRepository.getPaidAmountByBookingId(connection, id);
    const totalPrice = Number(booking.total_price) || 0;
    const remainingAmount = Math.max(0, totalPrice - paidAmount);

    if (remainingAmount <= 0) {
      await connection.rollback();
      return { alreadyPaid: true };
    }

    await paymentRepository.createPayment(connection, {
      bookingId: id,
      amount: remainingAmount,
      paymentMethod: payment_method,
      status: "PAID",
    });

    // Fetch details before commit so that any query errors trigger a clean rollback
    const bookingDetails = await bookingRepository.getBookingDetailsForEmail(connection, id);

    await connection.commit();

    // Send confirmation email
    if (bookingDetails) {
      try{
        await emailService.sendBookingConfirmation(bookingDetails.email, {
        ...bookingDetails,
        paymentStatus: "PAID",
      });
      }catch(error){
        console.error("Error sending booking confirmation email:", error);
      }
    }

    return {
      paid_amount: paidAmount + remainingAmount,
      remaining_amount: 0,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const getDashboardReport = async ({ days }) => {
  const normalizedDays = Math.min(Math.max(parseInt(days, 10) || 30, 7), 365);
  const { bookingAgg, paymentAgg, roomAgg } = await dashboardRepository.getDashboardSummary();
  const trendRows = await dashboardRepository.getBookingTrend(normalizedDays);
  const recentBookings = await dashboardRepository.getRecentBookings();

  return {
    summary: {
      total_bookings: Number(bookingAgg.total_bookings) || 0,
      booked_count: Number(bookingAgg.booked_count) || 0,
      checked_in_count: Number(bookingAgg.checked_in_count) || 0,
      checked_out_count: Number(bookingAgg.checked_out_count) || 0,
      avg_booking_value: Number(bookingAgg.avg_booking_value) || 0,
      total_revenue: Number(paymentAgg.total_revenue) || 0,
      collected_revenue: Number(paymentAgg.collected_revenue) || 0,
      outstanding_revenue: Number(paymentAgg.outstanding_revenue) || 0,
      total_rooms: Number(roomAgg.total_rooms) || 0,
      available_rooms: Number(roomAgg.available_rooms) || 0,
      occupied_rooms: Number(roomAgg.occupied_rooms) || 0,
    },
    trend: trendRows.map((row) => ({
      date: row.date,
      booking_count: Number(row.booking_count) || 0,
      expected_revenue: Number(row.expected_revenue) || 0,
      collected_revenue: Number(row.collected_revenue) || 0,
    })),
    recent_bookings: recentBookings,
  };
};

const deleteBooking = async (id) => {
  await bookingRepository.deleteBooking(id);
};

module.exports = {
  getAvailableRooms,
  createBooking,
  getBookings,
  updateBookingStatus,
  payFullRemaining,
  getDashboardReport,
  deleteBooking,
};
