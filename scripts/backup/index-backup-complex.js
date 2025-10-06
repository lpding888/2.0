// 云函数入口文件 - API统一入口
const cloud = require('wx-server-sdk')
const router = require('./routes/index')
const auth = require('./middlewares/auth')
const logger = require('./utils/logger')
const response = require('./utils/response')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

exports.main = async (event, context) => {
  try {
    // 安全获取微信上下文
    let wxContext = null
    let openid = null
    
    try {
      wxContext = cloud.getWXContext()
      openid = wxContext ? wxContext.OPENID : null
    } catch (e) {
      console.error('Failed to get WX context:', e)
      openid = null
    }
    
    // 安全获取action参数
    const action = event && event.action ? event.action : 'unknown'
    
    // 记录请求日志
    logger.info('API请求', { action, openid })
    
    // 身份认证中间件
    const authResult = await auth.authenticate(event, context)
    if (!authResult.success) {
      return response.error(authResult.message, 401)
    }
    
    // 路由分发
    const result = await router.handle(event, context)
    
    // 记录响应日志
    logger.info('API响应', { success: result.success, action })
    
    return result
    
  } catch (error) {
    // 安全记录错误
    try {
      logger.error('API异常', error)
    } catch (logError) {
      console.error('Logger error:', logError)
      console.error('Original error:', error)
    }
    
    return response.error('服务器内部错误', 500)
  }
}