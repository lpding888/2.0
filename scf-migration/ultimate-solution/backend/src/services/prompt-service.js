/**
 * 提示词生成服务
 * 完全基于原有微信云函数prompt的业务逻辑
 * 为AI生成提供专业的提示词模板和生成策略
 */

const logger = require('../utils/logger')
const { validateInput } = require('../utils/validation')

class PromptService {
  constructor() {
    this.db = require('../shared/database/connection')
  }

  /**
   * 生成提示词 - 核心功能
   */
  async generatePrompt(data) {
    try {
      const {
        type, // photography, fitting, personal
        mode = 'standard', // standard, creative, detailed, minimal
        sceneId, // 场景ID，可选
        userImages, // 用户上传的图片信息
        parameters = {}, // 生成参数
        customPrompt, // 用户自定义提示词
        language = 'zh-CN' // 语言
      } = data

      // 1. 验证必要参数
      if (!type) {
        return {
          success: false,
          message: '生图类型不能为空'
        }
      }

      // 2. 如果有自定义提示词，直接使用
      if (customPrompt && customPrompt.trim()) {
        const promptResult = {
          type: type,
          mode: mode,
          prompt: customPrompt.trim(),
          is_custom: true,
          generated_at: new Date()
        }

        // 保存提示词使用记录
        await this.savePromptUsage(promptResult)

        return {
          success: true,
          data: promptResult
        }
      }

      // 3. 获取场景信息（如果提供了场景ID）
      let sceneInfo = null
      if (sceneId) {
        sceneInfo = await this.db.collection('scenes').findOne({ _id: sceneId })
        if (!sceneInfo) {
          logger.warn('场景不存在，使用默认配置', { sceneId })
        }
      }

      // 4. 根据类型生成提示词
      let promptResult
      switch (type) {
        case 'photography':
          promptResult = await this.generatePhotographyPrompt(mode, sceneInfo, userImages, parameters, language)
          break
        case 'fitting':
          promptResult = await this.generateFittingPrompt(mode, sceneInfo, userImages, parameters, language)
          break
        case 'personal':
          promptResult = await this.generatePersonalPrompt(mode, sceneInfo, userImages, parameters, language)
          break
        default:
          return {
            success: false,
            message: `不支持的生图类型: ${type}`
          }
      }

      // 5. 保存提示词使用记录
      if (promptResult) {
        await this.savePromptUsage(promptResult)
      }

      return {
        success: true,
        data: promptResult
      }

    } catch (error) {
      logger.error('生成提示词失败:', error)
      return {
        success: false,
        message: '生成提示词失败'
      }
    }
  }

  /**
   * 生成摄影提示词
   */
  async generatePhotographyPrompt(mode, sceneInfo, userImages, parameters, language) {
    try {
      // 基础提示词模板
      const baseTemplate = this.getPhotographyBaseTemplate(mode, language)

      // 场景相关信息
      const sceneSection = sceneInfo ? this.buildSceneInfo(sceneInfo) : this.getDefaultSceneInfo()

      // 用户图像信息
      const imageSection = this.buildImageInfo(userImages, 'photography')

      // 技术参数
      const technicalSection = this.buildTechnicalParameters(parameters, 'photography')

      // 风格和质量要求
      const qualitySection = this.buildQualityRequirements(parameters)

      // 组合最终提示词
      const prompt = this.combinePromptSections([
        baseTemplate,
        sceneSection,
        imageSection,
        technicalSection,
        qualitySection
      ])

      const promptResult = {
        type: 'photography',
        mode: mode,
        prompt: prompt,
        is_custom: false,
        scene_info: sceneInfo,
        language: language,
        sections: {
          base: baseTemplate,
          scene: sceneSection,
          image: imageSection,
          technical: technicalSection,
          quality: qualitySection
        },
        generated_at: new Date()
      }

      logger.info('摄影提示词生成成功', { mode, sceneId: sceneInfo?._id : null })

      return promptResult

    } catch (error) {
      logger.error('生成摄影提示词失败:', error)
      throw error
    }
  }

