/**
 * API调用工具类 - 增强版，支持SCF和微信云开发双模式
 * 基于原有api.js扩展，添加SCF适配能力
 */

const SCFAdapter = require('./scf-adapter.js')

class EnhancedApiService {
  constructor() {
    // 原有配置
    this._cloudReadyPromise = null
    this._appInstance = null
    this._requestCache = new Map()
    this._pendingRequests = new Map()
    this._debounceTimers = new Map()
    this._throttleTimers = new Map()

    // SCF相关配置
    this._scfAdapter = null
    this._currentBackend = null // 'wechat_cloud' | 'scf'
    this._backendConfig = null

    // 初始化
    this.initBackendConfig()
  }

  /**
   * 初始化后端配置
   */
  initBackendConfig() {
    try {
      // 获取环境信息
      const accountInfo = wx.getAccountInfoSync()
      const envVersion = accountInfo.miniProgram.envVersion
      const isDev = (envVersion === 'develop' || envVersion === 'trial')

      // 配置后端选择
      this._backendConfig = {
        // 开发环境优先使用SCF，生产环境使用微信云开发
        preferredBackend: isDev ? 'scf' : 'wechat_cloud',

        // SCF配置
        scf: {
          baseUrl: isDev
            ? 'https://dev-api-gateway.scf.tencentcloudapi.com'
            : 'https://api-gateway.scf.tencentcloudapi.com',
          timeout: 30000,
          retryTimes: 3
        },

        // 功能开关
        features: {
          enableSCF: true,
          enableCache: true,
          enableRetry: true,
          enableStats: true
        },

        // 降级配置
        fallback: {
          enable: true,
          maxRetryTimes: 2,
          fallbackToCloud: true
        }
      }

      console.log('API配置初始化:', this._backendConfig)

    } catch (error) {
      console.warn('API配置初始化失败，使用默认配置', error)
      this._backendConfig = {
        preferredBackend: 'wechat_cloud',
        features: { enableSCF: false, enableCache: true }
      }
    }
  }

  /**
   * 获取当前使用的后端
   */
  async getCurrentBackend() {
    if (this._currentBackend) {
      return this._currentBackend
    }

    // 检查功能开关
    if (!this._backendConfig.features.enableSCF) {
      this._currentBackend = 'wechat_cloud'
      return this._currentBackend
    }

    // 检查SCF适配器是否可用
    try {
      if (!this._scfAdapter) {
        this._scfAdapter = new SCFAdapter(this._backendConfig.scf)
      }

      // 测试SCF连接
      await this.testSCFConnection()

      this._currentBackend = this._backendConfig.preferredBackend
      console.log(`使用后端: ${this._currentBackend}`)

    } catch (error) {
      console.warn('SCF连接测试失败，切换到微信云开发', error)

      if (this._backendConfig.fallback.enable && this._backendConfig.fallback.fallbackToCloud) {
        this._currentBackend = 'wechat_cloud'
      } else {
        this._currentBackend = 'scf' // 强制使用SCF
      }
    }

    return this._currentBackend
  }

  /**
   * 测试SCF连接
   */
  async testSCFConnection() {
    try {
      const response = await this._scfAdapter.callFunction({
        name: 'api-gateway',
        data: { action: 'ping' }
      })

      if (!response.result.success) {
        throw new Error(response.result.message)
      }

      console.log('SCF连接测试成功')
      return true

    } catch (error) {
      throw new Error(`SCF连接测试失败: ${error.message}`)
    }
  }

  /**
   * 统一的云函数调用入口
   */
  async callCloudFunction(functionName, data = {}) {
    const backend = await this.getCurrentBackend()

    if (backend === 'scf') {
      return await this.callSCFFunction(functionName, data)
    } else {
      return await this.callWeChatCloudFunction(functionName, data)
    }
  }

