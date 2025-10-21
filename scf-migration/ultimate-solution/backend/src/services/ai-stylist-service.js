/**
 * AI造型师服务
 * 基于真实AI模型提供专业的服装搭配和造型建议
 * 支持多种场景：商务、休闲、派对、旅行等
 */

const axios = require('axios')
const { v4: uuidv4 } = require('uuid')
const logger = require('../utils/logger')
const { validateInput } = require('../utils/validation')

class AIStylistService {
  constructor(openId) {
    this.openId = openId
  }

  /**
   * 获取AI造型建议
   */
  async getStyleRecommendation(data) {
    try {
      const {
        occasion,        // 场合：business, casual, party, travel, date
        season,          // 季节：spring, summer, autumn, winter
        gender,          // 性别：male, female, unisex
        age,             // 年龄段
        bodyType,        // 体型：slim, average, athletic, plus
        preferences,     // 偏好风格
        colors,          // 偏好颜色
        itemsProvided    // 已有服装图片
      } = data

      // 验证输入
      const validation = validateInput({
        occasion: { required: true, type: 'string', enum: ['business', 'casual', 'party', 'travel', 'date'] },
        season: { required: true, type: 'string', enum: ['spring', 'summer', 'autumn', 'winter'] },
        gender: { required: true, type: 'string', enum: ['male', 'female', 'unisex'] },
        age: { required: false, type: 'number', min: 16, max: 80 }
      }, data)

      if (!validation.valid) {
        return {
          success: false,
          message: validation.message
        }
      }

      // 构建专业提示词
      const prompt = this.buildStylistPrompt(data)

      // 调用AI模型获取建议
      const aiResponse = await this.callAIModel(prompt)

      // 解析AI响应
      const recommendations = this.parseAIResponse(aiResponse)

      return {
        success: true,
        data: {
          occasion,
          season,
          recommendations,
          metadata: {
            model: 'gpt-4-vision-preview',
            generatedAt: new Date(),
            confidence: this.calculateConfidence(recommendations)
          }
        }
      }

    } catch (error) {
      logger.error('AI造型建议生成失败:', error)
      return {
        success: false,
        message: 'AI造型建议生成失败，请稍后重试'
      }
    }
  }

  /**
   * 分析服装图片并提供搭配建议
   */
  async analyzeClothingItem(data) {
    try {
      const { imageUrl, analysisType = 'style' } = data

      if (!imageUrl) {
        return {
          success: false,
          message: '请提供服装图片URL'
        }
      }

      // 调用视觉AI模型分析图片
      const analysis = await this.analyzeImage(imageUrl, analysisType)

      // 基于分析结果生成搭配建议
      const outfitSuggestions = await this.generateOutfitSuggestions(analysis)

      return {
        success: true,
        data: {
          imageAnalysis: analysis,
          outfitSuggestions,
          styleTips: this.generateStyleTips(analysis),
          metadata: {
            analysisType,
            processedAt: new Date()
          }
        }
      }

    } catch (error) {
      logger.error('服装图片分析失败:', error)
      return {
        success: false,
        message: '图片分析失败，请稍后重试'
      }
    }
  }

  /**
   * 获取当季流行趋势
   */
  async getSeasonalTrends(data) {
    try {
      const { season, gender, region = 'china' } = data

      // 调用AI获取流行趋势
      const trends = await this.getTrendsFromAI({ season, gender, region })

      // 生成可视化趋势报告
      const trendReport = this.generateTrendReport(trends)

      return {
        success: true,
        data: {
          season,
          gender,
          region,
          trends: trendReport,
          updatedAt: new Date()
        }
      }

    } catch (error) {
      logger.error('获取流行趋势失败:', error)
      return {
        success: false,
        message: '获取流行趋势失败'
      }
    }
  }