  /**
   * 生成试衣提示词
   */
  async generateFittingPrompt(mode, sceneInfo, userImages, parameters, language) {
    try {
      // 基础提示词模板
      const baseTemplate = this.getFittingBaseTemplate(mode, language)

      // 场景相关信息
      const sceneSection = sceneInfo ? this.buildSceneInfo(sceneInfo) : this.getDefaultSceneInfo()

      // 用户图像信息
      const imageSection = this.buildImageInfo(userImages, 'fitting')

      // 服装信息
      const clothingSection = this.buildClothingInfo(userImages)

      // 姿势和表情
      const poseSection = this.buildPoseInfo(parameters, 'fitting')

      // 技术参数
      const technicalSection = this.buildTechnicalParameters(parameters, 'fitting')

      // 质量要求
      const qualitySection = this.buildQualityRequirements(parameters)

      // 组合最终提示词
      const prompt = this.combinePromptSections([
        baseTemplate,
        sceneSection,
        imageSection,
        clothingSection,
        poseSection,
        technicalSection,
        qualitySection
      ])

      const promptResult = {
        type: 'fitting',
        mode: mode,
        prompt: prompt,
        is_custom: false,
        scene_info: sceneInfo,
        language: language,
        sections: {
          base: baseTemplate,
          scene: sceneSection,
          image: imageSection,
          clothing: clothingSection,
          pose: poseSection,
          technical: technicalSection,
          quality: qualitySection
        },
        generated_at: new Date()
      }

      logger.info('试衣提示词生成成功', { mode, sceneId: sceneInfo?._id : null })

      return promptResult

    } catch (error) {
      logger.error('生成试衣提示词失败:', error)
      throw error
    }
  }

  /**
   * 生成个人版提示词
   */
  async generatePersonalPrompt(mode, sceneInfo, userImages, parameters, language) {
    try {
      // 个人版的基础模板
      const baseTemplate = this.getPersonalBaseTemplate(mode, language)

      // 场景信息
      const sceneSection = sceneInfo ? this.buildSceneInfo(sceneInfo) : this.getDefaultSceneInfo()

      // 用户图像信息
      const imageSection = this.buildImageInfo(userImages, 'personal')

      // 个人特色信息
      const personalSection = this.buildPersonalStyleInfo(parameters)

      // 技术参数
      const technicalSection = this.buildTechnicalParameters(parameters, 'personal')

      // 质量要求
      const qualitySection = this.buildQualityRequirements(parameters)

      // 组合最终提示词
      const prompt = this.combinePromptSections([
        baseTemplate,
        sceneSection,
        imageSection,
        personalSection,
        technicalSection,
        qualitySection
      ])

      const promptResult = {
        type: 'personal',
        mode: mode,
        prompt: prompt,
        is_custom: false,
        scene_info: sceneInfo,
        language: language,
        sections: {
          base: baseTemplate,
          scene: sceneSection,
          image: imageSection,
          personal: personalSection,
          technical: technicalSection,
          quality: qualitySection
        },
        generated_at: new Date()
      }

      logger.info('个人版提示词生成成功', { mode, sceneId: sceneInfo?._id : null })

      return promptResult

    } catch (error) {
      logger.error('生成个人版提示词失败:', error)
      throw error
    }
  }

  /**
   * 获取摄影基础模板
   */
  getPhotographyBaseTemplate(mode, language) {
    const templates = {
      'zh-CN': {
        'standard': `你是一位专业的商业摄影师，拥有10年的服装摄影经验。请根据提供的模特照片、服装和场景要求，生成高质量的商业级服装摄影作品。`,
        'creative': `你是一位富有创意的时尚摄影师，擅长拍摄具有艺术感的服装作品。请根据提供的模特照片、服装，创作出独特而富有表现力的摄影作品。`,
        'detailed': `你是一位细节控的商业摄影师，对光影、构图、色彩和质感都有极高的要求。请根据提供的模特照片、服装和场景，生成极其详细和专业的摄影作品，注意每一个细节的完美呈现。`,
        'minimal': `商业服装摄影。模特照片、服装、专业作品。`
      },
      'en-US': {
        'standard': `You are a professional commercial photographer with 10 years of experience in fashion photography. Create high-quality commercial fashion photography based on the provided model photos, clothing, and scene requirements.`,
        'creative': `You are a creative fashion photographer skilled in shooting artistic fashion pieces. Create unique and expressive fashion photography based on the provided model photos and clothing.`,
        'detailed': `You are a detail-oriented commercial photographer with extremely high standards for lighting, composition, color, and texture. Create exceptionally detailed and professional photography works, paying attention to every detail.`,
        'minimal': `Commercial fashion photography. Model photos, clothing, professional work.`
      }
    }

    return templates[language]?.[mode] || templates['zh-CN']['standard']
  }

