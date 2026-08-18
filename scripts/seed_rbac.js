const db = require('../db');

const permissionsData = [
  // User Management
  { name: 'users.read', description: 'Xem danh sách và chi tiết người dùng' },
  { name: 'users.create', description: 'Tạo người dùng mới' },
  { name: 'users.update', description: 'Cập nhật thông tin người dùng' },
  { name: 'users.delete', description: 'Xóa người dùng' },
  { name: 'users.reset_password', description: 'Đặt lại mật khẩu người dùng' },

  // Role Management
  { name: 'roles.read', description: 'Xem danh sách và chi tiết vai trò' },
  { name: 'roles.create', description: 'Tạo vai trò mới' },
  { name: 'roles.update', description: 'Cập nhật thông tin vai trò' },
  { name: 'roles.delete', description: 'Xóa vai trò' },

  // Permission Management
  { name: 'permissions.read', description: 'Xem danh sách quyền' },
  { name: 'permissions.create', description: 'Tạo quyền mới' },
  { name: 'permissions.update', description: 'Cập nhật quyền' },
  { name: 'permissions.delete', description: 'Xóa quyền' },
  { name: 'permissions.assign', description: 'Gán quyền cho vai trò' },

  // Room Management
  { name: 'rooms.read', description: 'Xem danh sách phòng' },
  { name: 'rooms.create', description: 'Tạo phòng mới' },
  { name: 'rooms.update', description: 'Cập nhật thông tin phòng' },
  { name: 'rooms.delete', description: 'Xóa phòng' },

  // Room Type Management
  { name: 'room_types.read', description: 'Xem loại phòng' },
  { name: 'room_types.create', description: 'Tạo loại phòng' },
  { name: 'room_types.update', description: 'Cập nhật loại phòng' },
  { name: 'room_types.delete', description: 'Xóa loại phòng' },

  // Booking Management
  { name: 'bookings.read', description: 'Xem đơn đặt phòng' },
  { name: 'bookings.create', description: 'Tạo đơn đặt phòng' },
  { name: 'bookings.update', description: 'Cập nhật đơn đặt phòng' },
  { name: 'bookings.cancel', description: 'Hủy đơn đặt phòng' },
  { name: 'bookings.delete', description: 'Xóa đơn đặt phòng' },
  { name: 'bookings.pay', description: 'Thanh toán đơn đặt phòng' },

  // Customer Management
  { name: 'customers.read', description: 'Xem thông tin khách hàng' },
  { name: 'customers.create', description: 'Tạo khách hàng' },
  { name: 'customers.update', description: 'Cập nhật khách hàng' },
  { name: 'customers.delete', description: 'Xóa khách hàng' },

  // Dashboard & Analytics
  { name: 'dashboard.read', description: 'Xem báo cáo dashboard' },
];

const rolesData = [
  { name: 'admin', description: 'Quản trị viên toàn hệ thống' },
  { name: 'manager', description: 'Quản lý khách sạn' },
  { name: 'receptionist', description: 'Lễ tân' },
  { name: 'customer', description: 'Khách hàng' },
];

const rolePermissionMappings = {
  admin: permissionsData.map((p) => p.name), // All permissions
  manager: [
    'rooms.read', 'rooms.create', 'rooms.update', 'rooms.delete',
    'room_types.read', 'room_types.create', 'room_types.update', 'room_types.delete',
    'bookings.read', 'bookings.create', 'bookings.update', 'bookings.cancel', 'bookings.delete', 'bookings.pay',
    'customers.read', 'customers.create', 'customers.update', 'customers.delete',
    'users.read', 'users.update',
    'dashboard.read'
  ],
  receptionist: [
    'rooms.read',
    'room_types.read',
    'bookings.read', 'bookings.create', 'bookings.update', 'bookings.cancel', 'bookings.pay',
    'customers.read', 'customers.create', 'customers.update'
  ],
  customer: [
    'rooms.read',
    'room_types.read',
    'bookings.read', 'bookings.create', 'bookings.cancel'
  ]
};

async function seedRBAC() {
  console.log('--- Starting RBAC Seed Process ---');
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Create tables if not exist
    await connection.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        description VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS permissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS user_roles (
        user_id INT NOT NULL,
        role_id INT NOT NULL,
        PRIMARY KEY (user_id, role_id),
        CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        role_id INT NOT NULL,
        permission_id INT NOT NULL,
        PRIMARY KEY (role_id, permission_id),
        CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
        CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    console.log('Tables initialized successfully.');

    // 2. Seed Permissions
    const permMap = new Map();
    for (const p of permissionsData) {
      await connection.query(
        `INSERT INTO permissions (name, description) VALUES (?, ?) ON DUPLICATE KEY UPDATE description = VALUES(description)`,
        [p.name, p.description]
      );
      const [[permRow]] = await connection.query(`SELECT id FROM permissions WHERE name = ?`, [p.name]);
      permMap.set(p.name, permRow.id);
    }
    console.log(`Seeded ${permissionsData.length} permissions.`);

    // 3. Seed Roles & Role Permissions
    const roleMap = new Map();
    for (const r of rolesData) {
      await connection.query(
        `INSERT INTO roles (name, description) VALUES (?, ?) ON DUPLICATE KEY UPDATE description = VALUES(description)`,
        [r.name, r.description]
      );
      const [[roleRow]] = await connection.query(`SELECT id FROM roles WHERE name = ?`, [r.name]);
      roleMap.set(r.name, roleRow.id);

      // Map permissions
      const allowedPerms = rolePermissionMappings[r.name] || [];
      for (const permName of allowedPerms) {
        const permId = permMap.get(permName);
        if (permId) {
          await connection.query(
            `INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)`,
            [roleRow.id, permId]
          );
        }
      }
    }
    console.log(`Seeded ${rolesData.length} roles with permissions.`);

    // 4. Migrate existing users from users.role_user to user_roles
    const [users] = await connection.query(`SELECT id, role_user FROM users`);
    let migratedCount = 0;
    for (const u of users) {
      const roleName = (u.role_user || 'customer').toLowerCase();
      let targetRoleId = roleMap.get(roleName);
      if (!targetRoleId && (roleName === 'user' || roleName === 'client')) {
        targetRoleId = roleMap.get('customer');
      }
      if (!targetRoleId) {
        targetRoleId = roleMap.get('customer');
      }

      if (targetRoleId) {
        await connection.query(
          `INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)`,
          [u.id, targetRoleId]
        );
        migratedCount++;
      }
    }
    console.log(`Migrated ${migratedCount} users into user_roles table.`);

    await connection.commit();
    console.log('--- RBAC Migration & Seed Completed Successfully ---');
  } catch (error) {
    await connection.rollback();
    console.error('Error during RBAC seed:', error);
    process.exit(1);
  } finally {
    connection.release();
    process.exit(0);
  }
}

seedRBAC();
