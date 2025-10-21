/**
 * 用户管理服务
 * 处理用户注册、登录、信息管理、积分系统等
 */

const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const moment = require('moment')
const { v4: uuidv4 } = require('uuid')

const Database = require('../shared/database/connection')
const COSService = require('../shared/storage/cos-config')
const logger = require('../utils/logger')
const { validateInput } = require('../utils/validation')

class UserService {
  constructor(user = null) {
    this.user = user
    this.db = new Database()
    this.cos = new COSService()
  }

  /**
   * 用户注册
   */
  async register(data) {
    try {
      const { code, userInfo } = data

      // 验证输入参数
      const validation = validateInput({
        code: { required: true, type: 'string' },
        userInfo: { required: true, type: 'object' }
      }, data)

      if (!validation.valid) {
        return {
          success: false,
          message: validation.message
        }
      }

      // 通过微信code获取openid和session_key
      const wechatAuth = await this.getWechatUserInfo(code)
      if (!wechatAuth.success) {
        return wechatAuth
      }

      const { openid, sessionKey } = wechatAuth.data

      // 检查用户是否已存在
      const existingUser = await this.db.collection('users').findOne({ openid })
      if (existingUser) {
        // 用户已存在，直接返回登录信息
        const token = this.generateToken(existingUser)

        return {
          success: true,
          data: {
            token,
            userInfo: this.sanitizeUserInfo(existingUser),
            isNewUser: false
          },
          message: '登录成功'
        }
      }

      // 创建新用户
      const newUser = {
        _id: uuidv4(),
        openid,
        sessionKey,
        ...userInfo,
        credits: {
          balance: 10, // 新用户赠送10积分
          totalEarned: 10,
          totalSpent: 0,
          lastUpdated: new Date()
        },
        subscription: {
          type: 'free', // free, basic, premium
          startDate: new Date(),
          endDate: moment().add(30, 'days').toDate(),
          features: ['basic_tryon', 'limited_generation']
        },
        settings: {
          notifications: true,
          autoSave: true,
          quality: 'medium', // low, medium, high
          language: 'zh-CN'
        },
        statistics: {
          worksCreated: 0,
          worksShared: 0,
          totalGenerationTime: 0,
          favoriteCount: 0
        },
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date()
      }

      // 保存用户到数据库
      await this.db.collection('users').insertOne(newUser)

      // 生成JWT token
      const token = this.generateToken(newUser)

      logger.info('新用户注册成功:', { openid, nickName: userInfo.nickName })

      return {
        success: true,
        data: {
          token,
          userInfo: this.sanitizeUserInfo(newUser),
          isNewUser: true,
          welcomeCredits: 10
        },
        message: '注册成功，赠送10积分'
      }

    } catch (error) {
      logger.error('用户注册失败:', error)
      return {
        success: false,
        message: '注册失败，请稍后重试'
      }
    }
  }

  /**
   * 用户登录
   */
  async login(data) {
    try {
      const { code } = data

      const validation = validateInput({
        code: { required: true, type: 'string' }
      }, data)

      if (!validation.valid) {
        return {
          success: false,
          message: validation.message
        }
      }

      // 通过微信code获取用户信息
      const wechatAuth = await this.getWechatUserInfo(code)
      if (!wechatAuth.success) {
        return wechatAuth
      }

      const { openid, sessionKey } = wechatAuth.data

      // 查找用户
      const user = await this.db.collection('users').findOne({ openid })
      if (!user) {
        return {
          success: false,
          message: '用户不存在，请先注册'
        }
      }

      // 更新登录信息
      await this.db.collection('users').updateOne(
        { _id: user._id },
        {
          $set: {
            sessionKey,
            lastLoginAt: new Date(),
            updatedAt: new Date()
          }
        }
      )

      // 生成token
      const token = this.generateToken(user)

      logger.info('用户登录成功:', { openid })

      return {
        success: true,
        data: {
          token,
          userInfo: this.sanitizeUserInfo(user),
          isNewUser: false
        },
        message: '登录成功'
      }

    } catch (error) {
      logger.error('用户登录失败:', error)
      return {
        success: false,
        message: '登录失败，请稍后重试'
      }
    }
  }

