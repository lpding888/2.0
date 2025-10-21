/**
 * 腾讯云SCF API网关处理器
 * 完全符合腾讯云SCF规范和事件格式
 */

const logger = require('../utils/logger')

/**
 * SCF主入口函数 - 完全符合腾讯云SCF规范
 * @param {Object} event - SCF事件对象
 * @param {Object} context - SCF上下文对象
 * @param {Function} callback - 回调函数
 */
exports.main_handler = async (event, context, callback) => {
  try {
    logger.info('SCF API网关请求', {
      event,
      context,
      requestId: context.request_id
    })

    // 解析API网关事件
    const apiGatewayEvent = parseAPIGatewayEvent(event)

    // 路由到对应的处理器
    const result = await routeRequest(apiGatewayEvent)

    // 返回标准的API网关响应格式
    const response = {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
      },
      body: JSON.stringify(result)
    }

    // 使用callback返回结果
    callback(null, response)

  } catch (error) {
    logger.error('SCF API网关处理失败', {
      error: error.message,
      stack: error.stack,
      requestId: context.request_id
    })

    // 返回错误响应
    const errorResponse = {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        message: '服务器内部错误',
        requestId: context.request_id
      })
    }

    callback(null, errorResponse)
  }
}

/**
 * 解析API网关事件
 */
function parseAPIGatewayEvent(event) {
  // 处理CORS预检请求
  if (event.httpMethod === 'OPTIONS') {
    return {
      method: 'OPTIONS',
      path: event.path,
      headers: event.headers || {},
      body: null,
      isCORS: true
    }
  }

  // 解析请求体
  let body = null
  if (event.body) {
    try {
      body = JSON.parse(event.body)
    } catch (e) {
      body = event.body
    }
  }

  // 提取路径参数
  const pathParams = extractPathParams(event.path)

  return {
    method: event.httpMethod,
    path: event.path,
    headers: event.headers || {},
    body,
    pathParams,
    queryParams: event.queryStringParameters || {}
  }
}

/**
 * 提取路径参数
 */
function extractPathParams(path) {
  const pathParts = path.split('/').filter(part => part)
  const params = {}

  // 解析不同路径格式的参数
  if (pathParts[0] === 'api' && pathParts.length >= 3) {
    // /api/{action} 格式
    params.action = pathParts[1]
  } else if (pathParts.length >= 2) {
    // /{service}/{action} 格式
    params.service = pathParts[0]
    params.action = pathParts[1]
  }

  return params
}

/**
 * 路由请求到对应处理器
 */
async function routeRequest(apiEvent) {
  const { method, path, pathParams, body } = apiEvent

  // CORS预检请求处理
  if (method === 'OPTIONS') {
    return {
      success: true,
      message: 'CORS预检成功'
    }
  }

  // 只处理POST请求
  if (method !== 'POST') {
    return {
      success: false,
      message: `不支持的方法: ${method}`
    }
  }

  try {
    // 根据路径参数路由
    if (pathParams.action) {
      return await handleAction(pathParams.action, body || {})
    }

    return {
      success: false,
      message: '无效的请求路径'
    }

  } catch (error) {
    logger.error('路由处理失败', error)
    return {
      success: false,
      message: error.message
    }
  }
}

/**
 * 处理具体的业务操作
 */
