/**
 * SCF适配器 - 微信小程序到腾讯云SCF的适配层
 * 基于腾讯云SCF官方文档规范实现
 * 提供与微信云开发API兼容的接口
 */

class SCFAdapterOfficial {
  constructor(config = {}) {
    // SCF Function URL配置
    this.baseUrl = config.baseUrl || 'https://your-function-url.scf.tencentcloudapi.com'
    this.timeout = config.timeout || 30000
    this.retryTimes = config.retryTimes || 3

    // 用户身份信息 - 从微信小程序获取
    this.openid = null
    this.appid = null
    this.unionid = null

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

    // 腾讯云配置
    this.secretId = config.secretId || ''
    this.secretKey = config.secretKey || ''
    this.region = config.region || 'ap-guangzhou'
  }

  /**
   * 设置用户身份信息
   */
  setUserAuth(openid, appid, unionid = null) {
    this.openid = openid
    this.appid = appid
    this.unionid = unionid

    console.log('SCF适配器：设置用户身份', { openid: openid.substring(0, 8) + '...', appid })
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
   * 基于腾讯云SCF Function URL官方调用方式
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

      console.log(`SCF调用: ${name} - ${data.action}`)

      // 构建Function URL请求
      const response = await this.invokeFunctionURL(name, data)

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
   * 调用Function URL - 基于官方文档规范
   */
  async invokeFunctionURL(functionName, data) {
    try {
      // 构建Function URL请求
      const functionUrl = `${this.baseUrl}/${functionName}`

      // 构建请求数据 - 直接发送业务数据，让SCF函数处理事件格式
      const requestData = {
        // 兼容微信云开发的action模式
        action: data.action,
        openid: this.openid,
        appid: this.appid,
        unionid: this.unionid,
        ...data
      }

      // 发送HTTP请求
      const response = await this.makeHttpRequest(functionUrl, {
        method: 'POST',
        header: {
          'Content-Type': 'application/json',
          'X-Openid': this.openid || '',
          'X-Appid': this.appid || '',
          'User-Agent': 'WeChat-MiniProgram-SCF-Adapter/1.0'
        },
        data: requestData
      })

      return response

    } catch (error) {
      console.error('Function URL调用失败:', error)
      throw new Error(`Function URL调用失败: ${error.message}`)
    }
  }

  /**
   * HTTP请求实现
   */
  async makeHttpRequest(url, options) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: url,
        method: options.method || 'GET',
        header: options.header || {},
        data: options.data || {},
        timeout: this.timeout,
        success: (res) => {
          console.log('SCF HTTP响应:', {
            statusCode: res.statusCode,
            header: res.header
          })

          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(res)
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${res.data?.message || '请求失败'}`))
          }
        },
        fail: (error) => {
          console.error('SCF HTTP请求失败:', error)
          reject(new Error(error.errMsg || '网络请求失败'))
        }
      })
    })
  }

  /**
   * 文件上传 - 适配到腾讯云COS
   * 基于腾讯云COS官方API
   */
  async uploadFile(options) {
    const { filePath, cloudPath } = options

    try {
      console.log(`SCF文件上传: ${filePath} -> ${cloudPath}`)

      // 1. 获取COS预签名上传URL
      const uploadUrlResponse = await this.callFunction({
        name: 'storage',
        data: {
          action: 'getPresignedUploadUrl',
          fileName: cloudPath,
          fileType: this.getFileType(filePath)
        }
      })

      if (!uploadUrlResponse.result.success) {
        throw new Error(uploadUrlResponse.result.message)
      }

      const { uploadUrl, fileId, headers } = uploadUrlResponse.result.data

      // 2. 直接上传到腾讯云COS
      const uploadResult = await this.uploadToCOS(uploadUrl, filePath, headers)

      // 3. 确认上传完成
      if (uploadResult.statusCode === 200 || uploadResult.statusCode === 204) {
        return {
          fileID: fileId,
          statusCode: uploadResult.statusCode
        }
      } else {
        throw new Error(`上传失败: HTTP ${uploadResult.statusCode}`)
      }

    } catch (error) {
      console.error('SCF文件上传失败:', error)
      throw error
    }
  }

  /**
   * 上传文件到腾讯云COS
   */
  async uploadToCOS(uploadUrl, filePath, additionalHeaders = {}) {
    return new Promise((resolve, reject) => {
      wx.uploadFile({
        url: uploadUrl,
        filePath: filePath,
        name: 'file', // COS要求使用file作为字段名
        header: {
          'Content-Type': this.getContentType(filePath),
          ...additionalHeaders
        },
        success: (res) => {
          console.log('COS上传响应:', {
            statusCode: res.statusCode,
            data: res.data
          })
          resolve(res)
        },
        fail: (error) => {
          console.error('COS上传失败:', error)
          reject(new Error(error.errMsg || 'COS上传失败'))
        }
      })
    })
  }

  /**
   * 获取临时文件链接
   */
  async getTempFileURL(options) {
    const { fileList } = options

    try {
      console.log(`SCF获取临时链接: ${fileList.join(', ')}`)

      const response = await this.callFunction({
        name: 'storage',
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
   * 下载文件 - 从腾讯云COS下载
   */
  async downloadFile(options) {
    const { fileID } = options

    try {
      console.log(`SCF文件下载: ${fileID}`)

      // 1. 获取COS下载URL
      const downloadResponse = await this.callFunction({
        name: 'storage',
        data: {
          action: 'getPresignedDownloadUrl',
          fileId: fileID
        }
      })

      if (!downloadResponse.result.success) {
        throw new Error(downloadResponse.result.message)
      }

      const { downloadUrl } = downloadResponse.result.data

      // 2. 下载文件
      const downloadResult = await this.downloadFromCOS(downloadUrl)

      return downloadResult

    } catch (error) {
      console.error('SCF文件下载失败:', error)
      throw error
    }
  }

  /**
   * 从COS下载文件
   */
  async downloadFromCOS(downloadUrl) {
    return new Promise((resolve, reject) => {
      wx.downloadFile({
        url: downloadUrl,
        success: (res) => {
          console.log('COS下载响应:', {
            statusCode: res.statusCode,
            tempFilePath: res.tempFilePath
          })
          resolve(res)
        },
        fail: (error) => {
          console.error('COS下载失败:', error)
          reject(new Error(error.errMsg || 'COS下载失败'))
        }
      })
    })
  }

  /**
   * 删除文件 - 从腾讯云COS删除
   */
  async deleteFile(options) {
    const { fileList } = options

    try {
      console.log(`SCF文件删除: ${fileList.join(', ')}`)

      const response = await this.callFunction({
        name: 'storage',
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
   * 生成请求ID
   */
  generateRequestId() {
    return 'req-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9)
  }

  /**
   * 获取文件类型
   */
  getFileType(filePath) {
    const ext = filePath.split('.').pop().toLowerCase()
    const typeMap = {
      'jpg': 'image', 'jpeg': 'image', 'png': 'image', 'gif': 'image', 'webp': 'image',
      'mp4': 'video', 'mov': 'video', 'avi': 'video', 'mkv': 'video',
      'mp3': 'audio', 'wav': 'audio', 'flac': 'audio', 'aac': 'audio',
      'txt': 'text', 'json': 'text', 'xml': 'text', 'csv': 'text',
      'pdf': 'document', 'doc': 'document', 'docx': 'document',
      'zip': 'archive', 'rar': 'archive', '7z': 'archive'
    }
    return typeMap[ext] || 'binary'
  }

  /**
   * 获取Content-Type
   */
  getContentType(filePath) {
    const ext = filePath.split('.').pop().toLowerCase()
    const typeMap = {
      'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png', 'gif': 'image/gif', 'webp': 'image/webp',
      'mp4': 'video/mp4', 'mov': 'video/quicktime', 'avi': 'video/x-msvideo', 'mkv': 'video/x-matroska',
      'mp3': 'audio/mpeg', 'wav': 'audio/wav', 'flac': 'audio/flac', 'aac': 'audio/aac',
      'txt': 'text/plain', 'json': 'application/json', 'xml': 'application/xml', 'csv': 'text/csv',
      'pdf': 'application/pdf', 'doc': 'application/msword', 'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'zip': 'application/zip', 'rar': 'application/x-rar-compressed', '7z': 'application/x-7z-compressed'
    }
    return typeMap[ext] || 'application/octet-stream'
  }

  /**
   * 更新平均响应时间
   */
  updateAverageResponseTime(responseTime) {
    if (this.stats.successRequests === 1) {
      this.stats.averageResponseTime = responseTime
    } else {
      const total = this.stats.averageResponseTime * (this.stats.successRequests - 1) + responseTime
      this.stats.averageResponseTime = total / this.stats.successRequests
    }
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

  /**
   * 健康检查
   */
  async healthCheck() {
    try {
      const response = await this.callFunction({
        name: 'api',
        data: {
          action: 'ping',
          __noLoading: true
        }
      })

      return {
        success: response.result && response.result.success,
        message: response.result?.message || '健康检查失败',
        stats: this.getStats()
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
        stats: this.getStats()
      }
    }
  }
}

module.exports = SCFAdapterOfficial