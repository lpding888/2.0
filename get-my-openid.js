// 获取当前用户的 openid
// 用法: 在云开发控制台的云函数调试中运行

const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()

  console.log('='.repeat(50))
  console.log('你的 OPENID 是:')
  console.log(OPENID)
  console.log('='.repeat(50))
  console.log('请复制上面的 OPENID,然后:')
  console.log('1. 在云开发控制台 -> 环境 -> 环境变量')
  console.log('2. 添加新变量: ADMIN_OPENIDS')
  console.log('3. 值设置为: ' + OPENID)
  console.log('4. 重新部署 aimodels 和 user 云函数')
  console.log('='.repeat(50))

  return {
    openid: OPENID,
    instructions: [
      '1. 复制上面显示的 OPENID',
      '2. 在云开发控制台设置环境变量 ADMIN_OPENIDS',
      '3. 重新部署云函数'
    ]
  }
}
