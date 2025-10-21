/**
 * 腾讯云数据万象CI服务
 * 提供智能抠图、图片处理、质量评估等功能
 * 集成腾讯云COS和CI能力，为AI生图提供高质量的图片处理
 */

const crypto = require('crypto')
const axios = require('axios')
const fs = require('fs')
const path = require('path')
const logger = require('../utils/logger')
const { validateInput } = require('../utils/validation')

class TencentCIService {
  constructor() {
    this.secretId = process.env.COS_SECRET_ID
    this.secretKey = process.env.COS_SECRET_KEY
    this.bucket = process.env.COS_BUCKET
    this.region = process.env.COS_REGION
    this.ciHost = `${this.bucket}.ci.${this.region}.myqcloud.com`
  }

  /**
   * 智能抠图服务
   * 自动识别图片中的主体并移除背景
   */
  async intelligentMatting(data) {
    try {
      const {
        imageUrl,
        imageUrlBase64,
        returnImage = 'base64',
        category = 'general' // general, goods, portrait
      } = data

      if (!imageUrl && !imageUrlBase64) {
        return {
          success: false,
          message: '请提供图片URL或Base64数据'
        }
      }

      // 构建CI请求参数
      const params = {
        'ci-process': 'Segment', // 智能抠图
        'return-image': returnImage,
        'category': category
      }

      // 如果是URL方式，添加图片链接
      if (imageUrl) {
        params['image-url'] = imageUrl
      } else {
        params['image-base64'] = imageUrlBase64
      }

      // 发送CI请求
      const result = await this.callCI(params)

      // 处理返回结果
      const processedResult = await this.processMattingResult(result, returnImage)

      return {
        success: true,
        data: {
          originalImage: imageUrl || 'base64_input',
          mattingResult: processedResult,
          metadata: {
            category,
            processTime: new Date(),
            confidence: this.calculateMattingConfidence(processedResult)
          }
        }
      }

    } catch (error) {
      logger.error('智能抠图处理失败:', error)
      return {
        success: false,
        message: '智能抠图处理失败，请稍后重试'
      }
    }
  }

  /**
   * 智能裁剪服务
   * 根据AI分析自动裁剪图片到最佳尺寸
   */
  async smartCrop(data) {
    try {
      const {
        imageUrl,
        width,
        height,
        detectUrl = '', // 用于智能识别的参考图片URL
        gravity = 'ci-center', // 裁剪重心
        cropMode = 'ai-crop' // ai-crop, smart-crop, center-crop
      } = data

      if (!imageUrl) {
        return {
          success: false,
          message: '请提供图片URL'
        }
      }

      // 构建智能裁剪参数
      const params = {
        'ci-process': 'SmartCrop',
        'image-url': imageUrl,
        'width': width,
        'height': height,
        'gravity': gravity,
        'crop-mode': cropMode
      }

      if (detectUrl) {
        params['detect-url'] = detectUrl
      }

      // 发送CI请求
      const result = await this.callCI(params)

      return {
        success: true,
        data: {
          originalImage: imageUrl,
          croppedImage: result.ResultImage || result.ImageBase64,
          cropInfo: {
            width,
            height,
            gravity,
            cropMode,
            processedAt: new Date()
          }
        }
      }

    } catch (error) {
      logger.error('智能裁剪处理失败:', error)
      return {
        success: false,
        message: '智能裁剪处理失败'
      }
    }
  }

  /**
   * 图片修复服务
   * 修复图片中的噪点、划痕、压缩失真等问题
   */
  async imageRestore(data) {
    try {
      const {
        imageUrl,
        enhanceType = 'all', // denoise, scratch, enhance, all
        quality = 100,
        format = 'png'
      } = data

      if (!imageUrl) {
        return {
          success: false,
          message: '请提供图片URL'
        }
      }

      // 构建图片修复参数
      const params = {
        'ci-process': 'ImageRepair',
        'image-url': imageUrl,
        'enhance-type': enhanceType,
        'quality': quality,
        'format': format
      }

      // 发送CI请求
      const result = await this.callCI(params)

      return {
        success: true,
        data: {
          originalImage: imageUrl,
          restoredImage: result.ResultImage || result.ImageBase64,
          repairInfo: {
            enhanceType,
            quality,
            format,
            processedAt: new Date()
          }
        }
      }

    } catch (error) {
      logger.error('图片修复处理失败:', error)
      return {
        success: false,
        message: '图片修复处理失败'
      }
    }
  }

