/**
 * 场景管理服务
 * 完全基于原有微信云函数scene的业务逻辑
 * 提供摄影场景信息、背景描述、参数配置等
 */

const logger = require('../utils/logger')
const { validateInput } = require('../utils/validation')

class SceneService {
  constructor() {
    this.db = require('../shared/database/connection')
  }

  /**
   * 获取场景列表
   */
  async getScenes(data) {
    try {
      const {
        type = 'all', // all, photography, fitting
        category = 'all', // all, indoor, outdoor, studio
        page = 1,
        pageSize = 50,
        status = 'active' // active, inactive
      } = data

      const skip = (page - 1) * pageSize

      // 构建查询条件
      const query = {}
      if (type !== 'all') {
        query.type = type
      }
      if (category !== 'all') {
        query.category = category
      }
      if (status !== 'all') {
        query.status = status
      }

      // 获取场景列表
      const scenes = await this.db.collection('scenes')
        .find(query)
        .sort({ priority: -1, created_at: -1 })
        .skip(skip)
        .limit(pageSize)
        .toArray()

      // 获取总数
      const total = await this.db.collection('scenes').countDocuments(query)

      return {
        success: true,
        data: {
          scenes,
          pagination: {
            page: parseInt(page),
            pageSize: parseInt(pageSize),
            total,
            totalPages: Math.ceil(total / pageSize)
          }
        }
      }

    } catch (error) {
      logger.error('获取场景列表失败:', error)
      return {
        success: false,
        message: '获取场景列表失败'
      }
    }
  }

  /**
   * 获取场景详情
   */
  async getSceneDetail(data) {
    try {
      const { sceneId } = data

      if (!sceneId) {
        return {
          success: false,
          message: '场景ID不能为空'
        }
      }

      const scene = await this.db.collection('scenes').findOne({ _id: sceneId })

      if (!scene) {
        return {
          success: false,
          message: '场景不存在'
        }
      }

      return {
        success: true,
        data: {
          scene
        }
      }

    } catch (error) {
      logger.error('获取场景详情失败:', error)
      return {
        success: false,
        message: '获取场景详情失败'
      }
    }
  }

  /**
   * 获取推荐场景
   */
  async getRecommendedScenes(data) {
    try {
      const {
        type, // photography, fitting
        limit = 6,
        tags = [] // 推荐标签
      } = data

      if (!type) {
        return {
          success: false,
          message: '生图类型不能为空'
        }
      }

      // 构建查询条件
      const query = {
        type: type,
        status: 'active',
        is_recommended: true
      }

      if (tags.length > 0) {
        query.tags = { $in: tags }
      }

      // 获取推荐场景
      const scenes = await this.db.collection('scenes')
        .find(query)
        .sort({ priority: -1, usage_count: -1 })
        .limit(limit)
        .toArray()

      // 为每个场景生成预览信息
      const recommendedScenes = scenes.map(scene => ({
        sceneId: scene._id,
        name: scene.name,
        description: scene.description,
        category: scene.category,
        tags: scene.tags,
        preview_image: scene.preview_image,
        usage_count: scene.usage_count || 0,
        priority: scene.priority,
        difficulty: scene.difficulty,
        estimated_time: scene.estimated_time
      }))

      return {
        success: true,
        data: {
          scenes: recommendedScenes,
          type: type
        }
      }

    } catch (error) {
      logger.error('获取推荐场景失败:', error)
      return {
        success: false,
        message: '获取推荐场景失败'
      }
    }
  }

  /**
   * 搜索场景
   */
  async searchScenes(data) {
    try {
      const {
        keyword,
        type = 'all',
        category = 'all',
        tags = [],
        limit = 20,
        page = 1
      } = data

      if (!keyword) {
        return {
          success: false,
          message: '搜索关键词不能为空'
        }
      }

      const skip = (page - 1) * limit

      // 构建搜索条件
      const query = {
        $and: [
          { status: 'active' },
          {
            $or: [
              { name: { $regex: keyword, $options: 'i' } },
              { description: { $regex: keyword, $options: 'i' } },
              { tags: { $in: [keyword] } },
              { keywords: { $in: [keyword] } }
            ]
          }
        ]
      }

      if (type !== 'all') {
        query.$and.push({ type: type })
      }

      if (category !== 'all') {
        query.$and.push({ category: category })
      }

      if (tags.length > 0) {
        query.$and.push({ tags: { $in: tags } })
      }

      // 搜索场景
      const scenes = await this.db.collection('scenes')
        .find(query)
        .sort({ priority: -1, usage_count: -1 })
        .skip(skip)
        .limit(limit)
        .toArray()

      // 获取总数
      const total = await this.db.collection('scenes').countDocuments(query)

      return {
        success: true,
        data: {
          scenes,
          pagination: {
            page: parseInt(page),
            pageSize: parseInt(limit),
            total,
            totalPages: Math.ceil(total / limit)
          },
          searchParams: {
            keyword,
            type,
            category,
            tags
          }
        }
      }

    } catch (error) {
      logger.error('搜索场景失败:', error)
      return {
        success: false,
        message: '搜索场景失败'
      }
    }
  }

