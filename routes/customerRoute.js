const express = require("express");
const router = express.Router();
const customerController = require("../controllers/customerController");
const verifyToken = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");


router.get("/", verifyToken, requireRole(['admin']), customerController.getAllCustomers);
router.get("/:id", verifyToken, requireRole(['admin']), customerController.getCustomerById);
router.post("/", verifyToken, requireRole(['admin']), customerController.createCustomer);
router.put("/:id", verifyToken, requireRole(['admin']), customerController.updateCustomer);
router.delete("/:id", verifyToken, requireRole(['admin']), customerController.deleteCustomer);

module.exports = router;