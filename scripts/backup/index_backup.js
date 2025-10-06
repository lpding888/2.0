// 简化版AI模型云函数 - 直接传递
const cloud = require('wx-server-sdk')
const axios = require('axios')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { action } = event
  
  try {
    console.log('AI模型调用:', action)
    
    switch (action) {
      case 'listModels':
        return await listModels(event)
      case 'getModel':
        return await getModel(event)
      case 'addModel':
        return await addModel(event)
      case 'updateModel':
        return await updateModel(event)
      case 'deleteModel':
        return await deleteModel(event)
      case 'toggleModelStatus':
        return await toggleModelStatus(event)
      case 'selectBestModel':
        return await selectBestModel(event)
      case 'callAIModel':
        return await callAIModel(event)
      case 'callAIModelAsync':
        return await callAIModelAsync(event)
      case 'checkAdminPermission':
        return await checkAdminPermissionAPI(event)
      default:
        return {
          success: false,
          message: '未知操作类型'
        }
    }
  } catch (error) {
    console.error('AI模型函数执行错误:', error)
    return {
      success: false,
      message: error.message || '服务器内部错误'
    }
  }
}

/**
 * 获取可用AI模型列表
 */
async function listModels(event) {
  try {
    const { model_type, provider, status } = event

    let query = {}

    if (model_type) {
      query.type = model_type
    }

    if (provider) {
      query.provider = provider
    }

    if (status !== undefined) {
      query.status = status
    }
    
    const result = await db.collection('api_configs')
      .where(query)
      .orderBy('priority', 'desc')
      .orderBy('weight', 'desc')
      .get()
    
    return {
      success: true,
      data: result.data,
      message: '获取AI模型列表成功'
    }
    
  } catch (error) {
    console.error('获取AI模型列表失败:', error)
    return {
      success: false,
      message: '获取AI模型列表失败'
    }
  }
}

/**
 * 获取单个AI模型详情
 */
async function getModel(event) {
  try {
    const { model_id } = event
    
    if (!model_id) {
      return {
        success: false,
        message: '模型ID不能为空'
      }
    }
    
    const result = await db.collection('api_configs')
      .doc(model_id)
      .get()
    
    if (!result.data) {
      return {
        success: false,
        message: '模型不存在'
      }
    }
    
    return {
      success: true,
      data: result.data,
      message: '获取模型详情成功'
    }
    
  } catch (error) {
    console.error('获取模型详情失败:', error)
    return {
      success: false,
      message: '获取模型详情失败'
    }
  }
}

/**
 * 添加新AI模型
 */
async function addModel(event) {
  try {
    const { model_data } = event

    if (!model_data) {
      return {
        success: false,
        message: '模型数据不能为空'
      }
    }

    // 验证必需字段
    const requiredFields = ['name', 'provider', 'model_type', 'api_format', 'api_url', 'api_key']
    for (const field of requiredFields) {
      if (!model_data[field]) {
        return {
          success: false,
          message: `缺少必需字段: ${field}`
        }
      }
    }

    const newModel = {
      name: model_data.name,
      provider: model_data.provider,
      model_type: model_data.model_type,
      api_format: model_data.api_format || 'google_official',
      api_url: model_data.api_url,
      api_key: model_data.api_key,
      model_name: model_data.model_name || model_data.name,
      capabilities: model_data.capabilities || ['text-to-image'],
      status: 'active',
      is_active: true,
      priority: model_data.priority || 5,
      weight: model_data.weight || 5,
      cost_per_request: model_data.cost_per_request || 0.01,
      max_requests_per_minute: model_data.max_requests_per_minute || 60,
      timeout: model_data.timeout || 60000,
      parameters: model_data.parameters || {
        default: {
          width: 1024,
          height: 1024,
          quality: 'standard'
        }
      },
      headers: model_data.headers || {},
      created_at: new Date(),
      updated_at: new Date()
    }

    const result = await db.collection('api_configs').add({
      data: newModel
    })

    return {
      success: true,
      data: { model_id: result._id, model: newModel },
      message: 'AI模型添加成功'
    }

  } catch (error) {
    console.error('添加AI模型失败:', error)
    return {
      success: false,
      message: '添加AI模型失败: ' + error.message
    }
  }
}

/**
 * 更新AI模型配置
 */
async function updateModel(event) {
  try {
    const { model_id, updates } = event
    
    if (!model_id || !updates) {
      return {
        success: false,
        message: '参数不完整'
      }
    }
    
    const updateData = {
      ...updates,
      updated_at: new Date()
    }
    
    const result = await db.collection('api_configs')
      .doc(model_id)
      .update({
        data: updateData
      })
    
    return {
      success: true,
      data: result,
      message: 'AI模型更新成功'
    }
    
  } catch (error) {
    console.error('更新AI模型失败:', error)
    return {
      success: false,
      message: '更新AI模型失败'
    }
  }
}

/**
 * 删除AI模型
 */
