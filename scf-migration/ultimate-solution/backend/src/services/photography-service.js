/**
 * 商业版服装摄影服务
 * 完全基于原有微信云函数photography的业务逻辑
 * 支持姿势裂变、场景化生成、多服装处理
 */

const { v4: uuidv4 } = require('uuid')
const moment = require('moment')
const logger = require('../utils/logger')
const { validateInput } = require('../utils/validation')

class PhotographyService {
  constructor(openId, businessMode = 'commercial') {
    this.openId = openId
    this.businessMode = businessMode // commercial, personal, hybrid
    this.db = require('../shared/database/connection')
  }

  /**
   * 生成服装摄影 - 完全复制原有逻辑
   */
  async generatePhotography(data) {
    try {
      const {
        model_image,
        clothing_images,
        parameters = {},
        sceneId,
        count = 1
      } = data

      // 1. 参数验证 (完全按照原有逻辑)
      if (!model_image) {
        return {
          success: false,
          message: '请上传模特照片'
        }
      }

      if (!clothing_images || Object.keys(clothing_images).length === 0) {
        return {
          success: false,
          message: '请至少上传一件服装'
        }
      }

      // 2. 获取用户信息检查积分
      const user = await this.db.collection('users').findOne({ openid: this.openId })
      if (!user) {
        return {
          success: false,
          message: '用户不存在'
        }
      }

      // 3. 积分检查 (商业版按服装数量扣费)
      const costCredits = Object.keys(clothing_images).length * count
      if (user.credits < costCredits) {
        return {
          success: false,
          message: `积分不足，需要${costCredits}积分，当前余额${user.credits}积分`
        }
      }

      // 4. 姿势裂变模式特殊处理
      if (parameters.mode === 'pose_variation' && parameters.referenceWorkId) {
        return await this.handlePoseVariation(data, user)
      }

      // 5. 扣除积分 (原子操作)
      await this.deductCredits(user._id, costCredits, 'photography', {
        clothing_count: Object.keys(clothing_images).length,
        generation_count: count
      })

      // 6. 创建任务记录
      const taskId = this.generateTaskId()
      const taskData = {
        _id: taskId,
        user_openid: this.openId,
        type: 'photography',
        business_mode: this.businessMode,
        status: 'pending',
        state: 'pending',
        params: {
          model_image,
          clothing_images,
          parameters,
          sceneId,
          count,
          original_openid: this.openId
        },
        retry_count: 0,
        created_at: new Date(),
        updated_at: new Date()
      }

      await this.db.collection('task_queue').insertOne(taskData)

      // 7. 创建作品记录
      const workData = {
        user_openid: this.openId,
        type: 'photography',
        business_mode: this.businessMode,
        status: 'pending',
        task_id: taskId,
        images: [],
        original_images: this.prepareOriginalImages(model_image, clothing_images),
        parameters,
        scene_id: sceneId,
        generation_count: count,
        credits_consumed: costCredits,
        created_at: new Date(),
        updated_at: new Date()
      }

      const workResult = await this.db.collection('works').insertOne(workData)

      // 8. 调用Worker处理器 (fire-and-forget模式)
      await this.callPhotographyWorker(taskId, taskData)

      logger.info('摄影任务创建成功', {
        taskId,
        workId: workResult.insertedId,
        clothingCount: Object.keys(clothing_images).length,
        creditsConsumed: costCredits
      })

      return {
        success: true,
        data: {
          taskId,
          workId: workResult.insertedId,
          estimatedTime: this.estimateProcessingTime(clothing_images, count),
          creditsConsumed: costCredits
        }
      }

    } catch (error) {
      logger.error('摄影生成失败:', error)
      return {
        success: false,
        message: '摄影生成失败，请稍后重试'
      }
    }
  }

