// 支付流程测试脚本
// 在开发者工具控制台运行此脚本

console.log('🧪 开始测试支付流程...');

// 测试支付下单流程
async function testPaymentFlow() {
  try {
    console.log('📝 第一步：获取套餐列表');

    // 1. 获取可用套餐
    const packagesResult = await wx.cloud.callFunction({
      name: 'payment',
      data: {
        action: 'getPackages'
      }
    });

    console.log('套餐列表结果:', packagesResult.result);

    if (!packagesResult.result.success) {
      console.error('❌ 获取套餐失败:', packagesResult.result.message);
      return;
    }

    const packages = packagesResult.result.data;
    if (!packages || packages.length === 0) {
      console.error('❌ 没有可用套餐');
      return;
    }

    console.log('✅ 找到套餐:', packages.length, '个');

    // 2. 选择第一个套餐进行测试
    const testPackage = packages[0];
    console.log('📦 测试套餐:', testPackage);

    console.log('💰 第二步：创建支付订单');

    // 3. 创建订单
    const orderResult = await wx.cloud.callFunction({
      name: 'payment',
      data: {
        action: 'createOrder',
        packageId: testPackage.id
      }
    });

    console.log('订单创建结果:', orderResult.result);

    if (!orderResult.result.success) {
      console.error('❌ 创建订单失败:', orderResult.result.message);
      return;
    }

    const orderData = orderResult.result.data;
    console.log('✅ 订单创建成功，订单ID:', orderData.order_id);

    // 4. 检查支付参数
    if (orderData.paymentParams) {
      console.log('💳 第三步：支付参数检查');
      console.log('支付参数:', orderData.paymentParams);

      // 模拟调起微信支付（注意：这里不会真正调起支付，只是显示参数）
      console.log('🔧 支付参数格式检查:');
      const params = orderData.paymentParams;

      const requiredFields = ['timeStamp', 'nonceStr', 'package', 'signType', 'paySign'];
      let allFieldsPresent = true;

      requiredFields.forEach(field => {
        if (params[field]) {
          console.log(`✅ ${field}: ${params[field]}`);
        } else {
          console.log(`❌ 缺少字段: ${field}`);
          allFieldsPresent = false;
        }
      });

      if (allFieldsPresent) {
        console.log('🎉 支付参数格式正确！');
        console.log('');
        console.log('📱 接下来可以在小程序中调用:');
        console.log('wx.requestPayment({');
        console.log('  timeStamp: "' + params.timeStamp + '",');
        console.log('  nonceStr: "' + params.nonceStr + '",');
        console.log('  package: "' + params.package + '",');
        console.log('  signType: "' + params.signType + '",');
        console.log('  paySign: "' + params.paySign + '",');
        console.log('  success: (res) => console.log("支付成功", res),');
        console.log('  fail: (err) => console.log("支付失败", err)');
        console.log('})');
      } else {
        console.log('❌ 支付参数格式有问题，需要检查云函数配置');
      }

    } else {
      console.log('⚠️ 没有返回支付参数，可能是配置问题');
    }

  } catch (error) {
    console.error('❌ 测试过程中出错:', error);
  }
}

// 测试支付回调
async function testPaymentCallback() {
  console.log('\n🔔 测试支付回调功能...');

  try {
    // 模拟支付成功回调
    const callbackResult = await wx.cloud.callFunction({
      name: 'payment',
      data: {
        action: 'paymentCallback',
        outTradeNo: 'test_order_123',
        resultCode: 'SUCCESS',
        totalFee: 990, // 9.9元
        transactionId: 'wx_test_123'
      }
    });

    console.log('支付回调测试结果:', callbackResult.result);

  } catch (error) {
    console.error('❌ 支付回调测试失败:', error);
  }
}

// 执行测试
testPaymentFlow().then(() => {
  // testPaymentCallback(); // 可选：测试回调功能
});

console.log(`
📋 支付功能测试说明

1. 此脚本会测试支付下单流程
2. 检查支付参数格式是否正确
3. 如果参数正确，说明云函数配置OK
4. 如果参数有问题，需要检查云开发支付配置

常见问题排查：
- 如果获取套餐失败：检查packages集合是否有数据
- 如果创建订单失败：检查用户登录状态
- 如果支付参数异常：检查云开发支付配置
- 如果微信支付调起失败：检查小程序支付权限

运行后请查看控制台输出结果。
`);