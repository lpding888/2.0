// 套餐管理权限测试脚本
// 在开发者工具控制台运行此脚本

console.log('🧪 开始测试套餐管理权限...');

// 测试套餐管理权限
wx.cloud.callFunction({
  name: 'payment',
  data: {
    action: 'addPackage',
    packageData: {
      name: '权限测试套餐',
      description: '用于测试权限的临时套餐',
      credits: 1,
      price: 0.01,
      original_price: 0.02,
      discount: '测试',
      sort_order: 999,
      is_popular: false,
      is_active: false  // 设为禁用状态，避免影响正常使用
    }
  },
  success: res => {
    console.log('✅ 套餐管理权限测试结果:', res.result);

    if (res.result.success) {
      console.log('🎉 权限验证成功！套餐管理功能现在应该可以正常使用了。');

      // 清理测试数据
      const packageId = res.result.data?.id || res.result.data?._id;
      if (packageId) {
        wx.cloud.callFunction({
          name: 'payment',
          data: {
            action: 'deletePackage',
            packageId: packageId
          },
          success: delRes => {
            console.log('🧹 测试套餐已清理:', delRes.result?.message || '删除完成');
          },
          fail: delErr => {
            console.log('⚠️ 清理测试套餐失败（不影响功能）:', delErr);
          }
        });
      }
    } else {
      console.log('❌ 权限验证失败:', res.result.message);
      console.log('📝 请检查您的管理员权限设置是否正确。');
    }
  },
  fail: err => {
    console.error('❌ 测试失败:', err);
    console.log('📝 请确保payment云函数已正确部署。');
  }
});

console.log('⏳ 正在执行权限测试，请稍候...');