const db = require("../db");
const bookingRepository = require("../repositories/bookingRepository");
const customerRepository = require("../repositories/customerRepository");
const roomRepository = require("../repositories/roomRepository");
const paymentRepository = require("../repositories/paymentRepository");
const dashboardRepository = require("../repositories/dashboardRepository");
const emailService = require("./emailService");
const { calculateNights, getTodayDateOnly, isValidDateOnly } = require("../utils/dateOnly");
const { getPagination, getPaginationMetadata } = require("../utils/pagination");

const normalizePayment = ({ totalPrice, paymentAmount }) => {
  const totalPriceNum = Number(totalPrice) || 0;
  const paymentAmountNum = Number(paymentAmount) || 0;
  const paidAmount = Math.max(0, Math.min(paymentAmountNum, totalPriceNum));
  const remainingAmount = Math.max(0, totalPriceNum - paidAmount);
  const paymentStatus = remainingAmount > 0 ? "PARTIAL_PAID" : "PAID";

  return { totalPriceNum, paidAmount, remainingAmount, paymentStatus };
};

const ensureCustomer = async (connection, bookingPayload, user) => {
  if (user && user.id) {
    const byUserId = await customerRepository.findCustomerIdByUserId(connection, user.id);
    if (byUserId) return byUserId;
    return customerRepository.createCustomerTransaction(connection, {
      full_name: bookingPayload.full_name || user.user_name,
      phone: bookingPayload.phone || "",
      email: bookingPayload.email || user.email,
      id_card: bookingPayload.id_card || "",
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
  // 1. Validate dates
  const checkInDate = payload.check_in_date || payload.checkInDate;
  const checkOutDate = payload.check_out_date || payload.checkOutDate;

  if (!checkInDate || !checkOutDate) {
    throw new Error("Vui lòng cung cấp ngày nhận phòng và ngày trả phòng hợp lệ");
  }

  if (!isValidDateOnly(checkInDate) || !isValidDateOnly(checkOutDate)) {
    throw new Error("Định dạng ngày nhận/trả phòng không hợp lệ");
  }

  if (checkInDate < getTodayDateOnly()) {
    throw new Error("Ngày nhận phòng không thể ở trong quá khứ");
  }
  else if (checkInDate >= checkOutDate) {
    throw new Error("Ngày nhận phòng phải trước ngày trả phòng");
  }

  const nights = calculateNights(checkInDate, checkOutDate);

  // 2. Normalize and validate rooms list
  let requestedRooms = [];
  if (Array.isArray(payload.rooms) && payload.rooms.length > 0) {
    requestedRooms = payload.rooms.map((r) => ({
      roomId: Number(r.roomId || r.room_id || r.id),
      guestCount: Math.max(1, Number(r.guestCount || r.guest_count || 1)),
    }));
  } else if (payload.room_id || payload.roomId) {
    requestedRooms = [
      {
        roomId: Number(payload.room_id || payload.roomId),
        guestCount: Math.max(1, Number(payload.guest_count || payload.guestCount || 1)),
      },
    ];
  }

  if (requestedRooms.length === 0) {
    throw new Error("Vui lòng chọn ít nhất một phòng");
  }

  // Validate duplicate rooms
  const roomIds = requestedRooms.map((r) => r.roomId);
  const uniqueIds = new Set(roomIds);
  if (uniqueIds.size !== roomIds.length) {
    throw new Error("Không thể đặt cùng một phòng nhiều lần trong một đơn hàng");
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 3. Lock requested rooms and fetch official prices from DB with FOR UPDATE
    const dbRooms = await roomRepository.getRoomsWithDetailsByIds(connection, roomIds);

    if (dbRooms.length !== roomIds.length) {
      throw new Error("Một hoặc nhiều phòng được chọn không tồn tại trong hệ thống");
    }

    const dbRoomMap = new Map();
    for (const r of dbRooms) {
      if (r.status && r.status.toLowerCase() === "maintenance") {
        throw new Error(`Phòng ${r.room_number} hiện đang được bảo trì, không thể đặt`);
      }
      dbRoomMap.set(r.id, r);
    }

    // 4. Validate guest capacity for each room and prepare booking details
    let calculatedTotalPrice = 0;
    const roomDetailsToInsert = [];

    for (const reqRoom of requestedRooms) {
      const roomInfo = dbRoomMap.get(reqRoom.roomId);
      const maxGuests = roomInfo.max_guests || 2;
      if (reqRoom.guestCount > maxGuests) {
        throw new Error(
          `Phòng ${roomInfo.room_number} (${roomInfo.room_name}) chỉ chứa tối đa ${maxGuests} khách (bạn đã chọn ${reqRoom.guestCount} khách)`
        );
      }

      const pricePerNight = Number(roomInfo.price_per_night) || 0;
      const subtotal = pricePerNight * nights;
      calculatedTotalPrice += subtotal;

      roomDetailsToInsert.push({
        roomId: reqRoom.roomId,
        roomNumber: roomInfo.room_number,
        roomName: roomInfo.room_name,
        pricePerNight,
        nights,
        subtotal,
        guestCount: reqRoom.guestCount,
      });
    }

    // 5. Check overlapping conflicts (now that rooms are locked, this check is race-condition safe)
    const conflict = await bookingRepository.hasBookingConflict(connection, {
      roomIds,
      checkInDate,
      checkOutDate,
    });

    if (conflict) {
      throw new Error(
        `Phòng ${conflict.room_number || conflict.room_id} đã được đặt trong khoảng thời gian này`
      );
    }

    // 6. Ensure customer record
    const customerId = await ensureCustomer(connection, payload, user);

    // 7. Calculate payment
    const payment = normalizePayment({
      totalPrice: calculatedTotalPrice,
      paymentAmount: payload.payment_amount,
    });

    // 8. Insert into bookings (Header)
    const primaryRoomId = roomDetailsToInsert[0]?.roomId || null;
    const bookingId = await bookingRepository.createBooking(connection, {
      customerId,
      roomId: primaryRoomId,
      checkInDate,
      checkOutDate,
      totalPrice: calculatedTotalPrice,
      status: "BOOKED",
    });

    // 9. Insert items into booking_details
    await bookingRepository.createBookingDetails(connection, bookingId, roomDetailsToInsert);

    // 10. Record payment at order level
    await paymentRepository.createPayment(connection, {
      bookingId,
      amount: payment.paidAmount,
      paymentMethod: payload.payment_method || "transfer",
      status: payment.paymentStatus,
    });

    await connection.commit();

    // 11. Send confirmation email (after commit, with error isolated)
    try {
      const recipientEmail = payload.email || (user ? user.email : "");
      if (recipientEmail) {
        emailService.sendBookingConfirmation(recipientEmail, {
          bookingId,
          customerName: payload.full_name || (user ? user.user_name : ""),
          checkInDate,
          checkOutDate,
          totalPrice: calculatedTotalPrice,
          paymentStatus: payment.paymentStatus,
          rooms: roomDetailsToInsert,
          totalRooms: roomDetailsToInsert.length,
        });
      }
    } catch (emailErr) {
      console.error("Gửi email xác nhận thất bại (đơn đặt phòng vẫn thành công):", emailErr);
    }

    return {
      bookingId,
      payment_status: payment.paymentStatus,
      remaining_amount: payment.remainingAmount,
      total_price: calculatedTotalPrice,
      total_rooms: roomDetailsToInsert.length,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const getBookings = async ({
  page,
  limit,
  status,
  search,
  check_in,
  check_out,
  userId,
} = {}) => {
  const requestedPagination = getPagination({ page, limit });
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
  const totalItems = await bookingRepository.countBookings({ whereSql, params });
  const pagination = getPaginationMetadata(
    totalItems,
    requestedPagination.currentPage,
    requestedPagination.limit
  );
  const rows = await bookingRepository.getBookings({
    whereSql,
    params,
    limit: pagination.limit,
    offset: pagination.offset,
  });

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
      total: pagination.totalItems,
      totalItems: pagination.totalItems,
      totalPages: pagination.totalPages,
      currentPage: pagination.currentPage,
      limit: pagination.limit,
    },
  };
};

const canAccessBooking = (user, ownerUserId) =>
  ["admin"].includes(
    String(user?.role || "").toLowerCase().trim()
  ) ||
  (user?.id != null &&
    ownerUserId != null &&
    String(ownerUserId) === String(user.id));

const updateBookingStatus = async ({ id, status, user }) => {
  const booking = await bookingRepository.getBookingOwnerUserId(id);
  if (!booking) return { notFound: true };
  if (!canAccessBooking(user, booking.user_id)) {
    return { forbidden: true };
  }

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

  return {};
};

const payFullRemaining = async ({ id, payment_method = "cash", user }) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const booking = await bookingRepository.getBookingTotalById(connection, id);
    if (!booking) {
      await connection.rollback();
      return { notFound: true };
    }

    if (!canAccessBooking(user, booking.owner_user_id)) {
      await connection.rollback();
      return { forbidden: true };
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
      try {
        emailService.sendBookingConfirmation(bookingDetails.email, {
          ...bookingDetails,
          paymentStatus: "PAID",
        });
      } catch (emailErr) {
        console.error("Gửi email thanh toán nốt thất bại:", emailErr);
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