  /**
   * 调用SCF云函数
   */
  async callSCFFunction(functionName, data) {
    try {
      console.log(`API: 调用SCF函数 ${functionName}`)

      // 生成请求唯一标识
      const requestKey = `${functionName}_${JSON.stringify(data)}`

      // 检查重复请求
      if (this._pendingRequests.has(requestKey)) {
        console.log(`API: 发现重复SCF请求 ${functionName}，返回已有Promise`)
        return await this._pendingRequests.get(requestKey)
      }

      const noLoading = !!(data && data.__noLoading)

      // 创建请求Promise
      const requestPromise = this.executeSCFCall(functionName, data, noLoading)
      this._pendingRequests.set(requestKey, requestPromise)

      try {
        const result = await requestPromise
        return result
      } finally {
        this._pendingRequests.delete(requestKey)
      }

    } catch (error) {
      console.error(`API: SCF函数调用失败 ${functionName}`, error)

      // 降级处理
      if (this._backendConfig.fallback.enable && this._currentBackend !== 'wechat_cloud') {
        console.log('API: 尝试降级到微信云开发')
        return await this.callWeChatCloudFunction(functionName, data)
      }

      throw error
    }
  }

  /**
   * 执行SCF调用
   */
  async executeSCFCall(functionName, data, noLoading) {
    try {
      // 显示加载提示
      if (!noLoading) {
        try {
          wx.showLoading({
            title: '处理中...',
            mask: true
          })
        } catch (error) {
          console.warn('显示loading失败', error)
        }
      }

      // 确保用户身份
      await this.ensureUserAuth()

      // 调用SCF
      const response = await this._scfAdapter.callFunction({
        name: functionName,
        data: data
      })

      // 隐藏加载提示
      if (!noLoading) {
        try {
          wx.hideLoading()
        } catch (error) {
          console.warn('隐藏loading失败', error)
        }
      }

      // 处理响应
      if (response.result && response.result.success) {
        return {
          success: true,
          data: response.result.data,
          message: response.result.message
        }
      } else {
        const errorMsg = response.result?.message || '请求失败'

        // 显示错误提示
        try {
          wx.showToast({
            title: errorMsg,
            icon: 'none',
            duration: 2000
          })
        } catch (error) {
          console.warn('显示错误提示失败', error)
        }

        return {
          success: false,
          message: errorMsg
        }
      }

    } catch (error) {
      // 隐藏加载提示
      if (!noLoading) {
        try {
          wx.hideLoading()
        } catch (error) {
          console.warn('隐藏loading失败', error)
        }
      }

      console.error(`SCF函数${functionName}调用异常:`, error)

      let errorMsg = error.message || '网络错误，请稍后重试'

      // 显示错误提示
      try {
        wx.showToast({
          title: errorMsg,
          icon: 'none',
          duration: 2000
        })
      } catch (toastError) {
        console.warn('显示错误提示失败', toastError)
      }

      return {
        success: false,
        message: errorMsg
      }
    }
  }

  /**
   * 调用微信云开发函数（原有逻辑）
   */
  async callWeChatCloudFunction(functionName, data) {
    // 这里保持原有的微信云开发调用逻辑
    // 从原始api.js复制相关方法
    try {
      console.log(`API: 调用微信云开发函数 ${functionName}`)

      // 确保云开发已初始化
      if (!wx.cloud) {
        throw new Error('云开发未初始化')
      }

      // 等待云开发初始化完成
      await this._ensureAppCloudReady()

      const noLoading = !!(data && data.__noLoading)

      // 显示加载提示
      if (!noLoading) {
        try {
          wx.showLoading({
            title: '处理中...',
            mask: true
          })
        } catch (error) {
          console.warn('显示loading失败', error)
        }
      }

      const res = await wx.cloud.callFunction({
        name: functionName,
        data
      })

      // 隐藏加载提示
      if (!noLoading) {
        try {
          wx.hideLoading()
        } catch (error) {
          console.warn('隐藏loading失败', error)
        }
      }

      if (res.result && res.result.success) {
        return {
          success: true,
          data: res.result.data,
          message: res.result.message
        }
      } else {
        const errorMsg = res.result?.message || '请求失败'

        try {
          wx.showToast({
            title: errorMsg,
            icon: 'none',
            duration: 2000
          })
        } catch (error) {
          console.warn('显示错误提示失败', error)
        }

        return {
          success: false,
          message: errorMsg
        }
      }

    } catch (error) {
      console.error(`微信云开发函数${functionName}调用失败:`, error)

      let errorMsg = error.message || '网络错误，请稍后重试'

      try {
        wx.showToast({
          title: errorMsg,
          icon: 'none',
          duration: 2000
        })
      } catch (toastError) {
        console.warn('显示错误提示失败', toastError)
      }

      return {
        success: false,
        message: errorMsg
      }
    }
  }