async function deleteModel(event) {
  try {
    const { model_id } = event
    
    if (!model_id) {
      return {
        success: false,
        message: '模型ID不能为空'
      }
    }
    
    const result = await db.collection('api_configs')
      .doc(model_id)
      .remove()
    
    return {
      success: true,
      data: result,
      message: 'AI模型删除成功'
    }
    
  } catch (error) {
    console.error('删除AI模型失败:', error)
    return {
      success: false,
      message: '删除AI模型失败'
    }
  }
}

/**
 * 切换模型启用状态
 */
async function toggleModelStatus(event) {
  try {
    const { model_id, is_active } = event
    
    if (!model_id || is_active === undefined) {
      return {
        success: false,
        message: '参数不完整'
      }
    }
    
    const result = await db.collection('api_configs')
      .doc(model_id)
      .update({
        data: {
          is_active: is_active,
          updated_at: new Date()
        }
      })
    
    return {
      success: true,
      data: result,
      message: `模型已${is_active ? '启用' : '禁用'}`
    }
    
  } catch (error) {
    console.error('切换模型状态失败:', error)
    return {
      success: false,
      message: '切换模型状态失败'
    }
  }
}

/**
 * 简化的模型选择：直接返回第一个启用的模型
 */
async function selectBestModel(event) {
  try {
    const { model_type } = event
    
    if (!model_type) {
      return {
        success: false,
        message: '模型类型不能为空'
      }
    }
    
    // 获取所有启用的模型
    const result = await db.collection('api_configs')
      .where({ status: "active" })
      .orderBy('priority', 'desc')
      .get()
    
    if (result.data.length === 0) {
      return {
        success: false,
        message: '没有可用的模型'
      }
    }
    
    // 直接返回第一个启用的模型
    const selectedModel = result.data[0]
    
    return {
      success: true,
      data: {
        selected_model: selectedModel,
        available_count: result.data.length
      },
      message: '模型选择成功'
    }
    
  } catch (error) {
    console.error('选择模型失败:', error)
    return {
      success: false,
      message: '选择模型失败'
    }
  }
}

/**
 * 简化的AI模型调用：直接调用第一个API
 */
async function callAIModel(event) {
  try {
    const { model_id, prompt, parameters = {}, images = [] } = event
    
    if (!prompt) {
      return {
        success: false,
        message: '提示词不能为空'
      }
    }
    
    console.log('开始AI模型调用')
    
    // 获取所有启用的模型
    const modelResult = await db.collection('api_configs')
      .where({ status: "active" })
      .orderBy('priority', 'desc')
      .get()
    
    if (modelResult.data.length === 0) {
      return {
        success: false,
        message: '没有可用的AI模型'
      }
    }
    
    // 直接使用第一个可用模型
    const model = modelResult.data[0]
    const params = prepareAPIParams(model, prompt, parameters, images)
    const result = await callExternalAI(model, params)
    
    return result
    
  } catch (error) {
    console.error('AI模型调用失败:', error)
    return {
      success: false,
      message: 'AI模型调用失败: ' + error.message,
      error_details: {
        action: 'callAIModel',
        error: error.message
      }
    }
  }
}



/**
 * 检查管理员权限API接口
 */
async function checkAdminPermissionAPI(event = {}) {
  try {
    // 优先使用传入的userOpenid，如果没有则使用当前云函数的WXContext
    let targetOpenid = event.userOpenid
    if (!targetOpenid) {
      const { OPENID } = cloud.getWXContext()
      targetOpenid = OPENID
    }

    if (!targetOpenid) {
      return {
        success: false,
        data: { isAdmin: false },
        message: '用户未登录'
      }
    }

    console.log('检查管理员权限，目标用户OPENID:', targetOpenid, '来源:', event.userOpenid ? 'API传递' : 'WXContext')

    // 增强的管理员权限查询 - 同时支持 _openid 和 openid 字段
    const adminResult = await db.collection('admin_users')
      .where({
        $or: [
          { _openid: targetOpenid, is_active: true },
          { openid: targetOpenid, is_active: true }
        ]
      })
      .get()

    console.log('管理员查询结果:', {
      found: adminResult.data.length > 0,
      count: adminResult.data.length,
      data: adminResult.data.map(admin => ({
        id: admin._id,
        _openid: admin._openid,
        openid: admin.openid,
        is_active: admin.is_active,
        role: admin.role || 'admin'
      }))
    })

    const isAdmin = adminResult.data && adminResult.data.length > 0

    return {
      success: true,
      data: {
        isAdmin: isAdmin,
        userId: targetOpenid,
        adminInfo: isAdmin ? adminResult.data[0] : null
      },
      message: isAdmin ? '管理员权限验证通过' : '非管理员用户'
    }

  } catch (error) {
    console.error('检查管理员权限失败:', error)
    return {
      success: false,
      data: { isAdmin: false },
      message: '权限检查失败: ' + error.message
    }
  }
}



