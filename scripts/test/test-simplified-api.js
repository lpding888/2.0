/**
 * 测试简化后的API选择逻辑
 */

console.log('🧪 开始测试简化的API选择逻辑...')

// 模拟测试数据
const testEvent = {
  model_type: 'text-to-image',
  capabilities: ['text-to-image'],
  max_cost: null,
  preferred_providers: []
}

console.log('📋 测试参数:', testEvent)

// 模拟简化的选择逻辑
function testSimplifiedSelection() {
  console.log('🎯 简化模型选择开始')
  console.log('📋 输入参数:', testEvent)
  
  // 模拟数据库查询结果
  const mockModels = [
    {
      _id: 'model1',
      name: 'Gemini Pro Vision',
      provider: 'google',
      model_type: 'multimodal',
      is_active: true,
      priority: 9
    },
    {
      _id: 'model2', 
      name: 'DALL-E 3',
      provider: 'openai',
      model_type: 'text-to-image',
      is_active: true,
      priority: 8
    }
  ]
  
  console.log('📊 数据库查询结果:', mockModels.length, '个启用模型')
  
  if (mockModels.length === 0) {
    return {
      success: false,
      message: '没有可用的模型'
    }
  }
  
  // 简化逻辑：直接返回第一个启用的模型
  const selectedModel = mockModels[0]
  
  console.log('✅ 选择模型:', selectedModel.name, '(提供商:', selectedModel.provider + ')')
  
  return {
    success: true,
    data: {
      selected_model: selectedModel,
      available_count: mockModels.length
    },
    message: '模型选择成功'
  }
}

// 模拟简化的调用逻辑
function testSimplifiedCall() {
  console.log('🎯 开始简化API调用流程')
  
  const availableModels = [
    {
      _id: 'model1',
      name: 'Gemini Pro Vision',
      provider: 'google',
      model_type: 'multimodal',
      is_active: true,
      priority: 9
    },
    {
      _id: 'model2', 
      name: 'DALL-E 3',
      provider: 'openai',
      model_type: 'text-to-image',
      is_active: true,
      priority: 8
    }
  ]
  
  console.log('📊 可用模型数量:', availableModels.length)
  
  // API 1: 尝试发送链接和文字（适用于支持URL的模型）
  const urlSupportModels = availableModels.filter(model => 
    model.provider === 'google' || model.provider === 'gemini' || 
    model.model_type === 'multimodal' || model.model_type === 'Gemini'
  )
  
  if (urlSupportModels.length > 0) {
    console.log('🔗 尝试API 1: 发送链接和文字')
    const urlModel = urlSupportModels[0]
    console.log('✅ 将使用模型:', urlModel.name, '进行URL格式调用')
    
    // 模拟调用成功
    console.log('✅ API 1 调用成功')
    return {
      success: true,
      data: {
        images: [{
          url: 'https://example.com/generated-image.jpg',
          model_used: urlModel.name,
          method: 'URL+文字'
        }]
      }
    }
  }
  
  // API 2: 发送图片base64和文字（备用方案）
  console.log('🖼️ 尝试API 2: 发送图片base64和文字')
  const base64Model = availableModels[0]
  console.log('✅ 将使用模型:', base64Model.name, '进行base64格式调用')
  
  return {
    success: true,
    data: {
      images: [{
        url: 'https://example.com/generated-image.jpg',
        model_used: base64Model.name,
        method: 'base64+文字'
      }]
    }
  }
}

// 执行测试
console.log('\n=== 测试模型选择逻辑 ===')
const selectionResult = testSimplifiedSelection()
console.log('选择结果:', selectionResult)

console.log('\n=== 测试调用逻辑 ===')
const callResult = testSimplifiedCall()
console.log('调用结果:', callResult)

console.log('\n✅ 简化API逻辑测试完成!')
console.log('\n📝 简化总结:')
console.log('- 移除了复杂的能力匹配逻辑')
console.log('- 移除了权重随机选择')
console.log('- 使用两个API的顺序调用机制:')
console.log('  1. 第一个API: 发送链接和文字 (适用于Google/Gemini等)')
console.log('  2. 第二个API: 发送图片base64和文字 (备用方案)')
console.log('- 第一个不成功时自动使用第二个')