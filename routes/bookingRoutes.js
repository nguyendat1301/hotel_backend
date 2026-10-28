const express = require("express");
const router = express.Router();
const bookingController = require("../controllers/bookingController");
const verifyToken = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");

router.get("/available-rooms", bookingController.getAvailableRooms);
router.get("/dashboard/report", verifyToken, requireRole(['admin']), bookingController.getDashboardReport);
router.get("/my-bookings", verifyToken, bookingController.getMyBookings);
router.post("/", verifyToken, bookingController.createBooking);
router.get("/", verifyToken, requireRole(['admin']), bookingController.getBookings);
router.put("/:id/status", verifyToken, requireRole(['admin']), bookingController.updateBookingStatus);
router.post("/:id/pay-full", verifyToken, bookingController.payFullRemaining);
router.delete("/:id", verifyToken, requireRole(['admin']), bookingController.deleteBooking);

module.exports = router;