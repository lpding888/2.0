// 快速添加AI模型配置脚本
const cloud = require('wx-server-sdk')

// 初始化云开发环境
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

async function addSimpleModel() {
  try {
    console.log('➕ 开始添加AI模型配置...')

    // 检查是否已有模型
    const existingModels = await db.collection('api_configs')
      .where({ is_active: true })
      .get()

    if (existingModels.data.length > 0) {
      console.log('✅ 数据库中已有启用模型:')
      existingModels.data.forEach(model => {
        console.log(`  - ${model.name} (${model.provider}) - ${model.is_active ? '启用' : '禁用'}`)
      })
      return
    }

    // 添加一个简单的模型配置
    const modelData = {
      name: "默认AI模型",
      provider: "mock",
      model_type: "text-to-image",
      capabilities: ["text-to-image"],
      api_config: {
        endpoint: "https://api.example.com/v1/generate",
        headers: {
          "Content-Type": "application/json"
        }
      },
      parameters: {
        default: {
          width: 1024,
          height: 1024,
          count: 1
        }
      },
      is_active: true,
      priority: 5,
      weight: 5,
      created_at: new Date(),
      updated_at: new Date()
    }

    const result = await db.collection('api_configs').add({
      data: modelData
    })

    console.log('✅ AI模型添加成功!')
    console.log('📊 模型ID:', result._id)
    console.log('📋 模型信息:')
    console.log('   - 名称:', modelData.name)
    console.log('   - 提供商:', modelData.provider)
    console.log('   - 类型:', modelData.model_type)
    console.log('   - 状态:', modelData.is_active ? '启用' : '禁用')

  } catch (error) {
    console.error('❌ 添加模型失败:', error)
  }
}

// 运行添加函数
addSimpleModel()