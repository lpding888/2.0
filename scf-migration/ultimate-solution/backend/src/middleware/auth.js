/**
 * 认证中间件
 * 处理JWT验证和用户权限
 */

const jwt = require('jsonwebtoken')
const logger = require('../utils/logger')

class AuthMiddleware {
  /**
   * 可选认证中间件
   */
  static optional(req, res, next) {
    const token = req.headers?.authorization || req.headers?.Authorization

    if (!token) {
      req.user = null
      return next()
    }

    try {
      const decoded = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET)
      req.user = decoded
      next()
    } catch (error) {
      logger.warn('Token验证失败:', error.message)
      req.user = null
      next()
    }
  }

  /**
   * 必需认证中间件
   */
  static required(req, res, next) {
    const token = req.headers?.authorization || req.headers?.Authorization

    if (!token) {
      return res.status(401).json({
        success: false,
        message: '未提供认证令牌'
      })
    }

    try {
      const decoded = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET)
      req.user = decoded
      next()
    } catch (error) {
      logger.warn('Token验证失败:', error.message)
      return res.status(401).json({
        success: false,
        message: '认证令牌无效或已过期'
      })
    }
  }

  /**
   * 管理员权限中间件
   */
  static admin(req, res, next) {
    // 首先验证用户身份
    AuthMiddleware.required(req, res, () => {
      // 检查是否为管理员
      if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({
          success: false,
          message: '需要管理员权限'
        })
      }
      next()
    })
  }
}

module.exports = AuthMiddleware