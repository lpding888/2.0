/**
 * API统一入口 - 腾讯云SCF版
 * 保持原微信云开发的action模式
 * 兼容Function URL + 原有action路由
 */

const logger = require('./backend/src/utils/logger')

// SCF入口函数 - 保持原项目设计理念
exports.main_handler = async (event, context) => {
  try {
    logger.info('API入口请求:', {
      path: event.path,
      method: event.httpMethod,
      headers: event.headers,
      queryParameters: event.queryParameters,
      body: event.body
    })

    // 解析请求体
    let body = {}
    try {
      body = event.body ? JSON.parse(event.body) : {}
    } catch (e) {
      body = event.body || {}
    }

    const { path, httpMethod } = event
    const { action } = body

    // 健康检查
    if (path === '/' && httpMethod === 'GET') {
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
            service: 'ai-photography-api',
            version: '2.0.0',
            architecture: 'scf-function-url'
          }
        })
      }
    }

    // 获取用户身份信息 - 模拟微信云开发的OPENID
    const userContext = await getUserContext(event)
    if (!userContext.success) {
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          success: false,
          message: '用户未登录或登录已过期'
        })
      }
    }

    const { OPENID, APPID } = userContext

    // 路由到对应的云函数 - 保持原项目调用模式
    const result = await routeToFunction(action, body, { OPENID, APPID, ...event })

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(result)
    }

  } catch (error) {
    logger.error('API入口处理失败:', error)

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: false,
        message: '服务器内部错误',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }
  }
}

/**
 * 获取用户上下文 - 模拟微信云开发
 */
async function getUserContext(event) {
  try {
    // 1. 尝试从Header获取Authorization Token
    const authHeader = event.headers?.Authorization || event.headers?.authorization

    if (authHeader) {
      // JWT Token验证
      const jwt = require('jsonwebtoken')
      const token = authHeader.replace('Bearer ', '')

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        return {
          success: true,
          OPENID: decoded.openid,
          APPID: decoded.appid || process.env.WECHAT_APP_ID
        }
      } catch (jwtError) {
        logger.warn('JWT验证失败:', jwtError.message)
      }
    }

    // 2. 尝试从请求体获取openid（兼容模式）
    const body = event.body ? JSON.parse(event.body) : {}
    if (body.openid) {
      return {
        success: true,
        OPENID: body.openid,
        APPID: process.env.WECHAT_APP_ID
      }
    }

    // 3. 尝试从Query参数获取openid（开发模式）
    if (event.queryParameters?.openid) {
      return {
        success: true,
        OPENID: event.queryParameters.openid,
        APPID: process.env.WECHAT_APP_ID
      }
    }

    // 4. 开发模式默认用户（仅开发环境）
    if (process.env.NODE_ENV === 'development') {
      return {
        success: true,
        OPENID: 'dev_test_user',
        APPID: process.env.WECHAT_APP_ID
      }
    }

    return {
      success: false,
      message: '未找到有效的用户身份信息'
    }

  } catch (error) {
    logger.error('获取用户上下文失败:', error)
    return {
      success: false,
      message: '用户身份验证失败'
    }
  }
}

/**
 * 路由到对应的云函数 - 模拟原项目的cloud.callFunction
 */
