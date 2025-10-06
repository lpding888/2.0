// 测试优化后的云函数流程
// 在微信开发者工具的控制台中运行此脚本

console.log('🧪 开始测试优化后的云函数流程...');

// 测试数据
const testConfig = {
  // 模拟上传的图片文件ID
  testImageIds: [
    'cloud://cloudbase-0gu1afji26f514d2.636c-cloudbase-0gu1afji26f514d2-1332/test_clothing_1.jpg',
    'cloud://cloudbase-0gu1afji26f514d2.636c-cloudbase-0gu1afji26f514d2-1332/test_person_1.jpg'
  ],

  // 测试参数
  photographyParams: {
    images: [], // 将在测试中填入
    parameters: {
      gender: 'female',
      age: 25,
      nationality: 'asian',
      skin_tone: 'medium',
      clothing_material: '棉质',
      pose_type: '自然站立'
    },
    sceneId: 'default_scene_id',
    count: 1
  },

  fittingParams: {
    personImages: [], // 将在测试中填入
    clothingImages: [], // 将在测试中填入
    parameters: {
      gender: 'female',
      height: 170,
      style: 'casual'
    },
    count: 1
  }
};

// 测试函数1: Photography完整流程
async function testPhotographyFlow() {
  console.log('\n📸 测试Photography流程...');

  try {
    // 准备测试数据
    const params = {
      ...testConfig.photographyParams,
      images: testConfig.testImageIds.slice(0, 1)
    };

    console.log('📤 调用photography.generate...', {
      imageCount: params.images.length,
      parameters: params.parameters
    });

    // 调用photography函数
    const result = await wx.cloud.callFunction({
      name: 'photography',
      data: {
        action: 'generate',
        ...params
      }
    });

    console.log('✅ Photography函数响应:', result.result);

    if (result.result.success) {
      const taskId = result.result.data.task_id;
      console.log('🔄 监控任务进度, TaskID:', taskId);

      // 等待2秒后检查进度
      setTimeout(async () => {
        try {
          const progressResult = await wx.cloud.callFunction({
            name: 'photography',
            data: {
              action: 'getProgress',
              taskId: taskId
            }
          });
          console.log('📊 任务进度:', progressResult.result);
        } catch (error) {
          console.error('❌ 获取进度失败:', error);
        }
      }, 2000);
    }

    return result.result;

  } catch (error) {
    console.error('❌ Photography测试失败:', error);
    return { success: false, error: error.message };
  }
}

// 测试函数2: Fitting完整流程
async function testFittingFlow() {
  console.log('\n👗 测试Fitting流程...');

  try {
    // 准备测试数据
    const params = {
      ...testConfig.fittingParams,
      personImages: testConfig.testImageIds.slice(0, 1),
      clothingImages: testConfig.testImageIds.slice(1, 2)
    };

    console.log('📤 调用fitting.generate...', {
      personImageCount: params.personImages.length,
      clothingImageCount: params.clothingImages.length
    });

    // 调用fitting函数
    const result = await wx.cloud.callFunction({
      name: 'fitting',
      data: {
        action: 'generate',
        ...params
      }
    });

    console.log('✅ Fitting函数响应:', result.result);

    if (result.result.success) {
      const taskId = result.result.data.task_id;
      console.log('🔄 监控任务进度, TaskID:', taskId);

      // 等待2秒后检查进度
      setTimeout(async () => {
        try {
          const progressResult = await wx.cloud.callFunction({
            name: 'fitting',
            data: {
              action: 'getProgress',
              taskId: taskId
            }
          });
          console.log('📊 任务进度:', progressResult.result);
        } catch (error) {
          console.error('❌ 获取进度失败:', error);
        }
      }, 2000);
    }

    return result.result;

  } catch (error) {
    console.error('❌ Fitting测试失败:', error);
    return { success: false, error: error.message };
  }
}

