// AI摄影师小程序 - 数据库初始化脚本
// 清理版本：移除模拟数据，仅保留数据结构

const cloud = require('wx-server-sdk')

// 初始化云开发环境
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

/**
 * 数据库初始化主函数
 */
async function initDatabase() {
  console.log('开始初始化数据库...')
  
  try {
    // 初始化各个集合（仅创建结构，不添加数据）
    await initUsersCollection()
    await initScenesCollection()
    await initPromptTemplatesCollection()
    await initAIModelsCollection()
    await initWorksCollection()
    await initAdminUsersCollection()
    await initPackagesCollection()

    // 添加初始数据
    await addInitialPromptTemplates()
    
    console.log('数据库初始化完成')
    return {
      success: true,
      message: '数据库初始化成功'
    }
  } catch (error) {
    console.error('数据库初始化失败:', error)
    return {
      success: false,
      message: '数据库初始化失败: ' + error.message
    }
  }
}

/**
 * 初始化用户集合
 */
async function initUsersCollection() {
  console.log('初始化users集合...')
  
  // 检查集合是否存在
  try {
    const result = await db.collection('users').limit(1).get()
    console.log('users集合已存在')
  } catch (error) {
    console.log('users集合将在首次使用时自动创建')
  }
}

/**
 * 初始化场景集合
 */
async function initScenesCollection() {
  console.log('初始化scenes集合...')
  
  // 检查集合是否存在
  try {
    const result = await db.collection('scenes').limit(1).get()
    console.log('scenes集合已存在')
  } catch (error) {
    console.log('scenes集合将在首次使用时自动创建')
  }
}

/**
 * 初始化提示词模板集合
 */
async function initPromptTemplatesCollection() {
  console.log('初始化prompt_templates集合...')
  
  // 检查集合是否存在
  try {
    const result = await db.collection('prompt_templates').limit(1).get()
    console.log('prompt_templates集合已存在')
  } catch (error) {
    console.log('prompt_templates集合将在首次使用时自动创建')
  }
}

/**
 * 初始化AI模型集合
 */
async function initAIModelsCollection() {
  console.log('初始化api_configs集合...')
  
  // 检查集合是否存在
  try {
    const result = await db.collection('api_configs').limit(1).get()
    console.log('api_configs集合已存在')
  } catch (error) {
    console.log('api_configs集合将在首次使用时自动创建')
  }
}

/**
 * 初始化作品集合
 */
async function initWorksCollection() {
  console.log('初始化works集合...')
  
  // 检查集合是否存在
  try {
    const result = await db.collection('works').limit(1).get()
    console.log('works集合已存在')
  } catch (error) {
    console.log('works集合将在首次使用时自动创建')
  }
}

/**
 * 初始化管理员用户集合
 */
async function initAdminUsersCollection() {
  console.log('初始化admin_users集合...')
  
  // 检查集合是否存在
  try {
    const result = await db.collection('admin_users').limit(1).get()
    console.log('admin_users集合已存在')
  } catch (error) {
    console.log('admin_users集合将在首次使用时自动创建')
  }
  
  console.log('注意：部署后请手动在admin_users集合中添加管理员openid')
}

/**
 * 初始化充值套餐集合
 */
async function initPackagesCollection() {
  console.log('初始化packages集合...')

  // 检查集合是否存在
  try {
    const result = await db.collection('packages').limit(1).get()
    console.log('packages集合已存在')
  } catch (error) {
    console.log('packages集合将在首次使用时自动创建')
  }
}

/**
 * 添加初始提示词模板数据
 */
async function addInitialPromptTemplates() {
  console.log('添加初始提示词模板数据...')

  try {
    // 导入姿势裂变模板添加函数
    const { addPosePromptTemplates } = require('./add-pose-prompt-templates')

    // 添加姿势裂变模板
    const result = await addPosePromptTemplates()

    if (result.success) {
      console.log(`✅ ${result.message}`)
    } else {
      console.log(`⚠️ ${result.message}`)
    }

  } catch (error) {
    console.log('⚠️ 添加姿势裂变模板失败:', error.message)
  }
}

// 导出初始化函数
module.exports = {
  initDatabase
}

// 如果直接运行此脚本
if (require.main === module) {
  initDatabase().then(result => {
    console.log('初始化结果:', result)
    process.exit(result.success ? 0 : 1)
  })
}