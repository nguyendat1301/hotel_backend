const { generateAnswer } = require("../services/chatbotService");

const chat = async (req, res) => {
    try {
        const { message, history = [] } = req.body;

        if (typeof message !== "string" || !message.trim() || message.length > 2000) {
            return res.status(400).json({
                message: "Vui lòng nhập câu hỏi không quá 2000 ký tự"
            });
        }

        if (!Array.isArray(history)) {
            return res.status(400).json({
                message: "Lịch sử hội thoại không hợp lệ"
            });
        }

        const answer = await generateAnswer(
            message.trim(),
            history.slice(-10)
        );

        return res.json({ answer });
    } catch (error) {
        console.error("Chatbot error:", error);

        return res.status(500).json({
            message: "Chatbot hiện không khả dụng"
        });
    }
};

module.exports = { chat };
