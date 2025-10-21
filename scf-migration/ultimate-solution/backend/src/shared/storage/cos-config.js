/**
 * 腾讯云对象存储 COS 配置
 * 替换微信云开发的 cloud.uploadFile/cloud.getTempFileURL
 */

const COS = require('cos-nodejs-sdk-v5')
const logger = require('../../utils/logger')

class COSService {
  constructor() {
    // 从环境变量初始化COS客户端
    this.cos = new COS({
      SecretId: process.env.COS_SECRET_ID,
      SecretKey: process.env.COS_SECRET_KEY,
      XCosSecurityToken: process.env.COS_SESSION_TOKEN
    })

    // 存储桶配置
    this.bucket = process.env.COS_BUCKET || 'ai-photo-prod-1379020062'
    this.region = process.env.COS_REGION || 'ap-guangzhou'

    logger.info(`📦 COS服务初始化: ${this.bucket} (${this.region})`)
  }

  /**
   * 上传文件到COS
   */
  async uploadFile(fileContent, fileName, folder = 'uploads') {
    try {
      // 处理base64图片数据
      let buffer
      let format = 'png'

      if (typeof fileContent === 'string' && fileContent.startsWith('data:image/')) {
        const matches = fileContent.match(/^data:image\/([^;]+);base64,(.+)$/)
        if (matches) {
          format = matches[1]
          buffer = Buffer.from(matches[2], 'base64')
        } else {
          throw new Error('无效的base64图片格式')
        }
      } else if (typeof fileContent === 'string') {
        buffer = Buffer.from(fileContent, 'base64')
      } else {
        buffer = fileContent
      }

      // 生成文件路径
      const timestamp = Date.now()
      const random = Math.random().toString(36).substring(2, 8)
      const cloudPath = `${folder}/${timestamp}_${random}.${format}`

      return new Promise((resolve, reject) => {
        this.cos.putObject({
          Bucket: this.bucket,
          Region: this.region,
          Key: cloudPath,
          Body: buffer,
          ContentType: `image/${format}`,
          ACL: 'private',
          ServerSideEncryption: 'AES256'
        }, (err, data) => {
          if (err) {
            logger.error('❌ COS上传失败:', err)
            reject(err)
          } else {
            logger.info(`✅ COS上传成功: ${cloudPath}`)
            resolve({
              fileID: data.Location,
              cloudPath: cloudPath,
              url: `https://${data.Location}`,
              size: buffer.length,
              format: format
            })
          }
        })
      })
    } catch (error) {
      logger.error('❌ 文件上传处理失败:', error)
      throw error
    }
  }

  /**
   * 获取文件的临时访问URL
   */
  async getTempFileURL(cloudPath, expiresIn = 3600) {
    try {
      return new Promise((resolve, reject) => {
        this.cos.getObjectUrl({
          Bucket: this.bucket,
          Region: this.region,
          Key: cloudPath,
          Sign: true,
          Expires: expiresIn
        }, (err, data) => {
          if (err) {
            logger.error('❌ 获取临时URL失败:', err)
            reject(err)
          } else {
            logger.info(`🔗 生成临时URL: ${cloudPath}`)
            resolve({
              tempFileURL: data.Url,
              expires: expiresIn,
              cloudPath: cloudPath
            })
          }
        })
      })
    } catch (error) {
      logger.error('❌ 获取临时URL处理失败:', error)
      throw error
    }
  }

  /**
   * 批量获取临时URL
   */
  async getBatchTempFileURLs(cloudPaths, expiresIn = 3600) {
    try {
      const promises = cloudPaths.map(path =>
        this.getTempFileURL(path, expiresIn)
      )

      const results = await Promise.all(promises)

      return {
        tempUrls: results.map(r => r.tempFileURL),
        fileList: results
      }
    } catch (error) {
      logger.error('❌ 批量获取临时URL失败:', error)
      throw error
    }
  }

  /**
   * 删除文件
   */
  async deleteFiles(cloudPaths) {
    try {
      const paths = Array.isArray(cloudPaths) ? cloudPaths : [cloudPaths]
      const deleteObjects = paths.map(path => ({ Key: path }))

      return new Promise((resolve, reject) => {
        this.cos.deleteMultipleObject({
          Bucket: this.bucket,
          Region: this.region,
          Objects: deleteObjects
        }, (err, data) => {
          if (err) {
            logger.error('❌ 删除文件失败:', err)
            reject(err)
          } else {
            logger.info(`🗑️ 删除文件成功: ${paths.length}个`)
            resolve({
              deleted: data.Deleted?.length || 0,
              errors: data.Error?.length || 0
            })
          }
        })
      })
    } catch (error) {
      logger.error('❌ 删除文件处理失败:', error)
      throw error
    }
  }

  /**
   * 检查文件是否存在
   */
  async checkFileExists(cloudPath) {
    try {
      return new Promise((resolve, reject) => {
        this.cos.headObject({
          Bucket: this.bucket,
          Region: this.region,
          Key: cloudPath
        }, (err, data) => {
          if (err) {
            if (err.statusCode === 404) {
              resolve(false)
            } else {
              logger.error('❌ 检查文件存在性失败:', err)
              reject(err)
            }
          } else {
            resolve(true)
          }
        })
      })
    } catch (error) {
      logger.error('❌ 检查文件存在性处理失败:', error)
      throw error
    }
  }

  /**
   * 获取文件元数据
   */
  async getFileMetadata(cloudPath) {
    try {
      return new Promise((resolve, reject) => {
        this.cos.headObject({
          Bucket: this.bucket,
          Region: this.region,
          Key: cloudPath
        }, (err, data) => {
          if (err) {
            logger.error('❌ 获取文件元数据失败:', err)
            reject(err)
          } else {
            resolve({
              size: data['content-length'],
              lastModified: data['last-modified'],
              contentType: data['content-type'],
              etag: data['etag']
            })
          }
        })
      })
    } catch (error) {
      logger.error('❌ 获取文件元数据处理失败:', error)
      throw error
    }
  }
}

// 单例模式
const cosService = new COSService()

module.exports = cosService