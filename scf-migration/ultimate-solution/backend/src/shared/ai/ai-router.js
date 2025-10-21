/**
 * AI路由服务
 * 多厂商AI模型选择和路由
 * 支持成本优化、质量优先、负载均衡等策略
 */

const logger = require('../../utils/logger')
const { validateInput } = require('../../utils/validation')

class AIRouter {
  constructor() {
    this.models = this.initializeModels()
    this.costTracker = new Map()
    this.performanceTracker = new Map()
  }

  /**
   * 初始化AI模型配置
   */
  initializeModels() {
    const businessMode = process.env.BUSINESS_MODE || 'personal'

    // 商业版模型配置
    const commercialModels = [
      {
        name: 'seedream-v4',
        provider: 'seedream',
        type: 'fashion_photo',
        quality: 'ultra',
        cost: 0.15, // 每次生成成本
        maxTokens: 4096,
        capabilities: ['virtual_tryon', 'fashion_photo', 'product_photo'],
        priority: 1, // 优先级，数字越小优先级越高
        features: ['background_removal', 'lighting_control', 'composition_optimization'],
        supportedFormats: ['jpg', 'png'],
        estimatedTime: 45, // 预计处理时间（秒）
        enabled: process.env.ENABLE_SEEDREAM_V4 === 'true'
      },
      {
        name: 'gemini-2.0',
        provider: 'gemini',
        type: 'general',
        quality: 'high',
        cost: 0.08,
        maxTokens: 8192,
        capabilities: ['virtual_tryon', 'digital_avatar'],
        priority: 2,
        features: ['multi_person', 'style_transfer', 'age_progression'],
        supportedFormats: ['jpg', 'png', 'webp'],
        estimatedTime: 30,
        enabled: process.env.ENABLE_GEMINI_2 === 'true'
      },
      {
        name: 'gpt-4-vision',
        provider: 'openai',
        type: 'general',
        quality: 'high',
        cost: 0.12,
        maxTokens: 4096,
        capabilities: ['virtual_tryon', 'digital_avatar', 'product_photo'],
        priority: 3,
        features: ['detailed_analysis', 'multi_object', 'occlusion_handling'],
        supportedFormats: ['jpg', 'png'],
        estimatedTime: 35,
        enabled: process.env.ENABLE_GPT4 === 'true'
      }
    ]

    // 个人版模型配置
    const personalModels = [
      {
        name: 'gemini-2.0',
        provider: 'gemini',
        type: 'general',
        quality: 'high',
        cost: 0.06,
        maxTokens: 8192,
        capabilities: ['virtual_tryon', 'digital_avatar'],
        priority: 1,
        features: ['style_transfer', 'background_replacement'],
        supportedFormats: ['jpg', 'png', 'webp'],
        estimatedTime: 25,
        enabled: process.env.ENABLE_GEMINI_2 === 'true'
      },
      {
        name: 'seedream-lite',
        provider: 'seedream',
        type: 'fashion_photo',
        quality: 'medium',
        cost: 0.04,
        maxTokens: 2048,
        capabilities: ['virtual_tryon'],
        priority: 2,
        features: ['basic_tryon', 'simple_background'],
        supportedFormats: ['jpg', 'png'],
        estimatedTime: 20,
        enabled: process.env.ENABLE_SEEDREAM_LITE === 'true'
      },
      {
        name: 'deepseek-vision',
        provider: 'deepseek',
        type: 'general',
        quality: 'medium',
        cost: 0.03,
        maxTokens: 4096,
        capabilities: ['virtual_tryon', 'digital_avatar', 'product_photo'],
        priority: 3,
        features: ['cost_effective', 'fast_processing'],
        supportedFormats: ['jpg', 'png'],
        estimatedTime: 18,
        enabled: process.env.ENABLE_DEEPSEEK === 'true'
      },
      {
        name: 'gpt-3.5-turbo-vision',
        provider: 'openai',
        type: 'general',
        quality: 'medium',
        cost: 0.02,
        maxTokens: 2048,
        capabilities: ['virtual_tryon'],
        priority: 4,
        features: ['free_trial', 'basic_features'],
        supportedFormats: ['jpg', 'png'],
        estimatedTime: 15,
        enabled: process.env.ENABLE_GPT35 === 'true'
      }
    ]

    // 根据业务模式选择模型列表
    const models = businessMode === 'commercial' ? commercialModels : personalModels

    // 过滤已启用的模型
    return models.filter(model => model.enabled)
  }

