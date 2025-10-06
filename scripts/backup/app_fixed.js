// app.js - 修复版本

App({
  onLaunch: function () {
    console.log('app.js: 小程序启动')
    
    // 初始化云开发环境
    this.initCloudEnvironment()
    
    // 延迟加载用户信息，避免存储API时机问题
    setTimeout(() => {
      this.loadUserInfoFromStorage()
      
      // 如果启动时用户已登录，则立即在后台刷新一次用户信息
      if (this.globalData.userInfo) {
        console.log('app.js: onLaunch - 检测到用户已登录，开始静默刷新用户信息...')
        this.refreshUserInfo()
      }
    }, 100) // 延迟100ms确保小程序完全初始化
  },

  onShow: function() {
    console.log('app.js: 小程序显示')
  },

  globalData: {
    userInfo: null,
    cloudReadyPromise: null, // 用于确保云环境初始化的Promise
    isRefreshingUserInfo: false, // 全局刷新状态控制
    lastRefreshTime: 0 // 上次刷新时间戳
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
      
      // 创建一个 resolved 的 Promise 表示已就绪
      this.globalData.cloudReadyPromise = Promise.resolve(true)
      console.log('app.js: 云开发环境初始化完成，cloudReadyPromise 已创建')
    } catch (error) {
      console.error('app.js: 云开发环境初始化失败', error)
      this.globalData.cloudReadyPromise = Promise.reject(error)
    }
  },

  /**
   * 从本地存储加载用户信息到全局数据
   * 增加错误处理和重试机制
   */
  loadUserInfoFromStorage() {
    try {
      // 使用同步方式，但增加错误处理
      const userInfo = wx.getStorageSync('userInfo')
      if (userInfo) {
        this.globalData.userInfo = userInfo
        console.log('app.js: 从本地存储加载用户信息成功', this.globalData.userInfo)
      } else {
        console.log('app.js: 本地存储中没有用户信息')
      }
    } catch (error) {
      console.error('app.js: 从本地存储加载用户信息失败', error)
      
      // 如果同步方式失败，尝试异步方式
      this.loadUserInfoAsync()
    }
  },

  /**
   * 异步方式加载用户信息（备用方案）
   */
  loadUserInfoAsync() {
    wx.getStorage({
      key: 'userInfo',
      success: (res) => {
        if (res.data) {
          this.globalData.userInfo = res.data
          console.log('app.js: 异步加载用户信息成功', this.globalData.userInfo)
        }
      },
      fail: (error) => {
        console.log('app.js: 异步加载用户信息失败（可能是首次使用）', error)
      }
    })
  },

  /**
   * 设置用户信息，并同步保存到全局 globalData 和本地存储
   * 增加错误处理和重试机制
   */
  setUserInfo(userInfo) {
    this.globalData.userInfo = userInfo
    
    if (userInfo) {
      // 用户登录或信息更新，存入缓存
      this.saveUserInfoToStorage(userInfo)
      console.log('app.js: 用户信息已更新', userInfo)
    } else {
      // 用户退出登录，清除缓存
      this.clearUserInfoFromStorage()
      console.log('app.js: 用户已退出，清除用户信息')
    }
  },

  /**
   * 保存用户信息到本地存储（增强版）
   */
  saveUserInfoToStorage(userInfo) {
    try {
      // 优先使用同步方式
      wx.setStorageSync('userInfo', userInfo)
      console.log('app.js: 用户信息已同步保存到本地存储')
    } catch (error) {
      console.error('app.js: 同步保存用户信息失败，尝试异步方式', error)
      
      // 同步失败时使用异步方式
      wx.setStorage({
        key: 'userInfo',
        data: userInfo,
        success: () => {
          console.log('app.js: 用户信息已异步保存到本地存储')
        },
        fail: (err) => {
          console.error('app.js: 异步保存用户信息也失败', err)
        }
      })
    }
  },

  /**
   * 清除用户信息从本地存储（增强版）
   */
  clearUserInfoFromStorage() {
    try {
      // 优先使用同步方式
      wx.removeStorageSync('userInfo')
      console.log('app.js: 已同步清除本地存储的用户信息')
    } catch (error) {
      console.error('app.js: 同步清除用户信息失败，尝试异步方式', error)
      
      // 同步失败时使用异步方式
      wx.removeStorage({
        key: 'userInfo',
        success: () => {
          console.log('app.js: 已异步清除本地存储的用户信息')
        },
        fail: (err) => {
          console.error('app.js: 异步清除用户信息也失败', err)
        }
      })
    }
  },

  /**
   * 异步从服务器刷新最新的用户信息
   * 修复循环依赖问题
   */
  async refreshUserInfo() {
    // 刷新控制：防止多个页面同时刷新
    const now = Date.now()
    if (this.globalData.isRefreshingUserInfo) {
      console.log('app.js: 刷新正在进行中，跳过重复调用')
      return this.globalData.userInfo
    }
    
    // 时间控制：30秒内不重复刷新
    if (now - this.globalData.lastRefreshTime < 30000) {
      console.log('app.js: 30秒内已刷新过，使用缓存数据')
      return this.globalData.userInfo
    }

    // 必须是在已登录状态下才执行刷新
    if (!this.globalData.userInfo) {
      console.log('app.js: 用户未登录，跳过刷新')
      return null
    }
    
    // 设置刷新状态
    this.globalData.isRefreshingUserInfo = true
    this.globalData.lastRefreshTime = now
    
    try {
      console.log('app.js: 开始从服务器刷新用户信息...')
      
      // 延迟加载api.js，避免循环依赖
      const api = require('./utils/api.js')
      const res = await api.getUserInfo()
      
      if (res.success && res.data && res.data.user_info) {
        // 后端返回的数据是嵌套的,需要提取 user_info 对象
        const userInfo = res.data.user_info
        // 获取成功后，通过统一的入口更新用户信息
        this.setUserInfo(userInfo)
        console.log('app.js: 从服务器刷新用户信息成功', userInfo)
        return userInfo
      } else {
        // 如果获取失败，可能意味着登录状态失效
        console.warn('app.js: 刷新用户信息失败，可能登录已失效', res.message)
        this.setUserInfo(null)
        return null
      }
    } catch (error) {
      console.error('app.js: 调用刷新用户信息接口异常', error)
      // 接口异常也可能意味着需要重新登录
      this.setUserInfo(null)
      return null
    } finally {
      // 无论成功失败，都要重置刷新状态
      this.globalData.isRefreshingUserInfo = false
    }
  }
})