// app.js

App({
  onLaunch: function () {
    // 初始化云开发环境
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        env: 'cloudbase-0gu1afji26f514d2',
        traceUser: true,
      });
      // **关键步骤**：初始化完成后，创建一个 resolved 的 Promise 表示已就绪
      this.globalData.cloudReadyPromise = Promise.resolve(true);
      console.log('app.js: 云开发环境初始化完成，cloudReadyPromise 已创建');
    }

    // 尝试从本地存储加载用户信息, 这是为了实现持久化登录
    this.loadUserInfoFromStorage();
    
    // **新增逻辑**: 如果启动时用户已登录，则立即在后台刷新一次用户信息，确保数据同步
    if (this.globalData.userInfo) {
      console.log('app.js: onLaunch - 检测到用户已登录，开始静默刷新用户信息...');
      this.refreshUserInfo();
    }
  },

  globalData: {
    userInfo: null,
    cloudReadyPromise: null, // 用于确保云环境初始化的Promise
    isRefreshingUserInfo: false, // 全局刷新状态控制
    lastRefreshTime: 0 // 上次刷新时间戳
  },

  /**
   * 从本地存储加载用户信息到全局数据
   * 这是小程序启动时执行的，确保用户打开小程序时能恢复上次的登录状态
   */
  loadUserInfoFromStorage() {
    try {
      const userInfo = wx.getStorageSync('userInfo');
      if (userInfo) {
        this.globalData.userInfo = userInfo;
        console.log('app.js: 从本地存储加载用户信息成功', this.globalData.userInfo);
      }
    } catch (e) {
      console.error('app.js: 从本地存储加载用户信息失败', e);
    }
  },

  /**
   * 设置用户信息，并同步保存到全局 globalData 和本地存储
   * 这是全局管理用户信息的唯一入口，确保数据一致性
   * @param {object | null} userInfo - 用户信息对象。如果为 null，则表示退出登录。
   */
  setUserInfo(userInfo) {
    this.globalData.userInfo = userInfo;
    if (userInfo) {
      // 用户登录或信息更新，存入缓存
      wx.setStorageSync('userInfo', userInfo);
      console.log('app.js: 用户信息已更新并存入本地存储', userInfo);
    } else {
      // 用户退出登录，清除缓存
      wx.removeStorageSync('userInfo');
      console.log('app.js: 用户已退出，清除本地存储的用户信息');
    }
  },

  /**
   * 异步从服务器刷新最新的用户信息
   * 这个函数可以被任何页面调用，以确保获取到的是最新数据（如积分）
   * @returns {Promise<object|null>} 返回最新的用户信息或null
   */
  async refreshUserInfo() {
    // **刷新控制**：防止多个页面同时刷新
    const now = Date.now();
    if (this.globalData.isRefreshingUserInfo) {
      console.log('app.js: 刷新正在进行中，跳过重复调用');
      return this.globalData.userInfo;
    }
    
    // **时间控制**：30秒内不重复刷新
    if (now - this.globalData.lastRefreshTime < 30000) {
      console.log('app.js: 30秒内已刷新过，使用缓存数据');
      return this.globalData.userInfo;
    }

    // **关键修复**：延迟加载api.js，避免循环依赖和加载时序问题
    const api = require('./utils/api.js');

    // 必须是在已登录状态下才执行刷新
    if (!this.globalData.userInfo) {
      console.log('app.js: 用户未登录，跳过刷新');
      return null;
    }
    
    // 设置刷新状态
    this.globalData.isRefreshingUserInfo = true;
    this.globalData.lastRefreshTime = now;
    
    try {
      console.log('app.js: 开始从服务器刷新用户信息...');
      const res = await api.getUserInfo();
      if (res.success && res.data && res.data.user_info) {
        // **关键修正**: 后端返回的数据是嵌套的,需要提取 user_info 对象
        const userInfo = res.data.user_info;
        // 获取成功后，通过统一的入口更新用户信息
        this.setUserInfo(userInfo);
        console.log('app.js: 从服务器刷新用户信息成功', userInfo);
        return userInfo;
      } else {
        // 如果获取失败，可能意味着登录状态失效（如token过期）
        // 在这种情况下，稳妥起见，清除本地登录状态
        console.warn('app.js: 刷新用户信息失败，可能登录已失效', res.message);
        this.setUserInfo(null);
        return null;
      }
    } catch (error) {
      console.error('app.js: 调用刷新用户信息接口异常', error);
      // 同样，接口异常也可能意味着需要重新登录
      this.setUserInfo(null);
      return null;
    } finally {
      // 无论成功失败，都要重置刷新状态
      this.globalData.isRefreshingUserInfo = false;
    }
  }
})