  /**
   * 姿势裂变模式 - 复制原有复杂逻辑
   */
  async handlePoseVariation(data, user) {
    const {
      model_image,
      clothing_images,
      parameters,
      sceneId,
      referenceWorkId,
      pose_description,
      count = 1
    } = data

    // 1. 验证参考作品
    const originalWork = await this.db.collection('works').findOne({
      _id: referenceWorkId,
      user_openid: this.openId
    })

    if (!originalWork) {
      return {
        success: false,
        message: '参考作品不存在'
      }
    }

    if (originalWork.status !== 'completed') {
      return {
        success: false,
        message: '参考作品还未生成完成'
      }
    }

    // 2. 获取原作品的原图信息
    const generatedImage = originalWork.images[0]?.url
    if (!generatedImage) {
      return {
        success: false,
        message: '参考作品没有可用的图片'
      }
    }

    // 3. 构建图片组合 (关键逻辑)
    const personFileId = this.extractPersonImageId(originalWork.original_images)
    const clothingFileIds = Object.values(clothing_images)

    if (!personFileId || clothingFileIds.length === 0) {
      return {
        success: false,
        message: '姿势裂变需要人物图和服装图'
      }
    }

    // 4. 生成最终姿势描述
    const finalPoseDescription = this.generateFinalPoseDescription(
      pose_description,
      originalWork.scene_info,
      parameters
    )

    // 5. 积分检查和扣除
    const costCredits = 1 * count
    if (user.credits < costCredits) {
      return {
        success: false,
        message: `积分不足，需要${costCredits}积分`
      }
    }

    await this.deductCredits(user._id, costCredits, 'pose_variation', {
      reference_work_id: referenceWorkId
    })

    // 6. 创建裂变任务
    const taskId = this.generateTaskId()
    const taskData = {
      _id: taskId,
      user_openid: this.openId,
      type: 'photography',
      business_mode: this.businessMode,
      mode: 'pose_variation',
      status: 'pending',
      state: 'pending',
      params: {
        model_image: personFileId,
        clothing_images: clothing_images.reduce((acc, fileId, index) => {
          acc[`item_${index}`] = fileId
          return acc
        }, {}),
        parameters: {
          ...parameters,
          pose_description: finalPoseDescription,
          reference_work_id: referenceWorkId,
          generated_image: generatedImage // 使用已生成的试衣图
        },
        sceneId,
        count,
        original_openid: this.openId
      },
      retry_count: 0,
      created_at: new Date(),
      updated_at: new Date()
    }

    await this.db.collection('task_queue').insertOne(taskData)

    // 7. 创建作品记录
    const workData = {
      user_openid: this.openId,
      type: 'photography',
      business_mode: this.businessMode,
      mode: 'pose_variation',
      status: 'pending',
      task_id: taskId,
      reference_work_id: referenceWorkId,
      images: [],
      original_images: this.prepareOriginalImages(personFileId, clothing_images),
      parameters: {
        ...parameters,
        pose_description: finalPoseDescription,
        reference_pose: originalWork.parameters?.pose_description
      },
      scene_id: sceneId,
      generation_count: count,
      credits_consumed: costCredits,
      created_at: new Date(),
      updated_at: new Date()
    }

    const workResult = await this.db.collection('works').insertOne(workData)

    // 8. 调用Worker
    await this.callPhotographyWorker(taskId, taskData)

    logger.info('姿势裂变任务创建成功', {
      taskId,
      referenceWorkId,
      poseDescription: finalPoseDescription
    })

    return {
      success: true,
      data: {
        taskId,
        workId: workResult.insertedId,
        mode: 'pose_variation',
        referenceWorkId,
        estimatedTime: this.estimateProcessingTime(clothing_images, count)
      }
    }
  }

  /**
   * 获取摄影作品列表
   */
  async getPhotographyWorks(data) {
    try {
      const {
        page = 1,
        pageSize = 10,
        status = 'all',
        mode = 'all',
        sortBy = 'created_at',
        sortOrder = 'desc'
      } = data

      const skip = (page - 1) * pageSize
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 }

      // 构建查询条件
      const query = {
        user_openid: this.openId,
        type: 'photography'
      }

      if (status !== 'all') {
        query.status = status
      }

      if (mode !== 'all') {
        query.mode = mode
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

      return {
        success: true,
        data: {
          works,
          pagination: {
            page: parseInt(page),
            pageSize: parseInt(pageSize),
            total,
            totalPages: Math.ceil(total / pageSize)
          }
        }
      }

    } catch (error) {
      logger.error('获取摄影作品失败:', error)
      return {
        success: false,
        message: '获取作品列表失败'
      }
    }
  }

