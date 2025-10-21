/**
 * API调用工具类 - 官方规范版本
 * 基于腾讯云SCF官方文档规范实现
 * 支持SCF和微信云开发双模式
 */

const SCFAdapterOfficial = require('./scf-adapter-official.js')

class ApiServiceOfficial {
  constructor() {
    // 原有配置
    this._cloudReadyPromise = null
    this._appInstance = null
    this._requestCache = new Map()
    this._pendingRequests = new Map()

    // SCF相关配置
    this._scfAdapter = null
    this._currentBackend = null // 'wechat_cloud' | 'scf'
    this._backendConfig = null

    // 初始化
    this.initBackendConfig()
  }

  /**
   * 初始化后端配置 - 基于腾讯云SCF官方规范
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

        // SCF配置 - 符合官方规范
        scf: {
          baseUrl: isDev
            ? 'https://dev-api-gateway.scf.tencentcloudapi.com'
            : 'https://api-gateway.scf.tencentcloudapi.com',
          timeout: 30000,
          retryTimes: 3,
          region: 'ap-guangzhou'
        },

        // 功能开关
        features: {
          enableSCF: true,
          enableCache: true,
          enableRetry: true,
          enableStats: true,
          enableHealthCheck: true
        },

        // 降级配置
        fallback: {
          enable: true,
          maxRetryTimes: 2,
          fallbackToCloud: true,
          healthCheckInterval: 30000 // 30秒健康检查
        }
      }

      console.log('API配置初始化(官方规范):', this._backendConfig)

    } catch (error) {
      console.warn('API配置初始化失败，使用默认配置', error)
      this._backendConfig = {
        preferredBackend: 'wechat_cloud',
        features: { enableSCF: false, enableCache: true },
        fallback: { enable: true, fallbackToCloud: true }
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
        this._scfAdapter = new SCFAdapterOfficial(this._backendConfig.scf)
      }

      // 设置用户身份
      await this.ensureUserAuth()

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
   * 测试SCF连接 - 基于官方规范的健康检查
   */
  async testSCFConnection() {
    try {
      const healthResult = await this._scfAdapter.healthCheck()

      if (!healthResult.success) {
        throw new Error(healthResult.message)
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
   * 调用SCF云函数 - 基于官方规范
   */
  async callSCFFunction(functionName, data) {
    try {
      console.log(`API: 调用SCF函数 ${functionName} (官方规范)`)

      // 生成请求唯一标识
      const requestKey = `${functionName}_${JSON.stringify(data)}`

      // 检查重复请求
      if (this._pendingRequests.has(requestKey)) {
        console.log(`API: 发现重复SCF请求 ${functionName}，返回已有Promise`)
        return await this._pendingRequests.get(requestKey)
      }

      const noLoading = !!(data && data.__noLoading)

      // 创建请求Promise
      const requestPromise = this.executeSCFCallOfficial(functionName, data, noLoading)
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
   * 执行SCF调用 - 基于官方规范
   */
  async executeSCFCallOfficial(functionName, data, noLoading) {
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

      // 调用SCF适配器
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
            app.globalData.userInfo.appid || 'wx_app_id',
            app.globalData.userInfo.unionid
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
   * 确保云开发初始化完成
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
   * 等待app初始化完成
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
   * 上传到SCF（腾讯云COS）- 基于官方规范
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
   * 上传到微信云存储（原有逻辑）
   */
  async uploadToWeChatCloud(filePath, cloudPath) {
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

  // ============ 原有API方法 ============

  async getUserInfo() {
    return await this.callCloudFunction('user', {
      action: 'getUserInfo'
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

  async getWorks(params) {
    return await this.callCloudFunction('api', {
      action: 'getWorks',
      ...params
    })
  }

  async getProgress(taskId) {
    return await this.callCloudFunction('api', {
      action: 'getProgress',
      taskId: taskId
    })
  }

  async getScenes() {
    return await this.callCloudFunction('scene', {
      action: 'getScenes'
    })
  }
}

// 创建单例实例
const apiServiceOfficial = new ApiServiceOfficial()

module.exports = apiServiceOfficial