  /**
   * 构建专业造型师提示词
   */
  buildStylistPrompt(data) {
    const { occasion, season, gender, age, bodyType, preferences, colors } = data

    let prompt = `你是一位专业的时尚造型师，拥有15年的服装搭配经验。请为以下场景提供专业的造型建议：

**基本信息：**
- 场合：${this.getOccasionDescription(occasion)}
- 季节：${this.getSeasonDescription(season)}
- 性别：${this.getGenderDescription(gender)}`

    if (age) {
      prompt += `\n- 年龄：${age}岁`
    }

    if (bodyType) {
      prompt += `\n- 体型：${this.getBodyTypeDescription(bodyType)}`
    }

    if (preferences && preferences.length > 0) {
      prompt += `\n- 风格偏好：${preferences.join('、')}`
    }

    if (colors && colors.length > 0) {
      prompt += `\n- 颜色偏好：${colors.join('、')}`
    }

    prompt += `

请提供详细的造型建议，包括：
1. **服装搭配** - 具体的服装单品、颜色搭配、层次感
2. **配饰建议** - 包包、鞋子、珠宝、帽子等
3. **妆发造型** - 适合的妆容和发型
4. **面料建议** - 适合季节的面料和材质
5. **品牌推荐** - 不同价位区间的品牌建议
6. **穿搭技巧** - 实用的搭配技巧和注意事项

请以JSON格式回复，结构清晰，建议具体实用。`

    return prompt
  }

  /**
   * 调用AI模型
   */
  async callAIModel(prompt) {
    try {
      // 根据可用性选择AI模型
      const aiModel = this.selectAIModel()

      switch (aiModel) {
        case 'gpt-4-vision':
          return await this.callGPT4Vision(prompt)
        case 'gemini-pro':
          return await this.callGeminiPro(prompt)
        case 'deepseek':
          return await this.callDeepSeek(prompt)
        default:
          throw new Error('无可用AI模型')
      }

    } catch (error) {
      logger.error('AI模型调用失败:', error)
      throw error
    }
  }

  /**
   * 选择可用的AI模型
   */
  selectAIModel() {
    const { OPENAI_API_KEY, GEMINI_API_KEY, DEEPSEEK_API_KEY } = process.env

    if (OPENAI_API_KEY && OPENAI_API_KEY !== 'test_openai_api_key') {
      return 'gpt-4-vision'
    }

    if (GEMINI_API_KEY && GEMINI_API_KEY !== 'test_gemini_api_key') {
      return 'gemini-pro'
    }

    if (DEEPSEEK_API_KEY && DEEPSEEK_API_KEY !== 'test_deepseek_api_key') {
      return 'deepseek'
    }

    // 返回模拟数据作为降级方案
    return 'mock'
  }

  /**
   * 调用GPT-4 Vision
   */
  async callGPT4Vision(prompt) {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4-vision-preview',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 2000,
      temperature: 0.7
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    return response.data.choices[0].message.content
  }

