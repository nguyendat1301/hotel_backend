const authService = require("../services/authService");

exports.register = async (req, res) => {
    try {
        const result = await authService.register(req.body);
        if (result.badRequest) {
            return res.status(400).json({ error: result.badRequest });
        }

        res.status(201).json({ message: "Đăng ký thành công!" });

    } catch (error) {
        // Bắt các lỗi hệ thống hoặc lỗi kết nối DB
        res.status(500).json({ error: "Đã xảy ra lỗi hệ thống: " + error.message });
    }
};

// authController.js - Hàm login
exports.login = async (req, res) => {
    try {
        const result = await authService.login(req.body);
        if (result.notFound) {
            return res.status(404).json({ message: "User không tồn tại" });
        }
        if (result.inactive) {
            return res.status(403).json({ message: "Tài khoản của bạn đã bị vô hiệu hoá. Vui lòng liên hệ quản trị viên." });
        }
        if (result.invalidPassword) {
            return res.status(401).json({ message: "Mật khẩu không đúng" });
        }

        res.cookie('token', result.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.json({
            message: "Đăng nhập thành công",
            user: result.user
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.googleLogin = async (req, res) => {
    try {
        const result = await authService.googleLogin(req.body);
        res.cookie('token', result.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.json({
            message: "Đăng nhập bằng Google thành công",
            user: result.user
        });
    } catch (error) {
        res.status(401).json({ error: error.message });
    }
};

exports.logout = (req, res) => {
    res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    });
    res.json({ message: "Đăng xuất thành công" });
};

exports.forgotPassword = async (req, res) => {
    try {
        const result = await authService.forgotPassword(req.body.email);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const result = await authService.resetPassword(req.body);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.getProfile = async (req, res) => {
    try {
        const user = await authService.getProfile(req.user.id);
        if (!user) {
            return res.status(401).json({ message: "Phiên đăng nhập không hợp lệ" });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const result = await authService.updateProfile(req.user.id, req.body);
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
