const permissionService = require('../services/permissionService');

/**
 * Express middleware to enforce permission-based authorization.
 * @param {string} permissionName - The required permission (e.g., 'rooms.delete', 'bookings.create')
 */
const requirePermission = (permissionName) => {
  return async (req, res, next) => {
    // 1. Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        message: "Không có token hoặc phiên làm việc đã hết hạn. Quyền truy cập bị từ chối.",
      });
    }

    try {
      // 2. Fetch user's permissions (from cache or DB)
      const userPermissions = await permissionService.getUserPermissions(req.user.id);

      // 3. Check if required permission is present
      if (!userPermissions || !userPermissions.includes(permissionName)) {
        return res.status(403).json({
          message: `Bạn không có quyền thực hiện thao tác này. Quyền yêu cầu: ${permissionName}`,
        });
      }

      // 4. Authorized -> Continue
      next();
    } catch (error) {
      return res.status(500).json({
        message: "Lỗi kiểm tra quyền hạn hệ thống",
        error: error.message,
      });
    }
  };
};

module.exports = {
  requirePermission,
};