/**
 * 准备API调用参数
 */
function prepareAPIParams(model, prompt, parameters, images = []) {
  return {
    prompt: String(prompt || ''),
    images: Array.isArray(images) ? images : [],
    ...(parameters || {})
  }
}











/**
 * 解析API密钥，支持环境变量
 */
function parseApiKey(apiKey) {
  // 如果是环境变量格式 {{VAR_NAME}}
  if (apiKey && apiKey.startsWith('{{') && apiKey.endsWith('}}')) {
    const envVar = apiKey.slice(2, -2)
    const envValue = process.env[envVar]
    if (envValue) {
      console.log(`使用环境变量 ${envVar}`)
      return envValue
    } else {
      console.warn(`环境变量 ${envVar} 未设置`)
      return null
    }
  }
  return apiKey
}

/**
 * 调用外部AI服务
 */
async function callExternalAI(model, params) {
  try {
    console.log(`调用${model.provider}模型: ${model.model_name || model.name}`)
    console.log(`API格式: ${model.api_format}`)
    console.log('完整模型信息:', JSON.stringify(model, null, 2))

    // 解析API密钥
    console.log('🔑 检查API密钥:', model.api_key)
    const apiKey = parseApiKey(model.api_key)
    if (!apiKey) {
      console.error('❌ API密钥解析失败！')
      console.error('模型配置的API密钥:', model.api_key)
      console.error('如果是环境变量格式，请检查云函数环境变量设置')
      return {
        success: false,
        message: `API密钥未配置或环境变量未设置: ${model.api_key}`,
        error_details: {
          reason: 'api_key_missing',
          configured_key: model.api_key,
          model: model.name,
          provider: model.provider
        }
      }
    }
    console.log('✅ API密钥解析成功')

    // 检查是否是模拟模式（用于测试）
    if (process.env.MOCK_MODE === 'true' || params.mock_mode) {
      console.log('⚠️ 警告：使用模拟模式生成图片，这不是真实的AI结果！')
      return {
        success: false,
        message: '模拟模式已禁用，请配置真实的API密钥',
        error_details: {
          reason: 'mock_mode_disabled',
          model: model.name,
          provider: model.provider
        }
      }
    }

    // OpenAI兼容格式的Gemini API
    if (model.api_format === 'openai_compatible') {
      return await callGeminiOpenAICompatible({ ...model, api_key: apiKey }, params)
    }

    // Google官方格式的Gemini API
    if (model.api_format === 'google_official') {
      return await callGoogleGeminiAPI({ ...model, api_key: apiKey }, params)
    }

    // 不支持的API格式，直接返回错误
    console.error('❌ 不支持的API格式:', model.api_format)
    return {
      success: false,
      message: `不支持的API格式: ${model.api_format}，请检查模型配置`,
      error_details: {
        reason: 'unsupported_api_format',
        api_format: model.api_format,
        provider: model.provider,
        model: model.name
      }
    }

  } catch (error) {
    console.error('AI模型调用失败:', error)
    return {
      success: false,
      message: 'AI模型调用失败: ' + error.message,
      error_details: {
        provider: model ? model.provider : 'unknown',
        model: model ? model.name : 'unknown',
        error: error.message
      }
    }
  }
}

/**
 * 调用Gemini API（OpenAI兼容格式）
 */