  /**
   * 获取试衣基础模板
   */
  getFittingBaseTemplate(mode, language) {
    const templates = {
      'zh-CN': {
        'standard': `你是一位专业的虚拟试衣AI，擅长将服装自然地合成到模特照片上。请根据提供的模特照片和服装图片，生成逼真的虚拟试衣效果。`,
        'creative': `你是一位富有创意的虚拟试衣AI，能够创造出独特而时尚的试衣效果。请根据提供的模特照片和服装，创作出具有艺术感的虚拟试衣作品。`,
        'detailed': `你是一位注重细节的虚拟试衣AI，对光影、材质、褶皱和合身度都有极高要求。请根据提供的模特照片和服装，生成极其逼真的虚拟试衣效果，注意每一个细节的完美处理。`,
        'minimal': `虚拟试衣。模特照片、服装图片、自然融合。`
      },
      'en-US': {
        'standard': `You are a professional virtual try-on AI specializing in naturally blending clothing onto model photos. Create realistic virtual try-on effects based on the provided model photos and clothing images.`,
        'creative': `You are a creative virtual try-on AI capable of producing unique and fashionable try-on effects. Create artistic virtual try-on works based on the provided model photos and clothing.`,
        'detailed': `You are a detail-oriented virtual try-on AI with extremely high standards for lighting, texture, wrinkles, and fit. Create incredibly realistic virtual try-on effects, paying attention to every detail.`,
        'minimal': `Virtual try-on. Model photos, clothing images, natural blend.`
      }
    }

    return templates[language]?.[mode] || templates['zh-CN']['standard']
  }

  /**
   * 获取个人版基础模板
   */
  getPersonalBaseTemplate(mode, language) {
    const templates = {
      'zh-CN': {
        'standard': `你是一位个人时尚顾问AI，擅长根据用户的身材特点和喜好，提供个性化的穿搭建议和虚拟试衣效果。`,
        'creative': `你是一位创意十足的时尚顾问AI，能够为用户创造出独特而有个性的穿搭效果和虚拟试衣方案。`,
        'detailed': `你是一位专业的个人时尚顾问，注重细节和个性化。请根据用户的身材特点和偏好，生成极其贴切的个人化穿搭建议和虚拟试衣效果。`,
        'minimal': `个人时尚顾问。用户身材、偏好、个性化方案。`
      },
      'en-US': {
        'standard': `You are a personal fashion stylist AI specializing in providing personalized styling advice and virtual try-on effects based on user's body characteristics and preferences.`,
        'creative': `You are a creative personal stylist AI capable of creating unique and personalized styling effects and virtual try-on solutions for users.`,
        'detailed': `You are a professional personal stylist with attention to detail and personalization. Generate highly personalized styling advice and virtual try-on effects based on user's body characteristics and preferences.`,
        'minimal': `Personal fashion stylist. User body, preferences, personalized solutions.`
      }
    }

    return templates[language]?.[mode] || templates['zh-CN']['standard']
  }

  /**
   * 构建场景信息
   */
  buildSceneInfo(sceneInfo) {
    if (!sceneInfo) return ''

    let sceneInfoText = `\n## 场景设置\n`
    sceneInfoText += `- 场景类型: ${sceneInfo.category}\n`
    sceneInfoText += `- 场景名称: ${sceneInfo.name}\n`
    sceneInfoText += `- 场景描述: ${sceneInfo.description}\n`

    if (sceneInfo.parameters?.lighting) {
      sceneInfoText += `- 光线条件: ${sceneInfo.parameters.lighting.type || '自然光'}\n`
    }

    if (sceneInfo.parameters?.background) {
      sceneInfoText += `- 背景环境: ${sceneInfo.parameters.background.type || '简约背景'}\n`
    }

    if (sceneInfo.parameters?.composition) {
      sceneInfoText += `- 构图要求: ${sceneInfo.parameters.composition.style || '中心构图'}\n`
    }

    if (sceneInfo.tags && sceneInfo.tags.length > 0) {
      sceneInfoText += `- 场景标签: ${sceneInfo.tags.join(', ')}\n`
    }

    return sceneInfoText
  }