  /**
   * 图片质量评估
   * 评估图片的清晰度、色彩、构图等质量指标
   */
  async assessImageQuality(data) {
    try {
      const {
        imageUrl,
        scoreType = 'overall' // overall, clarity, color, composition
      } = data

      if (!imageUrl) {
        return {
          success: false,
          message: '请提供图片URL'
        }
      }

      // 构建质量评估参数
      const params = {
        'ci-process': 'AssessQuality',
        'image-url': imageUrl,
        'score-type': scoreType
      }

      // 发送CI请求
      const result = await this.callCI(params)

      // 解析质量评分
      const qualityScores = this.parseQualityScores(result)

      return {
        success: true,
        data: {
          imageUrl,
          qualityScores,
          assessment: {
            overall: qualityScores.overall,
            strengths: this.identifyStrengths(qualityScores),
            improvements: this.suggestImprovements(qualityScores),
            processedAt: new Date()
          }
        }
      }

    } catch (error) {
      logger.error('图片质量评估失败:', error)
      return {
        success: false,
        message: '图片质量评估失败'
      }
    }
  }

  /**
   * 批量图片处理
   * 对多张图片执行相同的处理操作
   */
  async batchProcess(data) {
    try {
      const {
        imageUrls,
        processType, // matting, crop, restore, quality
        processParams = {}
      } = data

      if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
        return {
          success: false,
          message: '请提供有效的图片URL列表'
        }
      }

      if (!processType) {
        return {
          success: false,
          message: '请指定处理类型'
        }
      }

      // 限制批量处理数量
      const maxBatchSize = 10
      const urlsToProcess = imageUrls.slice(0, maxBatchSize)

      const results = []
      const errors = []

      // 并发处理图片
      const promises = urlsToProcess.map(async (url, index) => {
        try {
          let result
          const params = { ...processParams, imageUrl: url }

          switch (processType) {
            case 'matting':
              result = await this.intelligentMatting(params)
              break
            case 'crop':
              result = await this.smartCrop(params)
              break
            case 'restore':
              result = await this.imageRestore(params)
              break
            case 'quality':
              result = await this.assessImageQuality(params)
              break
            default:
              throw new Error(`不支持的处理类型: ${processType}`)
          }

          return {
            index,
            url,
            success: true,
            data: result.data
          }

        } catch (error) {
          logger.error(`批量处理失败 [${index}]:`, error)
          return {
            index,
            url,
            success: false,
            error: error.message
          }
        }
      })

      const batchResults = await Promise.allSettled(promises)

      // 整理结果
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value)
        } else {
          errors.push({
            index,
            url: urlsToProcess[index],
            error: result.reason.message
          })
        }
      })

      return {
        success: true,
        data: {
          processType,
          totalProcessed: urlsToProcess.length,
          successful: results.filter(r => r.success).length,
          failed: errors.length,
          results,
          errors,
          processedAt: new Date()
        }
      }

    } catch (error) {
      logger.error('批量图片处理失败:', error)
      return {
        success: false,
        message: '批量图片处理失败'
      }
    }
  }

  /**
   * 调用腾讯云CI API
   */
  async callCI(params) {
    try {
      // 构建请求URL
      const url = `https://${this.ciHost}`

      // 添加公共参数
      const publicParams = {
        'Action': 'ProcessImage',
        'Version': '2018-08-08',
        'Region': this.region,
        'Timestamp': Math.floor(Date.now() / 1000).toString(),
        'Nonce': Math.random().toString(36).substr(2, 8),
        'SecretId': this.secretId
      }

      const allParams = { ...publicParams, ...params }

      // 生成签名
      const signature = this.generateSignature(allParams)

      // 发送请求
      const response = await axios.post(url, null, {
        params: allParams,
        headers: {
          'Authorization': signature,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30秒超时
      })

      return response.data

    } catch (error) {
      logger.error('CI API调用失败:', error)
      throw error
    }
  }

  /**
   * 生成腾讯云API签名
   */
  generateSignature(params) {
    // 1. 参数排序
    const sortedKeys = Object.keys(params).sort()
    const canonicalizedString = sortedKeys.map(key => `${key}=${encodeURIComponent(params[key])}`).join('&')

    // 2. 构建待签名字符串
    const httpMethod = 'POST'
    const canonicalURI = '/'
    const canonicalQueryString = canonicalizedString
    const canonicalHeaders = `content-type:application/json\nhost:${this.ciHost}\n`
    const signedHeaders = 'content-type;host'
    const payloadHash = crypto.createHash('sha256').update('').digest('hex')

    const canonicalRequest = [
      httpMethod,
      canonicalURI,
      canonicalQueryString,
      canonicalHeaders,
      signedHeaders,
      payloadHash
    ].join('\n')

    // 3. 生成签名字符串
    const algorithm = 'TC3-HMAC-SHA256'
    const requestTime = params.Timestamp
    const date = requestTime.substr(0, 8)
    const service = 'ci'
    const credentialScope = `${date}/${service}/tc3_request`

    const stringToSign = [
      algorithm,
      requestTime,
      credentialScope,
      crypto.createHash('sha256').update(canonicalRequest).digest('hex')
    ].join('\n')

    // 4. 计算签名
    const secretDate = crypto.createHmac('sha256', `TC3${this.secretKey}`).update(date).digest()
    const secretService = crypto.createHmac('sha256', secretDate).update(service).digest()
    const secretSigning = crypto.createHmac('sha256', secretService).update('tc3_request').digest()
    const signature = crypto.createHmac('sha256', secretSigning).update(stringToSign).digest('hex')

    // 5. 构建Authorization
    return `${algorithm} Credential=${this.secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`
  }

  /**
   * 处理抠图结果
   */
  async processMattingResult(result, returnImage) {
    if (returnImage === 'base64' && result.ImageBase64) {
      return {
        type: 'base64',
        data: result.ImageBase64,
        size: this.calculateBase64Size(result.ImageBase64)
      }
    } else if (result.ResultImage) {
      return {
        type: 'url',
        url: result.ResultImage,
        accessible: true
      }
    } else {
      throw new Error('抠图结果格式错误')
    }
  }

  /**
   * 计算Base64图片大小
   */
  calculateBase64Size(base64String) {
    const base64Data = base64String.replace(/^data:image\/[a-z]+;base64,/, '')
    return Math.round(base64Data.length * 0.75) // Base64编码大约增加33%
  }

  /**
   * 计算抠图置信度
   */
  calculateMattingConfidence(result) {
    // 这里应该根据CI返回的置信度指标计算
    // 目前返回模拟值
    return 0.85
  }

  /**
   * 解析质量评分
   */
  parseQualityScores(result) {
    // 根据CI API返回结果解析各项质量指标
    // 目前返回模拟数据
    return {
      overall: 8.5,
      clarity: 8.2,
      color: 8.8,
      composition: 8.4,
      exposure: 8.6,
      sharpness: 8.0
    }
  }

  /**
   * 识别图片优势
   */
  identifyStrengths(scores) {
    const strengths = []
    const thresholds = {
      clarity: 8.0,
      color: 8.5,
      composition: 8.0,
      exposure: 8.0,
      sharpness: 7.5
    }

    for (const [aspect, score] of Object.entries(scores)) {
      if (aspect !== 'overall' && score >= thresholds[aspect]) {
        strengths.push(this.getAspectDescription(aspect))
      }
    }

    return strengths
  }

  /**
   * 建议改进点
   */
  suggestImprovements(scores) {
    const improvements = []
    const thresholds = {
      clarity: 7.0,
      color: 7.5,
      composition: 7.0,
      exposure: 7.0,
      sharpness: 6.5
    }

    for (const [aspect, score] of Object.entries(scores)) {
      if (aspect !== 'overall' && score < thresholds[aspect]) {
        improvements.push(this.getImprovementSuggestion(aspect))
      }
    }

    return improvements
  }

  /**
   * 获取质量方面的描述
   */
  getAspectDescription(aspect) {
    const descriptions = {
      clarity: '画面清晰度好',
      color: '色彩表现优秀',
      composition: '构图合理',
      exposure: '曝光适中',
      sharpness: '细节丰富'
    }
    return descriptions[aspect] || aspect
  }

  /**
   * 获取改进建议
   */
  getImprovementSuggestion(aspect) {
    const suggestions = {
      clarity: '建议提高画面清晰度',
      color: '建议优化色彩平衡',
      composition: '建议调整构图',
      exposure: '建议调整曝光参数',
      sharpness: '建议增强细节锐度'
    }
    return suggestions[aspect] || '建议优化此项'
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

    // 创建CI服务实例
    const ciService = new TencentCIService()

    // 根据action调用对应方法
    const methodMap = {
      'intelligentMatting': 'intelligentMatting',
      'smartCrop': 'smartCrop',
      'imageRestore': 'imageRestore',
      'assessImageQuality': 'assessImageQuality',
      'batchProcess': 'batchProcess'
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
          message: `不支持的CI操作: ${action}`
        })
      }
    }

    const result = await ciService[methodName](data)

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(result)
    }

  } catch (error) {
    logger.error('腾讯云CI服务处理失败:', error)

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        message: 'CI服务处理失败'
      })
    }
  }
}

module.exports = TencentCIService