async function callGeminiOpenAICompatible(model, params) {
  const startTime = Date.now()

  try {
    console.log('开始调用Gemini OpenAI兼容API')

    // 构建content数组，包含文本和图片
    const content = [
      {
        type: 'text',
        text: params.prompt
      }
    ]

    // 如果有参考图片，添加到content中
    if (params.reference_images && params.reference_images.length > 0) {
      console.log('为OpenAI兼容API处理参考图片，数量:', params.reference_images.length)

      params.reference_images.forEach((imageData, index) => {
        try {
          let imageUrl

          // 检查图片数据格式
          if (typeof imageData === 'object' && imageData.url) {
            // 新格式：从photography-worker传递的对象，包含完整的data URL
            imageUrl = imageData.url
            console.log(`📷 使用预处理的data URL图片 ${index+1}`)
          } else if (typeof imageData === 'string' && imageData.startsWith('data:image/')) {
            // data URL格式
            imageUrl = imageData
            console.log(`📷 使用data URL格式图片 ${index+1}`)
          } else if (typeof imageData === 'string') {
            // 传统URL格式
            imageUrl = imageData
            console.log(`📷 使用远程URL图片 ${index+1}`)
          } else {
            console.warn(`❌ 跳过不支持的图片数据格式 ${index+1}: ${typeof imageData}`)
            return
          }

          if (imageUrl && imageUrl.trim()) {
            content.push({
              type: 'image_url',
              image_url: {
                url: imageUrl
              }
            })
            console.log(`✅ 成功添加第${index+1}张图片到OpenAI API请求`)
          }
        } catch (error) {
          console.error(`❌ 处理第${index+1}张图片失败:`, error.message)
        }
      })

      console.log(`📊 OpenAI API图片处理完成，成功添加 ${content.length - 1} 张图片`)
    }

    // 构建请求数据
    const requestData = {
      model: 'gemini-2.5-flash-image',
      stream: false,
      messages: [
        {
          role: 'user',
          content: content
        }
      ]
    }

    console.log('Gemini OpenAI兼容API请求数据:', JSON.stringify(requestData, null, 2))

    // 调用API
    const response = await axios({
      method: 'POST',
      url: model.api_url || 'https://apis.kuai.host/v1/chat/completions',
      headers: {
        'Authorization': `Bearer ${model.api_key}`,
        'Content-Type': 'application/json'
      },
      data: requestData,
      timeout: 60000
    })

    const generationTime = Date.now() - startTime

    console.log('Gemini OpenAI兼容API响应状态:', response.status)
    console.log('Gemini OpenAI兼容API响应数据:', JSON.stringify(response.data, null, 2))

    // 处理响应
    if (response.data && response.data.choices && response.data.choices.length > 0) {
      const content = response.data.choices[0].message.content

      // 解析返回的内容，提取图片URL
      const images = parseOpenAICompatibleResponse(content)

      return {
        success: true,
        data: {
          images: images,
          model_used: model.name || 'Gemini 2.5 Flash Image',
          generation_time: generationTime,
          cost: calculateCost(response.data.usage),
          raw_content: content
        },
        message: 'AI图片生成成功'
      }
    } else {
      throw new Error('API返回数据格式异常')
    }

  } catch (error) {
    console.error('Gemini OpenAI兼容API调用失败:', error)

    let errorMessage = error.message
    let errorDetails = {
      model: model.name,
      provider: model.provider,
      endpoint: model.endpoint
    }

    // 详细错误信息处理
    if (error.response) {
      errorDetails.status = error.response.status
      errorDetails.statusText = error.response.statusText
      errorDetails.error = error.response.data

      if (error.response.status === 503) {
        errorMessage = 'AI服务暂时不可用，请稍后重试'
      } else if (error.response.status === 401) {
        errorMessage = 'API密钥无效，请检查配置'
      } else if (error.response.status === 429) {
        errorMessage = 'API调用频率限制，请稍后重试'
      }
    }

    return {
      success: false,
      message: `Gemini OpenAI兼容API调用失败: ${errorMessage}`,
      error_details: errorDetails
    }
  }
}

/**
 * 调用Google官方Gemini API
 */
async function callGoogleGeminiAPI(model, params) {
  const startTime = Date.now()

  try {
    console.log('开始调用Google官方Gemini API')

    // 构建parts数组，包含文本和图片
    const parts = [
      {
        text: params.prompt
      }
    ]

    // 如果有参考图片，添加到parts中
    if (params.reference_images && params.reference_images.length > 0) {
      console.log('检测到参考图片，数量:', params.reference_images.length)

      for (let i = 0; i < params.reference_images.length; i++) {
        const imageData = params.reference_images[i]
        try {
          let base64Data, mimeType

          // 检查图片数据格式
          if (typeof imageData === 'object' && imageData.base64) {
            // 新格式：从photography-worker传递的base64对象
            base64Data = imageData.base64
            mimeType = imageData.mimeType || 'image/jpeg'
            console.log(`📷 使用预处理的base64图片 ${i+1}，大小: ${base64Data.length} 字符, MIME: ${mimeType}`)
          } else if (typeof imageData === 'string' && imageData.startsWith('data:image/')) {
            // data URL格式
            const matches = imageData.match(/^data:image\/([^;]+);base64,(.+)$/)
            if (matches) {
              mimeType = `image/${matches[1]}`
              base64Data = matches[2]
              console.log(`📷 解析data URL格式图片 ${i+1}，MIME: ${mimeType}`)
            } else {
              throw new Error('data URL格式错误')
            }
          } else if (typeof imageData === 'string') {
            // 旧格式：需要下载的URL
            console.log(`📷 下载远程图片 ${i+1}: ${imageData.substring(0, 100)}...`)
            const imageResponse = await axios({
              method: 'GET',
              url: imageData,
              responseType: 'arraybuffer',
              timeout: 30000,
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
              }
            })

            base64Data = Buffer.from(imageResponse.data, 'binary').toString('base64')
            mimeType = imageResponse.headers['content-type'] || 'image/jpeg'
            console.log(`📷 成功下载并转换图片 ${i+1}，大小: ${base64Data.length} 字符`)
          } else {
            throw new Error(`不支持的图片数据格式: ${typeof imageData}`)
          }

          // 添加到parts
          parts.push({
            inline_data: {
              mime_type: mimeType,
              data: base64Data
            }
          })

          console.log(`✅ 成功添加第${i+1}张图片到API请求`)
        } catch (error) {
          console.error(`❌ 处理第${i+1}张图片失败:`, error.message)
          // 继续处理其他图片，不因为单张图片失败而中断
        }
      }

      console.log(`📊 图片处理完成，成功添加 ${parts.length - 1} 张图片到API请求`)
    }

    // 构建请求数据
    const requestData = {
      contents: [
        {
          parts: parts
        }
      ],
      generationConfig: {
        responseModalities: ["IMAGE"]
      }
    }

    console.log('Google官方Gemini API请求数据:', JSON.stringify(requestData, null, 2))

    // 调用API（使用Authorization header和query参数双重认证）
    const response = await axios({
      method: 'POST',
      url: `${model.api_url}?key=${model.api_key}`,
      headers: {
        'Authorization': `Bearer ${model.api_key}`,
        'Content-Type': 'application/json'
      },
      data: requestData,
      timeout: 60000
    })

    const generationTime = Date.now() - startTime

    console.log('Google官方Gemini API响应状态:', response.status)
    console.log('Google官方Gemini API响应数据:', JSON.stringify(response.data, null, 2))

    // 解析Google API响应
    const images = parseGoogleGeminiResponse(response.data)

    return {
      success: true,
      data: {
        images: images,
        model_used: model.name || 'Gemini 2.5 Flash Image',
        generation_time: generationTime,
        cost: 0, // Google API计费方式不同
        raw_response: response.data
      },
      message: 'AI图片生成成功'
    }

  } catch (error) {
    console.error('Google官方Gemini API调用失败:', error)

    let errorMessage = error.message
    let errorDetails = {
      model: model.name,
      provider: model.provider,
      endpoint: model.endpoint
    }

    if (error.response) {
      errorDetails.status = error.response.status
      errorDetails.statusText = error.response.statusText
      errorDetails.error = error.response.data

      if (error.response.status === 400) {
        errorMessage = '请求参数错误，请检查API配置'
      } else if (error.response.status === 401) {
        errorMessage = 'API密钥无效，请检查配置'
      } else if (error.response.status === 403) {
        errorMessage = 'API访问权限不足'
      }
    }

    return {
      success: false,
      message: `Google官方Gemini API调用失败: ${errorMessage}`,
      error_details: errorDetails
    }
  }
}