  /**
   * 更新场景使用统计
   */
  async updateSceneUsage(sceneId) {
    try {
      await this.db.collection('scenes').updateOne(
        { _id: sceneId },
        {
          $inc: {
            usage_count: 1,
            last_used_at: new Date()
          },
          $set: {
            updated_at: new Date()
          }
        }
      )

      logger.info('场景使用统计更新', { sceneId })

      return {
        success: true,
        message: '场景使用统计更新成功'
      }

    } catch (error) {
      logger.error('更新场景使用统计失败:', error)
      return {
        success: false,
        message: '更新场景使用统计失败'
      }
    }
  }

  /**
   * 创建场景（管理员功能）
   */
  async createScene(data, adminUser) {
    try {
      // 验证管理员权限
      if (!adminUser || !adminUser.isAdmin) {
        return {
          success: false,
          message: '权限不足'
        }
      }

      const {
        name,
        description,
        type, // photography, fitting
        category, // indoor, outdoor, studio
        tags,
        preview_image,
        parameters = {},
        difficulty = 'medium', // easy, medium, hard
        priority = 1,
        is_recommended = false
      } = data

      // 验证必填字段
      if (!name || !description || !type || !category) {
        return {
          success: false,
          message: '名称、描述、类型和分类不能为空'
        }
      }

      // 创建场景
      const sceneData = {
        name,
        description,
        type,
        category,
        tags: Array.isArray(tags) ? tags : [],
        preview_image,
        parameters: this.normalizeParameters(parameters),
        difficulty,
        priority,
        is_recommended,
        usage_count: 0,
        status: 'active',
        created_by: adminUser.openId,
        created_at: new Date(),
        updated_at: new Date()
      }

      const result = await this.db.collection('scenes').insertOne(sceneData)

      logger.info('场景创建成功', {
        sceneId: result.insertedId,
        name,
        type,
        category
      })

      return {
        success: true,
        data: {
          sceneId: result.insertedId,
          scene: sceneData
        }
      }

    } catch (error) {
      logger.error('创建场景失败:', error)
      return {
        success: false,
        message: '创建场景失败'
      }
    }
  }

  /**
   * 更新场景（管理员功能）
   */
  async updateScene(data, adminUser) {
    try {
      if (!adminUser || !adminUser.isAdmin) {
        return {
          success: false,
          message: '权限不足'
        }
      }

      const { sceneId, ...updateData } = data

      if (!sceneId) {
        return {
          success: false,
          message: '场景ID不能为空'
        }
      }

      // 更新场景
      const updateFields = {
        ...updateData,
        updated_at: new Date()
      }

      if (updateData.parameters) {
        updateFields.parameters = this.normalizeParameters(updateData.parameters)
      }

      const result = await this.db.collection('scenes').updateOne(
        { _id: sceneId },
        { $set: updateFields }
      )

      if (result.matchedCount === 0) {
        return {
          success: false,
          message: '场景不存在'
        }
      }

      logger.info('场景更新成功', { sceneId })

      return {
        success: true,
        message: '场景更新成功'
      }

    } catch (error) {
      logger.error('更新场景失败:', error)
      return {
        success: false,
        message: '更新场景失败'
      }
    }
  }

  /**
   * 删除场景（管理员功能）
   */
  async deleteScene(data, adminUser) {
    try {
      if (!adminUser || !adminUser.isAdmin) {
        return {
          success: false,
          message: '权限不足'
        }
      }

      const { sceneId } = data

      if (!sceneId) {
        return {
          success: false,
          message: '场景ID不能为空'
        }
      }

      // 检查场景是否被使用
      const usageCount = await this.db.collection('works').countDocuments({
        scene_id: sceneId
      })

      if (usageCount > 0) {
        return {
          success: false,
          message: `该场景已被使用${usageCount}次，无法删除`
        }
      }

      // 删除场景
      const result = await this.db.collection('scenes').deleteOne({ _id: sceneId })

      if (result.deletedCount === 0) {
        return {
          success: false,
          message: '场景不存在'
        }
      }

      logger.info('场景删除成功', { sceneId })

      return {
        success: true,
        message: '场景删除成功'
      }

    } catch (error) {
      logger.error('删除场景失败:', error)
      return {
        success: false,
        message: '删除场景失败'
      }
    }
  }

