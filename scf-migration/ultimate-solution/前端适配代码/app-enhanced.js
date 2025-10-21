// app.js - 增强版本，支持SCF和微信云开发双后端
const imageHandler = require('./utils/image-handler.js')

App({
  onLaunch: function () {
    // 初始化日志控制
    this.initLogger()

    console.log('app.js: 小程序启动 - 增强版本')

    // 初始化后端选择
    this.initBackendSelection()

    // 初始化云开发环境
    this.initCloudEnvironment()

    // 启动预热机制
    this.startWarmUp()

    // 延迟加载用户信息
    setTimeout(() => {
      this.loadUserInfoFromStorage()

      if (this.globalData.userInfo) {
        console.log('app.js: 检测到用户已登录，开始静默刷新用户信息...')
        this.refreshUserInfo()
      }
    }, 100)
  },

  onShow: function() {
    console.log('app.js: 小程序显示')

    // 应用回到前台时，恢复预热
    if (!this.warmUpTimer) {
      this.startWarmUp()
    }
  },

  onHide: function() {
    console.log('app.js: 小程序隐藏')

    // 应用进入后台时，停止预热
    if (this.warmUpTimer) {
      clearInterval(this.warmUpTimer)
      this.warmUpTimer = null
      console.log('预热机制暂停')
    }
  },

  globalData: {
    userInfo: null,
    cloudReadyPromise: null,
    isRefreshingUserInfo: false,
    lastRefreshTime: 0,
    imageHandler: imageHandler,
    isDev: false,

    // 后端配置
    backendConfig: {
      currentBackend: null, // 'wechat_cloud' | 'scf'
      preferredBackend: null,
      scfEnabled: false,
      autoSwitch: true
    },

    // 轮询状态管理
    pollingTasks: new Set(),
    pollingOwners: new Map()
  },

  /**
   * 初始化后端选择
   */
  initBackendSelection() {
    try {
      // 获取环境信息
      const accountInfo = wx.getAccountInfoSync()
      const envVersion = accountInfo.miniProgram.envVersion
      const isDev = (envVersion === 'develop' || envVersion === 'trial')

      this.globalData.isDev = isDev

      // 配置后端选择
      if (isDev) {
        // 开发环境：优先SCF
        this.globalData.backendConfig = {
          currentBackend: null, // 延迟决定
          preferredBackend: 'scf',
          scfEnabled: true,
          autoSwitch: true
        }
        console.log('开发环境：优先使用SCF后端')
      } else {
        // 生产环境：优先微信云开发
        this.globalData.backendConfig = {
          currentBackend: null, // 延迟决定
          preferredBackend: 'wechat_cloud',
          scfEnabled: false, // 生产环境默认关闭SCF
          autoSwitch: false
        }
        console.log('生产环境：优先使用微信云开发')
      }

      // 检查本地存储的后端配置
      this.loadBackendConfig()

    } catch (error) {
      console.warn('后端配置初始化失败，使用默认配置', error)
      this.globalData.backendConfig = {
        currentBackend: 'wechat_cloud',
        preferredBackend: 'wechat_cloud',
        scfEnabled: false,
        autoSwitch: false
      }
    }
  },

  /**
   * 加载后端配置
   */
  loadBackendConfig() {
    try {
      const savedConfig = wx.getStorageSync('backendConfig')
      if (savedConfig) {
        // 合并配置，用户设置优先
        Object.assign(this.globalData.backendConfig, savedConfig)
        console.log('加载保存的后端配置:', savedConfig)
      }
    } catch (error) {
      console.warn('加载后端配置失败', error)
    }
  },

  /**
   * 保存后端配置
   */
  saveBackendConfig(config) {
    try {
      const newConfig = Object.assign(this.globalData.backendConfig, config)
      wx.setStorageSync('backendConfig', newConfig)
      console.log('保存后端配置:', newConfig)
    } catch (error) {
      console.warn('保存后端配置失败', error)
    }
  },

  /**
   * 手动切换后端（用于调试）
   */
  async switchBackend(backend) {
    if (backend !== 'wechat_cloud' && backend !== 'scf') {
      console.error('不支持的后端类型:', backend)
      return false
    }

    try {
      console.log(`切换后端: ${this.globalData.backendConfig.currentBackend} -> ${backend}`)

      // 保存配置
      this.saveBackendConfig({ currentBackend: backend })

      // 重新初始化API服务
      if (this.globalData.apiService) {
        await this.globalData.apiService.switchBackend(backend)
      }

      // 重新启动预热
      this.restartWarmUp()

      wx.showToast({
        title: `已切换到${backend === 'scf' ? 'SCF' : '微信云开发'}`,
        icon: 'success',
        duration: 2000
      })

      return true

    } catch (error) {
      console.error('切换后端失败:', error)
      wx.showToast({
        title: '切换失败',
        icon: 'none'
      })
      return false
    }
  },

  /**
   * 获取后端状态
   */
  async getBackendStatus() {
    try {
      if (this.globalData.apiService) {
        return await this.globalData.apiService.getBackendStatus()
      }

      return {
        currentBackend: this.globalData.backendConfig.currentBackend,
        config: this.globalData.backendConfig
      }

    } catch (error) {
      console.error('获取后端状态失败:', error)
      return null
    }
  },

  /**
   * 初始化日志控制器
   */
  initLogger() {
    try {
      const accountInfo = wx.getAccountInfoSync()
      const envVersion = accountInfo.miniProgram.envVersion
      this.globalData.isDev = (envVersion === 'develop' || envVersion === 'trial')

      if (!this.globalData.isDev) {
        const originalConsole = {
          log: console.log,
          warn: console.warn,
          info: console.info,
          debug: console.debug
        }

        console.log = function() {}
        console.warn = function() {}
        console.info = function() {}
        console.debug = function() {}

        this.globalData.originalConsole = originalConsole
      }
    } catch (e) {
      console.warn('获取环境信息失败', e)
    }
  },

  /**
   * 初始化云开发环境
   */
  initCloudEnvironment() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
      return
    }

    try {
      wx.cloud.init({
        env: 'cloudbase-0gu1afji26f514d2',
        traceUser: true,
      })

      this.globalData.cloudReadyPromise = Promise.resolve(true)
      console.log('云开发环境初始化完成')

      // 延迟初始化API服务
      setTimeout(() => {
        this.initApiService()
      }, 200)

    } catch (error) {
      console.error('云开发环境初始化失败', error)
      this.globalData.cloudReadyPromise = Promise.reject(error)
    }
  },

  /**
   * 初始化API服务
   */
  async initApiService() {
    try {
      // 动态加载增强版API服务
      const EnhancedApiService = require('./utils/api-enhanced.js')
      this.globalData.apiService = EnhancedApiService

      console.log('增强版API服务初始化完成')

      // 获取后端状态
      const status = await this.globalData.apiService.getBackendStatus()
      console.log('当前后端状态:', status)

    } catch (error) {
      console.error('API服务初始化失败，使用原版API:', error)

      // 降级到原版API
      try {
        const OriginalApiService = require('./utils/api.js')
        this.globalData.apiService = OriginalApiService
        console.log('降级到原版API服务')
      } catch (fallbackError) {
        console.error('原版API加载也失败:', fallbackError)
      }
    }
  },

  /**
   * 从本地存储加载用户信息
   */
  loadUserInfoFromStorage() {
    setTimeout(() => {
      try {
        if (typeof wx === 'undefined' || !wx.getStorageSync) {
          return
        }

        const userInfo = wx.getStorageSync('userInfo')
        if (userInfo) {
          this.globalData.userInfo = userInfo
          console.log('从本地存储加载用户信息成功')
        }
      } catch (error) {
        console.error('从本地存储加载用户信息失败', error)
        this.loadUserInfoAsync()
      }
    }, 100)
  },

  /**
   * 异步加载用户信息
   */
  loadUserInfoAsync() {
    if (typeof wx === 'undefined' || !wx.getStorage) {
      return
    }

    try {
      wx.getStorage({
        key: 'userInfo',
        success: (res) => {
          if (res.data) {
            this.globalData.userInfo = res.data
            console.log('异步加载用户信息成功')
          }
        },
        fail: (error) => {
          console.log('异步加载用户信息失败', error)
        }
      })
    } catch (error) {
      console.error('异步存储API调用失败', error)
    }
  },

  /**
   * 设置用户信息
   */
  setUserInfo(userInfo) {
    this.globalData.userInfo = userInfo

    if (userInfo) {
      this.saveUserInfoToStorage(userInfo)
      console.log('用户信息已更新')
    } else {
      this.clearUserInfoFromStorage()
      console.log('用户已退出，清除用户信息')
    }

    // 更新SCF适配器的用户身份
    this.updateSCFUserAuth(userInfo)
  },

  /**
   * 更新SCF用户身份
   */
  updateSCFUserAuth(userInfo) {
    try {
      if (this.globalData.apiService && this.globalData.apiService._scfAdapter) {
        this.globalData.apiService._scfAdapter.setUserAuth(
          userInfo?.openid,
          userInfo?.appid || 'wx_app_id'
        )
        console.log('SCF用户身份已更新')
      }
    } catch (error) {
      console.warn('更新SCF用户身份失败', error)
    }
  },

  /**
   * 保存用户信息到本地存储
   */
  saveUserInfoToStorage(userInfo) {
    if (typeof wx === 'undefined') {
      return
    }

    try {
      if (wx.setStorageSync) {
        wx.setStorageSync('userInfo', userInfo)
      } else if (wx.setStorage) {
        this.saveUserInfoAsync(userInfo)
      }
    } catch (error) {
      console.error('保存用户信息失败', error)
      this.saveUserInfoAsync(userInfo)
    }
  },

  /**
   * 异步保存用户信息
   */
  saveUserInfoAsync(userInfo) {
    if (!wx.setStorage) {
      return
    }

    try {
      wx.setStorage({
        key: 'userInfo',
        data: userInfo,
        success: () => {
          console.log('用户信息已异步保存')
        },
        fail: (err) => {
          console.error('异步保存用户信息失败', err)
        }
      })
    } catch (error) {
      console.error('异步存储API调用失败', error)
    }
  },

  /**
   * 清除用户信息
   */
  clearUserInfoFromStorage() {
    if (typeof wx === 'undefined') {
      return
    }

    try {
      if (wx.removeStorageSync) {
        wx.removeStorageSync('userInfo')
      } else if (wx.removeStorage) {
        this.clearUserInfoAsync()
      }
    } catch (error) {
      console.error('清除用户信息失败', error)
      this.clearUserInfoAsync()
    }
  },

  /**
   * 异步清除用户信息
   */
  clearUserInfoAsync() {
    if (!wx.removeStorage) {
      return
    }

    try {
      wx.removeStorage({
        key: 'userInfo',
        success: () => {
          console.log('用户信息已异步清除')
        },
        fail: (err) => {
          console.error('异步清除用户信息失败', err)
        }
      })
    } catch (error) {
      console.error('异步清除存储API调用失败', error)
    }
  },

  /**
   * 刷新用户信息
   */
  async refreshUserInfo() {
    const now = Date.now()
    if (this.globalData.isRefreshingUserInfo) {
      return this.globalData.userInfo
    }

    if (now - this.globalData.lastRefreshTime < 30000) {
      return this.globalData.userInfo
    }

    if (!this.globalData.userInfo) {
      return null
    }

    this.globalData.isRefreshingUserInfo = true
    this.globalData.lastRefreshTime = now

    try {
      console.log('开始从服务器刷新用户信息...')

      if (!this.globalData.apiService) {
        throw new Error('API服务未初始化')
      }

      const res = await this.globalData.apiService.getUserInfo()

      if (res.success && res.data) {
        this.setUserInfo(res.data)
        console.log('从服务器刷新用户信息成功')
        return res.data
      } else {
        console.warn('刷新用户信息失败', res.message)
        this.setUserInfo(null)
        return null
      }
    } catch (error) {
      console.error('刷新用户信息异常', error)
      this.setUserInfo(null)
      return null
    } finally {
      this.globalData.isRefreshingUserInfo = false
    }
  },

  /**
   * 启动预热机制
   */
  startWarmUp() {
    this.warmUpCloudFunction()

    this.warmUpTimer = setInterval(() => {
      this.warmUpCloudFunction()
    }, 4 * 60 * 1000) // 4分钟

    console.log('预热机制已启动')
  },

  /**
   * 执行云函数预热
   */
  async warmUpCloudFunction() {
    try {
      if (!this.globalData.apiService) {
        return
      }

      // 静默调用，不显示loading
      const backend = await this.globalData.apiService.getCurrentBackend()

      if (backend === 'scf') {
        // SCF预热
        await this.globalData.apiService.callCloudFunction('api-gateway', {
          action: 'ping',
          __noLoading: true
        })
      } else {
        // 微信云开发预热
        wx.cloud.callFunction({
          name: 'api',
          data: {
            action: 'ping'
          },
          success: (res) => {
            console.log('云函数预热成功')
          },
          fail: (err) => {
            console.warn('云函数预热失败:', err)
          }
        })
      }

    } catch (error) {
      // 忽略预热错误
    }
  },

  /**
   * 重启预热机制
   */
  restartWarmUp() {
    if (this.warmUpTimer) {
      clearInterval(this.warmUpTimer)
      this.warmUpTimer = null
    }

    setTimeout(() => {
      this.startWarmUp()
    }, 1000)
  },

  // ============ 轮询任务管理 ============

  registerPolling(taskId, pagePath) {
    if (this.globalData.pollingTasks.has(taskId)) {
      const owner = this.globalData.pollingOwners.get(taskId)
      console.log(`任务 ${taskId} 已在 ${owner} 页面轮询，跳过重复注册`)
      return false
    }

    this.globalData.pollingTasks.add(taskId)
    this.globalData.pollingOwners.set(taskId, pagePath)
    console.log(`任务 ${taskId} 注册轮询：${pagePath}`)
    return true
  },

  unregisterPolling(taskId, pagePath) {
    const owner = this.globalData.pollingOwners.get(taskId)

    if (owner === pagePath) {
      this.globalData.pollingTasks.delete(taskId)
      this.globalData.pollingOwners.delete(taskId)
      console.log(`任务 ${taskId} 注销轮询：${pagePath}`)
    } else {
      console.log(`任务 ${taskId} 不属于 ${pagePath}，无法注销`)
    }
  },

  isPolling(taskId) {
    return this.globalData.pollingTasks.has(taskId)
  },

  clearPagePolling(pagePath) {
    const tasksToRemove = []

    this.globalData.pollingOwners.forEach((owner, taskId) => {
      if (owner === pagePath) {
        tasksToRemove.push(taskId)
      }
    })

    tasksToRemove.forEach(taskId => {
      this.globalData.pollingTasks.delete(taskId)
      this.globalData.pollingOwners.delete(taskId)
    })

    if (tasksToRemove.length > 0) {
      console.log(`清理 ${pagePath} 的 ${tasksToRemove.length} 个轮询任务`)
    }
  }
})