  /**
   * 确保用户身份
   */
  async ensureUserAuth() {
    try {
      const app = this._getApp()
      if (app && app.globalData && app.globalData.userInfo) {
        // 设置SCF适配器的用户身份
        if (this._scfAdapter) {
          this._scfAdapter.setUserAuth(
            app.globalData.userInfo.openid,
            app.globalData.userInfo.appid || 'wx_app_id'
          )
        }
      }
    } catch (error) {
      console.warn('设置用户身份失败', error)
    }
  }

  /**
   * 获取app实例
   */
  _getApp() {
    if (!this._appInstance) {
      try {
        this._appInstance = getApp()
      } catch (error) {
        console.error('获取app实例失败', error)
        return null
      }
    }
    return this._appInstance
  }

  /**
   * 确保云开发初始化完成（从原始api.js复制）
   */
  async _ensureAppCloudReady() {
    try {
      if (!wx.cloud) {
        throw new Error('请使用 2.2.3 或以上的基础库以使用云能力')
      }

      const app = await this._waitForAppInitialization()
      if (!app) {
        throw new Error('app初始化失败')
      }

      if (app.globalData.cloudReadyPromise) {
        this._cloudReadyPromise = app.globalData.cloudReadyPromise
        return await this._cloudReadyPromise
      }

      return !!wx.cloud

    } catch (error) {
      console.error('云开发就绪检查失败', error)
      return false
    }
  }

