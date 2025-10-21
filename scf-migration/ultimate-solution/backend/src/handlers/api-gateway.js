/**
 * 统一API网关 - 路由所有请求
 * 替代微信云开发的统一入口
 */

const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const compression = require('compression')

// 导入各服务处理器
const UserService = require('../services/user-service')
const AIService = require('./ai-generation')
const CIService = require('../services/ci-service')
const PaymentService = require('../services/payment-service')
const AdminService = require('../services/admin-service')

// 导入中间件
const auth = require('../middleware/auth')
const rateLimit = require('../middleware/rate-limit')
const errorHandler = require('../middleware/error-handler')
const logger = require('../utils/logger')

class APIGateway {
  constructor() {
    this.app = express()
    this.setupMiddleware()
    this.setupRoutes()
    this.setupErrorHandling()
  }

  /**
   * 设置中间件
   */
  setupMiddleware() {
    // 安全中间件
    this.app.use(helmet({
      contentSecurityPolicy: false, // 小程序需要
      crossOriginEmbedderPolicy: false
    }))

    // CORS 配置
    this.app.use(cors({
      origin: true, // 允许所有来源，生产环境应该配置具体域名
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    }))

    // 压缩响应
    this.app.use(compression())

    // 解析请求体
    this.app.use(express.json({ limit: '10mb' }))
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }))

    // 请求日志
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        body: req.method === 'POST' ? this.sanitizeLogData(req.body) : undefined
      })
      next()
    })

    // 限流中间件
    this.app.use(rateLimit)
  }

  /**
   * 设置路由
   */
  setupRoutes() {
    const router = express.Router()

    // 健康检查
    router.get('/health', (req, res) => {
      res.json({
        success: true,
        data: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          version: process.env.SERVICE_VERSION || '2.0.0',
          environment: process.env.NODE_ENV || 'development'
        }
      })
    })

    // 用户服务路由
    router.post('/user/:action', auth.optional, async (req, res) => {
      try {
        const { action } = req.params
        const userService = new UserService(req.user)

        // 根据action调用对应方法
        const methodMap = {
          'register': 'register',
          'login': 'login',
          'getInfo': 'getUserInfo',
          'updateInfo': 'updateUserInfo',
          'getWorks': 'getUserWorks',
          'updateSettings': 'updateUserSettings',
          'getCreditInfo': 'getCreditInfo',
          'recharge': 'rechargeCredits'
        }

        const methodName = methodMap[action]
        if (!methodName) {
          return res.status(400).json({
            success: false,
            message: `不支持的用户操作: ${action}`
          })
        }

        const result = await userService[methodName](req.body)
        res.json(result)

      } catch (error) {
        logger.error('用户服务错误:', error)
        res.status(500).json({
          success: false,
          message: error.message
        })
      }
    })

    // AI生成服务路由
    router.post('/ai/:action', auth.required, async (req, res) => {
      try {
        const { action } = req.params
        const aiService = new AIService(req.user.openId)

        const methodMap = {
          'generateVirtualTryon': 'generateVirtualTryon',
          'generateFashionPhoto': 'generateFashionPhoto',
          'generateDigitalAvatar': 'generateDigitalAvatar',
          'generateProductPhoto': 'generateProductPhoto',
          'getTaskStatus': 'getTaskStatus',
          'cancelTask': 'cancelTask',
          'getTaskResult': 'getTaskResult'
        }

        const methodName = methodMap[action]
        if (!methodName) {
          return res.status(400).json({
            success: false,
            message: `不支持的AI操作: ${action}`
          })
        }

        const result = await aiService[methodName](req.body)
        res.json(result)

      } catch (error) {
        logger.error('AI服务错误:', error)
        res.status(500).json({
          success: false,
          message: error.message
        })
      }
    })

    // 数据万象服务路由
    router.post('/ci/:action', auth.required, async (req, res) => {
      try {
        const { action } = req.params
        const ciService = new CIService(req.user.openId)

        const methodMap = {
          'intelligentMatting': 'intelligentMatting',
          'smartCrop': 'smartCrop',
          'imageRestore': 'imageRestore',
          'qualityAssess': 'assessImageQuality',
          'detectLabels': 'detectImageLabels',
          'contentModeration': 'contentModeration',
          'batchProcess': 'batchProcess'
        }

        const methodName = methodMap[action]
        if (!methodName) {
          return res.status(400).json({
            success: false,
            message: `不支持的CI操作: ${action}`
          })
        }

        const result = await ciService[methodName](req.body)
        res.json(result)

      } catch (error) {
        logger.error('CI服务错误:', error)
        res.status(500).json({
          success: false,
          message: error.message
        })
      }
    })

    // 支付服务路由
    router.post('/payment/:action', auth.required, async (req, res) => {
      try {
        const { action } = req.params
        const paymentService = new PaymentService(req.user.openId)

        const methodMap = {
          'createOrder': 'createOrder',
          'getOrderInfo': 'getOrderInfo',
          'getOrderList': 'getOrderList',
          'cancelOrder': 'cancelOrder',
          'wechatPay': 'processWechatPay',
          'payCallback': 'handlePaymentCallback',
          'getSubscriptionInfo': 'getSubscriptionInfo'
        }

        const methodName = methodMap[action]
        if (!methodName) {
          return res.status(400).json({
            success: false,
            message: `不支持的支付操作: ${action}`
          })
        }

        const result = await paymentService[methodName](req.body)
        res.json(result)

      } catch (error) {
        logger.error('支付服务错误:', error)
        res.status(500).json({
          success: false,
          message: error.message
        })
      }
    })

    // 管理后台服务路由
    router.post('/admin/:action', auth.admin, async (req, res) => {
      try {
        const { action } = req.params
        const adminService = new AdminService(req.user.openId)

        const methodMap = {
          'getUsers': 'getUsers',
          'getUserDetail': 'getUserDetail',
          'updateUserStatus': 'updateUserStatus',
          'getWorks': 'getAllWorks',
          'deleteWork': 'deleteWork',
          'getStatistics': 'getStatistics',
          'getOrders': 'getOrders',
          'updateOrderStatus': 'updateOrderStatus',
          'getAIModels': 'getAIModels',
          'updateAIModelConfig': 'updateAIModelConfig',
          'getSystemLogs': 'getSystemLogs'
        }

        const methodName = methodMap[action]
        if (!methodName) {
          return res.status(400).json({
            success: false,
            message: `不支持的管理操作: ${action}`
          })
        }

        const result = await adminService[methodName](req.body)
        res.json(result)

      } catch (error) {
        logger.error('管理服务错误:', error)
        res.status(500).json({
          success: false,
          message: error.message
        })
      }
    })

    // 兼容微信云开发的统一API接口
    router.post('/api', auth.optional, async (req, res) => {
      try {
        const { action, ...data } = req.body

        // 根据action路由到对应服务
        if (action.startsWith('user')) {
          // 用户相关操作
          const userService = new UserService(req.user)
          let result

          switch (action) {
            case 'user.getWorks':
              result = await userService.getUserWorks(data)
              break
            case 'user.getWorkDetail':
              result = await userService.getWorkDetail(data)
              break
            case 'user.toggleFavorite':
              result = await userService.toggleFavorite(data)
              break
            default:
              throw new Error(`不支持的操作: ${action}`)
          }

          res.json(result)

        } else if (action.startsWith('scene')) {
          // 场景相关操作
          const sceneService = require('../services/scene-service')
          const result = await sceneService[action.replace('scene.', '')](data)
          res.json(result)

        } else if (action.startsWith('prompt')) {
          // 提示词相关操作
          const promptService = require('../services/prompt-service')
          const result = await promptService[action.replace('prompt.', '')](data)
          res.json(result)

        } else {
          res.status(400).json({
            success: false,
            message: `不支持的操作: ${action}`
          })
        }

      } catch (error) {
        logger.error('统一API错误:', error)
        res.status(500).json({
          success: false,
          message: error.message
        })
      }
    })

    this.app.use('/api', router)
  }

  /**
   * 设置错误处理
   */
  setupErrorHandling() {
    // 404处理
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        message: `接口不存在: ${req.method} ${req.originalUrl}`
      })
    })

    // 全局错误处理
    this.app.use(errorHandler)
  }

  /**
   * 清理日志中的敏感数据
   */
  sanitizeLogData(data) {
    if (!data || typeof data !== 'object') return data

    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'openid']
    const sanitized = { ...data }

    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '[REDACTED]'
      } else if (typeof sanitized[key] === 'object') {
        sanitized[key] = this.sanitizeLogData(sanitized[key])
      }
    }

    return sanitized
  }

  /**
   * 获取Express应用实例
   */
  getApp() {
    return this.app
  }
}

