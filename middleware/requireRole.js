const requireRole = (allowedRoles = []) => {
  return (req, res, next) => {
    // Kiểm tra người dùng đã được xác thực chưa
    if (!req.user) {
      return res.status(401).json({
        message: "Bạn chưa đăng nhập",
      });
    }

    // Chuẩn hóa role
    const userRole = String(req.user.role || "")
      .toLowerCase()
      .trim();

    const roles = allowedRoles.map((role) =>
      String(role).toLowerCase().trim()
    );

    // Kiểm tra quyền
    if (!roles.includes(userRole)) {
      return res.status(403).json({
        message: "Bạn không có quyền thực hiện thao tác này",
      });
    }

    // Có quyền thì chuyển sang middleware/controller tiếp theo
    next();
  };
};

module.exports = requireRole;
