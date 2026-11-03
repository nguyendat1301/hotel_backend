const express = require("express");
const router = express.Router();
const { chatbotLimiter } = require("../middleware/rateLimiter");

const { chat } =
    require("../controllers/chatbotController");

router.post("/", chatbotLimiter, chat);

module.exports = router;