// SCF入口函数
exports.main_handler = async (event, context) => {
  try {
    logger.info('API网关请求:', {
      path: event.path,
      method: event.httpMethod,
      headers: event.headers
    })

    // 解析请求体
    let body
    try {
      body = event.body ? JSON.parse(event.body) : {}
    } catch (e) {
      body = event.body || {}
    }

    // 模拟路由处理（简化版本）
    const { path } = event
    const method = event.httpMethod

    // 健康检查
    if (path === '/api/health' && method === 'GET') {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: true,
          data: {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: process.env.SERVICE_VERSION || '2.0.0',
            environment: process.env.NODE_ENV || 'development'
          }
        })
      }
    }

    // API请求处理
    if (path.startsWith('/api/') && method === 'POST') {
      // 从路径中提取action
      const pathParts = path.split('/')
      let action = body.action

      if (pathParts.length >= 4) {
        // /api/user/register -> user/register
        action = `${pathParts[2]}.${pathParts[3]}`
      }

      // 根据action处理不同请求
      if (action.startsWith('user.')) {
        const UserService = require('./user-service')
        return await handleUserService(UserService, action, body, event)
      } else if (action.startsWith('ai.')) {
        const AIService = require('./ai-generation')
        return await handleAIService(AIService, action, body, event)
      } else if (action.startsWith('photography.')) {
        const PhotographyService = require('../services/photography-service')
        return await handlePhotographyService(PhotographyService, action, body, event)
      } else if (action.startsWith('fitting.')) {
        const FittingService = require('../services/fitting-service')
        return await handleFittingService(FittingService, action, body, event)
      } else if (action.startsWith('scene.')) {
        const SceneService = require('../services/scene-service')
        return await handleSceneService(SceneService, action, body, event)
      } else if (action.startsWith('prompt.')) {
        const PromptService = require('../services/prompt-service')
        return await handlePromptService(PromptService, action, body, event)
      } else if (action.startsWith('task.')) {
        const TaskProcessor = require('../services/task-processor')
        return await handleTaskService(TaskProcessor, action, body, event)
      }
    }

    // 默认响应
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        data: {
          message: 'API网关正常运行',
          timestamp: new Date().toISOString(),
          path,
          method
        }
      })
    }

  } catch (error) {
    logger.error('API网关处理失败:', error)

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: false,
        message: '服务器内部错误'
      })
    }
  }
}