/**
 * 解析OpenAI兼容格式响应
 */
function parseOpenAICompatibleResponse(content) {
  try {
    // 首先查找Markdown格式的base64图片 ![image](data:image/...)
    const base64ImageRegex = /!\[.*?\]\((data:image\/[^;]+;base64,[A-Za-z0-9+/=]+)\)/g
    const base64Matches = []
    let match

    while ((match = base64ImageRegex.exec(content)) !== null) {
      base64Matches.push(match[1])
    }

    if (base64Matches.length > 0) {
      console.log(`🖼️ OpenAI兼容API找到${base64Matches.length}张base64格式图片`)
      return base64Matches.map((dataUrl, index) => ({
        url: dataUrl,
        width: 1024,
        height: 1024,
        metadata: {
          generated_by: 'gemini_openai_compatible',
          real_ai: true,
          extracted_from: 'base64_markdown',
          format: 'base64',
          index: index
        }
      }))
    }

    // 然后查找Markdown格式的HTTP图片链接 ![image](url)
    const imageRegex = /!\[.*?\]\((https?:\/\/[^\s\)]+)\)/g
    const matches = []

    while ((match = imageRegex.exec(content)) !== null) {
      matches.push(match[1])
    }

    if (matches.length > 0) {
      console.log(`🔗 OpenAI兼容API找到${matches.length}张HTTP URL图片`)
      return matches.map(url => ({
        url: url,
        width: 1024,
        height: 1024,
        metadata: {
          generated_by: 'gemini_openai_compatible',
          real_ai: true,
          extracted_from: 'http_markdown'
        }
      }))
    }

    // 如果没有找到Markdown格式，尝试查找纯URL
    const urlRegex = /(https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp))/gi
    const urlMatches = []
    while ((match = urlRegex.exec(content)) !== null) {
      urlMatches.push(match[1])
    }

    if (urlMatches.length > 0) {
      return urlMatches.map(url => ({
        url: url,
        width: 1024,
        height: 1024,
        metadata: {
          generated_by: 'gemini_openai_compatible',
          real_ai: true,
          extracted_from: 'url'
        }
      }))
    }

    // 如果没有找到图片链接，返回文本内容作为提示
    console.warn('未在响应中找到图片链接，响应内容:', content)
    return [
      {
        url: 'https://via.placeholder.com/1024x1024/FF9800/FFFFFF?text=No+Image+Found',
        width: 1024,
        height: 1024,
        metadata: {
          generated_by: 'gemini_openai_compatible',
          real_ai: true,
          error: 'no_image_found',
          raw_content: content.substring(0, 200)
        }
      }
    ]

  } catch (error) {
    console.error('解析OpenAI兼容响应失败:', error)
    return [
      {
        url: 'https://via.placeholder.com/1024x1024/F44336/FFFFFF?text=Parse+Error',
        width: 1024,
        height: 1024,
        metadata: {
          generated_by: 'gemini_openai_compatible',
          real_ai: true,
          error: 'parse_error'
        }
      }
    ]
  }
}

