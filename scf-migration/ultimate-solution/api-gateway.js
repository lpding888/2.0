/**
 * API网关 - 腾讯云SCF入口
 * 统一处理所有API请求
 */

const logger = require('./backend/src/utils/logger')

// SCF入口函数 - 严格按照腾讯云SCF格式
exports.main_handler = async (event, context) => {
  try {
    logger.info('API网关请求:', {
      path: event.path,
      method: event.httpMethod,
      headers: event.headers,
      body: event.body
    })

    // 解析请求体
    let body
    try {
      body = event.body ? JSON.parse(event.body) : {}
    } catch (e) {
      body = event.body || {}
    }

    const { path, httpMethod } = event

    // 健康检查
    if (path === '/api' && httpMethod === 'GET') {
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
            service: 'ai-photography-api-gateway'
          }
        })
      }
    }

    // 处理不同类型的请求
    if (path.startsWith('/api/') && httpMethod === 'POST') {
      const action = body.action
      const result = await handleRequest(action, body, event)

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(result)
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
          message: 'AI摄影师API网关正常运行',
          timestamp: new Date().toISOString(),
          path,
          method: httpMethod
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
        message: '服务器内部错误',
        error: error.message
      })
    }
  }
}

// 处理不同类型的请求
async function handleRequest(action, data, event) {
  try {
    // 根据action路由到不同的服务
    if (action?.startsWith('user.')) {
      return await handleUserService(action, data, event)
    } else if (action?.startsWith('ai.')) {
      return await handleAIService(action, data, event)
    } else if (action?.startsWith('photography.')) {
      return await handlePhotographyService(action, data, event)
    } else if (action?.startsWith('fitting.')) {
      return await handleFittingService(action, data, event)
    } else if (action?.startsWith('scene.')) {
      return await handleSceneService(action, data, event)
    } else if (action?.startsWith('prompt.')) {
      return await handlePromptService(action, data, event)
    } else if (action?.startsWith('task.')) {
      return await handleTaskService(action, data, event)
    } else {
      return {
        success: false,
        message: `不支持的操作: ${action}`
      }
    }
  } catch (error) {
    logger.error('请求处理失败:', error)
    return {
      success: false,
      message: error.message
    }
  }
}

// 处理用户服务请求
async function handleUserService(action, data, event) {
  const UserService = require('./user-service')
  const userService = new UserService()

  switch (action) {
    case 'user.register':
      return await userService.register(data)
    case 'user.login':
      return await userService.login(data)
    case 'user.getInfo':
      return await userService.getUserInfo(data)
    default:
      return {
        success: false,
        message: `不支持的用户操作: ${action}`
      }
  }
}

// 处理AI服务请求
async function handleAIService(action, data, event) {
  const AIService = require('./ai-generation')
  const aiService = new AIService()

  switch (action) {
    case 'ai.generateVirtualTryon':
      return await aiService.generateVirtualTryon(data)
    case 'ai.generateFashionPhoto':
      return await aiService.generateFashionPhoto(data)
    case 'ai.getTaskStatus':
      return await aiService.getTaskStatus(data)
    default:
      return {
        success: false,
        message: `不支持的AI操作: ${action}`
      }
  }
}

// 处理摄影服务请求
async function handlePhotographyService(action, data, event) {
  const PhotographyService = require('./photography-service')
  const photographyService = new PhotographyService()

  switch (action) {
    case 'photography.generate':
      return await photographyService.generatePhotography(data)
    case 'photography.getWorks':
      return await photographyService.getPhotographyWorks(data)
    case 'photography.getTaskStatus':
      return await photographyService.getPhotographyTaskStatus(data)
    default:
      return {
        success: false,
        message: `不支持的摄影操作: ${action}`
      }
  }
}

// 处理试衣服务请求
async function handleFittingService(action, data, event) {
  const FittingService = require('./fitting-service')
  const fittingService = new FittingService()

  switch (action) {
    case 'fitting.generate':
      return await fittingService.generateFitting(data)
    case 'fitting.getWorks':
      return await fittingService.getFittingWorks(data)
    case 'fitting.getTaskStatus':
      return await fittingService.getFittingTaskStatus(data)
    default:
      return {
        success: false,
        message: `不支持的试衣操作: ${action}`
      }
  }
}

// 处理场景服务请求
async function handleSceneService(action, data, event) {
  const SceneService = require('./scene-service')
  const sceneService = new SceneService()

  switch (action) {
    case 'scene.list':
      return await sceneService.getScenes(data)
    case 'scene.detail':
      return await sceneService.getSceneDetail(data)
    case 'scene.recommended':
      return await sceneService.getRecommendedScenes(data)
    default:
      return {
        success: false,
        message: `不支持的场景操作: ${action}`
      }
  }
}

// 处理提示词服务请求
async function handlePromptService(action, data, event) {
  const PromptService = require('./prompt-service')
  const promptService = new PromptService()

  switch (action) {
    case 'prompt.generate':
      return await promptService.generatePrompt(data)
    case 'prompt.stats':
      return await promptService.getPromptStats(data)
    default:
      return {
        success: false,
        message: `不支持的提示词操作: ${action}`
      }
  }
}

// 处理任务服务请求
async function handleTaskService(action, data, event) {
  const TaskProcessor = require('./task-processor')
  const taskProcessor = new TaskProcessor()

  switch (action) {
    case 'task.processAll':
      return await taskProcessor.processAllTasks(data)
    case 'task.getStats':
      return await taskProcessor.getTaskStats()
    default:
      return {
        success: false,
        message: `不支持的任务操作: ${action}`
      }
  }
}