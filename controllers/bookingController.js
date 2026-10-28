const bookingService = require("../services/bookingService");


// ================= GET AVAILABLE ROOMS =================
exports.getAvailableRooms = async (req, res) => {
  const { check_in, check_out, room_type_id } = req.query;

  if (!check_in || !check_out) {
    return res.status(400).json({ message: "Thiếu ngày" });
  }

  try {
    const rooms = await bookingService.getAvailableRooms({
      check_in,
      check_out,
      room_type_id,
    });
    res.json(rooms);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



// ================= CREATE BOOKING =================
exports.createBooking = async (req, res) => {
  try {
    const result = await bookingService.createBooking({
      payload: req.body,
      user: req.user,
    });

    res.json({
      message: "Đặt phòng thành công",
      bookingId: result.bookingId,
      payment_status: result.payment_status,
      remaining_amount: result.remaining_amount,
      total_price: result.total_price,
      total_rooms: result.total_rooms,
    });

  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};



// ================= GET BOOKINGS =================
exports.getBookings = async (req, res) => {
  const {
    page = 1,
    limit = 6,
    status,
    search,
    check_in,
    check_out
  } = req.query;

  try {
    const result = await bookingService.getBookings({
      page,
      limit,
      status,
      search,
      check_in,
      check_out,
    });
    res.json(result);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



// ================= GET MY BOOKINGS =================
exports.getMyBookings = async (req, res) => {
  const {
    page = 1,
    limit = 6,
    status
  } = req.query;

  if (!req.user || !req.user.id) {
    return res.status(401).json({ message: "Bạn cần đăng nhập" });
  }

  try {
    const result = await bookingService.getBookings({
      page,
      limit,
      status,
      userId: req.user.id,
    });
    res.json(result);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



// ================= UPDATE STATUS =================
exports.updateBookingStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    await bookingService.updateBookingStatus({ id, status });

    res.json({ message: "Cập nhật thành công" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



// ================= PAY FULL REMAINING =================
exports.payFullRemaining = async (req, res) => {
  const { id } = req.params;
  const { payment_method = "cash" } = req.body || {};

  try {
    const result = await bookingService.payFullRemaining({ id, payment_method });
    if (result.notFound) {
      return res.status(404).json({ message: "Không tìm thấy booking" });
    }

    if (result.alreadyPaid) {
      return res.json({ message: "Booking đã thanh toán đủ" });
    }

    return res.json({
      message: "Đã thanh toán hết cho booking",
      paid_amount: result.paid_amount,
      remaining_amount: result.remaining_amount,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ================= DASHBOARD REPORT =================
exports.getDashboardReport = async (req, res) => {
  try {
    const result = await bookingService.getDashboardReport({ days: req.query.days });
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ================= DELETE =================
exports.deleteBooking = async (req, res) => {
  const { id } = req.params;

  try {
    await bookingService.deleteBooking(id);
    res.json({ message: "Xóa thành công" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};