async function handleAction(action, data) {
  // 验证JWT token
  const token = data.token || data.headers?.Authorization || data.headers?.authorization
  let user = null

  if (token) {
    try {
      const jwt = require('jsonwebtoken')
      user = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET)
    } catch (error) {
      logger.warn('Token验证失败:', error.message)
    }
  }

  // 根据action路由到对应的服务
  switch (action) {
    // 用户相关操作
    case 'user.register':
    case 'user.login':
    case 'user.getInfo':
    case 'user.updateInfo':
      return await handleUserService(action, data, user)

    // AI生成相关操作
    case 'ai.generateVirtualTryon':
    case 'ai.generateFashionPhoto':
    case 'ai.generateDigitalAvatar':
    case 'ai.generateProductPhoto':
    case 'ai.getTaskStatus':
    case 'ai.cancelTask':
    case 'ai.getTaskResult':
      return await handleAIService(action, data, user)

    // AI造型师相关操作
    case 'stylist.getRecommendation':
    case 'stylist.analyzeClothing':
    case 'stylist.getTrends':
      return await handleStylistService(action, data, user)

    // 腾讯云CI相关操作
    case 'ci.intelligentMatting':
    case 'ci.smartCrop':
    case 'ci.imageRestore':
    case 'ci.assessImageQuality':
    case 'ci.batchProcess':
      return await handleCIService(action, data, user)

    // 缓存相关操作
    case 'cache.get':
    case 'cache.set':
    case 'cache.delete':
    case 'cache.stats':
    case 'cache.clear':
      return await handleCacheService(action, data, user)

    // 异步任务相关操作
    case 'task.create':
    case 'task.getStatus':
    case 'task.getList':
    case 'task.cancel':
    case 'task.getStats':
      return await handleTaskService(action, data, user)

    // 支付相关操作
    case 'payment.createOrder':
    case 'payment.getOrderInfo':
    case 'payment.getOrderList':
    case 'payment.cancelOrder':
    case 'payment.wechatPay':
    case 'payment.getSubscriptionInfo':
      return await handlePaymentService(action, data, user)

    // 管理相关操作
    case 'admin.getUsers':
    case 'admin.getUserDetail':
    case 'admin.updateUserStatus':
    case 'admin.getStatistics':
    case 'admin.getAIModels':
      return await handleAdminService(action, data, user)

    default:
      return {
        success: false,
        message: `不支持的操作: ${action}`
      }
  }
}

/**
 * 处理用户服务
 */
async function handleUserService(action, data, user) {
  try {
    const UserService = require('./user-service')
    const userService = new UserService(user)

    const methodMap = {
      'user.register': 'register',
      'user.login': 'login',
      'user.getInfo': 'getUserInfo',
      'user.updateInfo': 'updateUserInfo'
    }

    const methodName = methodMap[action]
    if (!methodName) {
      return {
        success: false,
        message: `不支持的用户操作: ${action}`
      }
    }

    return await userService[methodName](data)

  } catch (error) {
    logger.error('用户服务错误:', error)
    return {
      success: false,
      message: error.message
    }
  }
}

/**
 * 处理AI服务
 */
async function handleAIService(action, data, user) {
  if (!user) {
    return {
      success: false,
      message: '用户未登录'
    }
  }

  try {
    const AIService = require('./ai-generation')
    const aiService = new AIService(user.openId)

    const methodMap = {
      'ai.generateVirtualTryon': 'generateVirtualTryon',
      'ai.generateFashionPhoto': 'generateFashionPhoto',
      'ai.generateDigitalAvatar': 'generateDigitalAvatar',
      'ai.generateProductPhoto': 'generateProductPhoto',
      'ai.getTaskStatus': 'getTaskStatus',
      'ai.cancelTask': 'cancelTask',
      'ai.getTaskResult': 'getTaskResult'
    }

    const methodName = methodMap[action]
    if (!methodName) {
      return {
        success: false,
        message: `不支持的AI操作: ${action}`
      }
    }

    return await aiService[methodName](data)

  } catch (error) {
    logger.error('AI服务错误:', error)
    return {
      success: false,
      message: error.message
    }
  }
}

/**
 * 处理造型师服务
 */
async function handleStylistService(action, data, user) {
  if (!user) {
    return {
      success: false,
      message: '用户未登录'
    }
  }

  try {
    const AIStylistService = require('../services/ai-stylist-service')
    const stylistService = new AIStylistService(user.openId)

    const methodMap = {
      'stylist.getRecommendation': 'getStyleRecommendation',
      'stylist.analyzeClothing': 'analyzeClothingItem',
      'stylist.getTrends': 'getSeasonalTrends'
    }

    const methodName = methodMap[action]
    if (!methodName) {
      return {
        success: false,
        message: `不支持的造型师操作: ${action}`
      }
    }

    return await stylistService[methodName](data)

  } catch (error) {
    logger.error('造型师服务错误:', error)
    return {
      success: false,
      message: error.message
    }
  }
}

/**
 * 处理腾讯云CI服务
 */
