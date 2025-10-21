/**
 * SCF适配器 - 微信小程序到腾讯云SCF的适配层
 * 提供与微信云开发API兼容的接口
 */

class SCFAdapter {
  constructor(config = {}) {
    // SCF Function URL配置
    this.baseUrl = config.baseUrl || 'https://your-api-gateway-url.scf.tencentcloudapi.com'
    this.timeout = config.timeout || 30000
    this.retryTimes = config.retryTimes || 3

    // 用户身份信息
    this.openid = null
    this.appid = null

    // 请求拦截器
    this.requestInterceptors = []
    this.responseInterceptors = []

    // 性能统计
    this.stats = {
      totalRequests: 0,
      successRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0
    }
  }

  /**
   * 设置用户身份信息
   */
  setUserAuth(openid, appid) {
    this.openid = openid
    this.appid = appid
  }

  /**
   * 添加请求拦截器
   */
  addRequestInterceptor(interceptor) {
    this.requestInterceptors.push(interceptor)
  }

  /**
   * 添加响应拦截器
   */
  addResponseInterceptor(interceptor) {
    this.responseInterceptors.push(interceptor)
  }

  /**
   * 调用云函数 - 兼容微信云开发API
   */
  async callFunction(options) {
    const startTime = Date.now()
    this.stats.totalRequests++

    try {
      const { name, data } = options

      // 执行请求拦截器
      for (const interceptor of this.requestInterceptors) {
        await interceptor(options)
      }

      // 构建SCF请求
      const scfOptions = {
        url: this.baseUrl,
        method: 'POST',
        timeout: this.timeout,
        header: {
          'Content-Type': 'application/json',
          'Authorization': this.openid ? `Bearer ${this.generateToken()}` : '',
          'X-Openid': this.openid || '',
          'X-Appid': this.appid || ''
        },
        data: {
          // 兼容微信云开发的action模式
          action: data.action,
          openid: this.openid,
          ...data
        }
      }

      console.log(`SCF调用: ${name} - ${data.action}`)

      // 发送请求（带重试）
      const response = await this.requestWithRetry(scfOptions)

      // 执行响应拦截器
      let result = response
      for (const interceptor of this.responseInterceptors) {
        result = await interceptor(result) || result
      }

      // 统计成功
      this.stats.successRequests++
      const responseTime = Date.now() - startTime
      this.updateAverageResponseTime(responseTime)

      // 返回兼容微信云开发的格式
      return {
        result: result.data || result,
        errMsg: 'callFunction:ok'
      }

    } catch (error) {
      // 统计失败
      this.stats.failedRequests++

      console.error('SCF调用失败:', error)

      return {
        result: {
          success: false,
          message: error.message || '网络错误'
        },
        errMsg: `callFunction:fail ${error.message}`
      }
    }
  }

  /**
   * 文件上传 - 适配到腾讯云COS
   */
  async uploadFile(options) {
    const { filePath, cloudPath } = options

    try {
      console.log(`SCF文件上传: ${filePath} -> ${cloudPath}`)

      // 1. 获取COS上传URL
      const uploadResponse = await this.callFunction({
        name: 'storage-service',
        data: {
          action: 'getUploadUrl',
          fileName: cloudPath,
          fileType: this.getFileType(filePath)
        }
      })

      if (!uploadResponse.result.success) {
        throw new Error(uploadResponse.result.message)
      }

      // 2. 上传文件到COS
      const uploadResult = await wx.uploadFile({
        url: uploadResponse.result.data.uploadUrl,
        filePath: filePath,
        name: 'file',
        header: {
          'Content-Type': this.getContentType(filePath)
        }
      })

      // 3. 解析上传结果
      const cosResult = JSON.parse(uploadResult.data)

      return {
        fileID: uploadResponse.result.data.fileId,
        statusCode: uploadResult.statusCode
      }

    } catch (error) {
      console.error('SCF文件上传失败:', error)
      throw error
    }
  }

  /**
   * 下载文件 - 从腾讯云COS下载
   */
  async downloadFile(options) {
    const { fileID } = options

    try {
      console.log(`SCF文件下载: ${fileID}`)

      // 1. 获取COS下载URL
      const downloadResponse = await this.callFunction({
        name: 'storage-service',
        data: {
          action: 'getDownloadUrl',
          fileId: fileID
        }
      })

      if (!downloadResponse.result.success) {
        throw new Error(downloadResponse.result.message)
      }

      // 2. 下载文件
      const downloadResult = await wx.downloadFile({
        url: downloadResponse.result.data.downloadUrl
      })

      return downloadResult

    } catch (error) {
      console.error('SCF文件下载失败:', error)
      throw error
    }
  }

