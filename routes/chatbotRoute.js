/**
 * chatbotRoute.js
 *
 * Routes cho chatbot:
 *   POST /api/chatbot           – Public (có rate limit), gửi câu hỏi
 *   POST /api/chatbot/ingest    – Admin only, nạp knowledge base
 *   GET  /api/chatbot/stats     – Admin only, xem thống kê KB
 */

const express = require('express');
const router = express.Router();

const { chatbotLimiter } = require('../middleware/rateLimiter');
const verifyToken = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const { chat, ingest, stats, getKnowledge } = require('../controllers/chatbotController');

// Lấy danh sách FAQ, Chính sách từ knowledge base – Public endpoint
router.get('/knowledge', getKnowledge);

// Gửi câu hỏi đến chatbot – Public endpoint (có rate limit)
router.post('/', chatbotLimiter, chat);

// Nạp knowledge base – Chỉ ADMIN
router.post('/ingest', verifyToken, requireRole(['ADMIN']), ingest);

// Xem thống kê knowledge base – Chỉ ADMIN
router.get('/stats', verifyToken, requireRole(['ADMIN']), stats);

module.exports = router;
