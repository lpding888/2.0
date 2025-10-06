const cloud = require('wx-server-sdk');
cloud.init({ env: 'cloudbase-0gu1afji26f514d2' });
const db = cloud.database();

async function checkModels() {
  try {
    console.log('🔍 查询数据库中的所有模型...');
    const allModels = await db.collection('api_configs').get();
    console.log('📊 总模型数量:', allModels.data.length);
    
    if (allModels.data.length === 0) {
      console.log('❌ 数据库中没有任何模型配置');
      return;
    }
    
    console.log('\n📋 所有模型列表:');
    allModels.data.forEach((model, index) => {
      console.log(`${index + 1}. ${model.name || 'Unnamed'}`);
      console.log(`   - ID: ${model._id}`);
      console.log(`   - 类型: ${model.model_type}`);
      console.log(`   - 提供商: ${model.provider}`);
      console.log(`   - 状态: ${model.is_active ? '启用' : '禁用'}`);
      console.log(`   - 权重: ${model.weight || '未设置'}`);
      console.log(`   - 优先级: ${model.priority || '未设置'}`);
      console.log(`   - 能力: ${model.capabilities ? model.capabilities.join(', ') : '未设置'}`);
      console.log('');
    });
    
    console.log('\n🔍 查询 text-to-image 类型的启用模型...');
    const textToImageModels = await db.collection('api_configs')
      .where({
        model_type: 'text-to-image',
        is_active: true
      })
      .get();
    
    console.log('📊 符合条件的 text-to-image 模型数量:', textToImageModels.data.length);
    
    if (textToImageModels.data.length > 0) {
      console.log('\n✅ 符合条件的模型:');
      textToImageModels.data.forEach((model, index) => {
        console.log(`${index + 1}. ${model.name} (${model.provider})`);
      });
    } else {
      console.log('❌ 没有找到符合条件的 text-to-image 模型');
    }
    
    // 检查特定的能力筛选
    console.log('\n🔍 查询具有 text-to-image 能力的模型...');
    const capabilityModels = await db.collection('api_configs')
      .where({
        is_active: true
      })
      .get();
    
    const filteredByCapability = capabilityModels.data.filter(model => {
      return model.capabilities && model.capabilities.includes('text-to-image');
    });
    
    console.log('📊 具有 text-to-image 能力的模型数量:', filteredByCapability.length);
    
    if (filteredByCapability.length > 0) {
      console.log('\n✅ 具有 text-to-image 能力的模型:');
      filteredByCapability.forEach((model, index) => {
        console.log(`${index + 1}. ${model.name} (${model.provider}) - 能力: ${model.capabilities.join(', ')}`);
      });
    }
    
  } catch (error) {
    console.error('❌ 查询失败:', error);
  }
}

checkModels();