  /**
   * 构建默认场景信息
   */
  getDefaultSceneInfo() {
    return `\n## 场景设置\n- 场景类型: 影棚\n- 光线条件: 柔和的影棚灯光\n- 背景环境: 专业背景\n- 构图要求: 三分法构图\n- 整体风格: 专业商业摄影\n`
  }

  /**
   * 构建图像信息
   */
  buildImageInfo(userImages, imageType) {
    if (!userImages || Object.keys(userImages).length === 0) {
      return ''
    }

    let imageInfoText = `\n## 图像信息\n`

    // 人物图片信息
    if (userImages.model_image) {
      imageInfoText += `- 人物照片: 模特照片\n`
      imageInfoText += `- 人物状态: 自然放松，专业摆姿\n`
    }

    // 服装图片信息
    if (Object.keys(userImages).some(key => key.startsWith('clothing_'))) {
      imageInfoText += `- 服装图片: ${Object.keys(userImages).filter(k => k.startsWith('clothing_')).length}件服装\n`
      imageInfoText += `- 服装状态: 干净平整，展示完整设计\n`
    }

    if (imageType === 'photography') {
      imageInfoText += `- 图像要求: 高分辨率，色彩准确\n`
    } else if (imageType === 'fitting') {
      imageInfoText += `- 图像要求: 清晰的人形轮廓和服装细节\n`
    }

    return imageInfoText
  }

  /**
   * 构建服装信息
   */
  buildClothingInfo(userImages) {
    if (!userImages || Object.keys(userImages).length === 0) {
      return ''
    }

    let clothingInfoText = `\n## 服装信息\n`

    Object.entries(userImages).forEach(([key, imageId]) => {
      if (key.startsWith('clothing_')) {
        const clothingType = key.replace('clothing_', '')
        const clothingTypeNames = {
          'top': '上装',
          'bottom': '下装',
          'dress': '连衣裙',
          'jacket': '外套',
          'accessory': '配饰'
        }
        const typeName = clothingTypeNames[clothingType] || clothingType
        clothingInfoText += `- ${typeName}: ${imageId}\n`
      }
    })

    clothingInfoText += `- 服装要求: 清晰展示设计和材质细节\n`
    clothingInfoText += `- 合身效果: 自然贴合，不夸张\n`

    return clothingInfoText
  }

  /**
   * 构建姿势信息
   */
  buildPoseInfo(parameters, imageType) {
    if (imageType !== 'fitting') return ''

    let poseInfoText = `\n## 姿势要求\n`

    if (parameters?.pose) {
      poseInfoText += `- 姿势风格: ${parameters.pose.style || '自然'}\n`
      poseInfoText += `- 角度: ${parameters.pose.angle || '正面'}\n`
      poseInfoText += `- 表情: ${parameters.pose.expression || '中性'}\n`
    } else {
      poseInfoText += `- 姿势风格: 自然放松\n`
      poseInfoText += `- 角度: 正面为主\n`
      poseInfoText += `- 表情: 自然中性\n`
    }

    poseInfoText += `- 身体语言: 自信而优雅\n`

    return poseInfoText
  }

  /**
   * 构建个人特色信息
   */
  buildPersonalStyleInfo(parameters) {
    let personalInfoText = `\n## 个性化要求\n`

    if (parameters?.body_shape) {
      personalInfoText += `- 身材特点: ${parameters.body_shape}\n`
    }

    if (parameters?.style_preference) {
      personalInfoText += `- 风格偏好: ${parameters.style_preference}\n`
    }

    if (parameters?.color_preference) {
      personalInfoText += `- 颜色偏好: ${parameters.color_preference.join(', ')}\n`
    }

    personalInfoText += `- 个性化特点: 突出个人特色\n`

    return personalInfoText
  }