// 处理用户服务请求
async function handleUserService(UserService, action, data, event) {
  try {
    const token = event.headers?.authorization || event.headers?.Authorization
    let user = null

    if (token) {
      try {
        const jwt = require('jsonwebtoken')
        user = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET)
      } catch (error) {
        // Token无效，继续处理
      }
    }

    const userService = new UserService(user)
    let result

    switch (action) {
      case 'user.register':
        result = await userService.register(data)
        break
      case 'user.login':
        result = await userService.login(data)
        break
      case 'user.getInfo':
        result = await userService.getUserInfo(data)
        break
      default:
        result = {
          success: false,
          message: `不支持的操作: ${action}`
        }
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(result)
    }

  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: false,
        message: error.message
      })
    }
  }
}

// 处理AI服务请求
async function handleAIService(AIService, action, data, event) {
  try {
    const token = event.headers?.authorization || event.headers?.Authorization
    if (!token) {
      return {
        statusCode: 401,
        body: JSON.stringify({
          success: false,
          message: '用户未登录'
        })
      }
    }

    const jwt = require('jsonwebtoken')
    let user

    try {
      user = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET)
    } catch (error) {
      return {
        statusCode: 401,
        body: JSON.stringify({
          success: false,
          message: '登录已过期'
        })
      }
    }

    const aiService = new AIService(user.openId)
    let result

    switch (action) {
      case 'ai.generateVirtualTryon':
        result = await aiService.generateVirtualTryon(data)
        break
      case 'ai.generateFashionPhoto':
        result = await aiService.generateFashionPhoto(data)
        break
      case 'ai.getTaskStatus':
        result = await aiService.getTaskStatus(data)
        break
      default:
        result = {
          success: false,
          message: `不支持的操作: ${action}`
        }
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(result)
    }

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: error.message
      })
    }
  }
}