async function routeToFunction(action, data, context) {
  try {
    if (!action) {
      return {
        success: false,
        message: '缺少action参数'
      }
    }

    logger.info('路由请求:', { action, openid: context.OPENID })

    // 根据action路由到对应的服务
    // 保持原项目的清晰分类
    switch (action) {
      // 用户管理相关
      case 'user.register':
      case 'user.login':
      case 'user.getInfo':
      case 'user.updateProfile':
      case 'user.getCredits':
      case 'user.getCreditRecords':
        return await callUserService(action, data, context)

      // 摄影业务相关
      case 'photography.generate':
      case 'photography.listWorks':
      case 'photography.getWork':
      case 'photography.deleteWork':
      case 'photography.toggleFavorite':
      case 'photography.poseVariation':
      case 'photography.getProgress':
        return await callPhotographyService(action, data, context)

      // 试衣业务相关
      case 'fitting.generate':
      case 'fitting.listWorks':
      case 'fitting.getWork':
      case 'fitting.deleteWork':
      case 'fitting.toggleFavorite':
      case 'fitting.getProgress':
        return await callFittingService(action, data, context)

      // 存储相关
      case 'storage.upload':
      case 'storage.getUploadUrl':
      case 'storage.deleteFile':
      case 'storage.resolveAsset':
        return await callStorageService(action, data, context)

      // AI模型相关
      case 'aimodels.selectBestModel':
      case 'aimodels.getModelInfo':
      case 'aimodels.listModels':
        return await callAIModelsService(action, data, context)

      // 场景相关
      case 'scene.list':
      case 'scene.getScene':
      case 'scene.getRecommended':
        return await callSceneService(action, data, context)

      // 提示词相关
      case 'prompt.generate':
      case 'prompt.getTemplate':
      case 'prompt.listTemplates':
        return await callPromptService(action, data, context)

      // 任务处理相关
      case 'task.getStatus':
      case 'task.cancel':
      case 'task.retry':
      case 'task.getStats':
        return await callTaskWorkerService(action, data, context)

      default:
        return {
          success: false,
          message: `不支持的操作: ${action}`
        }
    }

  } catch (error) {
    logger.error('路由处理失败:', error)
    return {
      success: false,
      message: '路由处理失败',
      error: error.message
    }
  }
}

/**
 * 调用用户服务 - 模拟cloud.callFunction
 */
async function callUserService(action, data, context) {
  try {
    const UserService = require('./user')
    const userService = new UserService()

    switch (action) {
      case 'user.register':
        return await userService.register(data, context.OPENID)
      case 'user.login':
        return await userService.login(data, context.OPENID)
      case 'user.getInfo':
        return await userService.getUserInfo(context.OPENID)
      case 'user.updateProfile':
        return await userService.updateProfile(data, context.OPENID)
      case 'user.getCredits':
        return await userService.getCredits(context.OPENID)
      case 'user.getCreditRecords':
        return await userService.getCreditRecords(data, context.OPENID)
      default:
        return {
          success: false,
          message: `不支持的用户操作: ${action}`
        }
    }
  } catch (error) {
    logger.error('用户服务调用失败:', error)
    return {
      success: false,
      message: '用户服务调用失败'
    }
  }
}

/**
 * 调用摄影服务 - 模拟cloud.callFunction
 */
async function callPhotographyService(action, data, context) {
  try {
    const PhotographyService = require('./photography')
    const photographyService = new PhotographyService()

    switch (action) {
      case 'photography.generate':
        return await photographyService.generate(data, context.OPENID)
      case 'photography.listWorks':
        return await photographyService.listWorks(data, context.OPENID)
      case 'photography.getWork':
        return await photographyService.getWork(data, context.OPENID)
      case 'photography.deleteWork':
        return await photographyService.deleteWork(data, context.OPENID)
      case 'photography.toggleFavorite':
        return await photographyService.toggleFavorite(data, context.OPENID)
      case 'photography.poseVariation':
        return await photographyService.poseVariation(data, context.OPENID)
      case 'photography.getProgress':
        return await photographyService.getProgress(data, context.OPENID)
      default:
        return {
          success: false,
          message: `不支持的摄影操作: ${action}`
        }
    }
  } catch (error) {
    logger.error('摄影服务调用失败:', error)
    return {
      success: false,
      message: '摄影服务调用失败'
    }
  }
}

/**
 * 调用试衣服务 - 模拟cloud.callFunction
 */
async function callFittingService(action, data, context) {
  try {
    const FittingService = require('./fitting')
    const fittingService = new FittingService()

    switch (action) {
      case 'fitting.generate':
        return await fittingService.generate(data, context.OPENID)
      case 'fitting.listWorks':
        return await fittingService.listWorks(data, context.OPENID)
      case 'fitting.getWork':
        return await fittingService.getWork(data, context.OPENID)
      case 'fitting.deleteWork':
        return await fittingService.deleteWork(data, context.OPENID)
      case 'fitting.toggleFavorite':
        return await fittingService.toggleFavorite(data, context.OPENID)
      case 'fitting.getProgress':
        return await fittingService.getProgress(data, context.OPENID)
      default:
        return {
          success: false,
          message: `不支持的试衣操作: ${action}`
        }
    }
  } catch (error) {
    logger.error('试衣服务调用失败:', error)
    return {
      success: false,
      message: '试衣服务调用失败'
    }
  }
}

