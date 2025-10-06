// 添加支持两种格式的Gemini API模型到数据库
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

const models = [
  {
    model_id: 'gemini-openai-compatible',
    model_name: 'Gemini (OpenAI兼容格式)',
    model_type: 'image',
    api_format: 'openai_compatible',
    api_url: 'https://apis.kuai.host/v1/chat/completions',
    api_key: '{{GEMINI_OPENAI_API_KEY}}', // 使用环境变量格式
    model_config: 'gemini-2.0-flash-thinking-exp-1219',
    status: 'active',
    created_time: new Date(),
    description: 'Gemini API (OpenAI兼容格式)，支持环境变量API密钥配置',
    parameters: {
      max_tokens: 4096,
      temperature: 0.7,
      response_format: 'markdown'
    }
  },
  {
    model_id: 'gemini-google-official',
    model_name: 'Gemini (Google官方格式)',
    model_type: 'image',
    api_format: 'google_official',
    api_url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent',
    api_key: '{{GEMINI_GOOGLE_API_KEY}}', // 使用环境变量格式
    model_config: 'gemini-2.5-flash-image-preview',
    status: 'active',
    created_time: new Date(),
    description: 'Gemini API (Google官方格式)，支持环境变量API密钥配置',
    parameters: {
      temperature: 0.7,
      top_p: 0.8,
      max_output_tokens: 8192
    }
  }
]

async function addModels() {
  try {
    console.log('开始添加Gemini API模型到数据库...')

    for (const model of models) {
      // 检查是否已存在
      const existing = await db.collection('aimodels').where({
        model_id: model.model_id
      }).get()

      if (existing.data.length > 0) {
        console.log(`模型 ${model.model_id} 已存在，更新配置...`)
        await db.collection('aimodels').where({
          model_id: model.model_id
        }).update({
          data: model
        })
      } else {
        console.log(`添加新模型 ${model.model_id}...`)
        await db.collection('aimodels').add({
          data: model
        })
      }
    }

    console.log('所有Gemini API模型已成功配置！')
    console.log('环境变量配置说明：')
    console.log('1. 在微信云开发控制台 > 云函数 > 环境变量中设置：')
    console.log('   - GEMINI_OPENAI_API_KEY: 您的OpenAI兼容格式API密钥')
    console.log('   - GEMINI_GOOGLE_API_KEY: 您的Google官方API密钥')
    console.log('2. 或者在管理后台直接输入API密钥（将覆盖环境变量）')

  } catch (error) {
    console.error('添加模型失败：', error)
  }
}

addModels()