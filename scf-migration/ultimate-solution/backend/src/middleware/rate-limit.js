/**
 * 限流中间件
 * 基于IP和用户的请求频率限制
 */

const logger = require('../utils/logger')

class RateLimitMiddleware {
  constructor() {
    // 使用内存存储（生产环境应使用Redis）
    this.requests = new Map()
    this.maxRequests = 1000 // 最大请求数
    this.windowMs = 15 * 60 * 1000 // 15分钟窗口
  }

  /**
   * 清理过期记录
   */
  cleanup() {
    const now = Date.now()
    for (const [key, data] of this.requests.entries()) {
      if (now - data.resetTime > this.windowMs) {
        this.requests.delete(key)
      }
    }
  }

  /**
   * 检查请求限制
   */
  checkLimit(key) {
    const now = Date.now()
    const data = this.requests.get(key)

    if (!data || now > data.resetTime) {
      // 新的窗口期
      this.requests.set(key, {
        count: 1,
        resetTime: now + this.windowMs
      })
      return { allowed: true, remaining: this.maxRequests - 1 }
    }

    if (data.count >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: data.resetTime
      }
    }

    data.count++
    return {
      allowed: true,
      remaining: this.maxRequests - data.count,
      resetTime: data.resetTime
    }
  }

  /**
   * 获取客户端标识
   */
  getClientKey(req) {
    const ip = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for']
    const user = req.user?.openId
    return user ? `user:${user}` : `ip:${ip}`
  }

  /**
   * 中间件函数
   */
  middleware(req, res, next) {
    // 定期清理过期记录
    if (Math.random() < 0.01) { // 1%的概率执行清理
      this.cleanup()
    }

    const key = this.getClientKey(req)
    const result = this.checkLimit(key)

    // 设置响应头
    res.set({
      'X-RateLimit-Limit': this.maxRequests,
      'X-RateLimit-Remaining': result.remaining,
      'X-RateLimit-Reset': new Date(result.resetTime).toISOString()
    })

    if (!result.allowed) {
      logger.warn('请求频率超限:', {
        key,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      })

      return res.status(429).json({
        success: false,
        message: '请求过于频繁，请稍后再试',
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
      })
    }

    next()
  }
}

// 创建中间件实例
const rateLimitInstance = new RateLimitMiddleware()

module.exports = (req, res, next) => rateLimitInstance.middleware(req, res, next)