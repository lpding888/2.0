// 创建管理员用户脚本
const cloud = require('wx-server-sdk')

cloud.init({
  env: 'cloudbase-0gu1afji26f514d2'
})

const db = cloud.database()

async function setupAdminUser() {
  try {
    console.log('开始创建管理员用户...')

    // 创建admin_users集合（如果不存在）
    const collections = await db.listCollections()
    const hasAdminUsers = collections.data.some(col => col.name === 'admin_users')

    if (!hasAdminUsers) {
      console.log('创建admin_users集合...')
      await db.createCollection('admin_users')
    }

    // 添加默认管理员用户
    // 注意：您需要先获取您的openid并替换下面的YOUR_OPENID
    const defaultAdmin = {
      _openid: 'YOUR_OPENID', // 替换为您的真实openid
      username: 'super_admin',
      role: 'super_admin',
      permissions: [
        'manage_models',
        'manage_prompts',
        'manage_scenes',
        'view_users',
        'manage_works'
      ],
      created_time: new Date(),
      updated_time: new Date(),
      is_active: true,
      last_login: null
    }

    // 检查是否已存在管理员
    const existingAdmin = await db.collection('admin_users')
      .where({
        _openid: defaultAdmin._openid
      })
      .get()

    if (existingAdmin.data.length > 0) {
      console.log('管理员用户已存在，更新信息...')
      await db.collection('admin_users')
        .doc(existingAdmin.data[0]._id)
        .update({
          data: {
            ...defaultAdmin,
            updated_time: new Date()
          }
        })
    } else {
      console.log('添加新管理员用户...')
      await db.collection('admin_users').add({
        data: defaultAdmin
      })
    }

    console.log('✅ 管理员用户设置完成！')
    console.log('')
    console.log('📝 后续步骤：')
    console.log('1. 获取您的openid（在小程序中调用wx.cloud.callFunction({name: "user", data: {action: "getOpenid"}})）')
    console.log('2. 修改上面的YOUR_OPENID为您的真实openid')
    console.log('3. 重新运行此脚本')
    console.log('4. 在数据库控制台中确认管理员记录已正确创建')

  } catch (error) {
    console.error('❌ 设置管理员用户失败:', error)
  }
}

// 获取当前用户openid的函数
async function getCurrentOpenid() {
  try {
    const result = await cloud.callFunction({
      name: 'user',
      data: {
        action: 'getOpenid'
      }
    })

    if (result.result && result.result.openid) {
      console.log('🔑 您的openid是:', result.result.openid)
      console.log('请将此openid复制到上面的defaultAdmin._openid字段中')
    }
  } catch (error) {
    console.log('获取openid失败，请在小程序中手动获取')
  }
}

// 执行脚本
console.log('🚀 AI摄影师小程序 - 管理员设置脚本')
console.log('')

setupAdminUser()
getCurrentOpenid()