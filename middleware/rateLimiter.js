const rateLimit = require('express-rate-limit');

// Rate limiter cho các thao tác đăng nhập/đăng ký
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 phút
    max: 20, // Giới hạn mỗi IP tối đa 20 request mỗi cửa sổ 15 phút
    message: {
        message: "Quá nhiều yêu cầu từ IP này, vui lòng thử lại sau 15 phút"
    },
    standardHeaders: true, // Trả về thông tin giới hạn trong headers `RateLimit-*`
    legacyHeaders: false, // Vô hiệu hóa headers `X-RateLimit-*`
});

// Rate limiter khắt khe hơn cho quên mật khẩu/reset mật khẩu
const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 giờ
    max: 5, // Giới hạn mỗi IP tối đa 5 yêu cầu mỗi giờ
    message: {
        message: "Quá nhiều yêu cầu khôi phục mật khẩu, vui lòng thử lại sau 1 giờ"
    },
    standardHeaders: true,
    legacyHeaders: false,
});

const chatbotLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: {
        message: "Bạn đã gửi quá nhiều câu hỏi, vui lòng thử lại sau 15 phút"
    },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = {
    authLimiter,
    passwordResetLimiter,
    chatbotLimiter
};
