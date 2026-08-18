const express = require("express");
const router = express.Router();
const customerController = require("../controllers/customerController");
const verifyToken = require("../middleware/auth");
const { requirePermission } = require("../middleware/authorize");

router.use(verifyToken);

router.get("/", requirePermission("customers.read"), customerController.getAllCustomers);
router.get("/:id", requirePermission("customers.read"), customerController.getCustomerById);
router.post("/", requirePermission("customers.create"), customerController.createCustomer);
router.put("/:id", requirePermission("customers.update"), customerController.updateCustomer);
router.delete("/:id", requirePermission("customers.delete"), customerController.deleteCustomer);

module.exports = router;