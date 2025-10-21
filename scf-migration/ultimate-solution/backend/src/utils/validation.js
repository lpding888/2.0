/**
 * 输入验证工具
 * 统一的数据验证和格式化
 */

const logger = require('./logger')

class ValidationHelper {
  /**
   * 验证输入数据
   */
  static validate(schema, data) {
    try {
      const errors = []

      for (const [field, rules] of Object.entries(schema)) {
        const value = data[field]
        const fieldErrors = this.validateField(field, value, rules)
        errors.push(...fieldErrors)
      }

      if (errors.length > 0) {
        return {
          valid: false,
          message: errors.join('; '),
          errors
        }
      }

      return {
        valid: true,
        message: '验证通过'
      }

    } catch (error) {
      logger.error('数据验证失败:', error)
      return {
        valid: false,
        message: '数据验证失败',
        error: error.message
      }
    }
  }

  /**
   * 验证单个字段
   */
  static validateField(fieldName, value, rules) {
    const errors = []

    // 检查必填
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push(`${fieldName} 是必填项`)
      return errors
    }

    // 如果值为空且不是必填，跳过其他验证
    if (value === undefined || value === null || value === '') {
      return errors
    }

    // 类型验证
    if (rules.type) {
      const typeError = this.validateType(fieldName, value, rules.type)
      if (typeError) {
        errors.push(typeError)
      }
    }

    // 字符串长度验证
    if (rules.type === 'string' && typeof value === 'string') {
      if (rules.minLength && value.length < rules.minLength) {
        errors.push(`${fieldName} 长度不能少于 ${rules.minLength} 个字符`)
      }
      if (rules.maxLength && value.length > rules.maxLength) {
        errors.push(`${fieldName} 长度不能超过 ${rules.maxLength} 个字符`)
      }
    }

    // 数值范围验证
    if (rules.type === 'number' && typeof value === 'number') {
      if (rules.min !== undefined && value < rules.min) {
        errors.push(`${fieldName} 不能小于 ${rules.min}`)
      }
      if (rules.max !== undefined && value > rules.max) {
        errors.push(`${fieldName} 不能大于 ${rules.max}`)
      }
    }

    // 数组长度验证
    if (rules.type === 'array' && Array.isArray(value)) {
      if (rules.minItems !== undefined && value.length < rules.minItems) {
        errors.push(`${fieldName} 至少需要 ${rules.minItems} 个元素`)
      }
      if (rules.maxItems !== undefined && value.length > rules.maxItems) {
        errors.push(`${fieldName} 最多只能有 ${rules.maxItems} 个元素`)
      }
    }

    // 枚举值验证
    if (rules.enum && !rules.enum.includes(value)) {
      errors.push(`${fieldName} 必须是以下值之一: ${rules.enum.join(', ')}`)
    }

    // 正则表达式验证
    if (rules.pattern && typeof value === 'string') {
      const regex = new RegExp(rules.pattern)
      if (!regex.test(value)) {
        errors.push(`${fieldName} 格式不正确`)
      }
    }

    // 自定义验证函数
    if (rules.validate && typeof rules.validate === 'function') {
      const customError = rules.validate(value)
      if (customError) {
        errors.push(customError)
      }
    }