/**
 * 调用存储服务 - 模拟cloud.callFunction
 */
async function callStorageService(action, data, context) {
  try {
    const StorageService = require('./storage')
    const storageService = new StorageService()

    switch (action) {
      case 'storage.upload':
        return await storageService.upload(data, context.OPENID)
      case 'storage.getUploadUrl':
        return await storageService.getUploadUrl(data, context.OPENID)
      case 'storage.deleteFile':
        return await storageService.deleteFile(data, context.OPENID)
      case 'storage.resolveAsset':
        return await storageService.resolveAsset(data, context.OPENID)
      default:
        return {
          success: false,
          message: `不支持的存储操作: ${action}`
        }
    }
  } catch (error) {
    logger.error('存储服务调用失败:', error)
    return {
      success: false,
      message: '存储服务调用失败'
    }
  }
}

/**
 * 调用AI模型服务 - 模拟cloud.callFunction
 */
async function callAIModelsService(action, data, context) {
  try {
    const AIModelsService = require('./aimodels')
    const aiModelsService = new AIModelsService()

    switch (action) {
      case 'aimodels.selectBestModel':
        return await aiModelsService.selectBestModel(data)
      case 'aimodels.getModelInfo':
        return await aiModelsService.getModelInfo(data)
      case 'aimodels.listModels':
        return await aiModelsService.listModels(data)
      default:
        return {
          success: false,
          message: `不支持的AI模型操作: ${action}`
        }
    }
  } catch (error) {
    logger.error('AI模型服务调用失败:', error)
    return {
      success: false,
      message: 'AI模型服务调用失败'
    }
  }
}

/**
 * 调用场景服务 - 模拟cloud.callFunction
 */
async function callSceneService(action, data, context) {
  try {
    const SceneService = require('./scene')
    const sceneService = new SceneService()

    switch (action) {
      case 'scene.list':
        return await sceneService.list(data)
      case 'scene.getScene':
        return await sceneService.getScene(data)
      case 'scene.getRecommended':
        return await sceneService.getRecommended(data)
      default:
        return {
          success: false,
          message: `不支持的场景操作: ${action}`
        }
    }
  } catch (error) {
    logger.error('场景服务调用失败:', error)
    return {
      success: false,
      message: '场景服务调用失败'
    }
  }
}

/**
 * 调用提示词服务 - 模拟cloud.callFunction
 */
async function callPromptService(action, data, context) {
  try {
    const PromptService = require('./prompt')
    const promptService = new PromptService()

    switch (action) {
      case 'prompt.generate':
        return await promptService.generate(data)
      case 'prompt.getTemplate':
        return await promptService.getTemplate(data)
      case 'prompt.listTemplates':
        return await promptService.listTemplates(data)
      default:
        return {
          success: false,
          message: `不支持的提示词操作: ${action}`
        }
    }
  } catch (error) {
    logger.error('提示词服务调用失败:', error)
    return {
      success: false,
      message: '提示词服务调用失败'
    }
  }
}

/**
 * 调用任务处理器服务 - 模拟cloud.callFunction
 */
async function callTaskWorkerService(action, data, context) {
  try {
    const TaskWorkerService = require('./task-worker')
    const taskWorkerService = new TaskWorkerService()

    switch (action) {
      case 'task.getStatus':
        return await taskWorkerService.getStatus(data, context.OPENID)
      case 'task.cancel':
        return await taskWorkerService.cancel(data, context.OPENID)
      case 'task.retry':
        return await taskWorkerService.retry(data, context.OPENID)
      case 'task.getStats':
        return await taskWorkerService.getStats(data, context.OPENID)
      default:
        return {
          success: false,
          message: `不支持的任务操作: ${action}`
        }
    }
  } catch (error) {
    logger.error('任务处理器服务调用失败:', error)
    return {
      success: false,
      message: '任务处理器服务调用失败'
    }
  }
}