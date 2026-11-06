/**
 * chatbotController.js
 *
 * Xử lý HTTP request/response cho chatbot:
 *   POST /api/chatbot       – Gửi câu hỏi, nhận câu trả lời
 *   POST /api/chatbot/ingest – Nạp knowledge base (chỉ dành cho ADMIN)
 */

const { generateAnswer } = require('../services/chatbotService');
const { ingestKnowledgeBase, getKnowledgeBaseStats } = require('../services/knowledgeBaseService');

// Giới hạn độ dài câu hỏi
const MAX_MESSAGE_LENGTH = 1000;

/**
 * POST /api/chatbot
 * Body: { message: string, history?: Array, sessionId?: string }
 * Response: { answer: string, sources: Array, intent: string }
 */
const chat = async (req, res) => {
    try {
        const { message, history = [], sessionId } = req.body;

        // --- Validation ---
        if (typeof message !== 'string' || !message.trim()) {
            return res.status(400).json({ message: 'Vui lòng nhập câu hỏi' });
        }

        if (message.length > MAX_MESSAGE_LENGTH) {
            return res.status(400).json({
                message: `Câu hỏi không được vượt quá ${MAX_MESSAGE_LENGTH} ký tự`
            });
        }

        if (!Array.isArray(history)) {
            return res.status(400).json({ message: 'Lịch sử hội thoại không hợp lệ' });
        }

        // --- Gọi RAG service ---
        const { answer, sources, intent } = await generateAnswer(
            message.trim(),
            history
        );

        return res.json({
            answer,
            sources,       // [{title, category}] – frontend hiển thị nguồn tham khảo
            intent,        // Thông tin debug (optional)
            sessionId: sessionId || null,
        });

    } catch (error) {
        // Log ở server nhưng không tiết lộ thông tin nội bộ cho client
        console.error('[Chatbot] Error:', error.message);

        const statusCode = Number(error?.status ?? error?.code);
        const isUpstreamError = [429, 500, 502, 503, 504].includes(statusCode);
        const isAborted = error.name === 'AbortError';

        if (isAborted) {
            return res.status(504).json({
                message: 'Chatbot mất quá nhiều thời gian để phản hồi. Vui lòng thử lại.'
            });
        }

        if (isUpstreamError) {
            return res.status(503).json({
                message: 'Dịch vụ AI đang tạm thời quá tải. Vui lòng thử lại sau ít phút.'
            });
        }

        return res.status(500).json({
            message: 'Chatbot hiện không khả dụng. Vui lòng liên hệ lễ tân để được hỗ trợ.'
        });
    }
};

/**
 * POST /api/chatbot/ingest
 * Body: { force?: boolean }
 * Yêu cầu: ADMIN role
 * Mục đích: Nạp hoặc cập nhật knowledge base từ data/hotel_knowledge.js
 */
const ingest = async (req, res) => {
    try {
        const { force = false } = req.body;

        const result = await ingestKnowledgeBase({ forceUpdate: Boolean(force) });
        const stats = await getKnowledgeBaseStats();

        return res.json({
            message: 'Knowledge base đã được cập nhật thành công',
            result,
            stats,
        });
    } catch (error) {
        console.error('[Chatbot Ingest] Error:', error.message);

        if (error.message.includes('chatbot_knowledge_chunks')) {
            return res.status(500).json({
                message: 'Bảng knowledge base chưa tồn tại. Hãy chạy migration SQL trước.',
            });
        }

        return res.status(500).json({
            message: 'Không thể cập nhật knowledge base. Kiểm tra log server.'
        });
    }
};

/**
 * GET /api/chatbot/stats
 * Yêu cầu: ADMIN role
 * Mục đích: Xem thống kê knowledge base
 */
const stats = async (req, res) => {
    try {
        const data = await getKnowledgeBaseStats();
        return res.json(data);
    } catch (error) {
        console.error('[Chatbot Stats] Error:', error.message);
        return res.status(500).json({ message: 'Không thể lấy thống kê' });
    }
};

/**
 * GET /api/chatbot/knowledge
 * Public endpoint: Lấy danh sách FAQ và chính sách từ hotel_knowledge.js
 * Query params: ?category=faq|policy|service|contact (optional)
 */
const getKnowledge = async (req, res) => {
    try {
        const { HOTEL_KNOWLEDGE_CHUNKS } = require('../data/hotel_knowledge');
        const { category } = req.query;

        let items = HOTEL_KNOWLEDGE_CHUNKS;
        if (category && category !== 'all') {
            items = items.filter((item) => item.category === category);
        }

        return res.json({
            total: items.length,
            items,
        });
    } catch (error) {
        console.error('[Chatbot Knowledge] Error:', error.message);
        return res.status(500).json({ message: 'Không thể lấy dữ liệu' });
    }
};

module.exports = { chat, ingest, stats, getKnowledge };