    return errors
  }

  /**
   * 验证数据类型
   */
  static validateType(fieldName, value, expectedType) {
    let actualType = typeof value

    // 更精确的类型检测
    if (value === null) {
      actualType = 'null'
    } else if (Array.isArray(value)) {
      actualType = 'array'
    } else if (value instanceof Date) {
      actualType = 'date'
    } else if (Buffer.isBuffer(value)) {
      actualType = 'buffer'
    }

    if (actualType !== expectedType) {
      return `${fieldName} 类型错误，期望 ${expectedType}，实际 ${actualType}`
    }

    return null
  }

  /**
   * 清理和格式化数据
   */
  static sanitize(data, schema = {}) {
    const sanitized = {}

    for (const [field, rules] of Object.entries(schema)) {
      let value = data[field]

      // 跳过未定义的值
      if (value === undefined) {
        continue
      }

      // 类型转换
      if (rules.type && value !== null) {
        value = this.convertType(value, rules.type)
      }

      // 默认值
      if (value === null && rules.default !== undefined) {
        value = rules.default
      }

      // 字符串清理
      if (rules.type === 'string' && typeof value === 'string') {
        value = value.trim()
        if (rules.lowercase) {
          value = value.toLowerCase()
        }
        if (rules.uppercase) {
          value = value.toUpperCase()
        }
      }

      // 移除空字符串
      if (rules.removeEmpty && value === '') {
        continue
      }

      sanitized[field] = value
    }

    return sanitized
  }

  /**
   * 类型转换
   */
  static convertType(value, targetType) {
    try {
      switch (targetType) {
        case 'string':
          return String(value)
        case 'number':
          const num = Number(value)
          return isNaN(num) ? null : num
        case 'boolean':
          if (typeof value === 'boolean') return value
          if (typeof value === 'string') {
            return value.toLowerCase() === 'true'
          }
          return Boolean(value)
        case 'array':
          return Array.isArray(value) ? value : [value]
        case 'object':
          return typeof value === 'object' ? value : {}
        case 'date':
          return value instanceof Date ? value : new Date(value)
        default:
          return value
      }
    } catch (error) {
      logger.warn('类型转换失败:', { value, targetType, error: error.message })
      return null
    }
  }

  /**
   * 验证邮箱格式
   */
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  /**
   * 验证手机号格式（中国大陆）
   */
  static isValidPhoneNumber(phone) {
    const phoneRegex = /^1[3-9]\d{9}$/
    return phoneRegex.test(phone)
  }

  /**
   * 验证身份证号格式
   */
  static isValidIdNumber(idNumber) {
    const idRegex = /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/
    return idRegex.test(idNumber)
  }

  /**
   * 验证URL格式
   */
  static isValidUrl(url) {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  /**
   * 验证Base64格式
   */
  static isValidBase64(base64) {
    try {
      Buffer.from(base64, 'base64')
      return true
    } catch {
      return false
    }
  }

  /**
   * 验证图片Base64格式
   */
  static isValidImageBase64(base64) {
    if (!this.isValidBase64(base64)) {
      return false
    }

    // 检查图片格式
    const imageFormats = ['data:image/png', 'data:image/jpeg', 'data:image/jpg', 'data:image/webp']
    return imageFormats.some(format => base64.startsWith(format))
  }

  /**
   * 验证OpenID格式（微信）
   */
  static isValidOpenId(openId) {
    // OpenID 通常是28位字符串
    return typeof openId === 'string' && openId.length === 28 && /^[a-zA-Z0-9_-]+$/.test(openId)
  }

  /**
   * 验证文件大小
   */
  static isValidFileSize(size, maxSize) {
    return typeof size === 'number' && size >= 0 && size <= maxSize
  }

  /**
   * 验证分页参数
   */
  static validatePaginationParams(params = {}) {
    const schema = {
      page: { type: 'number', min: 1, default: 1 },
      pageSize: { type: 'number', min: 1, max: 100, default: 10 }
    }

    const validation = this.validate(schema, params)
    if (!validation.valid) {
      return { valid: false, message: validation.message }
    }

    return {
      valid: true,
      data: this.sanitize(params, schema)
    }
  }

  /**
   * 验证排序参数
   */
  static validateSortParams(sort, allowedFields = []) {
    if (!sort || typeof sort !== 'string') {
      return { valid: true, data: { createdAt: -1 } }
    }

    const [field, order] = sort.split(' ')
    const sortOrder = order === 'asc' ? 1 : -1

    if (allowedFields.length > 0 && !allowedFields.includes(field)) {
      return {
        valid: false,
        message: `排序字段必须是以下之一: ${allowedFields.join(', ')}`
      }
    }

    return {
      valid: true,
      data: { [field]: sortOrder }
    }
  }

  /**
   * 验证时间范围参数
   */
  static validateDateRange(params = {}) {
    const schema = {
      startDate: { type: 'date' },
      endDate: { type: 'date' }
    }

    const validation = this.validate(schema, params)
    if (!validation.valid) {
      return { valid: false, message: validation.message }
    }

    const sanitized = this.sanitize(params, schema)

    // 检查日期范围合理性
    if (sanitized.startDate && sanitized.endDate) {
      if (sanitized.startDate > sanitized.endDate) {
        return {
          valid: false,
          message: '开始日期不能晚于结束日期'
        }
      }
    }

    return {
      valid: true,
      data: sanitized
    }
  }
}

/**
 * 简化的验证函数
 */
function validateInput(schema, data) {
  return ValidationHelper.validate(schema, data)
}

module.exports = {
  ValidationHelper,
  validateInput
}