async function handleCIService(action, data, user) {
  if (!user) {
    return {
      success: false,
      message: '用户未登录'
    }
  }

  try {
    const TencentCIService = require('../services/tencent-ci-service')
    const ciService = new TencentCIService()

    const methodMap = {
      'ci.intelligentMatting': 'intelligentMatting',
      'ci.smartCrop': 'smartCrop',
      'ci.imageRestore': 'imageRestore',
      'ci.assessImageQuality': 'assessImageQuality',
      'ci.batchProcess': 'batchProcess'
    }

    const methodName = methodMap[action]
    if (!methodName) {
      return {
        success: false,
        message: `不支持的CI操作: ${action}`
      }
    }

    return await ciService[methodName](data)

  } catch (error) {
    logger.error('CI服务错误:', error)
    return {
      success: false,
      message: error.message
    }
  }
}

/**
 * 处理缓存服务
 */
async function handleCacheService(action, data, user) {
  try {
    const CacheService = require('../services/cache-service')
    const cacheService = new CacheService()

    const methodMap = {
      'cache.get': 'get',
      'cache.set': 'set',
      'cache.delete': 'delete',
      'cache.stats': 'getStats',
      'cache.clear': 'clear'
    }

    const methodName = methodMap[action]
    if (!methodName) {
      return {
        success: false,
        message: `不支持的缓存操作: ${action}`
      }
    }

    return {
      success: true,
      data: await cacheService[methodName](data)
    }

  } catch (error) {
    logger.error('缓存服务错误:', error)
    return {
      success: false,
      message: error.message
    }
  }
}

/**
 * 处理任务服务
 */
async function handleTaskService(action, data, user) {
  if (!user) {
    return {
      success: false,
      message: '用户未登录'
    }
  }

  try {
    const AsyncTaskProcessor = require('../services/async-task-processor')
    const taskProcessor = new AsyncTaskProcessor()

    const methodMap = {
      'task.create': 'createTask',
      'task.getStatus': 'getTaskStatus',
      'task.getList': 'getTaskList',
      'task.cancel': 'cancelTask',
      'task.getStats': 'getSystemStats'
    }

    const methodName = methodMap[action]
    if (!methodName) {
      return {
        success: false,
        message: `不支持的任务操作: ${action}`
      }
    }

    return await taskProcessor[methodName](data)

  } catch (error) {
    logger.error('任务服务错误:', error)
    return {
      success: false,
      message: error.message
    }
  }
}

/**
 * 处理支付服务
 */
async function handlePaymentService(action, data, user) {
  if (!user) {
    return {
      success: false,
      message: '用户未登录'
    }
  }

  try {
    const PaymentService = require('./payment-service')
    const paymentService = new PaymentService(user.openId)

    const methodMap = {
      'payment.createOrder': 'createOrder',
      'payment.getOrderInfo': 'getOrderInfo',
      'payment.getOrderList': 'getOrderList',
      'payment.cancelOrder': 'cancelOrder',
      'payment.wechatPay': 'processWechatPay',
      'payment.getSubscriptionInfo': 'getSubscriptionInfo'
    }

    const methodName = methodMap[action]
    if (!methodName) {
      return {
        success: false,
        message: `不支持的支付操作: ${action}`
      }
    }

    return await paymentService[methodName](data)

  } catch (error) {
    logger.error('支付服务错误:', error)
    return {
      success: false,
      message: error.message
    }
  }
}

/**
 * 处理管理服务
 */
async function handleAdminService(action, data, user) {
  if (!user) {
    return {
      success: false,
      message: '用户未登录'
    }
  }

  // 检查管理员权限
  if (!user.isAdmin) {
    return {
      success: false,
      message: '权限不足'
    }
  }

  try {
    const AdminService = require('./admin-service')
    const adminService = new AdminService(user.openId)

    const methodMap = {
      'admin.getUsers': 'getUsers',
      'admin.getUserDetail': 'getUserDetail',
      'admin.updateUserStatus': 'updateUserStatus',
      'admin.getStatistics': 'getStatistics',
      'admin.getAIModels': 'getAIModels'
    }

    const methodName = methodMap[action]
    if (!methodName) {
      return {
        success: false,
        message: `不支持的管理操作: ${action}`
      }
    }

    return await adminService[methodName](data)

  } catch (error) {
    logger.error('管理服务错误:', error)
    return {
      success: false,
      message: error.message
    }
  }
}