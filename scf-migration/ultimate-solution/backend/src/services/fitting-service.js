/**
 * 虚拟试衣服务
 * 完全基于原有微信云函数fitting的业务逻辑
 * 支持多种试衣模式、姿势裂变、背景处理
 */

const { v4: uuidv4 } = require('uuid')
const moment = require('moment')
const logger = require('../utils/logger')
const { validateInput } = require('../utils/validation')

class FittingService {
  constructor(openId, businessMode = 'commercial') {
    this.openId = openId
    this.businessMode = businessMode
    this.db = require('../shared/database/connection')
  }

  /**
   * 生成虚拟试衣 - 完全复制原有逻辑
   */
  async generateFitting(data) {
    try {
      const {
        model_image,
        clothing_images,
        parameters = {},
        sceneId,
        count = 1,
        mode = 'standard' // standard, pose_variation, multi_angle
      } = data

      // 1. 参数验证
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

      // 2. 获取用户信息
      const user = await this.db.collection('users').findOne({ openid: this.openId })
      if (!user) {
        return {
          success: false,
          message: '用户不存在'
        }
      }

      // 3. 积分检查
      const costCredits = this.calculateFittingCost(clothing_images, count, mode)
      if (user.credits < costCredits) {
        return {
          success: false,
          message: `积分不足，需要${costCredits}积分，当前余额${user.credits}积分`
        }
      }

      // 4. 姿势裂变模式处理
      if (mode === 'pose_variation' && parameters.referenceWorkId) {
        return await this.handleFittingPoseVariation(data, user)
      }

      // 5. 多角度模式处理
      if (mode === 'multi_angle') {
        return await this.handleMultiAngleFitting(data, user)
      }

      // 6. 扣除积分
      await this.deductCredits(user._id, costCredits, 'fitting', {
        clothing_count: Object.keys(clothing_images).length,
        generation_count: count,
        mode: mode
      })

      // 7. 创建任务记录
      const taskId = this.generateTaskId()
      const taskData = {
        _id: taskId,
        user_openid: this.openId,
        type: 'fitting',
        business_mode: this.businessMode,
        mode: mode,
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

      // 8. 创建作品记录
      const workData = {
        user_openid: this.openId,
        type: 'fitting',
        business_mode: this.businessMode,
        mode: mode,
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

      // 9. 调用FittingWorker
      await this.callFittingWorker(taskId, taskData)

      logger.info('试衣任务创建成功', {
        taskId,
        workId: workResult.insertedId,
        clothingCount: Object.keys(clothing_images).length,
        mode,
        creditsConsumed: costCredits
      })

      return {
        success: true,
        data: {
          taskId,
          workId: workResult.insertedId,
          estimatedTime: this.estimateFittingTime(clothing_images, count, mode),
          creditsConsumed: costCredits,
          mode: mode
        }
      }

    } catch (error) {
      logger.error('虚拟试衣生成失败:', error)
      return {
        success: false,
        message: '虚拟试衣生成失败，请稍后重试'
      }
    }
  }

  /**
   * 姿势裂变试衣模式
   */
  async handleFittingPoseVariation(data, user) {
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

    // 2. 获取原作品的试衣图
    const generatedFittingImage = originalWork.images[0]?.url
    if (!generatedFittingImage) {
      return {
        success: false,
        message: '参考作品没有可用的试衣图'
      }
    }

    // 3. 提取原图信息
    const personFileId = this.extractPersonImageId(originalWork.original_images)
    const clothingFileIds = Object.values(clothing_images)

    // 4. 生成新的姿势描述
    const finalPoseDescription = this.generateFittingPoseDescription(
      pose_description,
      originalWork.scene_info,
      parameters
    )

    // 5. 积分处理
    const costCredits = 1 * count
    if (user.credits < costCredits) {
      return {
        success: false,
        message: `积分不足，需要${costCredits}积分`
      }
    }

    await this.deductCredits(user._id, costCredits, 'fitting_pose_variation', {
      reference_work_id: referenceWorkId
    })

    // 6. 创建裂变任务
    const taskId = this.generateTaskId()
    const taskData = {
      _id: taskId,
      user_openid: this.openId,
      type: 'fitting',
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
          fitting_reference_image: generatedFittingImage // 使用原试衣图作为参考
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
      type: 'fitting',
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
    await this.callFittingWorker(taskId, taskData)

    return {
      success: true,
      data: {
        taskId,
        workId: workResult.insertedId,
        mode: 'pose_variation',
        referenceWorkId,
        estimatedTime: this.estimateFittingTime(clothing_images, count, 'pose_variation')
      }
    }
  }

  /**
   * 多角度试衣模式
   */
  async handleMultiAngleFitting(data, user) {
    const {
      model_image,
      clothing_images,
      parameters,
      sceneId,
      count = 3 // 多角度默认生成3张
    } = data

    // 多角度模式需要更多积分
    const costCredits = this.calculateFittingCost(clothing_images, count, 'multi_angle')
    if (user.credits < costCredits) {
      return {
        success: false,
        message: `积分不足，需要${costCredits}积分`
      }
    }

    // 生成多个角度的参数
    const angles = ['front', 'side', 'back'].slice(0, count)
    const tasks = []

    for (let i = 0; i < angles.length; i++) {
      const angle = angles[i]
      const angleParams = {
        ...parameters,
        angle: angle,
        multi_angle_index: i,
        total_angles: angles.length
      }

      // 为每个角度创建独立任务
      const taskId = this.generateTaskId()
      const taskData = {
        _id: taskId,
        user_openid: this.openId,
        type: 'fitting',
        business_mode: this.businessMode,
        mode: 'multi_angle',
        multi_angle_group: this.generateGroupId(), // 组ID用于关联多角度任务
        angle_index: i,
        status: 'pending',
        state: 'pending',
        params: {
          model_image,
          clothing_images,
          parameters: angleParams,
          sceneId,
          count: 1, // 每个任务只生成1张
          original_openid: this.openId
        },
        retry_count: 0,
        created_at: new Date(),
        updated_at: new Date()
      }

      await this.db.collection('task_queue').insertOne(taskData)
      tasks.push({ taskId, angle })
    }

    // 扣除积分 (一次扣除所有角度的积分)
    await this.deductCredits(user._id, costCredits, 'multi_angle_fitting', {
      clothing_count: Object.keys(clothing_images).length,
      angles_count: angles.length
    })

    // 创建主作品记录
    const groupId = tasks[0].taskId.split('_')[2] // 从第一个任务ID提取组ID
    const workData = {
      user_openid: this.openId,
      type: 'fitting',
      business_mode: this.businessMode,
      mode: 'multi_angle',
      multi_angle_group: groupId,
      status: 'pending',
      related_task_ids: tasks.map(t => t.taskId),
      images: [],
      original_images: this.prepareOriginalImages(model_image, clothing_images),
      parameters: {
        ...parameters,
        angles: angles
      },
      scene_id: sceneId,
      generation_count: angles.length,
      credits_consumed: costCredits,
      created_at: new Date(),
      updated_at: new Date()
    }

    const workResult = await this.db.collection('works').insertOne(workData)

    // 调用多个Worker
    for (const task of tasks) {
      const taskData = await this.db.collection('task_queue').findOne({ _id: task.taskId })
      await this.callFittingWorker(task.taskId, taskData)
    }

    return {
      success: true,
      data: {
        groupId,
        workId: workResult.insertedId,
        tasks: tasks.map(t => ({
          taskId: t.taskId,
          angle: t.angle
        })),
        estimatedTime: this.estimateFittingTime(clothing_images, angles.length, 'multi_angle'),
        creditsConsumed: costCredits,
        mode: 'multi_angle'
      }
    }
  }

  /**
   * 获取试衣作品列表
   */
  async getFittingWorks(data) {
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
        type: 'fitting'
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
      logger.error('获取试衣作品失败:', error)
      return {
        success: false,
        message: '获取作品列表失败'
      }
    }
  }

  /**
   * 获取试衣任务状态
   */
  async getFittingTaskStatus(data) {
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

      // 如果是多角度任务，获取组内所有任务状态
      let relatedTasks = []
      if (task.mode === 'multi_angle' && task.multi_angle_group) {
        relatedTasks = await this.db.collection('task_queue')
          .find({
            multi_angle_group: task.multi_angle_group,
            user_openid: this.openId
          })
          .toArray()
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
          mode: task.mode,
          angle: task.angle_index,
          createdAt: task.created_at,
          updatedAt: task.updated_at,
          retryCount: task.retry_count,
          estimatedTime: this.estimateRemainingTime(task),
          work: work ? {
            workId: work._id,
            images: work.images,
            creditsConsumed: work.credits_consumed
          } : null,
          relatedTasks: relatedTasks.length > 0 ? relatedTasks.map(t => ({
            taskId: t._id,
            angle: t.angle_index,
            status: t.status,
            state: t.state
          })) : null
        }
      }

    } catch (error) {
      logger.error('获取试衣任务状态失败:', error)
      return {
        success: false,
        message: '获取任务状态失败'
      }
    }
  }

