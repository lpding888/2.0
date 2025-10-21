/**
 * 统一API入口 - 基于腾讯云SCF官方文档
 * Web函数类型，直接处理HTTP请求
 * 保持原项目的action路由模式
 */

const logger = require('./backend/src/utils/logger')

// SCF入口函数 - 遵循官方文档格式
exports.main_handler = async (event, context) => {
  try {
    logger.info('API网关请求:', {
      path: event.path,
      method: event.httpMethod,
      headers: event.headers,
      queryParameters: event.queryParameters,
      body: event.body
    })

    // 处理CORS预检请求
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400'
        },
        body: ''
      }
    }

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
            service: 'ai-photography-api-gateway',
            version: '2.0.0',
            architecture: 'scf-function-url-official'
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
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          message: '用户未登录或登录已过期'
        })
      }
    }

    const { OPENID, APPID } = userContext

    // Action路由处理 - 保持原项目模式
    const result = await handleActionRequest(action, body, {
      OPENID,
      APPID,
      event,
      context
    })

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'true'
      },
      body: JSON.stringify(result)
    }

  } catch (error) {
    logger.error('API网关处理失败:', error)

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
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
 * 获取用户上下文 - 基于官方文档最佳实践
 */
async function getUserContext(event) {
  try {
    // 1. 从Header获取Authorization Token
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

    // 2. 从请求体获取openid（兼容模式）
    const body = event.body ? JSON.parse(event.body) : {}
    if (body.openid) {
      return {
        success: true,
        OPENID: body.openid,
        APPID: process.env.WECHAT_APP_ID
      }
    }

    // 3. 从Query参数获取openid（开发模式）
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
 * Action路由处理 - 保持原项目设计理念
 */
async function handleActionRequest(action, data, context) {
  try {
    if (!action) {
      return {
        success: false,
        message: '缺少action参数'
      }
    }

    logger.info('处理Action请求:', { action, openid: context.OPENID })

    // 直接处理简单操作（避免函数间调用）
    switch (action) {
      // 用户管理相关 - 直接处理
      case 'user.register':
      case 'user.login':
      case 'user.getInfo':
      case 'user.updateProfile':
      case 'user.getCredits':
      case 'user.getCreditRecords':
        return await callUserService(action, data, context.OPENID)

      // 数据查询相关 - 直接处理
      case 'scene.list':
      case 'scene.getScene':
      case 'scene.getRecommended':
      case 'prompt.generate':
      case 'prompt.getTemplate':
      case 'prompt.listTemplates':
      case 'aimodels.selectBestModel':
      case 'aimodels.getModelInfo':
      case 'aimodels.listModels':
        return await callDataService(action, data, context.OPENID)

      // 存储相关 - 直接处理
      case 'storage.upload':
      case 'storage.getUploadUrl':
      case 'storage.deleteFile':
      case 'storage.resolveAsset':
        return await callStorageService(action, data, context.OPENID)

      // 任务状态查询 - 直接处理
      case 'task.getStatus':
      case 'task.cancel':
      case 'task.retry':
      case 'task.getStats':
        return await callTaskService(action, data, context.OPENID)

      // 复杂业务处理 - 调用专门服务
      case 'photography.generate':
      case 'photography.listWorks':
      case 'photography.getWork':
      case 'photography.deleteWork':
      case 'photography.toggleFavorite':
      case 'photography.poseVariation':
      case 'photography.getProgress':
        return await callPhotographyService(action, data, context.OPENID)

      case 'fitting.generate':
      case 'fitting.listWorks':
      case 'fitting.getWork':
      case 'fitting.deleteWork':
      case 'fitting.toggleFavorite':
      case 'fitting.getProgress':
        return await callFittingService(action, data, context.OPENID)

      default:
        return {
          success: false,
          message: `不支持的操作: ${action}`
        }
    }

  } catch (error) {
    logger.error('Action处理失败:', error)
    return {
      success: false,
      message: '请求处理失败',
      error: error.message
    }
  }
}

/**
 * 调用用户服务 - 直接处理，无函数调用开销
 */
async function callUserService(action, data, openid) {
  try {
    // 这里直接实现用户服务逻辑，避免函数间调用
    // 基于原user云函数的逻辑

    switch (action) {
      case 'user.register':
        return await handleUserRegister(data, openid)
      case 'user.login':
        return await handleUserLogin(data, openid)
      case 'user.getInfo':
        return await handleUserGetInfo(openid)
      case 'user.updateProfile':
        return await handleUserUpdateProfile(data, openid)
      case 'user.getCredits':
        return await handleUserGetCredits(openid)
      case 'user.getCreditRecords':
        return await handleUserGetCreditRecords(data, openid)
      default:
        return {
          success: false,
          message: `不支持的用户操作: ${action}`
        }
    }
  } catch (error) {
    logger.error('用户服务处理失败:', error)
    return {
      success: false,
      message: '用户服务处理失败'
    }
  }
}

/**
 * 调用数据服务 - 直接处理配置相关数据
 */
async function callDataService(action, data, openid) {
  try {
    // 直接处理数据查询，避免函数间调用
    switch (action) {
      case 'scene.list':
        return await handleSceneList(data)
      case 'scene.getScene':
        return await handleSceneGet(data)
      case 'scene.getRecommended':
        return await handleSceneGetRecommended(data)
      case 'prompt.generate':
        return await handlePromptGenerate(data)
      case 'prompt.getTemplate':
        return await handlePromptGetTemplate(data)
      case 'prompt.listTemplates':
        return await handlePromptListTemplates(data)
      case 'aimodels.selectBestModel':
        return await handleAIModelsSelectBest(data)
      case 'aimodels.getModelInfo':
        return await handleAIModelsGetInfo(data)
      case 'aimodels.listModels':
        return await handleAIModelsList(data)
      default:
        return {
          success: false,
          message: `不支持的数据操作: ${action}`
        }
    }
  } catch (error) {
    logger.error('数据服务处理失败:', error)
    return {
      success: false,
      message: '数据服务处理失败'
    }
  }
}

/**
 * 调用存储服务 - 直接处理文件操作
 */
async function callStorageService(action, data, openid) {
  try {
    // 直接处理存储操作
    switch (action) {
      case 'storage.upload':
        return await handleStorageUpload(data, openid)
      case 'storage.getUploadUrl':
        return await handleStorageGetUploadUrl(data, openid)
      case 'storage.deleteFile':
        return await handleStorageDeleteFile(data, openid)
      case 'storage.resolveAsset':
        return await handleStorageResolveAsset(data, openid)
      default:
        return {
          success: false,
          message: `不支持的存储操作: ${action}`
        }
    }
  } catch (error) {
    logger.error('存储服务处理失败:', error)
    return {
      success: false,
      message: '存储服务处理失败'
    }
  }
}

/**
 * 调用任务服务 - 直接处理任务状态
 */
async function callTaskService(action, data, openid) {
  try {
    // 直接处理任务状态查询
    switch (action) {
      case 'task.getStatus':
        return await handleTaskGetStatus(data, openid)
      case 'task.cancel':
        return await handleTaskCancel(data, openid)
      case 'task.retry':
        return await handleTaskRetry(data, openid)
      case 'task.getStats':
        return await handleTaskGetStats(data, openid)
      default:
        return {
          success: false,
          message: `不支持的任务操作: ${action}`
        }
    }
  } catch (error) {
    logger.error('任务服务处理失败:', error)
    return {
      success: false,
      message: '任务服务处理失败'
    }
  }
}

/**
 * 调用摄影服务 - 使用Invoke API调用专门服务
 */
async function callPhotographyService(action, data, openid) {
  try {
    // 使用腾讯云SDK调用摄影服务函数
    const scf = require('@tencentcloud/scf-sdk')

    const payload = {
      action,
      data,
      openid,
      source: 'api-gateway'
    }

    const result = await scf.invoke({
      FunctionName: 'photography-service',
      InvocationType: 'RequestResponse', // 同步调用
      Payload: JSON.stringify(payload)
    })

    return JSON.parse(result.Payload)
  } catch (error) {
    logger.error('摄影服务调用失败:', error)
    return {
      success: false,
      message: '摄影服务调用失败'
    }
  }
}

/**
 * 调用试衣服务 - 使用Invoke API调用专门服务
 */
async function callFittingService(action, data, openid) {
  try {
    // 使用腾讯云SDK调用试衣服务函数
    const scf = require('@tencentcloud/scf-sdk')

    const payload = {
      action,
      data,
      openid,
      source: 'api-gateway'
    }

    const result = await scf.invoke({
      FunctionName: 'fitting-service',
      InvocationType: 'RequestResponse', // 同步调用
      Payload: JSON.stringify(payload)
    })

    return JSON.parse(result.Payload)
  } catch (error) {
    logger.error('试衣服务调用失败:', error)
    return {
      success: false,
      message: '试衣服务调用失败'
    }
  }
}

// ============ 用户服务具体实现 ============

async function handleUserRegister(data, openid) {
  // 基于原user云函数的注册逻辑
  const { userInfo } = data

  // TODO: 实现用户注册逻辑
  return {
    success: true,
    message: '注册成功',
    data: {
      openid,
      userInfo
    }
  }
}

async function handleUserLogin(data, openid) {
  // 基于原user云函数的登录逻辑
  const { userInfo } = data

  // TODO: 实现用户登录逻辑
  return {
    success: true,
    message: '登录成功',
    data: {
      openid,
      userInfo,
      token: 'jwt_token_here'
    }
  }
}

async function handleUserGetInfo(openid) {
  // TODO: 实现获取用户信息逻辑
  return {
    success: true,
    data: {
      openid,
      nickname: '测试用户',
      avatar: '',
      credits: 100
    }
  }
}

async function handleUserUpdateProfile(data, openid) {
  // TODO: 实现更新用户资料逻辑
  return {
    success: true,
    message: '更新成功'
  }
}

async function handleUserGetCredits(openid) {
  // TODO: 实现获取积分逻辑
  return {
    success: true,
    data: {
      credits: 100,
      records: []
    }
  }
}

async function handleUserGetCreditRecords(data, openid) {
  // TODO: 实现获取积分记录逻辑
  return {
    success: true,
    data: {
      records: [],
      total: 0
    }
  }
}

// ============ 数据服务具体实现 ============

async function handleSceneList(data) {
  // TODO: 实现场景列表逻辑
  return {
    success: true,
    data: {
      scenes: []
    }
  }
}

async function handleSceneGet(data) {
  // TODO: 实现获取场景逻辑
  return {
    success: true,
    data: {}
  }
}

async function handleSceneGetRecommended(data) {
  // TODO: 实现推荐场景逻辑
  return {
    success: true,
    data: {
      scenes: []
    }
  }
}

async function handlePromptGenerate(data) {
  // TODO: 实现提示词生成逻辑
  return {
    success: true,
    data: {
      prompt: 'generated_prompt'
    }
  }
}

async function handlePromptGetTemplate(data) {
  // TODO: 实现获取提示词模板逻辑
  return {
    success: true,
    data: {}
  }
}

async function handlePromptListTemplates(data) {
  // TODO: 实现提示词模板列表逻辑
  return {
    success: true,
    data: {
      templates: []
    }
  }
}

async function handleAIModelsSelectBest(data) {
  // TODO: 实现AI模型选择逻辑
  return {
    success: true,
    data: {
      model: 'seedream-4.0'
    }
  }
}

async function handleAIModelsGetInfo(data) {
  // TODO: 实现获取AI模型信息逻辑
  return {
    success: true,
    data: {}
  }
}

async function handleAIModelsList(data) {
  // TODO: 实现AI模型列表逻辑
  return {
    success: true,
    data: {
      models: []
    }
  }
}

// ============ 存储服务具体实现 ============

async function handleStorageUpload(data, openid) {
  // TODO: 实现文件上传逻辑
  return {
    success: true,
    data: {
      fileId: 'file_id_here',
      url: 'file_url_here'
    }
  }
}

async function handleStorageGetUploadUrl(data, openid) {
  // TODO: 实现获取上传URL逻辑
  return {
    success: true,
    data: {
      uploadUrl: 'upload_url_here'
    }
  }
}

async function handleStorageDeleteFile(data, openid) {
  // TODO: 实现删除文件逻辑
  return {
    success: true,
    message: '删除成功'
  }
}

async function handleStorageResolveAsset(data, openid) {
  // TODO: 实现解析资源逻辑
  return {
    success: true,
    data: {
      url: 'resolved_url_here'
    }
  }
}

// ============ 任务服务具体实现 ============

async function handleTaskGetStatus(data, openid) {
  // TODO: 实现获取任务状态逻辑
  return {
    success: true,
    data: {
      taskId: data.taskId,
      status: 'completed',
      progress: 100
    }
  }
}

async function handleTaskCancel(data, openid) {
  // TODO: 实现取消任务逻辑
  return {
    success: true,
    message: '任务已取消'
  }
}

async function handleTaskRetry(data, openid) {
  // TODO: 实现重试任务逻辑
  return {
    success: true,
    message: '任务已重试'
  }
}

async function handleTaskGetStats(data, openid) {
  // TODO: 实现获取任务统计逻辑
  return {
    success: true,
    data: {
      total: 0,
      completed: 0,
      failed: 0
    }
  }
}