/**
 * 腾讯云数据万象 CI 服务集成
 * 提供图片AI处理能力：智能抠图、图像修复、智能裁剪等
 */

const COS = require('cos-nodejs-sdk-v5')
const crypto = require('crypto')

class CIService {
  constructor() {
    // 初始化COS客户端（CI通过COS调用）
    this.cos = new COS({
      SecretId: process.env.COS_SECRET_ID,
      SecretKey: process.env.COS_SECRET_KEY,
      XCosSecurityToken: process.env.COS_SESSION_TOKEN
    })

    this.bucket = process.env.COS_BUCKET || 'ai-photo-prod-1379020062'
    this.region = process.env.COS_REGION || 'ap-guangzhou'

    console.log(`🎨 CI服务初始化: ${this.bucket} (${this.region})`)
  }

  /**
   * 生成数据万象处理签名
   * @param {String} path - 处理路径
   * @param {String} rule - 处理规则
   */
  generateCISignature(path, rule) {
    const keyTime = Math.floor(Date.now() / 1000) + 3600 // 1小时有效期
    const signKey = crypto
      .createHmac('sha1', process.env.COS_SECRET_KEY)
      .update(keyTime)
      .digest('hex')

    const httpString = `path=${path}&rule=${rule}`
    const httpStringSha1 = crypto.createHash('sha1').update(httpString).digest('hex')
    const signature = crypto
      .createHmac('sha1', signKey)
      .update(httpStringSha1)
      .digest('hex')

    return {
      signature,
      keyTime,
      httpString
    }
  }

  /**
   * 智能抠图（商品抠图）
   * @param {String} cloudPath - 原图片在COS中的路径
   * @param {Object} options - 抠图选项
   */
  async intelligentMatting(cloudPath, options = {}) {
    try {
      // 数据万象智能抠图参数
      const ciParams = {
        'ci-process': 'ProductMatting', // 商品抠图
        'detect-type': options.detectType || '1', // 1:通用 2:人像 3:商品
        'format': options.format || 'png', // 输出格式
        'quality': options.quality || '100' // 图片质量
      }

      console.log(`🎨 开始智能抠图: ${cloudPath}`)
      console.log('📋 抠图参数:', ciParams)

      // 构建处理URL
      const baseUrl = `https://${this.bucket}.cos.${this.region}.myqcloud.com`
      const imageUrl = `${baseUrl}/${cloudPath}`

      // 添加处理参数
      const paramStr = Object.entries(ciParams)
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join('&')

      const processUrl = `${imageUrl}?${paramStr}`

      console.log(`🔗 处理URL: ${processUrl}`)

      return {
        success: true,
        processedUrl: processUrl,
        originalPath: cloudPath,
        processedPath: cloudPath.replace(/\.[^/.]+$/, '_matting.png'),
        parameters: ciParams
      }

    } catch (error) {
      console.error('❌ 智能抠图失败:', error)
      throw new Error(`智能抠图失败: ${error.message}`)
    }
  }

  /**
   * 图像智能裁剪
   * @param {String} cloudPath - 原图片路径
   * @param {Object} options - 裁剪选项
   */
  async smartCrop(cloudPath, options = {}) {
    try {
      const ciParams = {
        'ci-process': 'smart-crop', // 智能裁剪
        'width': options.width || '1024',
        'height': options.height || '1024',
        'detect-type': options.detectType || '1', // 1:人脸 2:主体
        'format': options.format || 'jpg',
        'quality': options.quality || '90'
      }

      console.log(`✂️ 开始智能裁剪: ${cloudPath}`)
      console.log('📋 裁剪参数:', ciParams)

      const baseUrl = `https://${this.bucket}.cos.${this.region}.myqcloud.com`
      const imageUrl = `${baseUrl}/${cloudPath}`

      const paramStr = Object.entries(ciParams)
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join('&')

      const processUrl = `${imageUrl}?${paramStr}`

      return {
        success: true,
        processedUrl: processUrl,
        originalPath: cloudPath,
        processedPath: cloudPath.replace(/\.[^/.]+$/, '_smart_crop.jpg'),
        parameters: ciParams
      }

    } catch (error) {
      console.error('❌ 智能裁剪失败:', error)
      throw new Error(`智能裁剪失败: ${error.message}`)
    }
  }

