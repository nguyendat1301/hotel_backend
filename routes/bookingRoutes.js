const express = require("express");
const router = express.Router();
const bookingController = require("../controllers/bookingController");
const verifyToken = require("../middleware/auth");
const { requirePermission } = require("../middleware/authorize");

router.get("/available-rooms", bookingController.getAvailableRooms);
router.get("/dashboard/report", verifyToken, requirePermission("dashboard.read"), bookingController.getDashboardReport);
router.get("/my-bookings", verifyToken, requirePermission("bookings.read"), bookingController.getMyBookings);
router.post("/", verifyToken, requirePermission("bookings.create"), bookingController.createBooking);
router.get("/", verifyToken, requirePermission("bookings.read"), bookingController.getBookings);
router.put("/:id/status", verifyToken, requirePermission("bookings.update"), bookingController.updateBookingStatus);
router.post("/:id/pay-full", verifyToken, requirePermission("bookings.pay"), bookingController.payFullRemaining);
router.delete("/:id", verifyToken, requirePermission("bookings.delete"), bookingController.deleteBooking);

module.exports = router;