  /**
   * 选择最佳AI模型
   */
  async selectModel(taskType, preferences = {}) {
    try {
      // 验证输入参数
      const validation = validateInput({
        taskType: { required: true, type: 'string', enum: ['virtual_tryon', 'fashion_photo', 'digital_avatar', 'product_photo'] }
      }, { taskType })

      if (!validation.valid) {
        throw new Error(validation.message)
      }

      // 获取可用模型
      const availableModels = this.getAvailableModels(taskType, preferences)

      if (availableModels.length === 0) {
        throw new Error(`没有可用的AI模型支持任务类型: ${taskType}`)
      }

      // 根据策略选择模型
      let selectedModel

      switch (preferences.strategy) {
        case 'cost':
          selectedModel = this.selectByCost(availableModels, preferences)
          break
        case 'quality':
          selectedModel = this.selectByQuality(availableModels, preferences)
          break
        case 'speed':
          selectedModel = this.selectBySpeed(availableModels, preferences)
          break
        case 'load_balance':
          selectedModel = this.selectByLoadBalance(availableModels)
          break
        default:
          selectedModel = this.selectByDefault(availableModels, preferences)
      }

      // 记录选择
      this.trackModelSelection(selectedModel, taskType, preferences)

      logger.info('AI模型选择完成:', {
        taskType,
        selectedModel: selectedModel.name,
        provider: selectedModel.provider,
        cost: selectedModel.cost,
        strategy: preferences.strategy || 'default'
      })

      return selectedModel

    } catch (error) {
      logger.error('AI模型选择失败:', error)
      throw error
    }
  }

  /**
   * 获取可用模型
   */
  getAvailableModels(taskType, preferences) {
    const { quality = 'medium', maxCost = null, features = [] } = preferences

    return this.models.filter(model => {
      // 检查是否支持任务类型
      if (!model.capabilities.includes(taskType)) {
        return false
      }

      // 检查质量要求
      if (quality && this.compareQuality(model.quality, quality) < 0) {
        return false
      }

      // 检查成本限制
      if (maxCost && model.cost > maxCost) {
        return false
      }

      // 检查功能要求
      if (features.length > 0) {
        const hasRequiredFeatures = features.every(feature =>
          model.features.includes(feature)
        )
        if (!hasRequiredFeatures) {
          return false
        }
      }

      return true
    })
  }

  /**
   * 按成本选择模型
   */
  selectByCost(models, preferences) {
    return models.reduce((prev, current) =>
      prev.cost < current.cost ? prev : current
    )
  }

  /**
   * 按质量选择模型
   */
  selectByQuality(models, preferences) {
    return models.reduce((prev, current) =>
      this.compareQuality(current.quality, prev.quality) > 0 ? current : prev
    )
  }

  /**
   * 按速度选择模型
   */
  selectBySpeed(models, preferences) {
    return models.reduce((prev, current) =>
      current.estimatedTime < prev.estimatedTime ? current : prev
    )
  }

  /**
   * 负载均衡选择
   */
  selectByLoadBalance(models) {
    // 选择当前使用次数最少的模型
    return models.reduce((prev, current) => {
      const prevUsage = this.performanceTracker.get(prev.name)?.usageCount || 0
      const currentUsage = this.performanceTracker.get(current.name)?.usageCount || 0
      return currentUsage < prevUsage ? current : prev
    })
  }

  /**
   * 默认选择策略
   */
  selectByDefault(models, preferences) {
    // 根据优先级选择，同时考虑用户质量要求
    const { quality = 'medium' } = preferences

    // 首先按质量过滤
    const qualityFiltered = models.filter(model =>
      this.compareQuality(model.quality, quality) >= 0
    )

    // 如果没有符合质量要求的，使用所有可用模型
    const candidateModels = qualityFiltered.length > 0 ? qualityFiltered : models

    // 按优先级选择
    return candidateModels.reduce((prev, current) =>
      prev.priority < current.priority ? prev : current
    )
  }

  /**
   * 比较质量等级
   */
  compareQuality(quality1, quality2) {
    const qualityLevels = {
      'low': 1,
      'medium': 2,
      'high': 3,
      'ultra': 4
    }

    const level1 = qualityLevels[quality1] || 0
    const level2 = qualityLevels[quality2] || 0

    return level1 - level2
  }

  /**
   * 记录模型选择
   */
  trackModelSelection(model, taskType, preferences) {
    const key = model.name
    const current = this.performanceTracker.get(key) || {
      usageCount: 0,
      totalCost: 0,
      totalTime: 0,
      successCount: 0,
      errorCount: 0,
      lastUsed: null
    }

    current.usageCount++
    current.totalCost += model.cost
    current.totalTime += model.estimatedTime
    current.lastUsed = new Date()

    this.performanceTracker.set(key, current)
  }

