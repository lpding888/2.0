// 调用云函数设置Gemini API模型
const cloud = require('wx-server-sdk')

cloud.init({
  env: 'your-env-id' // 需要替换为实际的环境ID
})

async function setupModels() {
  try {
    console.log('正在配置Gemini API模型...')

    const result = await cloud.callFunction({
      name: 'database-init',
      data: {
        action: 'add_gemini_models'
      }
    })

    console.log('配置结果：', result.result)

    if (result.result.success) {
      console.log('✅ 模型配置成功！')
      console.log('📋 配置的模型：')
      result.result.results.forEach(model => {
        console.log(`  - ${model.model_id}: ${model.action}`)
      })
      console.log('\n🔧 环境变量设置说明：')
      result.result.instructions.environment_variables.forEach(instruction => {
        console.log(`  - ${instruction}`)
      })
      console.log(`\n📍 设置位置: ${result.result.instructions.setup_guide}`)
    } else {
      console.error('❌ 配置失败：', result.result.message)
    }

  } catch (error) {
    console.error('调用云函数失败：', error)
  }
}

// 直接在数据库中插入记录的函数（如果云函数调用失败）
async function directDatabaseSetup() {
  const db = cloud.database()

  const models = [
    {
      model_id: 'gemini-openai-compatible',
      model_name: 'Gemini (OpenAI兼容格式)',
      model_type: 'image',
      api_format: 'openai_compatible',
      api_url: 'https://apis.kuai.host/v1/chat/completions',
      api_key: '{{GEMINI_OPENAI_API_KEY}}',
      model_config: 'gemini-2.0-flash-thinking-exp-1219',
      status: 'active',
      created_time: new Date(),
      description: 'Gemini API (OpenAI兼容格式)，支持环境变量API密钥配置'
    },
    {
      model_id: 'gemini-google-official',
      model_name: 'Gemini (Google官方格式)',
      model_type: 'image',
      api_format: 'google_official',
      api_url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent',
      api_key: '{{GEMINI_GOOGLE_API_KEY}}',
      model_config: 'gemini-2.5-flash-image-preview',
      status: 'active',
      created_time: new Date(),
      description: 'Gemini API (Google官方格式)，支持环境变量API密钥配置'
    }
  ]

  try {
    for (const model of models) {
      const existing = await db.collection('aimodels').where({
        model_id: model.model_id
      }).get()

      if (existing.data.length > 0) {
        await db.collection('aimodels').doc(existing.data[0]._id).update({
          data: model
        })
        console.log(`✅ 更新模型: ${model.model_id}`)
      } else {
        await db.collection('aimodels').add({
          data: model
        })
        console.log(`✅ 添加模型: ${model.model_id}`)
      }
    }

    console.log('🎉 所有模型配置完成！')

  } catch (error) {
    console.error('❌ 直接数据库操作失败：', error)
  }
}

console.log('🚀 开始设置Gemini API模型...')
console.log('选择执行方式：')
console.log('1. 通过云函数设置（推荐）')
console.log('2. 直接数据库操作')

// 这里可以根据需要选择执行方式
setupModels() // 或者调用 directDatabaseSetup()