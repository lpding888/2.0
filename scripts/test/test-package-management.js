// 套餐管理功能测试脚本
// 使用说明：在开发者工具控制台中复制粘贴此代码进行测试

const testPackageManagement = {

  // 测试获取套餐列表
  async testGetPackages() {
    console.log('📦 测试获取套餐列表...');
    try {
      const result = await wx.cloud.callFunction({
        name: 'payment',
        data: {
          action: 'getPackages'
        }
      });
      console.log('✅ 获取套餐列表成功:', result.result);
      return result.result;
    } catch (error) {
      console.error('❌ 获取套餐列表失败:', error);
      return { success: false, message: error.message };
    }
  },

  // 测试添加套餐（需要管理员权限）
  async testAddPackage() {
    console.log('➕ 测试添加套餐...');
    try {
      const testPackage = {
        name: '测试套餐',
        description: '这是一个测试套餐',
        credits: 50,
        price: 15.9,
        original_price: 25.0,
        discount: '限时优惠',
        sort_order: 10,
        is_popular: false,
        is_active: true
      };

      const result = await wx.cloud.callFunction({
        name: 'payment',
        data: {
          action: 'addPackage',
          packageData: testPackage
        }
      });
      console.log('✅ 添加套餐成功:', result.result);
      return result.result;
    } catch (error) {
      console.error('❌ 添加套餐失败:', error);
      return { success: false, message: error.message };
    }
  },

  // 测试更新套餐（需要管理员权限）
  async testUpdatePackage(packageId) {
    console.log('📝 测试更新套餐...');
    try {
      const updateData = {
        name: '更新后的测试套餐',
        price: 12.9,
        is_popular: true
      };

      const result = await wx.cloud.callFunction({
        name: 'payment',
        data: {
          action: 'updatePackage',
          packageId: packageId,
          packageData: updateData
        }
      });
      console.log('✅ 更新套餐成功:', result.result);
      return result.result;
    } catch (error) {
      console.error('❌ 更新套餐失败:', error);
      return { success: false, message: error.message };
    }
  },

  // 测试删除套餐（需要管理员权限）
  async testDeletePackage(packageId) {
    console.log('🗑️ 测试删除套餐...');
    try {
      const result = await wx.cloud.callFunction({
        name: 'payment',
        data: {
          action: 'deletePackage',
          packageId: packageId
        }
      });
      console.log('✅ 删除套餐成功:', result.result);
      return result.result;
    } catch (error) {
      console.error('❌ 删除套餐失败:', error);
      return { success: false, message: error.message };
    }
  },

  // 运行完整测试
  async runCompleteTest() {
    console.log('🚀 开始运行套餐管理完整测试...\n');

    // 1. 测试获取套餐列表
    const packagesResult = await this.testGetPackages();
    if (!packagesResult.success) {
      console.log('❌ 基础功能测试失败，停止测试');
      return;
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // 2. 测试添加套餐（需要管理员权限）
    const addResult = await this.testAddPackage();
    if (addResult.success) {
      const newPackageId = addResult.data?.id || addResult.data?._id;

      if (newPackageId) {
        console.log('\n' + '='.repeat(50) + '\n');

        // 3. 测试更新套餐
        await this.testUpdatePackage(newPackageId);

        console.log('\n' + '='.repeat(50) + '\n');

        // 4. 测试删除套餐
        await this.testDeletePackage(newPackageId);
      }
    } else {
      console.log('⚠️ 管理员功能测试跳过（需要管理员权限）');
    }

    console.log('\n🎉 套餐管理功能测试完成！');
  }
};

// 导出测试对象到全局
if (typeof window !== 'undefined') {
  window.testPackageManagement = testPackageManagement;
}

// 使用方法：
console.log(`
📋 套餐管理功能测试指南：

1. 测试获取套餐列表：
   testPackageManagement.testGetPackages()

2. 测试添加套餐（需要管理员权限）：
   testPackageManagement.testAddPackage()

3. 测试更新套餐（需要管理员权限）：
   testPackageManagement.testUpdatePackage('package_id_here')

4. 测试删除套餐（需要管理员权限）：
   testPackageManagement.testDeletePackage('package_id_here')

5. 运行完整测试：
   testPackageManagement.runCompleteTest()

📝 注意事项：
- 添加、更新、删除操作需要管理员权限
- 请确保已登录并且用户具有管理员权限
- 测试前请确保云函数已部署
`);