  /**
   * 获取场景分类列表
   */
  async getSceneCategories() {
    try {
      const categories = await this.db.collection('scenes').aggregate([
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            types: { $addToSet: '$type' }
          }
        },
        {
          $sort: { count: -1 }
        }
      ]).toArray()

      return {
        success: true,
        data: {
          categories: categories.map(cat => ({
            category: cat._id,
            count: cat.count,
            types: cat.types,
            name: this.getCategoryName(cat._id)
          }))
        }
      }

    } catch (error) {
      logger.error('获取场景分类失败:', error)
      return {
        success: false,
        message: '获取场景分类失败'
      }
    }
  }

  /**
   * 获取热门标签
   */
  async getPopularTags() {
    try {
      const tags = await this.db.collection('scenes').aggregate([
        { $unwind: '$tags' },
        {
          $group: {
            _id: '$tags',
            count: { $sum: 1 },
            usage_sum: { $sum: '$usage_count' }
          }
        },
        {
          $sort: { usage_sum: -1, count: -1 }
        },
        {
          $limit: 50
        }
      ]).toArray()

      return {
        success: true,
        data: {
          tags: tags.map(tag => ({
            tag: tag._id,
            count: tag.count,
            usage_count: tag.usage_sum,
            popularity_score: tag.count + tag.usage_sum
          }))
        }
      }

    } catch (error) {
      logger.error('获取热门标签失败:', error)
      return {
        success: false,
        message: '获取热门标签失败'
      }
    }
  }

  /**
   * 标准化参数
   */
  normalizeParameters(parameters) {
    // 确保参数格式正确
    const normalized = {}

    // 摄影相关参数
    if (parameters.lighting) {
      normalized.lighting = {
        type: parameters.lighting.type || 'natural',
        intensity: parameters.lighting.intensity || 'medium',
        direction: parameters.lighting.direction || 'front'
      }
    }

    if (parameters.background) {
      normalized.background = {
        type: parameters.background.type || 'solid',
        color: parameters.background.color || '#ffffff',
        blur: parameters.background.blur || 0
      }
    }

    if (parameters.composition) {
      normalized.composition = {
        style: parameters.composition.style || 'center',
        rule_of_thirds: parameters.composition.rule_of_thirds || true,
        symmetry: parameters.composition.symmetry || 'balanced'
      }
    }

    // 试衣相关参数
    if (parameters.pose) {
      normalized.pose = {
        style: parameters.pose.style || 'natural',
        angle: parameters.pose.angle || 'front',
        expression: parameters.pose.expression || 'neutral'
      }
    }

    if (parameters.background) {
      normalized.background = {
        type: parameters.background.type || 'studio',
        color: parameters.background.color || '#f0f0f0',
        complexity: parameters.background.complexity || 'simple'
      }
    }

    return {
      ...parameters,
      ...normalized
    }
  }

  /**
   * 获取分类名称
   */
  getCategoryName(category) {
    const categoryNames = {
      'indoor': '室内场景',
      'outdoor': '户外场景',
      'studio': '影棚场景',
      'street': '街景',
      'nature': '自然风光',
      'urban': '城市风光',
      'minimal': '极简风格',
      'luxury': '豪华风格',
      'vintage': '复古风格',
      'modern': '现代风格'
    }
    return categoryNames[category] || category
  }
}

// SCF入口函数
exports.main_handler = async (event, context) => {
  try {
    const { action, ...data } = event

    // 验证JWT token（部分操作需要管理员权限）
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

    // 创建场景服务实例
    const sceneService = new SceneService()

    // 根据action调用对应方法
    const methodMap = {
      'list': 'getScenes',
      'detail': 'getSceneDetail',
      'recommended': 'getRecommendedScenes',
      'search': 'searchScenes',
      'categories': 'getSceneCategories',
      'tags': 'getPopularTags',
      'create': 'createScene',
      'update': 'updateScene',
      'delete': 'deleteScene',
      'updateUsage': 'updateSceneUsage'
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
          message: `不支持的场景操作: ${action}`
        })
      }
    }

    // 管理员操作需要验证权限
    if (['create', 'update', 'delete'].includes(action) && (!user || !user.isAdmin)) {
      return {
        statusCode: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          message: '权限不足'
        })
      }
    }

    const result = await sceneService[methodName](data, user)

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(result)
    }

  } catch (error) {
    logger.error('场景服务处理失败:', error)

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

module.exports = SceneService