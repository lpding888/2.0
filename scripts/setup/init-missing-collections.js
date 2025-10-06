// 初始化缺失的数据库集合
const cloud = require('wx-server-sdk')

// 初始化云开发环境
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

/**
 * 初始化缺失的数据库集合
 */
async function initMissingCollections() {
  console.log('开始初始化缺失的数据库集合...')

  try {
    // 初始化信用记录集合
    await initCreditRecordsCollection()

    // 初始化订单集合
    await initOrdersCollection()

    // 初始化签到记录集合
    await initDailyCheckinsCollection()

    console.log('缺失集合初始化完成')
    return {
      success: true,
      message: '缺失集合初始化成功'
    }
  } catch (error) {
    console.error('缺失集合初始化失败:', error)
    return {
      success: false,
      message: '缺失集合初始化失败: ' + error.message
    }
  }
}

/**
 * 初始化信用记录集合
 */
async function initCreditRecordsCollection() {
  console.log('初始化credit_records集合...')

  try {
    const result = await db.collection('credit_records').limit(1).get()
    console.log('credit_records集合已存在')
  } catch (error) {
    console.log('创建credit_records集合...')
    // 创建一个示例记录来初始化集合结构
    const sampleRecord = {
      user_openid: 'sample_openid',
      type: 'sample',
      amount: 0,
      balance: 0,
      description: 'Sample record for collection initialization',
      created_at: new Date(),
      _sample: true // 标记为示例数据
    }

    try {
      await db.collection('credit_records').add({
        data: sampleRecord
      })
      console.log('credit_records集合创建成功')

      // 删除示例记录
      await db.collection('credit_records').where({
        _sample: true
      }).remove()
      console.log('示例记录已清理')
    } catch (addError) {
      console.log('credit_records集合将在首次使用时自动创建')
    }
  }
}

/**
 * 初始化订单集合
 */
async function initOrdersCollection() {
  console.log('初始化orders集合...')

  try {
    const result = await db.collection('orders').limit(1).get()
    console.log('orders集合已存在')
  } catch (error) {
    console.log('创建orders集合...')
    // 创建一个示例记录来初始化集合结构
    const sampleOrder = {
      user_openid: 'sample_openid',
      package_id: 'sample_package',
      amount: 0,
      credits: 0,
      status: 'sample',
      payment_method: 'wechat',
      created_at: new Date(),
      _sample: true // 标记为示例数据
    }

    try {
      await db.collection('orders').add({
        data: sampleOrder
      })
      console.log('orders集合创建成功')

      // 删除示例记录
      await db.collection('orders').where({
        _sample: true
      }).remove()
      console.log('示例记录已清理')
    } catch (addError) {
      console.log('orders集合将在首次使用时自动创建')
    }
  }
}

/**
 * 初始化签到记录集合
 */
async function initDailyCheckinsCollection() {
  console.log('初始化daily_checkins集合...')

  try {
    const result = await db.collection('daily_checkins').limit(1).get()
    console.log('daily_checkins集合已存在')
  } catch (error) {
    console.log('创建daily_checkins集合...')
    // 创建一个示例记录来初始化集合结构
    const sampleCheckin = {
      user_openid: 'sample_openid',
      date: new Date().toISOString().split('T')[0],
      credits_earned: 0,
      created_at: new Date(),
      _sample: true // 标记为示例数据
    }

    try {
      await db.collection('daily_checkins').add({
        data: sampleCheckin
      })
      console.log('daily_checkins集合创建成功')

      // 删除示例记录
      await db.collection('daily_checkins').where({
        _sample: true
      }).remove()
      console.log('示例记录已清理')
    } catch (addError) {
      console.log('daily_checkins集合将在首次使用时自动创建')
    }
  }
}

// 导出初始化函数
module.exports = {
  initMissingCollections
}

// 如果直接运行此脚本
if (require.main === module) {
  initMissingCollections().then(result => {
    console.log('初始化结果:', result)
    process.exit(result.success ? 0 : 1)
  })
}