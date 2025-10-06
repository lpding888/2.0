// API调用工具类 - 修复版本
// 解决循环依赖和存储API问题

class ApiService {
  constructor() {
    this.baseUrl = '' // 云函数不需要baseUrl
    this._cloudReadyPromise = null // 内部缓存，避免重复获取
    this._appInstance = null // 缓存app实例，避免重复获取

    // 性能优化相关
    this._requestCache = new Map() // 请求缓存
    this._pendingRequests = new Map() // 防止重复请求
    this._debounceTimers = new Map() // 防抖定时器
    this._throttleTimers = new Map() // 节流定时器
  }

  /**
   * 获取app实例（缓存版本）
   */
  _getApp() {
    if (!this._appInstance) {
      try {
        this._appInstance = getApp()
      } catch (error) {
        console.error('ApiService: 获取app实例失败', error)
        return null
      }
    }
    return this._appInstance
  }

  /**
   * 智能等待app初始化完成（优化版）
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
   * 确保云开发初始化完成（修复版）
   */
  async _ensureAppCloudReady() {
    try {
      // 1. 检查基础库支持
      if (!wx.cloud) {
        throw new Error('请使用 2.2.3 或以上的基础库以使用云能力')
      }
      
      // 2. 等待app初始化完成
      const app = await this._waitForAppInitialization()
      if (!app) {
        throw new Error('app初始化失败')
      }
      
      // 3. 检查云开发初始化状态
      if (app.globalData.cloudReadyPromise) {
        this._cloudReadyPromise = app.globalData.cloudReadyPromise
        return await this._cloudReadyPromise
      }
      
      // 4. 如果没有Promise，直接检查wx.cloud状态
      return !!wx.cloud
      
    } catch (error) {
      console.error('ApiService: 云开发就绪检查失败', error)
      return false
    }
  }