// 处理摄影服务请求
async function handlePhotographyService(PhotographyService, action, data, event) {
  try {
    const token = event.headers?.authorization || event.headers?.Authorization
    if (!token) {
      return {
        statusCode: 401,
        body: JSON.stringify({
          success: false,
          message: '用户未登录'
        })
      }
    }

    const jwt = require('jsonwebtoken')
    let user

    try {
      user = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET)
    } catch (error) {
      return {
        statusCode: 401,
        body: JSON.stringify({
          success: false,
          message: '登录已过期'
        })
      }
    }

    const photographyService = new PhotographyService(user.openId, 'commercial')
    let result

    switch (action) {
      case 'photography.generate':
        result = await photographyService.generatePhotography(data)
        break
      case 'photography.poseVariation':
        result = await photographyService.generatePhotography(data) // 姿势裂变走同一个方法
        break
      case 'photography.getWorks':
        result = await photographyService.getPhotographyWorks(data)
        break
      case 'photography.getTaskStatus':
        result = await photographyService.getPhotographyTaskStatus(data)
        break
      default:
        result = {
          success: false,
          message: `不支持的操作: ${action}`
        }
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(result)
    }

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: error.message
      })
    }
  }
}

// 处理试衣服务请求
async function handleFittingService(FittingService, action, data, event) {
  try {
    const token = event.headers?.authorization || event.headers?.Authorization
    if (!token) {
      return {
        statusCode: 401,
        body: JSON.stringify({
          success: false,
          message: '用户未登录'
        })
      }
    }

    const jwt = require('jsonwebtoken')
    let user

    try {
      user = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET)
    } catch (error) {
      return {
        statusCode: 401,
        body: JSON.stringify({
          success: false,
          message: '登录已过期'
        })
      }
    }

    const fittingService = new FittingService(user.openId, 'personal')
    let result

    switch (action) {
      case 'fitting.generate':
        result = await fittingService.generateFitting(data)
        break
      case 'fitting.multiAngle':
        result = await fittingService.generateMultiAngleFitting(data)
        break
      case 'fitting.getWorks':
        result = await fittingService.getFittingWorks(data)
        break
      case 'fitting.getTaskStatus':
        result = await fittingService.getFittingTaskStatus(data)
        break
      default:
        result = {
          success: false,
          message: `不支持的操作: ${action}`
        }
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(result)
    }

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: error.message
      })
    }
  }
}

// 处理场景服务请求
async function handleSceneService(SceneService, action, data, event) {
  try {
    const sceneService = new SceneService()
    let result

    switch (action) {
      case 'scene.list':
        result = await sceneService.getScenes(data)
        break
      case 'scene.detail':
        result = await sceneService.getSceneDetail(data)
        break
      case 'scene.recommended':
        result = await sceneService.getRecommendedScenes(data)
        break
      case 'scene.search':
        result = await sceneService.searchScenes(data)
        break
      case 'scene.categories':
        result = await sceneService.getSceneCategories()
        break
      case 'scene.tags':
        result = await sceneService.getPopularTags()
        break
      default:
        result = {
          success: false,
          message: `不支持的操作: ${action}`
        }
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(result)
    }

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: error.message
      })
    }
  }
}

// 处理提示词服务请求
async function handlePromptService(PromptService, action, data, event) {
  try {
    const promptService = new PromptService()
    let result

    switch (action) {
      case 'prompt.generate':
        result = await promptService.generatePrompt(data)
        break
      case 'prompt.stats':
        result = await promptService.getPromptStats(data)
        break
      case 'prompt.templates':
        result = await promptService.getPromptTemplates(data)
        break
      default:
        result = {
          success: false,
          message: `不支持的操作: ${action}`
        }
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(result)
    }

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: error.message
      })
    }
  }
}

// 处理任务处理服务请求
async function handleTaskService(TaskProcessor, action, data, event) {
  try {
    const taskProcessor = new TaskProcessor()
    let result

    switch (action) {
      case 'task.processAll':
        result = await taskProcessor.processAllTasks()
        break
      case 'task.getStats':
        result = await taskProcessor.getTaskStats()
        break
      case 'task.cleanup':
        result = await taskProcessor.cleanupExpiredTasks()
        break
      default:
        result = {
          success: false,
          message: `不支持的操作: ${action}`
        }
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(result)
    }

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: error.message
      })
    }
  }
}

// 导出类供测试使用
module.exports = APIGateway