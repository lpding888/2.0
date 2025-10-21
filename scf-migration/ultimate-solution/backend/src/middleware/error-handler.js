/**
 * 错误处理中间件
 * 统一的错误处理和响应格式
 */

const logger = require('../utils/logger')

class ErrorHandler {
  /**
   * 错误处理中间件
   */
  static middleware(err, req, res, next) {
    logger.error('未捕获的错误:', {
      error: err.message,
      stack: err.stack,
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    })

    // 根据错误类型返回不同的响应
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: '输入数据验证失败',
        details: err.message
      })
    }

    if (err.name === 'UnauthorizedError') {
      return res.status(401).json({
        success: false,
        message: '认证失败'
      })
    }

    if (err.code === 11000) {
      // MongoDB 重复键错误
      return res.status(409).json({
        success: false,
        message: '数据已存在'
      })
    }

    // 默认错误响应
    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'production'
        ? '服务器内部错误'
        : err.message,
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    })
  }

  /**
   * 404处理中间件
   */
  static notFound(req, res) {
    res.status(404).json({
      success: false,
      message: `接口不存在: ${req.method} ${req.originalUrl}`
    })
  }

  /**
   * 异步错误包装器
   */
  static asyncHandler(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next)
    }
  }
}

module.exports = ErrorHandler.middleware