  /**
   * 等待app初始化完成（从原始api.js复制）
   */
  async _waitForAppInitialization(maxWaitTime = 5000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now()

      const checkApp = () => {
        try {
          const app = this._getApp()
          if (app && app.globalData) {
            resolve(app)
          } else if (Date.now() - startTime > maxWaitTime) {
            reject(new Error('app初始化超时'))
          } else {
            setTimeout(checkApp, 100)
          }
        } catch (error) {
          reject(error)
        }
      }

      checkApp()
    })
  }

  /**
   * 文件上传 - 根据后端选择不同的上传方式
   */
  async uploadFile(filePath, cloudPath) {
    const backend = await this.getCurrentBackend()

    if (backend === 'scf') {
      return await this.uploadToSCF(filePath, cloudPath)
    } else {
      return await this.uploadToWeChatCloud(filePath, cloudPath)
    }
  }

  /**
   * 上传到SCF（腾讯云COS）
   */
  async uploadToSCF(filePath, cloudPath) {
    try {
      console.log(`API: 上传文件到SCF ${cloudPath}`)

      try {
        wx.showLoading({
          title: '上传中...',
          mask: true
        })
      } catch (error) {
        console.warn('显示上传loading失败', error)
      }

      // 确保用户身份
      await this.ensureUserAuth()

      const result = await this._scfAdapter.uploadFile({
        filePath,
        cloudPath
      })

      try {
        wx.hideLoading()
      } catch (error) {
        console.warn('隐藏上传loading失败', error)
      }

      return {
        success: true,
        data: {
          file_id: result.fileID,
          cloud_path: cloudPath
        }
      }

    } catch (error) {
      try {
        wx.hideLoading()
      } catch (hideError) {
        console.warn('隐藏上传loading失败', hideError)
      }

      console.error('SCF文件上传失败:', error)

      try {
        wx.showToast({
          title: '上传失败',
          icon: 'none'
        })
      } catch (toastError) {
        console.warn('显示上传错误提示失败', toastError)
      }

      return {
        success: false,
        message: error.message || '上传失败'
      }
    }
  }

  /**
   * 上传到微信云存储（从原始api.js复制）
   */
  async uploadToWeChatCloud(filePath, cloudPath) {
    // 保持原有的微信云存储上传逻辑
    try {
      try {
        wx.showLoading({
          title: '上传中...',
          mask: true
        })
      } catch (error) {
        console.warn('显示上传loading失败', error)
      }

      const res = await wx.cloud.uploadFile({
        cloudPath,
        filePath
      })

      try {
        wx.hideLoading()
      } catch (error) {
        console.warn('隐藏上传loading失败', error)
      }

      if (res.fileID) {
        return {
          success: true,
          data: {
            file_id: res.fileID,
            cloud_path: cloudPath
          }
        }
      } else {
        throw new Error('上传失败')
      }
    } catch (error) {
      try {
        wx.hideLoading()
      } catch (hideError) {
        console.warn('隐藏上传loading失败', hideError)
      }

      console.error('文件上传失败:', error)

      try {
        wx.showToast({
          title: '上传失败',
          icon: 'none'
        })
      } catch (toastError) {
        console.warn('显示上传错误提示失败', toastError)
      }

      return {
        success: false,
        message: error.message || '上传失败'
      }
    }
  }

  /**
   * 切换后端（用于调试）
   */
  async switchBackend(backend) {
    if (backend === 'scf' || backend === 'wechat_cloud') {
      this._currentBackend = backend
      console.log(`手动切换后端到: ${backend}`)

      // 如果切换到SCF，重新测试连接
      if (backend === 'scf') {
        await this.testSCFConnection()
      }

      return true
    }
    return false
  }

  /**
   * 获取当前后端状态
   */
  async getBackendStatus() {
    const current = await this.getCurrentBackend()

    return {
      currentBackend: current,
      config: this._backendConfig,
      scfStats: this._scfAdapter ? this._scfAdapter.getStats() : null
    }
  }

  /**
   * 带缓存的云函数调用（保持原有接口）
   */
  async callCloudFunctionWithCache(functionName, data = {}, options = {}) {
    const { cache = false, cacheTTL = 300000 } = options

    if (cache && this._backendConfig.features.enableCache) {
      const cacheKey = `${functionName}_${JSON.stringify(data || {})}`
      const cachedResult = this._getCachedRequest(cacheKey)
      if (cachedResult) {
        console.log(`使用缓存结果: ${functionName}`)
        return cachedResult
      }
    }

    const result = await this.callCloudFunction(functionName, data)

    if (cache && result.success && this._backendConfig.features.enableCache) {
      const cacheKey = `${functionName}_${JSON.stringify(data || {})}`
      this._cacheRequest(cacheKey, result, cacheTTL)
    }

    return result
  }

  /**
   * 缓存相关方法（从原始api.js复制）
   */
  _getCachedRequest(cacheKey) {
    const cached = this._requestCache.get(cacheKey)
    if (cached && Date.now() < cached.expireTime) {
      return cached.result
    }
    this._requestCache.delete(cacheKey)
    return null
  }

  _cacheRequest(cacheKey, result, ttl = 300000) {
    const expireTime = Date.now() + ttl
    this._requestCache.set(cacheKey, {
      result,
      expireTime
    })

    setTimeout(() => {
      const cached = this._requestCache.get(cacheKey)
      if (cached && Date.now() > cached.expireTime) {
        this._requestCache.delete(cacheKey)
      }
    }, ttl)
  }

  // ============ 保持原有的API方法 ============
  // 这里可以添加所有原有的API方法，它们会自动使用新的调用逻辑

  async getUserInfo() {
    return await this.callCloudFunctionWithCache('user', {
      action: 'getUserInfo'
    }, {
      cache: true,
      cacheTTL: 300000
    })
  }

  async generatePhotography(params) {
    return await this.callCloudFunction('photography', {
      action: 'generate',
      count: params.count || 1,
      images: params.images,
      parameters: params.parameters,
      sceneId: params.sceneId
    })
  }

  async generateFitting(params) {
    return await this.callCloudFunction('fitting', {
      action: 'generate',
      count: params.count || 1,
      model_image: params.modelImage,
      clothing_images: params.clothingImages,
      parameters: params.parameters,
      sceneId: params.sceneId
    })
  }

  // ... 更多原有方法可以按需添加
}

// 创建单例实例
const enhancedApiService = new EnhancedApiService()

module.exports = enhancedApiService