/**
 * 解析Google官方Gemini API响应
 */
function parseGoogleGeminiResponse(responseData) {
  try {
    // Google Gemini API返回格式解析
    // 这里需要根据实际API响应格式进行调整
    if (responseData.candidates && responseData.candidates.length > 0) {
      const candidate = responseData.candidates[0]

      if (candidate.content && candidate.content.parts) {
        const parts = candidate.content.parts
        const images = []

        parts.forEach(part => {
          // 查找包含图片的part
          if (part.inlineData && part.inlineData.mimeType && part.inlineData.data) {
            // base64图片数据
            const mimeType = part.inlineData.mimeType
            const base64Data = part.inlineData.data

            images.push({
              url: `data:${mimeType};base64,${base64Data}`,
              width: 1024,
              height: 1024,
              metadata: {
                generated_by: 'google_gemini_official',
                real_ai: true,
                format: 'base64',
                mime_type: mimeType
              }
            })
          } else if (part.text) {
            // 从文本中提取图片链接
            const imageRegex = /(https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp))/gi
            let match
            while ((match = imageRegex.exec(part.text)) !== null) {
              images.push({
                url: match[1],
                width: 1024,
                height: 1024,
                metadata: {
                  generated_by: 'google_gemini_official',
                  real_ai: true,
                  format: 'url'
                }
              })
            }
          }
        })

        if (images.length > 0) {
          return images
        }
      }
    }

    // 如果没有找到图片，返回错误提示
    console.warn('Google Gemini API响应中未找到图片:', JSON.stringify(responseData, null, 2))
    return [
      {
        url: 'https://via.placeholder.com/1024x1024/9C27B0/FFFFFF?text=Google+API+No+Image',
        width: 1024,
        height: 1024,
        metadata: {
          generated_by: 'google_gemini_official',
          real_ai: true,
          error: 'no_image_found',
          raw_response: JSON.stringify(responseData).substring(0, 200)
        }
      }
    ]

  } catch (error) {
    console.error('解析Google Gemini响应失败:', error)
    return [
      {
        url: 'https://via.placeholder.com/1024x1024/F44336/FFFFFF?text=Google+Parse+Error',
        width: 1024,
        height: 1024,
        metadata: {
          generated_by: 'google_gemini_official',
          real_ai: true,
          error: 'parse_error'
        }
      }
    ]
  }
}

/**
 * 计算API调用成本
 */
function calculateCost(usage) {
  if (!usage) return 0

  // 简单的成本计算逻辑
  // 可以根据实际API定价调整
  const inputTokens = usage.prompt_tokens || 0
  const outputTokens = usage.completion_tokens || 0

  // 假设每1000个token 0.01元
  return (inputTokens + outputTokens) / 1000 * 0.01
}

/**
 * 异步AI模型调用：启动AI任务后立即返回，完成后回调
 */