  /**
   * 获取摄影任务状态
   */
  async getPhotographyTaskStatus(data) {
    try {
      const { taskId } = data

      if (!taskId) {
        return {
          success: false,
          message: '任务ID不能为空'
        }
      }

      // 获取任务信息
      const task = await this.db.collection('task_queue').findOne({
        _id: taskId,
        user_openid: this.openId
      })

      if (!task) {
        return {
          success: false,
          message: '任务不存在'
        }
      }

      // 获取关联的作品信息
      const work = await this.db.collection('works').findOne({
        task_id: taskId
      })

      return {
        success: true,
        data: {
          taskId: task._id,
          status: task.status,
          state: task.state,
          progress: this.calculateProgress(task.state),
          createdAt: task.created_at,
          updatedAt: task.updated_at,
          retryCount: task.retry_count,
          estimatedTime: this.estimateRemainingTime(task),
          work: work ? {
            workId: work._id,
            images: work.images,
            creditsConsumed: work.credits_consumed
          } : null
        }
      }

    } catch (error) {
      logger.error('获取摄影任务状态失败:', error)
      return {
        success: false,
        message: '获取任务状态失败'
      }
    }
  }

  /**
   * 扣除积分 (原子操作)
   */
  async deductCredits(userId, amount, type, metadata = {}) {
    try {
      const session = this.db.startSession()
      session.startTransaction()

      try {
        // 1. 扣除积分
        await this.db.collection('users').updateOne(
          { _id: userId },
          {
            $inc: {
              credits: -amount,
              total_consumed_credits: amount
            },
            $set: {
              updated_at: new Date()
            }
          },
          { session }
        )

        // 2. 记录消费记录
        await this.db.collection('credit_records').insertOne({
          user_openid: this.openId,
          type: type,
          amount: amount,
          description: `摄影生成消费(${amount}张)`,
          metadata,
          balance_after: await this.getUserBalance(userId, session),
          created_at: new Date(),
          updated_at: new Date()
        }, { session })

        await session.commitTransaction()

      } catch (error) {
        await session.abortTransaction()
        throw error
      } finally {
        session.endSession()
      }

    } catch (error) {
      logger.error('扣除积分失败:', error)
      throw error
    }
  }

  /**
   * 调用摄影Worker (独立容器)
   */
  async callPhotographyWorker(taskId, taskData) {
    try {
      // 在SCF中，我们需要调用异步任务处理器
      const AsyncTaskProcessor = require('./async-task-processor')
      const taskProcessor = new AsyncTaskProcessor()

      // 创建长时间运行的摄影任务
      await taskProcessor.createTask({
        type: 'ai-generation',
        priority: 'high',
        timeout: 900000, // 15分钟
        data: {
          service_type: 'photography',
          task_id: taskId,
          task_data: taskData,
          worker_type: 'photography-worker'
        },
        metadata: {
          user_openid: this.openId,
          business_mode: this.businessMode
        }
      })

      logger.info('摄影Worker调用成功', { taskId })

    } catch (error) {
      logger.error('调用摄影Worker失败:', { taskId, error: error.message })
      // 标记任务失败并退还积分
      await this.markTaskFailed(taskId, error)
    }
  }

  /**
   * 标记任务失败并退还积分
   */
  async markTaskFailed(taskId, error) {
    try {
      // 1. 更新任务状态
      await this.db.collection('task_queue').updateOne(
        { _id: taskId },
        {
          $set: {
            status: 'failed',
            state: 'failed',
            error: {
              message: error.message,
              stack: error.stack,
              timestamp: new Date()
            },
            updated_at: new Date()
          }
        }
      )

      // 2. 更新作品状态
      await this.db.collection('works').updateOne(
        { task_id: taskId },
        {
          $set: {
            status: 'failed',
            error: error.message,
            updated_at: new Date()
          }
        }
      )

      // 3. 获取消费信息并退还积分
      const work = await this.db.collection('works').findOne({ task_id: taskId })
      if (work && work.credits_consumed > 0) {
        await this.refundCredits(work.credits_consumed, 'photography_refund', {
          task_id: taskId,
          reason: error.message
        })
      }

    } catch (refundError) {
      logger.error('标记任务失败和退还积分时出错:', refundError)
    }
  }

  /**
   * 退还积分
   */
  async refundCredits(amount, type, metadata = {}) {
    try {
      await this.db.collection('users').updateOne(
        { openid: this.openId },
        {
          $inc: {
            credits: amount,
            total_consumed_credits: -amount
          },
          $set: {
            updated_at: new Date()
          }
        }
      )

      await this.db.collection('credit_records').insertOne({
        user_openid: this.openId,
        type: type,
        amount: amount,
        description: '摄影生成失败退款',
        metadata,
        created_at: new Date()
      })

      logger.info('积分退还成功', { amount, type, metadata })

    } catch (error) {
      logger.error('退还积分失败:', error)
    }
  }