  /**
   * 计算试衣成本
   */
  calculateFittingCost(clothingImages, count, mode) {
    const baseCost = Object.keys(clothingImages).length
    const multipliers = {
      'standard': 1,
      'pose_variation': 1,
      'multi_angle': 1.5 // 多角度模式成本更高
    }
    return Math.ceil(baseCost * count * multipliers[mode])
  }

  /**
   * 扣除积分
   */
  async deductCredits(userId, amount, type, metadata = {}) {
    try {
      const session = this.db.startSession()
      session.startTransaction()

      try {
        // 扣除积分
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

        // 记录消费
        await this.db.collection('credit_records').insertOne({
          user_openid: this.openId,
          type: type,
          amount: amount,
          description: `虚拟试衣消费(${amount}张)`,
          metadata,
          balance_after: await this.getUserBalance(userId, session),
          created_at: new Date()
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
   * 调用试衣Worker
   */
  async callFittingWorker(taskId, taskData) {
    try {
      const AsyncTaskProcessor = require('./async-task-processor')
      const taskProcessor = new AsyncTaskProcessor()

      await taskProcessor.createTask({
        type: 'ai-generation',
        priority: 'high',
        timeout: 900000,
        data: {
          service_type: 'fitting',
          task_id: taskId,
          task_data: taskData,
          worker_type: 'fitting-worker'
        },
        metadata: {
          user_openid: this.openId,
          business_mode: this.businessMode
        }
      })

      logger.info('试衣Worker调用成功', { taskId })

    } catch (error) {
      logger.error('调用试衣Worker失败:', { taskId, error: error.message })
      await this.markTaskFailed(taskId, error)
    }
  }

  /**
   * 标记任务失败并退还积分
   */
  async markTaskFailed(taskId, error) {
    try {
      // 更新任务状态
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

      // 更新作品状态
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

      // 退还积分
      const work = await this.db.collection('works').findOne({ task_id: taskId })
      if (work && work.credits_consumed > 0) {
        await this.refundCredits(work.credits_consumed, 'fitting_refund', {
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
        description: '虚拟试衣失败退款',
        metadata,
        created_at: new Date()
      })

      logger.info('积分退还成功', { amount, type, metadata })

    } catch (error) {
      logger.error('退还积分失败:', error)
    }
  }

  /**
   * 辅助方法
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

  extractPersonImageId(originalImages) {
    const personImage = originalImages.find(img => img.type === 'person')
    return personImage ? personImage.fileId : null
  }

  generateFittingPoseDescription(userDescription, sceneInfo, parameters) {
    if (userDescription && userDescription.trim()) {
      return userDescription.trim()
    }

    if (sceneInfo && sceneInfo.pose_description) {
      return sceneInfo.pose_description
    }

    const poseMap = {
      'fashion': '时尚优雅的试衣姿势，展示服装的整体效果',
      'casual': '自然放松的日常试衣姿势，体现舒适感',
      'business': '专业得体的商务试衣姿势，突出职业形象',
      'party': '优雅迷人的社交试衣姿势，展现个人魅力'
    }

    return poseMap[parameters.style] || '自然优雅的试衣姿势，展现服装美感'
  }

  generateTaskId() {
    const timestamp = moment().format('YYYYMMDD_HHmmss')
    const random = Math.random().toString(36).substr(2, 8)
    return `fitting_${timestamp}_${random}`
  }

  generateGroupId() {
    const timestamp = moment().format('YYYYMMDD_HHmmss')
    const random = Math.random().toString(36).substr(2, 6)
    return `multi_${timestamp}_${random}`
  }

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

  estimateFittingTime(clothingImages, count, mode) {
    const baseTime = 30000
    const clothingTime = Object.keys(clothing_images).length * 12000
    const multipliers = {
      'standard': 1,
      'pose_variation': 1.2,
      'multi_angle': 0.8 // 多角度并发处理，单张时间更短
    }

    return baseTime * multipliers[mode] + clothingTime * count
  }

  estimateRemainingTime(task) {
    const timeElapsed = Date.now() - new Date(task.created_at).getTime()
    const estimatedTotal = this.estimateFittingTime(
      task.params.clothing_images || {},
      task.params.count || 1,
      task.mode || 'standard'
    )

    const remaining = Math.max(0, estimatedTotal - timeElapsed)
    return Math.ceil(remaining / 1000)
  }

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

    // 创建试衣服务实例
    const fittingService = new FittingService(user.openId, 'commercial')

    // 根据action调用对应方法
    const methodMap = {
      'generate': 'generateFitting',
      'poseVariation': 'generateFitting',
      'multiAngle': 'generateFitting',
      'getWorks': 'getFittingWorks',
      'getTaskStatus': 'getFittingTaskStatus'
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
          message: `不支持的试衣操作: ${action}`
        })
      }
    }

    const result = await fittingService[methodName](data)

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(result)
    }

  } catch (error) {
    logger.error('试衣服务处理失败:', error)

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

module.exports = FittingService