async function callAIModelAsync(event) {
  try {
    const { model_id, prompt, parameters = {}, callback = {} } = event

    if (!prompt) {
      return {
        success: false,
        message: '提示词不能为空'
      }
    }

    console.log('🚀 启动异步AI模型调用, taskId:', callback.taskId)

    // 提取图片数据
    const images = parameters.reference_images || []
    console.log('📸 提取图片数据, 数量:', images.length)

    // 启动AI任务（不等待结果）
    const aiTaskPromise = callAIModel({
      model_id,
      prompt,
      parameters,
      images  // ✅ 正确传递 images 参数
    })

    // 立即返回任务已启动
    const response = {
      success: true,
      message: 'AI异步任务已启动',
      taskId: callback.taskId,
      type: callback.type
    }

    // 添加超时保护 - 5分钟超时
    const timeoutPromise = new Promise((resolve, reject) => {
      setTimeout(() => {
        reject(new Error('AI任务超时（5分钟）'))
      }, 5 * 60 * 1000) // 5分钟
    })

    // 在后台处理AI结果，带超时保护
    Promise.race([aiTaskPromise, timeoutPromise]).then(async (aiResult) => {
      console.log('🎯 异步AI任务完成, taskId:', callback.taskId)
      console.log('🔍 AI结果概览:', {
        success: aiResult.success,
        hasData: !!aiResult.data,
        hasImages: !!(aiResult.data && aiResult.data.images),
        imageCount: aiResult.data && aiResult.data.images ? aiResult.data.images.length : 0,
        message: aiResult.message
      })

      // 如果有图片，显示图片信息摘要
      if (aiResult.success && aiResult.data && aiResult.data.images) {
        console.log('🖼️ 生成的图片概览:')
        aiResult.data.images.forEach((img, index) => {
          console.log(`  图片${index + 1}: ${img.url ? (img.url.startsWith('data:') ? 'base64格式' : 'URL格式') : '无URL'}, 大小: ${img.width || '?'}x${img.height || '?'}`)
        })
      }

      try {
        // 检查结果数据大小，如果太大则直接在这里处理，避免调用ai-callback时RequestTooLarge
        const resultSize = JSON.stringify(aiResult).length
        console.log('📊 AI结果数据大小:', resultSize, 'bytes', resultSize > 1024 * 1024 ? '(超过1MB限制)' : '(正常)')

        if (resultSize > 1024 * 1024) { // 1MB限制
          console.log('⚠️ AI结果数据过大，直接在aimodels中处理，跳过ai-callback调用')

          // 直接在这里处理结果，模拟ai-callback的逻辑
          if (aiResult.success && aiResult.data && aiResult.data.images) {
            console.log('🔄 开始直接处理大型AI结果...')
            await handleLargeAIResult(callback.taskId, callback.type, aiResult, prompt)
          } else {
            console.log('❌ AI结果失败，开始处理失败情况...')
            await handleFailedAI(callback.taskId, callback.type, aiResult)
          }
        } else {
          // 数据大小正常，调用ai-callback
          console.log('📞 数据大小正常，调用ai-callback处理结果...')
          const callbackResult = await cloud.callFunction({
            name: 'ai-callback',
            data: {
              taskId: callback.taskId,
              type: callback.type,
              aiResult: aiResult,
              originalPrompt: prompt
            }
          })
          console.log('✅ ai-callback处理完成, taskId:', callback.taskId, 'result:', callbackResult.result?.success)
        }
      } catch (callbackError) {
        console.error('❌ 回调处理失败, taskId:', callback.taskId, callbackError)

        // 回调失败时，直接更新数据库状态，避免任务永远卡住
        try {
          const db = cloud.database()
          await db.collection('task_queue').doc(callback.taskId).update({
            data: {
              status: 'failed',
              error: 'callback_failed: ' + callbackError.message,
              updated_at: new Date()
            }
          })
          await db.collection('works').where({ task_id: callback.taskId }).update({
            data: {
              status: 'failed',
              error: 'callback_failed: ' + callbackError.message,
              updated_at: new Date()
            }
          })
          console.log('🔧 已直接更新数据库状态为失败, taskId:', callback.taskId)
        } catch (dbError) {
          console.error('❌ 直接更新数据库也失败了, taskId:', callback.taskId, dbError)
        }
      }
    }).catch(async (aiError) => {
      console.error('❌ 异步AI任务失败或超时, taskId:', callback.taskId, aiError)

      try {
        // AI失败也要回调，更新任务状态
        await cloud.callFunction({
          name: 'ai-callback',
          data: {
            taskId: callback.taskId,
            type: callback.type,
            aiResult: { success: false, message: aiError.message },
            originalPrompt: prompt
          }
        })
        console.log('✅ 失败回调处理完成, taskId:', callback.taskId)
      } catch (callbackError) {
        console.error('❌ 错误回调处理失败, taskId:', callback.taskId, callbackError)

        // 回调失败时，直接更新数据库状态
        try {
          const db = cloud.database()
          await db.collection('task_queue').doc(callback.taskId).update({
            data: {
              status: 'failed',
              error: aiError.message,
              updated_at: new Date()
            }
          })
          await db.collection('works').where({ task_id: callback.taskId }).update({
            data: {
              status: 'failed',
              error: aiError.message,
              updated_at: new Date()
            }
          })
          console.log('🔧 已直接更新数据库状态为失败（超时/错误）, taskId:', callback.taskId)
        } catch (dbError) {
          console.error('❌ 直接更新数据库也失败了, taskId:', callback.taskId, dbError)
        }
      }
    })

    return response

  } catch (error) {
    console.error('异步AI模型调用启动失败:', error)
    return {
      success: false,
      message: '异步AI模型调用启动失败: ' + error.message
    }
  }
}

/**
 * 处理大型AI结果 - 直接在aimodels中处理，避免调用ai-callback时RequestTooLarge
 */