// 测试函数3: 直接测试aimodels.createGenerationTask
async function testCreateGenerationTask() {
  console.log('\n🤖 测试aimodels.createGenerationTask...');

  try {
    const result = await wx.cloud.callFunction({
      name: 'aimodels',
      data: {
        action: 'createGenerationTask',
        taskId: 'test_task_' + Date.now(),
        imageIds: testConfig.testImageIds,
        prompt: '测试提示词：专业时尚摄影，亚洲女性模特展示服装',
        parameters: {
          count: 1,
          width: 1024,
          height: 1024,
          style: 'photography'
        },
        type: 'photography'
      }
    });

    console.log('✅ createGenerationTask响应:', result.result);
    return result.result;

  } catch (error) {
    console.error('❌ createGenerationTask测试失败:', error);
    return { success: false, error: error.message };
  }
}

// 测试函数4: 数据传输大小对比
function testDataTransmissionSize() {
  console.log('\n📊 数据传输大小对比...');

  // 模拟Base64数据大小 (原始方案)
  const mockBase64Size = 2 * 1024 * 1024; // 2MB图片
  const base64TransmissionSize = mockBase64Size * 1.33; // Base64增长33%

  // fileId传输大小 (优化方案)
  const fileIdTransmissionSize = testConfig.testImageIds.join(',').length;

  const reduction = ((base64TransmissionSize - fileIdTransmissionSize) / base64TransmissionSize * 100).toFixed(3);

  console.log('📈 传输大小对比:');
  console.log(`   原始方案(Base64): ${(base64TransmissionSize/1024/1024).toFixed(2)}MB`);
  console.log(`   优化方案(fileId): ${fileIdTransmissionSize}字节`);
  console.log(`   减少传输量: ${reduction}%`);

  return {
    originalSize: base64TransmissionSize,
    optimizedSize: fileIdTransmissionSize,
    reductionPercent: reduction
  };
}

// 主测试函数
async function runAllTests() {
  console.log('🚀 开始完整测试流程...\n');

  const results = {
    dataTransmission: testDataTransmissionSize(),
    photography: null,
    fitting: null,
    createGenerationTask: null
  };

  // 运行Photography测试
  results.photography = await testPhotographyFlow();

  // 等待1秒
  await new Promise(resolve => setTimeout(resolve, 1000));

  // 运行Fitting测试
  results.fitting = await testFittingFlow();

  // 等待1秒
  await new Promise(resolve => setTimeout(resolve, 1000));

  // 运行直接AI测试
  results.createGenerationTask = await testCreateGenerationTask();

  // 输出完整测试结果
  console.log('\n📋 完整测试结果:');
  console.log('================================');
  console.log('📊 数据传输优化:', results.dataTransmission);
  console.log('📸 Photography流程:', results.photography?.success ? '✅ 成功' : '❌ 失败');
  console.log('👗 Fitting流程:', results.fitting?.success ? '✅ 成功' : '❌ 失败');
  console.log('🤖 AI任务创建:', results.createGenerationTask?.success ? '✅ 成功' : '❌ 失败');
  console.log('================================');

  return results;
}

// 导出测试函数，可在控制台中调用
window.testOptimizedFunctions = {
  runAll: runAllTests,
  testPhotography: testPhotographyFlow,
  testFitting: testFittingFlow,
  testCreateTask: testCreateGenerationTask,
  testDataSize: testDataTransmissionSize
};

console.log('✅ 测试脚本加载完成！');
console.log('📝 使用方法:');
console.log('   - 运行全部测试: testOptimizedFunctions.runAll()');
console.log('   - 单独测试摄影: testOptimizedFunctions.testPhotography()');
console.log('   - 单独测试试衣: testOptimizedFunctions.testFitting()');
console.log('   - 测试AI任务: testOptimizedFunctions.testCreateTask()');
console.log('   - 数据大小对比: testOptimizedFunctions.testDataSize()');