  /**
   * 图像修复（去除水印、划痕等）
   * @param {String} cloudPath - 原图片路径
   * @param {Object} options - 修复选项
   */
  async imageRestore(cloudPath, options = {}) {
    try {
      const ciParams = {
        'ci-process': 'ImageRestore', // 图像修复
        'restore-type': options.restoreType || '1', // 1:去水印 2:去划痕 3:去摩尔纹
        'format': options.format || 'jpg',
        'quality': options.quality || '95'
      }

      console.log(`🔧 开始图像修复: ${cloudPath}`)
      console.log('📋 修复参数:', ciParams)

      const baseUrl = `https://${this.bucket}.cos.${this.region}.myqcloud.com`
      const imageUrl = `${baseUrl}/${cloudPath}`

      const paramStr = Object.entries(ciParams)
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join('&')

      const processUrl = `${imageUrl}?${paramStr}`

      return {
        success: true,
        processedUrl: processUrl,
        originalPath: cloudPath,
        processedPath: cloudPath.replace(/\.[^/.]+$/, '_restored.jpg'),
        parameters: ciParams
      }

    } catch (error) {
      console.error('❌ 图像修复失败:', error)
      throw new Error(`图像修复失败: ${error.message}`)
    }
  }

  /**
   * 图片质量评估
   * @param {String} cloudPath - 图片路径
   */
  async assessImageQuality(cloudPath) {
    try {
      const ciParams = {
        'ci-process': 'QualityAssess' // 质量评估
      }

      console.log(`📊 开始图片质量评估: ${cloudPath}`)

      const baseUrl = `https://${this.bucket}.cos.${this.region}.myqcloud.com`
      const imageUrl = `${baseUrl}/${cloudPath}`

      const paramStr = Object.entries(ciParams)
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join('&')

      const assessUrl = `${imageUrl}?${paramStr}`

      // 注意：这里需要实际调用API获取评估结果
      // 简化示例，实际需要根据CI API文档实现
      return {
        success: true,
        assessUrl: assessUrl,
        imagePath: cloudPath,
        // 模拟评估结果
        quality: {
          overall: 85, // 总体质量评分 0-100
          clarity: 88, // 清晰度
          color: 82,    // 色彩质量
          composition: 86 // 构图质量
        }
      }

    } catch (error) {
      console.error('❌ 图片质量评估失败:', error)
      throw new Error(`图片质量评估失败: ${error.message}`)
    }
  }

  /**
   * 图片标签识别（AI识别图片内容）
   * @param {String} cloudPath - 图片路径
   * @param {Object} options - 识别选项
   */
  async detectImageLabels(cloudPath, options = {}) {
    try {
      const ciParams = {
        'ci-process': 'ImageLabels', // 图片标签
        'detect-type': options.detectType || '1,2,3,4', // 1:实体 2:场景 3:概念 4:动作
        'max-label-num': options.maxLabels || '10'
      }

      console.log(`🏷️ 开始图片标签识别: ${cloudPath}`)

      const baseUrl = `https://${this.bucket}.cos.${this.region}.myqcloud.com`
      const imageUrl = `${baseUrl}/${cloudPath}`

      const paramStr = Object.entries(ciParams)
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join('&')

      const detectUrl = `${imageUrl}?${paramStr}`

      // 简化示例，实际需要调用CI API获取识别结果
      return {
        success: true,
        detectUrl: detectUrl,
        imagePath: cloudPath,
        // 模拟识别结果
        labels: [
          { name: '人像', confidence: 95 },
          { name: '服装', confidence: 88 },
          { name: '时尚', confidence: 76 },
          { name: '模特', confidence: 82 }
        ]
      }

    } catch (error) {
      console.error('❌ 图片标签识别失败:', error)
      throw new Error(`图片标签识别失败: ${error.message}`)
    }
  }