  /**
   * 构建技术参数
   */
  buildTechnicalParameters(parameters, imageType) {
    let technicalText = `\n## 技术参数\n`

    // 图像格式和质量
    technicalText += `- 图像分辨率: 1024x1024像素或更高\n`
    technicalText += `- 图像格式: 高质量JPEG\n`
    technicalText += `- 色彩空间: sRGB\n`

    // 风格特定参数
    if (imageType === 'photography') {
      technicalText += `- 景深信息: 保留适当景深效果\n`
      technicalText += `- 焦距处理: 适当焦外虚化\n`
    } else if (imageType === 'fitting') {
      technicalText += `- 边缘处理: 自然过渡，无生硬边缘\n`
      technicalText += `- 色彩匹配: 人物和服装色彩协调\n`
    }

    // 自定义参数
    if (parameters?.technical) {
      Object.entries(parameters.technical).forEach(([key, value]) => {
        technicalText += `- ${key}: ${value}\n`
      })
    }

    return technicalText
  }

  /**
   * 构建质量要求
   */
  buildQualityRequirements(parameters) {
    let qualityText = `\n## 质量要求\n`

    qualityText += `- 整体质量: 专业级高分辨率\n`
    qualityText += `- 细节呈现: 清晰的纹理和材质\n`
    qualityText += `- 色彩表现: 准确的色彩还原\n`

    if (parameters?.quality) {
      Object.entries(parameters.quality).forEach(([key, value]) => {
        qualityText += `- ${key}: ${value}\n`
      })
    }

    qualityText += `- 一致性: 整体风格协调统一\n`
    qualityText += `- 商业价值: 符合商业使用标准\n`

    return qualityText
  }

  /**
   * 组合提示词各部分
   */
  combinePromptSections(sections) {
    return sections.filter(section => section && section.trim()).join('\n\n')
  }

  /**
   * 保存提示词使用记录
   */
  async savePromptUsage(promptResult) {
    try {
      await this.db.collection('prompt_usage').insertOne({
        ...promptResult,
        created_at: new Date()
      })

      // 更新场景使用统计（如果有场景）
      if (promptResult.scene_info) {
        await this.db.collection('scenes').updateOne(
          { _id: promptResult.scene_info._id },
          {
            $inc: { prompt_usage_count: 1 },
            $set: { last_used_at: new Date() }
          }
        )
      }

    } catch (error) {
      logger.error('保存提示词使用记录失败:', error)
    }
  }

  /**
   * 获取提示词使用统计
   */
  async getPromptStats(data) {
    try {
      const {
        type = 'all',
        mode = 'all',
        startDate,
        endDate,
        limit = 100
      } = data

      const query = {}
      if (type !== 'all') {
        query.type = type
      }
      if (mode !== 'all') {
        query.mode = mode
      }
      if (startDate || endDate) {
        query.created_at = {}
        if (startDate) {
          query.created_at.$gte = new Date(startDate)
        }
        if (endDate) {
          query.created_at.$lte = new Date(endDate)
        }
      }

      const stats = await this.db.collection('prompt_usage')
        .find(query)
        .sort({ created_at: -1 })
        .limit(limit)
        .toArray()

      return {
        success: true,
        data: {
          stats,
          total: stats.length,
          query: { type, mode, startDate, endDate }
        }
      }

    } catch (error) {
      logger.error('获取提示词统计失败:', error)
      return {
        success: false,
        message: '获取提示词统计失败'
      }
    }
  }

  /**
   * 获取提示词模板列表
   */
  async getPromptTemplates(data) {
    try {
      const { type = 'all' } = data

      const query = {}
      if (type !== 'all') {
        query.type = type
      }

      const templates = await this.db.collection('prompt_templates')
        .find(query)
        .sort({ created_at: -1 })
        .toArray()

      return {
        success: true,
        data: {
          templates
        }
      }

    } catch (error) {
      logger.error('获取提示词模板失败:', error)
      return {
        success: false,
        message: '获取提示词模板失败'
      }
    }
  }
}

// SCF入口函数
exports.main_handler = async (event, context) => {
  try {
    const { action, ...data } = event

    // 创建提示词服务实例
    const promptService = new PromptService()

    // 根据action调用对应方法
    const methodMap = {
      'generate': 'generatePrompt',
      'stats': 'getPromptStats',
      'templates': 'getPromptTemplates'
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
          message: `不支持的提示词操作: ${action}`
        })
      }
    }

    const result = await promptService[methodName](data)

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(result)
    }

  } catch (error) {
    logger.error('提示词服务处理失败:', error)

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

module.exports = PromptService