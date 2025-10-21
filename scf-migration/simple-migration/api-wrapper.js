/**
 * 简化迁移包装器
 * 把微信云函数快速包装成腾讯云 SCF
 */

const { connectDatabase } = require('../shared/database/connection')
const { getOpenIdFromToken } = require('../shared/auth/jwt-helper')

// 导入原有的微信云函数逻辑
const originalHandlers = {
  // 直接复制你现有的云函数逻辑
  'getWorks': async (event, context) => {
    // 这里是你原有的 getWorks 逻辑
    const db = await connectDatabase()
    const { collection } = event
    const { page = 1, pageSize = 10 } = event.data || {}

    // 原有逻辑...
    return {
      success: true,
      data: []
    }
  },

  'getWorkDetail': async (event, context) => {
    // 原有的 getWorkDetail 逻辑
    const db = await connectDatabase()
    const { collection, workId } = event

    // 原有逻辑...
    return {
      success: true,
      data: {}
    }
  },

  // ... 其他函数
}

/**
 * SCF 统一入口
 */
exports.main = async (event, context) => {
  console.log('🚀 SCF API 请求:', event)

  try {
    // 从请求头获取用户信息（替代微信云的 OPENID）
    const token = event.headers?.Authorization || event.headers?.authorization
    const userInfo = token ? await getOpenIdFromToken(token) : null
    const openId = userInfo?.openId

    // 兼容微信云的 event 结构
    const cloudEvent = {
      ...event,
      action: event.action || event.pathParameters?.action,
      OPENID: openId
    }

    // 调用原有的处理逻辑
    const { action } = cloudEvent
    const handler = originalHandlers[action]

    if (!handler) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          message: `未知操作: ${action}`
        })
      }
    }

    // 执行原有逻辑
    const result = await handler(cloudEvent, context)

    // 返回 HTTP 响应格式
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(result)
    }

  } catch (error) {
    console.error('❌ SCF 处理失败:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: error.message
      })
    }
  }
}