  /**
   * 记录模型执行结果
   */
  trackModelExecution(modelName, success, actualTime = null) {
    const key = modelName
    const current = this.performanceTracker.get(key)

    if (!current) return

    if (success) {
      current.successCount++
    } else {
      current.errorCount++
    }

    if (actualTime) {
      current.totalTime = current.totalTime - current.estimatedTime + actualTime
    }

    this.performanceTracker.set(key, current)
  }

  /**
   * 获取模型性能统计
   */
  getModelStats(modelName = null) {
    if (modelName) {
      return this.performanceTracker.get(modelName) || null
    }

    const stats = {}
    for (const [name, data] of this.performanceTracker.entries()) {
      stats[name] = {
        ...data,
        averageTime: data.usageCount > 0 ? data.totalTime / data.usageCount : 0,
        averageCost: data.usageCount > 0 ? data.totalCost / data.usageCount : 0,
        successRate: data.usageCount > 0 ? data.successCount / data.usageCount : 0
      }
    }

    return stats
  }

  /**
   * 获取成本统计
   */
  getCostStats(timeRange = '24h') {
    const now = new Date()
    let startTime

    switch (timeRange) {
      case '1h':
        startTime = new Date(now.getTime() - 60 * 60 * 1000)
        break
      case '24h':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    }

    // 这里应该从数据库或日志中获取实际成本数据
    // 暂时返回内存中的统计数据
    const totalCost = Array.from(this.performanceTracker.values())
      .reduce((sum, data) => sum + data.totalCost, 0)

    return {
      timeRange,
      startTime,
      endTime: now,
      totalCost,
      modelBreakdown: this.getModelStats()
    }
  }

  /**
   * 重置统计数据
   */
  resetStats(modelName = null) {
    if (modelName) {
      this.performanceTracker.delete(modelName)
    } else {
      this.performanceTracker.clear()
    }
  }

  /**
   * 检查模型健康状态
   */
  async checkModelHealth(modelName) {
    try {
      const model = this.models.find(m => m.name === modelName)
      if (!model) {
        return { healthy: false, error: '模型不存在' }
      }

      // 这里应该实现实际的健康检查逻辑
      // 比如调用模型的测试接口

      return {
        healthy: true,
        model: modelName,
        provider: model.provider,
        responseTime: model.estimatedTime,
        lastCheck: new Date()
      }

    } catch (error) {
      logger.error('模型健康检查失败:', error)
      return {
        healthy: false,
        model: modelName,
        error: error.message
      }
    }
  }

  /**
   * 获取推荐模型
   */
  getRecommendedModels(taskType, budget = null) {
    const availableModels = this.getAvailableModels(taskType, { maxCost: budget })

    // 按综合评分排序（质量、成本、速度的加权平均）
    return availableModels
      .map(model => ({
        ...model,
        score: this.calculateModelScore(model, taskType)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3) // 返回前3个推荐模型
  }

  /**
   * 计算模型评分
   */
  calculateModelScore(model, taskType) {
    const stats = this.performanceTracker.get(model.name)

    let score = 0

    // 质量评分 (40%)
    const qualityScore = this.compareQuality(model.quality, 'medium') * 10
    score += qualityScore * 0.4

    // 成本评分 (30%) - 成本越低分数越高
    const costScore = Math.max(0, (0.2 - model.cost)) * 100
    score += costScore * 0.3

    // 速度评分 (20%) - 时间越短分数越高
    const speedScore = Math.max(0, (60 - model.estimatedTime)) * 1.5
    score += speedScore * 0.2

    // 可靠性评分 (10%) - 基于历史成功率
    const reliabilityScore = stats ? (stats.successCount / Math.max(1, stats.usageCount)) * 100 : 50
    score += reliabilityScore * 0.1

    return Math.round(score)
  }

  /**
   * 动态调整模型配置
   */
  updateModelConfig(modelName, updates) {
    const modelIndex = this.models.findIndex(m => m.name === modelName)
    if (modelIndex === -1) {
      throw new Error(`模型不存在: ${modelName}`)
    }

    this.models[modelIndex] = { ...this.models[modelIndex], ...updates }
    logger.info('模型配置已更新:', { modelName, updates })
  }

  /**
   * 获取所有可用模型
   */
  getAllModels() {
    return this.models.map(model => ({
      ...model,
      stats: this.getModelStats(model.name)
    }))
  }
}

module.exports = AIRouter