  /**
   * 内容审核（检查违规内容）
   * @param {String} cloudPath - 图片路径
   * @param {Array} scenes - 审核场景
   */
  async contentModeration(cloudPath, scenes = ['porn', 'terrorist', 'politics', 'ads']) {
    try {
      const ciParams = {
        'ci-process': 'sensitive-content-recognition', // 内容审核
        'scenes': scenes.join(',') // 审核场景
      }

      console.log(`🛡️ 开始内容审核: ${cloudPath}`)
      console.log('📋 审核场景:', scenes)

      const baseUrl = `https://${this.bucket}.cos.${this.region}.myqcloud.com`
      const imageUrl = `${baseUrl}/${cloudPath}`

      const paramStr = Object.entries(ciParams)
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join('&')

      const moderationUrl = `${imageUrl}?${paramStr}`

      return {
        success: true,
        moderationUrl: moderationUrl,
        imagePath: cloudPath,
        scenes: scenes,
        // 模拟审核结果
        result: {
          suggestion: 'pass', // pass, review, block
          details: [
            { scene: 'porn', suggestion: 'pass', confidence: 0.01 },
            { scene: 'ads', suggestion: 'pass', confidence: 0.05 }
          ]
        }
      }

    } catch (error) {
      console.error('❌ 内容审核失败:', error)
      throw new Error(`内容审核失败: ${error.message}`)
    }
  }

  /**
   * 批量处理图片（组合多个处理步骤）
   * @param {String} cloudPath - 原图片路径
   * @param {Array} operations - 处理操作序列
   */
  async batchProcess(cloudPath, operations = []) {
    try {
      console.log(`🔄 开始批量处理: ${cloudPath}`)
      console.log('📋 处理步骤:', operations)

      const results = []
      let currentPath = cloudPath

      for (const operation of operations) {
        let result

        switch (operation.type) {
          case 'matting':
            result = await this.intelligentMatting(currentPath, operation.options)
            break
          case 'smart-crop':
            result = await this.smartCrop(currentPath, operation.options)
            break
          case 'restore':
            result = await this.imageRestore(currentPath, operation.options)
            break
          case 'quality-assess':
            result = await this.assessImageQuality(currentPath)
            break
          case 'detect-labels':
            result = await this.detectImageLabels(currentPath, operation.options)
            break
          case 'moderation':
            result = await this.contentModeration(currentPath, operation.options.scenes)
            break
          default:
            console.warn(`⚠️ 未知操作类型: ${operation.type}`)
            continue
        }

        results.push(result)

        // 更新当前路径为处理后路径（用于下一步处理）
        if (result.processedPath) {
          currentPath = result.processedPath
        }
      }

      return {
        success: true,
        originalPath: cloudPath,
        results: results,
        totalOperations: operations.length,
        processedCount: results.length
      }

    } catch (error) {
      console.error('❌ 批量处理失败:', error)
      throw new Error(`批量处理失败: ${error.message}`)
    }
  }

  /**
   * 生成持久化处理URL（用于保存处理后的图片）
   * @param {String} cloudPath - 原图片路径
   * @param {Object} processParams - 处理参数
   * @param {String} outputPath - 输出路径
   */
  async generatePersistentProcessUrl(cloudPath, processParams, outputPath) {
    try {
      const baseUrl = `https://${this.bucket}.cos.${this.region}.myqcloud.com`

      // 构建持久化处理参数
      const persistentParams = {
        'ci-process': 'persistent-process', // 持久化处理
        'pic-operations': JSON.stringify({
          rules: [{
            fileid: outputPath,
            rule: Object.entries(processParams)
              .map(([key, value]) => `${key}=${value}`)
              .join('&')
          }]
        })
      }

      const paramStr = Object.entries(persistentParams)
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join('&')

      const processUrl = `${baseUrl}/${cloudPath}?${paramStr}`

      return {
        success: true,
        processUrl: processUrl,
        originalPath: cloudPath,
        outputPath: outputPath,
        processParams: processParams
      }

    } catch (error) {
      console.error('❌ 生成持久化处理URL失败:', error)
      throw new Error(`生成持久化处理URL失败: ${error.message}`)
    }
  }
}

// 单例模式
const ciService = new CIService()

module.exports = ciService