  /**
   * 删除文件 - 从腾讯云COS删除
   */
  async deleteFile(options) {
    const { fileList } = options

    try {
      console.log(`SCF文件删除: ${fileList.join(', ')}`)

      const response = await this.callFunction({
        name: 'storage-service',
        data: {
          action: 'deleteFiles',
          fileList: fileList
        }
      })

      return response

    } catch (error) {
      console.error('SCF文件删除失败:', error)
      throw error
    }
  }

  /**
   * 获取临时文件链接
   */
  async getTempFileURL(options) {
    const { fileList } = options

    try {
      console.log(`SCF获取临时链接: ${fileList.join(', ')}`)

      const response = await this.callFunction({
        name: 'storage-service',
        data: {
          action: 'getTempFileURL',
          fileList: fileList
        }
      })

      return response

    } catch (error) {
      console.error('SCF获取临时链接失败:', error)
      throw error
    }
  }

  /**
   * 带重试的请求
   */
  async requestWithRetry(options, retryCount = 0) {
    try {
      const response = await this.request(options)
      return response
    } catch (error) {
      if (retryCount < this.retryTimes) {
        console.warn(`请求失败，${1000}ms后重试 (${retryCount + 1}/${this.retryTimes}):`, error.message)
        await this.sleep(1000)
        return this.requestWithRetry(options, retryCount + 1)
      } else {
        throw error
      }
    }
  }

  /**
   * 基础HTTP请求
   */
  async request(options) {
    return new Promise((resolve, reject) => {
      wx.request({
        ...options,
        success: (res) => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(res)
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${res.data?.message || '请求失败'}`))
          }
        },
        fail: (error) => {
          reject(new Error(error.errMsg || '网络请求失败'))
        }
      })
    })
  }

  /**
   * 生成JWT Token（简化版）
   */
  generateToken() {
    // 这里应该调用后端生成JWT，这里简化处理
    if (!this.openid) return ''

    const payload = {
      openid: this.openid,
      appid: this.appid,
      exp: Math.floor(Date.now() / 1000) + 3600 // 1小时过期
    }

    // 临时实现 - 生产环境需要后端生成
    return Buffer.from(JSON.stringify(payload)).toString('base64')
  }

  /**
   * 获取文件类型
   */
  getFileType(filePath) {
    const ext = filePath.split('.').pop().toLowerCase()
    const typeMap = {
      'jpg': 'image', 'jpeg': 'image', 'png': 'image', 'gif': 'image',
      'mp4': 'video', 'mov': 'video', 'avi': 'video',
      'mp3': 'audio', 'wav': 'audio',
      'txt': 'text', 'json': 'text', 'xml': 'text'
    }
    return typeMap[ext] || 'binary'
  }

  /**
   * 获取Content-Type
   */
  getContentType(filePath) {
    const ext = filePath.split('.').pop().toLowerCase()
    const typeMap = {
      'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png', 'gif': 'image/gif',
      'mp4': 'video/mp4', 'mov': 'video/quicktime', 'avi': 'video/x-msvideo',
      'mp3': 'audio/mpeg', 'wav': 'audio/wav',
      'txt': 'text/plain', 'json': 'application/json', 'xml': 'application/xml'
    }
    return typeMap[ext] || 'application/octet-stream'
  }

  /**
   * 更新平均响应时间
   */
  updateAverageResponseTime(responseTime) {
    const total = this.stats.averageResponseTime * (this.stats.successRequests - 1) + responseTime
    this.stats.averageResponseTime = total / this.stats.successRequests
  }

  /**
   * 睡眠函数
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 获取性能统计
   */
  getStats() {
    return {
      ...this.stats,
      successRate: this.stats.totalRequests > 0
        ? (this.stats.successRequests / this.stats.totalRequests * 100).toFixed(2) + '%'
        : '0%'
    }
  }

  /**
   * 重置统计
   */
  resetStats() {
    this.stats = {
      totalRequests: 0,
      successRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0
    }
  }
}

module.exports = SCFAdapter