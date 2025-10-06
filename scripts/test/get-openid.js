// 获取openid的临时脚本
// 在小程序任意页面的onLoad函数中调用

// 方法1：直接调用auth云函数
wx.cloud.callFunction({
  name: 'auth',
  data: {
    action: 'getAdminInfo'
  },
  success: res => {
    console.log('当前用户openid:', res.result.openid || '从wxContext获取')
    
    // 如果出现权限错误，说明您还不是管理员，但可以从错误信息中看到openid
    const wxContext = wx.cloud.getWXContext()
    console.log('您的openid是:', wxContext.OPENID)
  },
  fail: err => {
    console.error('获取失败:', err)
  }
})

// 方法2：创建临时云函数获取
// 在cloudfunctions目录下创建临时云函数get-openid/index.js:
/*
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  console.log('您的openid是:', OPENID)
  return {
    success: true,
    openid: OPENID,
    message: '获取openid成功'
  }
}
*/

// 方法3：在控制台查看users集合
// 1. 先正常登录小程序
// 2. 在云开发控制台 -> 数据库 -> users集合中查看
// 3. 找到您的用户记录，复制openid字段