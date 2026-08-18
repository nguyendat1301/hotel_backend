/**
 * In-Memory & Extensible Cache Service for RBAC Permissions.
 * Key format: auth:permissions:user:{userId}
 */

class CacheService {
  constructor() {
    this.cache = new Map();
    this.defaultTTL = 300000; // 5 minutes in ms
  }

  getKey(userId) {
    return `auth:permissions:user:${userId}`;
  }

  get(userId) {
    const key = this.getKey(userId);
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  set(userId, permissions, ttlMs = this.defaultTTL) {
    const key = this.getKey(userId);
    this.cache.set(key, {
      value: permissions,
      expiresAt: Date.now() + ttlMs,
    });
  }

  invalidateUser(userId) {
    const key = this.getKey(userId);
    this.cache.delete(key);
  }

  invalidateAll() {
    this.cache.clear();
  }
}

module.exports = new CacheService();