  /**
   * 通用云函数调用方法（修复版）
   */
  async callCloudFunction(functionName, data = {}) {
    try {
      console.log(`api.js callCloudFunction: 开始调用云函数 ${functionName}`)
      console.log(`api.js callCloudFunction: 传入数据`, data)
      
      // 确保云开发已初始化
      if (!wx.cloud) {
        throw new Error('云开发未初始化，请检查基础库版本')
      }
      console.log('api.js callCloudFunction: wx.cloud 已存在')

      // 等待云开发初始化完成
      console.log('api.js callCloudFunction: 等待云开发初始化完成')
      const isCloudReady = await this._ensureAppCloudReady()
      console.log('api.js callCloudFunction: 云开发初始化状态', isCloudReady)
      
      if (!isCloudReady) {
        throw new Error('云开发初始化失败，请检查配置')
      }

      const noLoading = !!(data && data.__noLoading)

      // 显示加载提示（增加错误处理）
      if (!noLoading) {
        try {
          wx.showLoading({
            title: '处理中...',
            mask: true
          })
        } catch (error) {
          console.warn('显示loading失败，继续执行', error)
        }
      }

      console.log(`api.js callCloudFunction: 开始调用 wx.cloud.callFunction`)
      const res = await wx.cloud.callFunction({
        name: functionName,
        data
      })
      console.log(`api.js callCloudFunction: 云函数 ${functionName} 返回结果`, res)

      // 隐藏加载提示（增加错误处理）
      if (!noLoading) {
        try {
          wx.hideLoading()
        } catch (error) {
          console.warn('隐藏loading失败，继续执行', error)
        }
      }

      if (res.result && res.result.success) {
        console.log(`api.js callCloudFunction: 云函数 ${functionName} 调用成功`)
        return {
          success: true,
          data: res.result.data,
          message: res.result.message
        }
      } else {
        const errorMsg = res.result?.message || '请求失败'
        console.log(`api.js callCloudFunction: 云函数 ${functionName} 调用失败`, errorMsg)
        
        // 显示错误提示（增加错误处理）
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
      const noLoading = !!(data && data.__noLoading)
      
      // 隐藏加载提示（增加错误处理）
      if (!noLoading) {
        try {
          wx.hideLoading()
        } catch (hideError) {
          console.warn('隐藏loading失败', hideError)
        }
      }
      
      console.error(`云函数${functionName}调用失败:`, error)
      
      let errorMsg = error.message || '网络错误，请稍后重试'
      
      // 特殊错误处理
      if (error.message && String(error.message).indexOf('Cloud API isn\'t enabled') >= 0) {
        errorMsg = '云服务初始化中，请稍后重试'
      }
      
      // 显示错误提示（增加错误处理）
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

  // ==================== 用户相关 ====================
  
  /**
   * 用户注册
   */
  async registerUser(userInfo, inviteCode = '') {
    console.log('api.js registerUser: 开始调用云函数user')
    console.log('api.js registerUser: 用户信息', userInfo)
    
    const result = await this.callCloudFunction('user', {
      action: 'register',
      nickname: userInfo.nickName,
      avatar_url: userInfo.avatarUrl,
      invite_code: inviteCode
    })
    
    console.log('api.js registerUser: 云函数返回结果', result)
    return result
  }

  /**
   * 获取用户信息
   */
  async getUserInfo() {
    return await this.callCloudFunction('user', {
      action: 'getUserInfo'
    })
  }

  /**
   * 更新用户信息
   */
  async updateUserInfo(userInfo) {
    return await this.callCloudFunction('user', {
      action: 'updateUserInfo',
      nickname: userInfo.nickName,
      avatar_url: userInfo.avatarUrl
    })
  }

  // ==================== 提示词相关 ====================
  
  /**
   * 生成AI提示词
   */
  async generatePrompt(type, parameters, sceneInfo) {
    return await this.callCloudFunction('prompt', {
      action: 'generatePrompt',
      type: type, // 'photography' | 'fitting'
      parameters: parameters,
      sceneInfo: sceneInfo
    })
  }

  /**
   * 获取提示词模板列表
   */
  async getPromptTemplates(type, category) {
    return await this.callCloudFunction('prompt', {
      action: 'getTemplates',
      type: type,
      category: category
    });
  }

  /**
   * 添加提示词模板（管理员功能）
   */
  async addPromptTemplate(templateData) {
    return await this.callCloudFunction('prompt', {
      action: 'addTemplate',
      template_data: templateData
    });
  }

  /**
   * 更新提示词模板（管理员功能）
   */
  async updatePromptTemplate(templateId, updates) {
    return await this.callCloudFunction('prompt', {
      action: 'updateTemplate',
      templateId: templateId,
      updates: updates
    });
  }

  /**
   * 删除提示词模板（管理员功能）
   */
  async deletePromptTemplate(templateId) {
    return await this.callCloudFunction('prompt', {
      action: 'deleteTemplate',
      template_id: templateId
    });
  }

  // ==================== AI模型管理 ====================
  
  /**
   * 获取可用AI模型列表
   */
  async getAIModels(modelType, provider, isActive) {
    return await this.callCloudFunction('aimodels', {
      action: 'listModels',
      model_type: modelType,
      provider: provider,
      is_active: isActive
    });
  }

  /**
   * 获取AI模型详情
   */
  async getAIModel(modelId) {
    return await this.callCloudFunction('aimodels', {
      action: 'getModel',
      model_id: modelId
    });
  }

  /**
   * 添加新AI模型（管理员功能）
   */
  async addAIModel(modelData) {
    return await this.callCloudFunction('aimodels', {
      action: 'addModel',
      model_data: modelData
    });
  }

  /**
   * 更新AI模型配置（管理员功能）
   */
  async updateAIModel(modelId, updates) {
    return await this.callCloudFunction('aimodels', {
      action: 'updateModel',
      model_id: modelId,
      updates: updates
    });
  }

  /**
   * 删除AI模型（管理员功能）
   */
  async deleteAIModel(modelId) {
    return await this.callCloudFunction('aimodels', {
      action: 'deleteModel',
      model_id: modelId
    });
  }

  /**
   * 切换AI模型启用状态（管理员功能）
   */
  async toggleAIModelStatus(modelId, isActive) {
    return await this.callCloudFunction('aimodels', {
      action: 'toggleModelStatus',
      model_id: modelId,
      is_active: isActive
    });
  }

  /**
   * 选择最佳AI模型
   */
  async selectBestAIModel(modelType, capabilities, maxCost, preferredProviders) {
    return await this.callCloudFunction('aimodels', {
      action: 'selectBestModel',
      model_type: modelType,
      capabilities: capabilities,
      max_cost: maxCost,
      preferred_providers: preferredProviders
    });
  }

  // ==================== 场景相关 ====================
  
  /**
   * 获取场景列表
   */
  async getScenes(category = 'all') {
    return await this.callCloudFunction('scene', {
      action: 'getScenes',
      category
    });
  }

  /**
   * 添加新场景（管理员功能）
   */
  async addScene(sceneData) {
    return await this.callCloudFunction('scene', {
      action: 'addScene',
      scene_data: sceneData
    })
  }

  /**
   * 更新场景（管理员功能）
   */
  async updateScene(sceneId, updates) {
    return await this.callCloudFunction('scene', {
      action: 'updateScene',
      sceneId: sceneId,
      updates: updates
    });
  }

  /**
   * 删除场景（管理员功能）
   */
  async deleteScene(sceneId) {
    return await this.callCloudFunction('scene', {
      action: 'deleteScene',
      sceneId: sceneId
    });
  }

  /**
   * 切换场景状态（管理员功能）
   */
  async toggleSceneStatus(sceneId, enabled) {
    return await this.callCloudFunction('scene', {
      action: 'toggleSceneStatus',
      sceneId: sceneId,
      enabled: enabled
    });
  }

  // ==================== 服装摄影相关 ====================
  
  /**
   * 生成服装摄影作品
   */
  async generatePhotography(params) {
    return await this.callCloudFunction('photography', {
      action: 'generate',
      images: params.images,
      parameters: params.parameters,
      sceneId: params.sceneId,
      count: params.count || 1
    });
  }

  /**
   * 获取摄影任务进度
   */
  async getPhotographyProgress(taskId) {
    // 轮询进度为静默调用，不干扰页面自定义loading
    return await this.callCloudFunction('photography', {
      action: 'getProgress',
      task_id: taskId,  // 修复：前端传递taskId，云函数期望task_id
      __noLoading: true
    });
  }

  // ==================== 试衣间相关 ====================
  
  /**
   * 生成试衣间作品
   */
  async generateFitting(params) {
    // 前端兜底：若无 sceneId 但提供了 parameters.location，则根据场景名称匹配 sceneId
    let sceneId = params.sceneId
    try {
      if (!sceneId && params && params.parameters && params.parameters.location) {
        const scenesRes = await this.getScenes('all')
        if (scenesRes && scenesRes.success && Array.isArray(scenesRes.data)) {
          const loc = params.parameters.location
          const match = scenesRes.data.find(s => s && (s.name === loc || s.title === loc))
          if (match && (match._id || match.id)) {
            sceneId = match._id || match.id
          }
        }
      }
    } catch (e) {
      console.warn('generateFitting: 场景自动匹配失败(忽略继续):', e && e.message)
    }

    return await this.callCloudFunction('fitting', {
      action: 'generate',
      model_image: params.modelImage,
      clothing_images: params.clothingImages,
      parameters: params.parameters,
      sceneId: sceneId,  // 修复：前端传递sceneId，云函数期望sceneId
      count: params.count || 1
    })
  }

  // ==================== 作品相关 ====================
  
  /**
   * 获取作品列表（旧：works 云函数）
   */
  async getWorksList(params = {}) {
    return await this.callCloudFunction('api', {
      action: 'getWorkList',
      type: params.type || 'all',
      is_favorite: params.isFavorite,
      page: params.page || 1,
      limit: params.limit || 20
    })
  }

  /**
   * 轻量分页获取作品列表（新：api.listWorks）
   */
  async listWorks({ tab = 'all', onlyCompleted = false, pageSize = 12, last_id = null } = {}) {
    return await this.callCloudFunction('api', {
      action: 'listWorks',
      tab,
      onlyCompleted,
      pageSize,
      last_id,
      __noLoading: true
    })
  }

  /**
   * 获取作品详情
   */
  async getWorkDetail(workId) {
    return await this.callCloudFunction('api', {
      action: 'getWorkDetail',
      workId: workId
    })
  }

  /**
   * 删除作品（新后端：api.deleteWork）
   */
  async deleteWork(workId) {
    return await this.callCloudFunction('api', {
      action: 'deleteWork',
      workId: workId
    })
  }

  /**
   * 切换收藏状态
   */
  async toggleFavorite(workId) {
    return await this.callCloudFunction('api', {
      action: 'toggleFavorite',
      workId: workId
    })
  }

  // ==================== 支付相关 ====================
  
  /**
   * 获取充值套餐
   */
  async getPackages() {
    return await this.callCloudFunction('payment', {
      action: 'getPackages'
    })
  }

  /**
   * 每日签到
   */
  async dailyCheckin() {
    return await this.callCloudFunction('payment', {
      action: 'dailyCheckin'
    })
  }

  /**
   * 创建充值订单（返回支付参数）
   */
  async createRechargeOrder({ packageId }) {
    return await this.callCloudFunction('payment', {
      action: 'createOrder',
      packageId: packageId
    })
  }

  /**
   * 获取充值记录
   */
  async getRechargeRecords() {
    return await this.callCloudFunction('payment', {
      action: 'listRechargeRecords',
      __noLoading: true
    })
  }

  /**
   * 获取积分消费记录
   */
  async getConsumeRecords() {
    return await this.callCloudFunction('payment', {
      action: 'listConsumeRecords',
      __noLoading: true
    })
  }

  // ==================== 文件上传相关 ====================
  
  /**
   * 上传文件到云存储
   */
  async uploadFile(filePath, cloudPath) {
    try {
      // 显示上传提示（增加错误处理）
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

      // 隐藏上传提示（增加错误处理）
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
      // 隐藏上传提示（增加错误处理）
      try {
        wx.hideLoading()
      } catch (hideError) {
        console.warn('隐藏上传loading失败', hideError)
      }
      
      console.error('文件上传失败:', error)
      
      // 显示错误提示（增加错误处理）
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
}

// 创建单例实例
const apiService = new ApiService()

module.exports = apiService