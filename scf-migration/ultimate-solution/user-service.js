/**
 * 用户管理服务 - 腾讯云SCF版本
 * 处理用户注册、登录、积分管理等功能
 */

const logger = require('./backend/src/utils/logger')

class UserService {
  constructor() {
    this.db = require('./backend/src/shared/database/connection')
  }

  /**
   * 用户注册
   */
  async register(data) {
    try {
      const { openid, userInfo } = data

      if (!openid) {
        return {
          success: false,
          message: '用户标识不能为空'
        }
      }

      // 检查用户是否已存在
      const existingUser = await this.db.collection('users').findOne({ openid })
      if (existingUser) {
        return {
          success: false,
          message: '用户已存在'
        }
      }

      // 创建新用户
      const newUser = {
        openid,
        ...userInfo,
        credits: 10, // 新用户赠送10积分
        total_consumed_credits: 0,
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      }

      await this.db.collection('users').insertOne(newUser)

      logger.info('用户注册成功', { openid })

      return {
        success: true,
        data: {
          user: newUser
        }
      }

    } catch (error) {
      logger.error('用户注册失败:', error)
      return {
        success: false,
        message: '注册失败'
      }
    }
  }

  /**
   * 用户登录
   */
  async login(data) {
    try {
      const { openid, userInfo } = data

      if (!openid) {
        return {
          success: false,
          message: '用户标识不能为空'
        }
      }

      // 查找用户
      let user = await this.db.collection('users').findOne({ openid })

      if (!user) {
        // 自动注册
        return await this.register(data)
      }

      // 更新用户信息
      await this.db.collection('users').updateOne(
        { openid },
        {
          $set: {
            ...userInfo,
            updated_at: new Date(),
            last_login_at: new Date()
          }
        }
      )

      // 重新获取用户信息
      user = await this.db.collection('users').findOne({ openid })

      logger.info('用户登录成功', { openid })

      return {
        success: true,
        data: {
          user,
          token: this.generateToken(user.openid)
        }
      }

    } catch (error) {
      logger.error('用户登录失败:', error)
      return {
        success: false,
        message: '登录失败'
      }
    }
  }

  /**
   * 获取用户信息
   */
  async getUserInfo(data) {
    try {
      const { openid } = data

      if (!openid) {
        return {
          success: false,
          message: '用户标识不能为空'
        }
      }

      const user = await this.db.collection('users').findOne({ openid })

      if (!user) {
        return {
          success: false,
          message: '用户不存在'
        }
      }

      return {
        success: true,
        data: {
          user
        }
      }

    } catch (error) {
      logger.error('获取用户信息失败:', error)
      return {
        success: false,
        message: '获取用户信息失败'
      }
    }
  }

  /**
   * 生成JWT Token
   */
  generateToken(openid) {
    const jwt = require('jsonwebtoken')
    return jwt.sign(
      { openid },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: '7d' }
    )
  }
}

// SCF入口函数
exports.main_handler = async (event, context) => {
  try {
    const { action, ...data } = event

    const userService = new UserService()

    switch (action) {
      case 'register':
        return await userService.register(data)
      case 'login':
        return await userService.login(data)
      case 'getInfo':
        return await userService.getUserInfo(data)
      default:
        return {
          success: false,
          message: `不支持的操作: ${action}`
        }
    }

  } catch (error) {
    logger.error('用户服务处理失败:', error)

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

module.exports = UserService