  /**
   * 准备原图信息
   */
  prepareOriginalImages(modelImage, clothingImages) {
    const originalImages = [
      { type: 'person', fileId: modelImage }
    ]

    Object.entries(clothingImages).forEach(([key, fileId]) => {
      originalImages.push({
        type: 'clothing',
        clothingType: key,
        fileId: fileId
      })
    })

    return originalImages
  }

  /**
   * 提取人物图片ID
   */
  extractPersonImageId(originalImages) {
    const personImage = originalImages.find(img => img.type === 'person')
    return personImage ? personImage.fileId : null
  }

  /**
   * 生成最终姿势描述
   */
  generateFinalPoseDescription(userDescription, sceneInfo, parameters) {
    if (userDescription && userDescription.trim()) {
      return userDescription.trim()
    }

    // 基于场景信息生成姿势描述
    if (sceneInfo && sceneInfo.pose_description) {
      return sceneInfo.pose_description
    }

    // 基于参数生成默认描述
    const poseMap = {
      'fashion': '时尚专业的模特姿势，展示服装设计细节',
      'casual': '自然休闲的日常姿势，突出舒适感',
      'business': '专业商务姿势，体现职业气质',
      'party': '优雅的社交姿势，展现个人魅力'
    }

    return poseMap[parameters.style] || '自然优雅的姿势，展现服装美感'
  }

  /**
   * 生成任务ID
   */
  generateTaskId() {
    const timestamp = moment().format('YYYYMMDD_HHmmss')
    const random = Math.random().toString(36).substr(2, 8)
    return `photography_${timestamp}_${random}`
  }

  /**
   * 计算处理进度
   */
  calculateProgress(state) {
    const progressMap = {
      'pending': 0,
      'downloading': 10,
      'downloaded': 20,
      'ai_calling': 30,
      'ai_processing': 70,
      'ai_completed': 85,
      'uploading': 95,
      'completed': 100,
      'failed': 0
    }
    return progressMap[state] || 0
  }

  /**
   * 估算处理时间
   */
  estimateProcessingTime(clothingImages, count) {
    const baseTime = 30000 // 30秒基础时间
    const clothingTime = Object.keys(clothingImages).length * 15000 // 每件服装15秒
    const countTime = (count - 1) * 20000 // 额外生成每张20秒

    return baseTime + clothingTime + countTime
  }

  /**
   * 估算剩余时间
   */
  estimateRemainingTime(task) {
    const timeElapsed = Date.now() - new Date(task.created_at).getTime()
    const estimatedTotal = this.estimateProcessingTime(
      task.params.clothing_images || {},
      task.params.count || 1
    )

    const remaining = Math.max(0, estimatedTotal - timeElapsed)
    return Math.ceil(remaining / 1000) // 返回秒数
  }

  /**
   * 获取用户余额
   */
  async getUserBalance(userId, session = null) {
    try {
      const options = session ? { session } : {}
      const user = await this.db.collection('users').findOne({ _id: userId }, options)
      return user ? user.credits : 0
    } catch (error) {
      logger.error('获取用户余额失败:', error)
      return 0
    }
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
        const jwt = require('jsonwebtoken')
        user = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET)
      } catch (error) {
        logger.warn('Token验证失败:', error.message)
      }
    }

    if (!user) {
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          message: '用户未登录'
        })
      }
    }

    // 创建摄影服务实例
    const photographyService = new PhotographyService(user.openId, 'commercial')

    // 根据action调用对应方法
    const methodMap = {
      'generate': 'generatePhotography',
      'poseVariation': 'generatePhotography', // 姿势裂变走同一个方法
      'getWorks': 'getPhotographyWorks',
      'getTaskStatus': 'getPhotographyTaskStatus'
    }

    const methodName = methodMap[action]
    if (!methodName) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          message: `不支持的摄影操作: ${action}`
        })
      }
    }

    const result = await photographyService[methodName](data)

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(result)
    }

  } catch (error) {
    logger.error('摄影服务处理失败:', error)

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        message: '服务器内部错误'
      })
    }
  }
}

module.exports = PhotographyService