  /**
   * 获取用户信息
   */
  async getUserInfo(data) {
    try {
      if (!this.user) {
        return {
          success: false,
          message: '用户未登录'
        }
      }

      const user = await this.db.collection('users').findOne(
        { openid: this.user.openId },
        { projection: { sessionKey: 0 } }
      )

      if (!user) {
        return {
          success: false,
          message: '用户不存在'
        }
      }

      return {
        success: true,
        data: {
          userInfo: this.sanitizeUserInfo(user)
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
   * 更新用户信息
   */
  async updateUserInfo(data) {
    try {
      if (!this.user) {
        return {
          success: false,
          message: '用户未登录'
        }
      }

      const { userInfo } = data
      const allowedFields = ['nickName', 'avatarUrl', 'gender', 'city', 'province', 'country']

      // 过滤允许更新的字段
      const updateData = {}
      for (const field of allowedFields) {
        if (userInfo[field] !== undefined) {
          updateData[field] = userInfo[field]
        }
      }

      if (Object.keys(updateData).length === 0) {
        return {
          success: false,
          message: '没有可更新的字段'
        }
      }

      updateData.updatedAt = new Date()

      const result = await this.db.collection('users').updateOne(
        { openid: this.user.openId },
        { $set: updateData }
      )

      if (result.matchedCount === 0) {
        return {
          success: false,
          message: '用户不存在'
        }
      }

      logger.info('用户信息更新成功:', {
        openid: this.user.openId,
        updatedFields: Object.keys(updateData)
      })

      return {
        success: true,
        message: '用户信息更新成功'
      }

    } catch (error) {
      logger.error('更新用户信息失败:', error)
      return {
        success: false,
        message: '更新用户信息失败'
      }
    }
  }

  /**
   * 获取用户作品列表
   */
  async getUserWorks(data) {
    try {
      if (!this.user) {
        return {
          success: false,
          message: '用户未登录'
        }
      }

      const {
        page = 1,
        pageSize = 10,
        type = 'all', // all, tryon, photo, avatar
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = data

      const skip = (page - 1) * pageSize
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 }

      // 构建查询条件
      const query = { openid: this.user.openId }
      if (type !== 'all') {
        query.type = type
      }

      // 获取作品列表
      const works = await this.db.collection('works')
        .find(query)
        .sort(sort)
        .skip(skip)
        .limit(pageSize)
        .toArray()

      // 获取总数
      const total = await this.db.collection('works').countDocuments(query)

      // 为每个作品生成临时访问URL
      const worksWithURLs = await Promise.all(
        works.map(async (work) => {
          if (work.resultImages && work.resultImages.length > 0) {
            const tempUrls = await this.cos.getBatchTempFileURLs(
              work.resultImages.map(img => img.cloudPath)
            )
            return {
              ...work,
              resultImages: work.resultImages.map((img, index) => ({
                ...img,
                tempUrl: tempUrls.tempUrls[index]
              }))
            }
          }
          return work
        })
      )

      return {
        success: true,
        data: {
          works: worksWithURLs,
          pagination: {
            page: parseInt(page),
            pageSize: parseInt(pageSize),
            total,
            totalPages: Math.ceil(total / pageSize)
          }
        }
      }

    } catch (error) {
      logger.error('获取用户作品失败:', error)
      return {
        success: false,
        message: '获取作品列表失败'
      }
    }
  }

  /**
   * 获取积分信息
   */
  async getCreditInfo(data) {
    try {
      if (!this.user) {
        return {
          success: false,
          message: '用户未登录'
        }
      }

      const user = await this.db.collection('users').findOne(
        { openid: this.user.openId },
        { projection: { credits: 1, subscription: 1 } }
      )

      if (!user) {
        return {
          success: false,
          message: '用户不存在'
        }
      }

      // 获取积分使用记录
      const creditRecords = await this.db.collection('credit_records')
        .find({ openid: this.user.openId })
        .sort({ createdAt: -1 })
        .limit(20)
        .toArray()

      return {
        success: true,
        data: {
          credits: user.credits,
          subscription: user.subscription,
          recentRecords: creditRecords
        }
      }

    } catch (error) {
      logger.error('获取积分信息失败:', error)
      return {
        success: false,
        message: '获取积分信息失败'
      }
    }
  }

  /**
   * 积分充值
   */
  async rechargeCredits(data) {
    try {
      if (!this.user) {
        return {
          success: false,
          message: '用户未登录'
        }
      }

      const { packageId, paymentMethod = 'wechat' } = data

      // 验证充值套餐
      const packages = {
        'small': { credits: 50, price: 9.9, name: '小额包' },
        'medium': { credits: 120, price: 19.9, name: '中额包' },
        'large': { credits: 300, price: 49.9, name: '大额包' },
        'premium': { credits: 1000, price: 149.9, name: '豪华包' }
      }

      const pkg = packages[packageId]
      if (!pkg) {
        return {
          success: false,
          message: '无效的充值套餐'
        }
      }

      // 创建充值订单
      const orderId = uuidv4()
      const order = {
        _id: orderId,
        openid: this.user.openId,
        type: 'credit_recharge',
        package: {
          id: packageId,
          name: pkg.name,
          credits: pkg.credits,
          price: pkg.price
        },
        payment: {
          method: paymentMethod,
          status: 'pending'
        },
        amount: pkg.price,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      await this.db.collection('orders').insertOne(order)

      // 这里应该调用支付服务创建支付订单
      // 暂时返回模拟数据
      return {
        success: true,
        data: {
          orderId,
          paymentInfo: {
            package: pkg,
            paymentUrl: `https://pay.example.com/${orderId}` // 模拟支付URL
          }
        },
        message: '充值订单创建成功'
      }

    } catch (error) {
      logger.error('积分充值失败:', error)
      return {
        success: false,
        message: '充值失败，请稍后重试'
      }
    }
  }

  /**
   * 更新用户设置
   */
  async updateUserSettings(data) {
    try {
      if (!this.user) {
        return {
          success: false,
          message: '用户未登录'
        }
      }

      const { settings } = data
      const allowedSettings = ['notifications', 'autoSave', 'quality', 'language']

      // 验证设置项
      const updateData = {}
      for (const key of allowedSettings) {
        if (settings[key] !== undefined) {
          updateData[`settings.${key}`] = settings[key]
        }
      }

      if (Object.keys(updateData).length === 0) {
        return {
          success: false,
          message: '没有可更新的设置'
        }
      }

      updateData.updatedAt = new Date()

      const result = await this.db.collection('users').updateOne(
        { openid: this.user.openId },
        { $set: updateData }
      )

      if (result.matchedCount === 0) {
        return {
          success: false,
          message: '用户不存在'
        }
      }

      return {
        success: true,
        message: '设置更新成功'
      }

    } catch (error) {
      logger.error('更新用户设置失败:', error)
      return {
        success: false,
        message: '更新设置失败'
      }
    }
  }

  /**
   * 通过微信code获取用户信息
   */
  async getWechatUserInfo(code) {
    try {
      const axios = require('axios')
      const { WECHAT_APP_ID, WECHAT_APP_SECRET } = process.env

      const response = await axios.get('https://api.weixin.qq.com/sns/jscode2session', {
        params: {
          appid: WECHAT_APP_ID,
          secret: WECHAT_APP_SECRET,
          js_code: code,
          grant_type: 'authorization_code'
        }
      })

      const { openid, session_key, errcode, errmsg } = response.data

      if (errcode) {
        logger.error('微信登录失败:', { errcode, errmsg })
        return {
          success: false,
          message: '微信登录失败'
        }
      }

      return {
        success: true,
        data: {
          openid,
          sessionKey: session_key
        }
      }

    } catch (error) {
      logger.error('获取微信用户信息失败:', error)
      return {
        success: false,
        message: '微信登录失败'
      }
    }
  }

  /**
   * 生成JWT token
   */
  generateToken(user) {
    const payload = {
      openId: user.openid,
      userId: user._id,
      nickName: user.nickName
    }

    return jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: '7d'
    })
  }

  /**
   * 清理用户敏感信息
   */
  sanitizeUserInfo(user) {
    const { sessionKey, ...sanitized } = user
    return sanitized
  }
}

// SCF入口函数
exports.main_handler = async (event, context) => {
  try {
    const { action, ...data } = event

    // 验证JWT token
    const token = event.headers?.Authorization || event.headers?.authorization
    let user = null

    if (token) {
      try {
        const decoded = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET)
        user = decoded
      } catch (error) {
        logger.warn('Token验证失败:', error.message)
      }
    }

    // 创建用户服务实例
    const userService = new UserService(user)

    // 根据action调用对应方法
    const methodMap = {
      'register': 'register',
      'login': 'login',
      'getInfo': 'getUserInfo',
      'updateInfo': 'updateUserInfo',
      'getWorks': 'getUserWorks',
      'getCreditInfo': 'getCreditInfo',
      'recharge': 'rechargeCredits',
      'updateSettings': 'updateUserSettings'
    }

    const methodName = methodMap[action]
    if (!methodName) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          message: `不支持的操作: ${action}`
        })
      }
    }

    const result = await userService[methodName](data)

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(result)
    }

  } catch (error) {
    logger.error('用户服务处理失败:', error)

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: '服务器内部错误'
      })
    }
  }
}

module.exports = UserService