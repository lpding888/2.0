/**
 * AI生成服务
 * 支持虚拟试衣、服装摄影、数字分身等多种AI生成功能
 * 集成多厂商AI路由：Seedream 4.0、Gemini 2.0、DeepSeek等
 */

const axios = require('axios')
const { v4: uuidv4 } = require('uuid')
const moment = require('moment')

const Database = require('../shared/database/connection')
const COSService = require('../shared/storage/cos-config')
const CIService = require('../shared/storage/ci-service')
const AIRouter = require('../shared/ai/ai-router')
const TaskQueue = require('../shared/utils/task-queue')
const logger = require('../utils/logger')
const { validateInput } = require('../utils/validation')

class AIService {
  constructor(openId) {
    this.openId = openId
    this.db = new Database()
    this.cos = new COSService()
    this.ciService = new CIService()
    this.aiRouter = new AIRouter()
    this.taskQueue = new TaskQueue()
  }

  /**
   * 生成虚拟试衣效果
   */
  async generateVirtualTryon(data) {
    try {
      const { personImage, clothingImage, settings = {} } = data

      // 验证输入参数
      const validation = validateInput({
        personImage: { required: true, type: 'string' },
        clothingImage: { required: true, type: 'string' }
      }, data)

      if (!validation.valid) {
        return {
          success: false,
          message: validation.message
        }
      }

      // 检查用户积分
      const creditCheck = await this.checkUserCredits('virtual_tryon')
      if (!creditCheck.success) {
        return creditCheck
      }

      // 创建任务
      const taskId = uuidv4()
      const task = {
        _id: taskId,
        openid: this.openId,
        type: 'virtual_tryon',
        status: 'processing',
        input: {
          personImage,
          clothingImage,
          settings: {
            quality: settings.quality || 'medium',
            style: settings.style || 'natural',
            background: settings.background || 'white'
          }
        },
        result: null,
        error: null,
        credits: creditCheck.cost,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      await this.db.collection('task_queue').insertOne(task)

      // 扣除积分
      await this.deductCredits(creditCheck.cost, '虚拟试衣生成')

      // 异步处理任务
      this.processVirtualTryonTask(taskId).catch(error => {
        logger.error('虚拟试衣任务处理失败:', error)
      })

      return {
        success: true,
        data: {
          taskId,
          estimatedTime: this.getEstimatedTime('virtual_tryon'),
          creditsDeducted: creditCheck.cost,
          remainingCredits: creditCheck.remaining
        },
        message: '虚拟试衣任务已创建，请稍后...'
      }

    } catch (error) {
      logger.error('创建虚拟试衣任务失败:', error)
      return {
        success: false,
        message: '创建任务失败，请稍后重试'
      }
    }
  }

  /**
   * 生成时尚服装摄影
   */
  async generateFashionPhoto(data) {
    try {
      const { productImage, sceneType, modelStyle, settings = {} } = data

      // 验证输入参数
      const validation = validateInput({
        productImage: { required: true, type: 'string' },
        sceneType: { required: true, type: 'string' },
        modelStyle: { required: true, type: 'string' }
      }, data)

      if (!validation.valid) {
        return {
          success: false,
          message: validation.message
        }
      }

      // 检查用户积分
      const creditCheck = await this.checkUserCredits('fashion_photo')
      if (!creditCheck.success) {
        return creditCheck
      }

      // 创建任务
      const taskId = uuidv4()
      const task = {
        _id: taskId,
        openid: this.openId,
        type: 'fashion_photo',
        status: 'processing',
        input: {
          productImage,
          sceneType,
          modelStyle,
          settings: {
            quality: settings.quality || 'high',
            lighting: settings.lighting || 'professional',
            composition: settings.composition || 'auto',
            brandStyle: settings.brandStyle || 'modern'
          }
        },
        result: null,
        error: null,
        credits: creditCheck.cost,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      await this.db.collection('task_queue').insertOne(task)

      // 扣除积分
      await this.deductCredits(creditCheck.cost, '时尚摄影生成')

      // 异步处理任务
      this.processFashionPhotoTask(taskId).catch(error => {
        logger.error('时尚摄影任务处理失败:', error)
      })

      return {
        success: true,
        data: {
          taskId,
          estimatedTime: this.getEstimatedTime('fashion_photo'),
          creditsDeducted: creditCheck.cost,
          remainingCredits: creditCheck.remaining
        },
        message: '时尚摄影任务已创建，请稍后...'
      }

    } catch (error) {
      logger.error('创建时尚摄影任务失败:', error)
      return {
        success: false,
        message: '创建任务失败，请稍后重试'
      }
    }
  }

  /**
   * 生成数字分身
   */
  async generateDigitalAvatar(data) {
    try {
      const { sourceImages, style, preferences = {} } = data

      // 验证输入参数
      const validation = validateInput({
        sourceImages: { required: true, type: 'array', minItems: 1 },
        style: { required: true, type: 'string' }
      }, data)

      if (!validation.valid) {
        return {
          success: false,
          message: validation.message
        }
      }

      // 检查用户积分
      const creditCheck = await this.checkUserCredits('digital_avatar')
      if (!creditCheck.success) {
        return creditCheck
      }

      // 创建任务
      const taskId = uuidv4()
      const task = {
        _id: taskId,
        openid: this.openId,
        type: 'digital_avatar',
        status: 'processing',
        input: {
          sourceImages,
          style,
          preferences: {
            age: preferences.age || 'natural',
            gender: preferences.gender || 'auto',
            ethnicity: preferences.ethnicity || 'auto',
            expression: preferences.expression || 'natural'
          }
        },
        result: null,
        error: null,
        credits: creditCheck.cost,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      await this.db.collection('task_queue').insertOne(task)

      // 扣除积分
      await this.deductCredits(creditCheck.cost, '数字分身生成')

      // 异步处理任务
      this.processDigitalAvatarTask(taskId).catch(error => {
        logger.error('数字分身任务处理失败:', error)
      })

      return {
        success: true,
        data: {
          taskId,
          estimatedTime: this.getEstimatedTime('digital_avatar'),
          creditsDeducted: creditCheck.cost,
          remainingCredits: creditCheck.remaining
        },
        message: '数字分身任务已创建，请稍后...'
      }

    } catch (error) {
      logger.error('创建数字分身任务失败:', error)
      return {
        success: false,
        message: '创建任务失败，请稍后重试'
      }
    }
  }

  /**
   * 生成商品摄影
   */
  async generateProductPhoto(data) {
    try {
      const { productImage, background, lighting, composition } = data

      // 验证输入参数
      const validation = validateInput({
        productImage: { required: true, type: 'string' }
      }, data)

      if (!validation.valid) {
        return {
          success: false,
          message: validation.message
        }
      }

      // 检查用户积分
      const creditCheck = await this.checkUserCredits('product_photo')
      if (!creditCheck.success) {
        return creditCheck
      }

      // 创建任务
      const taskId = uuidv4()
      const task = {
        _id: taskId,
        openid: this.openId,
        type: 'product_photo',
        status: 'processing',
        input: {
          productImage,
          background: background || 'white',
          lighting: lighting || 'studio',
          composition: composition || 'center'
        },
        result: null,
        error: null,
        credits: creditCheck.cost,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      await this.db.collection('task_queue').insertOne(task)

      // 扣除积分
      await this.deductCredits(creditCheck.cost, '商品摄影生成')

      // 异步处理任务
      this.processProductPhotoTask(taskId).catch(error => {
        logger.error('商品摄影任务处理失败:', error)
      })

      return {
        success: true,
        data: {
          taskId,
          estimatedTime: this.getEstimatedTime('product_photo'),
          creditsDeducted: creditCheck.cost,
          remainingCredits: creditCheck.remaining
        },
        message: '商品摄影任务已创建，请稍后...'
      }

    } catch (error) {
      logger.error('创建商品摄影任务失败:', error)
      return {
        success: false,
        message: '创建任务失败，请稍后重试'
      }
    }
  }

  /**
   * 获取任务状态
   */
  async getTaskStatus(data) {
    try {
      const { taskId } = data

      const validation = validateInput({
        taskId: { required: true, type: 'string' }
      }, data)

      if (!validation.valid) {
        return {
          success: false,
          message: validation.message
        }
      }

      const task = await this.db.collection('task_queue').findOne({
        _id: taskId,
        openid: this.openId
      })

      if (!task) {
        return {
          success: false,
          message: '任务不存在'
        }
      }

      return {
        success: true,
        data: {
          taskId: task._id,
          status: task.status,
          progress: task.progress || 0,
          estimatedTime: this.getRemainingTime(task),
          createdAt: task.createdAt,
          updatedAt: task.updatedAt
        }
      }

    } catch (error) {
      logger.error('获取任务状态失败:', error)
      return {
        success: false,
        message: '获取任务状态失败'
      }
    }
  }

  /**
   * 获取任务结果
   */
  async getTaskResult(data) {
    try {
      const { taskId } = data

      const validation = validateInput({
        taskId: { required: true, type: 'string' }
      }, data)

      if (!validation.valid) {
        return {
          success: false,
          message: validation.message
        }
      }

      const task = await this.db.collection('task_queue').findOne({
        _id: taskId,
        openid: this.openId
      })

      if (!task) {
        return {
          success: false,
          message: '任务不存在'
        }
      }

      if (task.status !== 'completed') {
        return {
          success: false,
          message: '任务尚未完成',
          data: {
            status: task.status,
            progress: task.progress || 0
          }
        }
      }

      // 为结果图片生成临时访问URL
      let resultWithUrls = task.result
      if (task.result && task.result.images) {
        const tempUrls = await this.cos.getBatchTempFileURLs(
          task.result.images.map(img => img.cloudPath)
        )

        resultWithUrls = {
          ...task.result,
          images: task.result.images.map((img, index) => ({
            ...img,
            tempUrl: tempUrls.tempUrls[index]
          }))
        }
      }

      return {
        success: true,
        data: {
          taskId: task._id,
          status: task.status,
          result: resultWithUrls,
          createdAt: task.createdAt,
          completedAt: task.completedAt
        }
      }

    } catch (error) {
      logger.error('获取任务结果失败:', error)
      return {
        success: false,
        message: '获取任务结果失败'
      }
    }
  }

  /**
   * 取消任务
   */
  async cancelTask(data) {
    try {
      const { taskId } = data

      const validation = validateInput({
        taskId: { required: true, type: 'string' }
      }, data)

      if (!validation.valid) {
        return {
          success: false,
          message: validation.message
        }
      }

      const task = await this.db.collection('task_queue').findOne({
        _id: taskId,
        openid: this.openId
      })

      if (!task) {
        return {
          success: false,
          message: '任务不存在'
        }
      }

      if (task.status === 'completed') {
        return {
          success: false,
          message: '任务已完成，无法取消'
        }
      }

      if (task.status === 'cancelled') {
        return {
          success: false,
          message: '任务已取消'
        }
      }

      // 更新任务状态
      await this.db.collection('task_queue').updateOne(
        { _id: taskId },
        {
          $set: {
            status: 'cancelled',
            updatedAt: new Date()
          }
        }
      )

      // 退还积分
      await this.refundCredits(task.credits, '任务取消')

      return {
        success: true,
        message: '任务已取消，积分已退还'
      }

    } catch (error) {
      logger.error('取消任务失败:', error)
      return {
        success: false,
        message: '取消任务失败'
      }
    }
  }

  /**
   * 处理虚拟试衣任务
   */
  async processVirtualTryonTask(taskId) {
    try {
      const task = await this.db.collection('task_queue').findOne({ _id: taskId })
      if (!task) return

      // 更新任务状态
      await this.updateTaskProgress(taskId, 10, '开始处理图片...')

      // 上传并处理图片
      const personImagePath = await this.uploadBase64Image(task.input.personImage, 'person')
      const clothingImagePath = await this.uploadBase64Image(task.input.clothingImage, 'clothing')

      await this.updateTaskProgress(taskId, 30, '图片处理完成，开始AI生成...')

      // 使用智能抠图
      const mattingResult = await this.ciService.intelligentMatting(clothingImagePath, {
        detectType: '2' // 人像抠图
      })

      await this.updateTaskProgress(taskId, 50, '开始虚拟试衣生成...')

      // 选择AI模型
      const aiModel = await this.aiRouter.selectModel('virtual_tryon', {
        quality: task.input.settings.quality,
        style: task.input.settings.style
      })

      // 调用AI生成
      const aiResult = await this.callAIService(aiModel, {
        type: 'virtual_tryon',
        personImage: personImagePath,
        clothingImage: mattingResult.processedPath,
        settings: task.input.settings
      })

      await this.updateTaskProgress(taskId, 80, 'AI生成完成，后处理中...')

      // 后处理和保存结果
      const resultImages = await this.processAIResult(aiResult, 'virtual_tryon')

      // 保存作品到数据库
      await this.saveWork({
        _id: uuidv4(),
        openid: this.openId,
        type: 'virtual_tryon',
        title: '虚拟试衣作品',
        input: task.input,
        result: {
          images: resultImages,
          aiModel: aiModel.name,
          processingTime: Date.now() - task.createdAt.getTime()
        },
        settings: task.input.settings,
        isPublic: false,
        favoriteCount: 0,
        createdAt: new Date()
      })

      // 更新任务完成状态
      await this.completeTask(taskId, {
        images: resultImages,
        aiModel: aiModel.name
      })

      logger.info('虚拟试衣任务完成:', { taskId, openid: this.openId })

    } catch (error) {
      logger.error('虚拟试衣任务处理失败:', error)
      await this.failTask(taskId, error.message)
    }
  }

  /**
   * 处理时尚摄影任务
   */
  async processFashionPhotoTask(taskId) {
    try {
      const task = await this.db.collection('task_queue').findOne({ _id: taskId })
      if (!task) return

      await this.updateTaskProgress(taskId, 10, '开始处理商品图片...')

      // 上传商品图片
      const productImagePath = await this.uploadBase64Image(task.input.productImage, 'product')

      await this.updateTaskProgress(taskId, 30, '商品图片处理完成...')

      // 智能抠图（商品抠图）
      const mattingResult = await this.ciService.intelligentMatting(productImagePath, {
        detectType: '3' // 商品抠图
      })

      await this.updateTaskProgress(taskId, 50, '开始AI摄影生成...')

      // 选择AI模型（商业版优先Seedream 4.0）
      const aiModel = await this.aiRouter.selectModel('fashion_photo', {
        quality: task.input.settings.quality,
        sceneType: task.input.sceneType,
        modelStyle: task.input.modelStyle
      })

      // 调用AI生成
      const aiResult = await this.callAIService(aiModel, {
        type: 'fashion_photo',
        productImage: mattingResult.processedPath,
        sceneType: task.input.sceneType,
        modelStyle: task.input.modelStyle,
        settings: task.input.settings
      })

      await this.updateTaskProgress(taskId, 80, 'AI摄影完成，后处理中...')

      // 后处理和保存结果
      const resultImages = await this.processAIResult(aiResult, 'fashion_photo')

      // 保存作品
      await this.saveWork({
        _id: uuidv4(),
        openid: this.openId,
        type: 'fashion_photo',
        title: '时尚摄影作品',
        input: task.input,
        result: {
          images: resultImages,
          aiModel: aiModel.name,
          processingTime: Date.now() - task.createdAt.getTime()
        },
        settings: task.input.settings,
        isPublic: false,
        favoriteCount: 0,
        createdAt: new Date()
      })

      await this.completeTask(taskId, {
        images: resultImages,
        aiModel: aiModel.name
      })

      logger.info('时尚摄影任务完成:', { taskId, openid: this.openId })

    } catch (error) {
      logger.error('时尚摄影任务处理失败:', error)
      await this.failTask(taskId, error.message)
    }
  }

  /**
   * 处理数字分身任务
   */
  async processDigitalAvatarTask(taskId) {
    try {
      const task = await this.db.collection('task_queue').findOne({ _id: taskId })
      if (!task) return

      await this.updateTaskProgress(taskId, 10, '开始分析源图片...')

      // 上传源图片
      const uploadedImages = []
      for (let i = 0; i < task.input.sourceImages.length; i++) {
        const imagePath = await this.uploadBase64Image(
          task.input.sourceImages[i],
          `avatar_source_${i}`
        )
        uploadedImages.push(imagePath)
      }

      await this.updateTaskProgress(taskId, 30, '源图片处理完成...')

      // 选择AI模型
      const aiModel = await this.aiRouter.selectModel('digital_avatar', {
        style: task.input.style,
        sourceCount: uploadedImages.length
      })

      await this.updateTaskProgress(taskId, 50, '开始数字分身生成...')

      // 调用AI生成
      const aiResult = await this.callAIService(aiModel, {
        type: 'digital_avatar',
        sourceImages: uploadedImages,
        style: task.input.style,
        preferences: task.input.preferences
      })

      await this.updateTaskProgress(taskId, 80, '数字分身生成完成，后处理中...')

      // 后处理和保存结果
      const resultImages = await this.processAIResult(aiResult, 'digital_avatar')

      // 保存作品
      await this.saveWork({
        _id: uuidv4(),
        openid: this.openId,
        type: 'digital_avatar',
        title: '数字分身作品',
        input: task.input,
        result: {
          images: resultImages,
          aiModel: aiModel.name,
          processingTime: Date.now() - task.createdAt.getTime()
        },
        settings: task.input.settings,
        isPublic: false,
        favoriteCount: 0,
        createdAt: new Date()
      })

      await this.completeTask(taskId, {
        images: resultImages,
        aiModel: aiModel.name
      })

      logger.info('数字分身任务完成:', { taskId, openid: this.openId })

    } catch (error) {
      logger.error('数字分身任务处理失败:', error)
      await this.failTask(taskId, error.message)
    }
  }

  /**
   * 处理商品摄影任务
   */
  async processProductPhotoTask(taskId) {
    try {
      const task = await this.db.collection('task_queue').findOne({ _id: taskId })
      if (!task) return

      await this.updateTaskProgress(taskId, 10, '开始处理商品图片...')

      // 上传商品图片
      const productImagePath = await this.uploadBase64Image(task.input.productImage, 'product')

      await this.updateTaskProgress(taskId, 30, '商品图片处理完成...')

      // 智能抠图
      const mattingResult = await this.ciService.intelligentMatting(productImagePath, {
        detectType: '3' // 商品抠图
      })

      await this.updateTaskProgress(taskId, 50, '开始商品摄影生成...')

      // 选择AI模型
      const aiModel = await this.aiRouter.selectModel('product_photo', {
        quality: 'high',
        background: task.input.background,
        lighting: task.input.lighting
      })

      // 调用AI生成
      const aiResult = await this.callAIService(aiModel, {
        type: 'product_photo',
        productImage: mattingResult.processedPath,
        background: task.input.background,
        lighting: task.input.lighting,
        composition: task.input.composition
      })

      await this.updateTaskProgress(taskId, 80, '商品摄影完成，后处理中...')

      // 后处理和保存结果
      const resultImages = await this.processAIResult(aiResult, 'product_photo')

      // 保存作品
      await this.saveWork({
        _id: uuidv4(),
        openid: this.openId,
        type: 'product_photo',
        title: '商品摄影作品',
        input: task.input,
        result: {
          images: resultImages,
          aiModel: aiModel.name,
          processingTime: Date.now() - task.createdAt.getTime()
        },
        settings: task.input.settings,
        isPublic: false,
        favoriteCount: 0,
        createdAt: new Date()
      })

      await this.completeTask(taskId, {
        images: resultImages,
        aiModel: aiModel.name
      })

      logger.info('商品摄影任务完成:', { taskId, openid: this.openId })

    } catch (error) {
      logger.error('商品摄影任务处理失败:', error)
      await this.failTask(taskId, error.message)
    }
  }

  /**
   * 上传Base64图片到COS
   */
  async uploadBase64Image(base64Data, folder) {
    try {
      const result = await this.cos.uploadFile(base64Data, `${folder}/${Date.now()}`)
      return result.cloudPath
    } catch (error) {
      logger.error('上传图片失败:', error)
      throw new Error('图片上传失败')
    }
  }

  /**
   * 调用AI服务
   */
  async callAIService(aiModel, params) {
    try {
      // 根据选择的AI模型调用对应服务
      switch (aiModel.provider) {
        case 'seedream':
          return await this.callSeedreamAPI(params, aiModel)
        case 'gemini':
          return await this.callGeminiAPI(params, aiModel)
        case 'deepseek':
          return await this.callDeepSeekAPI(params, aiModel)
        case 'openai':
          return await this.callOpenAIAPI(params, aiModel)
        default:
          throw new Error(`不支持的AI模型: ${aiModel.provider}`)
      }
    } catch (error) {
      logger.error('AI服务调用失败:', error)
      throw new Error('AI生成失败，请稍后重试')
    }
  }

  /**
   * 调用Seedream API
   */
  async callSeedreamAPI(params, modelConfig) {
    // 这里实现Seedream API调用
    // 暂时返回模拟数据
    return {
      success: true,
      images: ['generated_image_1.jpg', 'generated_image_2.jpg'],
      metadata: {
        model: 'seedream-v4',
        processingTime: 15000
      }
    }
  }

  /**
   * 调用Gemini API
   */
  async callGeminiAPI(params, modelConfig) {
    // 这里实现Gemini API调用
    return {
      success: true,
      images: ['generated_image_1.jpg'],
      metadata: {
        model: 'gemini-2.0',
        processingTime: 12000
      }
    }
  }

  /**
   * 调用DeepSeek API
   */
  async callDeepSeekAPI(params, modelConfig) {
    // 这里实现DeepSeek API调用
    return {
      success: true,
      images: ['generated_image_1.jpg'],
      metadata: {
        model: 'deepseek-vision',
        processingTime: 10000
      }
    }
  }

  /**
   * 调用OpenAI API
   */
  async callOpenAIAPI(params, modelConfig) {
    // 这里实现OpenAI API调用
    return {
      success: true,
      images: ['generated_image_1.jpg'],
      metadata: {
        model: 'gpt-4-vision',
        processingTime: 18000
      }
    }
  }

  /**
   * 处理AI结果
   */
  async processAIResult(aiResult, type) {
    try {
      const resultImages = []

      for (const imageName of aiResult.images) {
        // 这里应该处理AI生成的图片
        // 比如添加水印、调整大小等
        resultImages.push({
          cloudPath: `results/${type}/${Date.now()}_${imageName}`,
          fileName: imageName,
          size: 0, // 实际获取文件大小
          format: 'jpg'
        })
      }

      return resultImages
    } catch (error) {
      logger.error('处理AI结果失败:', error)
      throw new Error('结果处理失败')
    }
  }

  /**
   * 检查用户积分
   */
  async checkUserCredits(action) {
    try {
      const creditCosts = {
        'virtual_tryon': 5,
        'fashion_photo': 8,
        'digital_avatar': 10,
        'product_photo': 6
      }

      const cost = creditCosts[action] || 5

      const user = await this.db.collection('users').findOne(
        { openid: this.openId },
        { projection: { credits: 1, subscription: 1 } }
      )

      if (!user) {
        return {
          success: false,
          message: '用户不存在'
        }
      }

      // 检查订阅用户是否有免费额度
      if (user.subscription.type === 'premium' && user.subscription.features.includes('unlimited_generation')) {
        return {
          success: true,
          cost: 0,
          remaining: user.credits.balance
        }
      }

      if (user.credits.balance < cost) {
        return {
          success: false,
          message: '积分不足，请充值',
          data: {
            required: cost,
            current: user.credits.balance
          }
        }
      }

      return {
        success: true,
        cost,
        remaining: user.credits.balance - cost
      }

    } catch (error) {
      logger.error('检查用户积分失败:', error)
      return {
        success: false,
        message: '积分检查失败'
      }
    }
  }

  /**
   * 扣除积分
   */
  async deductCredits(amount, description) {
    try {
      await this.db.collection('users').updateOne(
        { openid: this.openId },
        {
          $inc: {
            'credits.balance': -amount,
            'credits.totalSpent': amount
          },
          $set: {
            'credits.lastUpdated': new Date()
          }
        }
      )

      // 记录积分使用
      await this.db.collection('credit_records').insertOne({
        _id: uuidv4(),
        openid: this.openId,
        type: 'spend',
        amount: -amount,
        description,
        createdAt: new Date()
      })

    } catch (error) {
      logger.error('扣除积分失败:', error)
      throw error
    }
  }

  /**
   * 退还积分
   */
  async refundCredits(amount, description) {
    try {
      await this.db.collection('users').updateOne(
        { openid: this.openId },
        {
          $inc: {
            'credits.balance': amount,
            'credits.totalEarned': amount
          },
          $set: {
            'credits.lastUpdated': new Date()
          }
        }
      )

      // 记录积分退还
      await this.db.collection('credit_records').insertOne({
        _id: uuidv4(),
        openid: this.openId,
        type: 'refund',
        amount: amount,
        description,
        createdAt: new Date()
      })

    } catch (error) {
      logger.error('退还积分失败:', error)
      throw error
    }
  }

  /**
   * 更新任务进度
   */
  async updateTaskProgress(taskId, progress, message) {
    try {
      await this.db.collection('task_queue').updateOne(
        { _id: taskId },
        {
          $set: {
            progress,
            statusMessage: message,
            updatedAt: new Date()
          }
        }
      )
    } catch (error) {
      logger.error('更新任务进度失败:', error)
    }
  }

  /**
   * 完成任务
   */
  async completeTask(taskId, result) {
    try {
      await this.db.collection('task_queue').updateOne(
        { _id: taskId },
        {
          $set: {
            status: 'completed',
            progress: 100,
            result,
            completedAt: new Date(),
            updatedAt: new Date()
          }
        }
      )
    } catch (error) {
      logger.error('完成任务失败:', error)
    }
  }

  /**
   * 任务失败
   */
  async failTask(taskId, errorMessage) {
    try {
      await this.db.collection('task_queue').updateOne(
        { _id: taskId },
        {
          $set: {
            status: 'failed',
            error: errorMessage,
            updatedAt: new Date()
          }
        }
      )
    } catch (error) {
      logger.error('更新任务失败状态失败:', error)
    }
  }

  /**
   * 保存作品
   */
  async saveWork(work) {
    try {
      await this.db.collection('works').insertOne(work)

      // 更新用户统计
      await this.db.collection('users').updateOne(
        { openid: this.openId },
        {
          $inc: {
            'statistics.worksCreated': 1
          }
        }
      )

    } catch (error) {
      logger.error('保存作品失败:', error)
      throw error
    }
  }

  /**
   * 获取预计处理时间
   */
  getEstimatedTime(type) {
    const times = {
      'virtual_tryon': 30, // 30秒
      'fashion_photo': 45, // 45秒
      'digital_avatar': 60, // 60秒
      'product_photo': 25  // 25秒
    }
    return times[type] || 30
  }

  /**
   * 获取剩余时间
   */
  getRemainingTime(task) {
    if (!task.progress || task.progress >= 100) return 0
    const elapsed = Date.now() - task.createdAt.getTime()
    const estimatedTotal = (elapsed / task.progress) * 100
    return Math.max(0, Math.ceil(estimatedTotal - elapsed / 1000))
  }
}

// SCF入口函数
exports.main_handler = async (event, context) => {
  try {
    const { action, ...data } = event

    // 验证用户身份
    const token = event.headers?.Authorization || event.headers?.authorization
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
    let user = null

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

    // 创建AI服务实例
    const aiService = new AIService(user.openId)

    // 根据action调用对应方法
    const methodMap = {
      'generateVirtualTryon': 'generateVirtualTryon',
      'generateFashionPhoto': 'generateFashionPhoto',
      'generateDigitalAvatar': 'generateDigitalAvatar',
      'generateProductPhoto': 'generateProductPhoto',
      'getTaskStatus': 'getTaskStatus',
      'getTaskResult': 'getTaskResult',
      'cancelTask': 'cancelTask'
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

    const result = await aiService[methodName](data)

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(result)
    }

  } catch (error) {
    logger.error('AI生成服务处理失败:', error)

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: '服务器内部错误'
      })
    }
  }
}

module.exports = AIService