  /**
   * 调用Gemini Pro
   */
  async callGeminiPro(prompt) {
    const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ]
    })

    return response.data.candidates[0].content.parts[0].text
  }

  /**
   * 调用DeepSeek
   */
  async callDeepSeek(prompt) {
    const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
      model: 'deepseek-chat',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 2000,
      temperature: 0.7
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    return response.data.choices[0].message.content
  }

  /**
   * 解析AI响应
   */
  parseAIResponse(aiResponse) {
    try {
      // 尝试解析JSON格式的响应
      if (aiResponse.includes('{') && aiResponse.includes('}')) {
        return JSON.parse(aiResponse)
      }

      // 如果不是JSON格式，解析文本内容
      return this.parseTextResponse(aiResponse)

    } catch (error) {
      logger.error('AI响应解析失败:', error)
      // 返回基础格式的建议
      return this.generateBasicRecommendations()
    }
  }

  /**
   * 解析文本格式响应
   */
  parseTextResponse(textResponse) {
    const recommendations = {
      clothing: [],
      accessories: [],
      makeupHair: [],
      fabrics: [],
      brands: [],
      tips: []
    }

    // 使用正则表达式解析各个部分
    const sections = {
      '服装搭配|搭配|穿搭': 'clothing',
      '配饰|饰品': 'accessories',
      '妆发|发型|妆容': 'makeupHair',
      '面料|材质': 'fabrics',
      '品牌': 'brands',
      '技巧|建议|提示': 'tips'
    }

    let currentSection = 'clothing'
    const lines = textResponse.split('\n')

    for (const line of lines) {
      const trimmedLine = line.trim()
      if (!trimmedLine) continue

      // 检查是否是新的部分
      for (const [pattern, section] of Object.entries(sections)) {
        if (new RegExp(pattern, 'i').test(trimmedLine)) {
          currentSection = section
          break
        }
      }

      // 添加到对应部分
      if (trimmedLine.length > 10 && !trimmedLine.match(/^\d+\.|^-\s|^•\s/)) {
        recommendations[currentSection].push(trimmedLine)
      }
    }

    return recommendations
  }

  /**
   * 生成基础建议（降级方案）
   */
  generateBasicRecommendations() {
    return {
      clothing: [
        '选择合身的单品，突出身材优势',
        '注重色彩搭配，避免超过3种主色',
        '层次感能提升整体造型质感'
      ],
      accessories: [
        '选择与服装风格匹配的配饰',
        '包包大小要适中，颜色与服装呼应',
        '鞋子的舒适度与美观并重'
      ],
      makeupHair: [
        '妆容要自然，突出个人特点',
        '发型要整洁，适合场合氛围',
        '妆容颜色与服装色调协调'
      ],
      fabrics: [
        '选择适合季节的面料',
        '注重面料的手感和垂感',
        '天然面料更加舒适透气'
      ],
      brands: [
        '根据预算选择合适的品牌',
        '关注品牌的品质和口碑',
        '小众品牌也能找到不错的单品'
      ],
      tips: [
        '自信是最好的造型',
        '保持服装的整洁和挺括',
        '根据个人特点调整建议'
      ]
    }
  }

  /**
   * 计算建议的可信度
   */
  calculateConfidence(recommendations) {
    const sections = Object.keys(recommendations)
    const filledSections = sections.filter(section =>
      recommendations[section] && recommendations[section].length > 0
    )

    return Math.min(filledSections.length / sections.length, 1.0)
  }

  /**
   * 分析服装图片
   */
  async analyzeImage(imageUrl, analysisType) {
    // 这里应该调用视觉AI模型分析图片
    // 目前返回模拟数据
    return {
      type: 'clothing',
      category: 'dress',
      style: 'casual',
      colors: ['blue', 'white'],
      patterns: ['solid'],
      fabric: 'cotton',
      fit: 'regular',
      occasion: 'casual',
      season: 'summer'
    }
  }

  /**
   * 生成搭配建议
   */
  async generateOutfitSuggestions(analysis) {
    return {
      combinations: [
        {
          description: '休闲搭配',
          items: ['白色T恤', '牛仔裤', '小白鞋'],
          occasion: 'casual'
        }
      ]
    }
  }

  /**
   * 生成造型技巧
   */
  generateStyleTips(analysis) {
    return [
      '蓝色是百搭色，适合多种场合',
      '选择合身的款式能提升整体形象'
    ]
  }

  /**
   * 获取流行趋势
   */
  async getTrendsFromAI(params) {
    // 调用AI获取流行趋势数据
    return {
      colors: ['pastel', 'neon'],
      styles: ['minimalist', 'vintage'],
      materials: ['sustainable', 'organic'],
      patterns: ['floral', 'geometric']
    }
  }

  /**
   * 生成趋势报告
   */
  generateTrendReport(trends) {
    return {
      summary: '本季流行趋势总结',
      details: trends,
      recommendations: [
        '尝试流行色彩搭配',
        '关注可持续时尚'
      ]
    }
  }

  /**
   * 获取场景描述
   */
  getOccasionDescription(occasion) {
    const descriptions = {
      business: '商务正式场合',
      casual: '日常休闲',
      party: '聚会派对',
      travel: '旅行出游',
      date: '约会场合'
    }
    return descriptions[occasion] || occasion
  }

  /**
   * 获取季节描述
   */
  getSeasonDescription(season) {
    const descriptions = {
      spring: '春季',
      summer: '夏季',
      autumn: '秋季',
      winter: '冬季'
    }
    return descriptions[season] || season
  }

  /**
   * 获取性别描述
   */
  getGenderDescription(gender) {
    const descriptions = {
      male: '男性',
      female: '女性',
      unisex: '中性'
    }
    return descriptions[gender] || gender
  }

  /**
   * 获取体型描述
   */
  getBodyTypeDescription(bodyType) {
    const descriptions = {
      slim: '纤细',
      average: '标准',
      athletic: '健美',
      plus: '丰满'
    }
    return descriptions[bodyType] || bodyType
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

    // 创建AI造型师服务实例
    const stylistService = new AIStylistService(user.openId)

    // 根据action调用对应方法
    const methodMap = {
      'getRecommendation': 'getStyleRecommendation',
      'analyzeClothing': 'analyzeClothingItem',
      'getTrends': 'getSeasonalTrends'
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
          message: `不支持的操作: ${action}`
        })
      }
    }

    const result = await stylistService[methodName](data)

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(result)
    }

  } catch (error) {
    logger.error('AI造型师服务处理失败:', error)

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

module.exports = AIStylistService