async function handleLargeAIResult(taskId, type, aiResult, originalPrompt) {
  console.log('✅ 开始处理大型AI结果, taskId:', taskId)

  const db = cloud.database()
  const finalImages = []

  // 处理生成的图片 - 上传到云存储
  let uploadSuccessCount = 0
  let uploadFailCount = 0

  for (let i = 0; i < aiResult.data.images.length; i++) {
    const image = aiResult.data.images[i]
    console.log(`🖼️ 处理第${i+1}张图片，URL类型: ${image.url ? (image.url.startsWith('data:') ? 'base64' : 'URL') : '无URL'}`)

    try {
      if (image.url && image.url.startsWith('data:image/')) {
        // 处理base64图片
        console.log(`📤 上传第${i+1}张base64图片到云存储`)

        // 解析base64数据
        const matches = image.url.match(/^data:image\/([^;]+);base64,(.+)$/)
        if (!matches) {
          throw new Error('base64格式解析失败')
        }

        const [, imageFormat, base64Data] = matches

        // 验证base64数据
        if (!base64Data || base64Data.length < 100) {
          throw new Error('base64数据无效或过小')
        }

        const timestamp = Date.now()
        const fileName = `${type}_${taskId}_${i+1}_${timestamp}.${imageFormat}`
        const cloudPath = `${type}/${taskId}/${fileName}`

        // 上传到云存储
        const uploadResult = await cloud.uploadFile({
          cloudPath: cloudPath,
          fileContent: Buffer.from(base64Data, 'base64')
        })

        if (uploadResult.fileID) {
          finalImages.push({
            url: uploadResult.fileID,
            width: image.width || 1024,
            height: image.height || 1024,
            metadata: {
              ...image.metadata,
              cloud_path: cloudPath,
              uploaded_at: new Date(),
              original_format: imageFormat,
              ai_generated: true,
              upload_success: true,
              processed_in_aimodels: true // 标记为在aimodels中处理
            }
          })
          uploadSuccessCount++
          console.log(`✅ 第${i+1}张图片上传成功: ${uploadResult.fileID}`)
        } else {
          throw new Error('云存储返回空fileID')
        }
      } else if (image.url && (image.url.startsWith('http://') || image.url.startsWith('https://'))) {
        // 处理远程URL图片 - 保留原始URL
        console.log(`🔗 第${i+1}张图片为远程URL，直接保存`)
        finalImages.push({
          ...image,
          metadata: {
            ...image.metadata,
            ai_generated: true,
            upload_success: false,
            url_type: 'remote',
            processed_in_aimodels: true
          }
        })
        uploadSuccessCount++
      } else {
        throw new Error(`不支持的图片格式: ${image.url ? image.url.substring(0, 50) + '...' : '无URL'}`)
      }
    } catch (uploadError) {
      console.error(`❌ 第${i+1}张图片处理失败:`, uploadError.message)
      uploadFailCount++

      // 保留原始图片数据作为备份
      finalImages.push({
        ...image,
        metadata: {
          ...image.metadata,
          ai_generated: true,
          upload_success: false,
          upload_error: uploadError.message,
          processed_in_aimodels: true
        }
      })
    }
  }

  console.log(`📊 图片处理统计: 总数 ${aiResult.data.images.length}, 成功 ${uploadSuccessCount}, 失败 ${uploadFailCount}`)

  // 更新作品记录
  console.log('📝 更新作品记录为completed')
  await db.collection('works')
    .where({ task_id: taskId })
    .update({
      data: {
        status: 'completed',
        images: finalImages,
        ai_prompt: originalPrompt,
        completed_at: new Date(),
        updated_at: new Date()
      }
    })

  // 更新任务状态
  await db.collection('task_queue')
    .doc(taskId)
    .update({
      data: {
        status: 'completed',
        result: {
          success: true,
          images_count: finalImages.length,
          ai_generated: true,
          processed_in_aimodels: true
        },
        updated_at: new Date()
      }
    })

  console.log('🎉 大型AI结果处理完成，生成图片数量:', finalImages.length)
}

/**
 * 处理AI失败的情况 - 在aimodels中处理
 */
async function handleFailedAI(taskId, type, aiResult) {
  console.log('❌ 在aimodels中处理AI失败结果, taskId:', taskId)

  const db = cloud.database()

  // 获取任务信息以便退还积分
  let taskInfo = null
  try {
    const taskResult = await db.collection('task_queue').doc(taskId).get()
    if (taskResult.data) {
      taskInfo = taskResult.data
    }
  } catch (error) {
    console.warn('获取任务信息失败:', error)
  }

  // 更新作品记录为失败
  await db.collection('works')
    .where({ task_id: taskId })
    .update({
      data: {
        status: 'failed',
        error: aiResult.message || 'AI生成失败',
        updated_at: new Date()
      }
    })

  // 更新任务状态为失败
  await db.collection('task_queue')
    .doc(taskId)
    .update({
      data: {
        status: 'failed',
        error: aiResult.message || 'AI生成失败',
        updated_at: new Date()
      }
    })

  // 退还用户积分
  if (taskInfo && taskInfo.user_openid && taskInfo.params) {
    try {
      const refundCredits = taskInfo.params.count || 1
      console.log('💰 退还用户积分:', refundCredits, 'to user:', taskInfo.user_openid)

      await db.collection('users')
        .where({ openid: taskInfo.user_openid })
        .update({
          data: {
            credits: db.command.inc(refundCredits),
            total_consumed_credits: db.command.inc(-refundCredits),
            updated_at: new Date()
          }
        })

      console.log('✅ 积分退还成功')
    } catch (refundError) {
      console.error('❌ 积分退还失败:', refundError)
    }
  } else {
    console.warn('无法退还积分，任务信息不完整')
  }

  console.log('💥 AI失败处理完成, taskId:', taskId)
}

















