/**
 * 日志工具
 * 统一的日志记录格式和级别管理
 */

const os = require('os')

class Logger {
  constructor() {
    this.hostname = os.hostname()
    this.pid = process.pid
    this.logLevel = process.env.LOG_LEVEL || 'info'
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    }
  }

  /**
   * 格式化日志消息
   */
  formatMessage(level, message, extra = {}) {
    const timestamp = new Date().toISOString()
    const logData = {
      timestamp,
      level: level.toUpperCase(),
      hostname: this.hostname,
      pid: this.pid,
      message,
      ...extra
    }

    return JSON.stringify(logData)
  }

  /**
   * 输出日志
   */
  log(level, message, extra = {}) {
    if (this.levels[level] <= this.levels[this.logLevel]) {
      const formattedMessage = this.formatMessage(level, message, extra)

      switch (level) {
        case 'error':
          console.error(formattedMessage)
          break
        case 'warn':
          console.warn(formattedMessage)
          break
        case 'info':
          console.info(formattedMessage)
          break
        case 'debug':
          console.debug(formattedMessage)
          break
        default:
          console.log(formattedMessage)
      }
    }
  }

  /**
   * 错误日志
   */
  error(message, extra = {}) {
    this.log('error', message, extra)
  }

  /**
   * 警告日志
   */
  warn(message, extra = {}) {
    this.log('warn', message, extra)
  }

  /**
   * 信息日志
   */
  info(message, extra = {}) {
    this.log('info', message, extra)
  }

  /**
   * 调试日志
   */
  debug(message, extra = {}) {
    this.log('debug', message, extra)
  }

  /**
   * 性能日志
   */
  performance(operation, duration, extra = {}) {
    this.info(`Performance: ${operation}`, {
      duration,
      operation,
      ...extra
    })
  }

  /**
   * 请求日志
   */
  request(req, res, duration) {
    this.info('HTTP Request', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    })
  }

  /**
   * 业务日志
   */
  business(event, data = {}) {
    this.info(`Business Event: ${event}`, {
      event,
      ...data
    })
  }

  /**
   * 安全日志
   */
  security(event, data = {}) {
    this.warn(`Security Event: ${event}`, {
      event,
      timestamp: new Date().toISOString(),
      ...data
    })
  }

  /**
   * 创建子日志器
   */
  child(context = {}) {
    return {
      error: (message, extra = {}) => this.error(message, { ...context, ...extra }),
      warn: (message, extra = {}) => this.warn(message, { ...context, ...extra }),
      info: (message, extra = {}) => this.info(message, { ...context, ...extra }),
      debug: (message, extra = {}) => this.debug(message, { ...context, ...extra }),
      performance: (operation, duration, extra = {}) => this.performance(operation, duration, { ...context, ...extra }),
      business: (event, data = {}) => this.business(event, { ...context, ...data }),
      security: (event, data = {}) => this.security(event, { ...context, ...data })
    }
  }
}

// 创建全局日志器实例
const logger = new Logger()

module.exports = logger