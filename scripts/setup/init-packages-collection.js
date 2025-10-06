// 初始化 packages 集合的脚本
// 在开发者工具控制台运行此脚本

console.log('🚀 开始初始化 packages 集合...');

// 创建默认套餐数据
const defaultPackages = [
  {
    id: 'package_25',
    name: '基础包',
    description: '适合轻度使用',
    credits: 25,
    price: 9.9,
    original_price: 12.5,
    discount: '限时8折',
    sort_order: 1,
    is_popular: false,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    id: 'package_60',
    name: '标准包',
    description: '性价比之选',
    credits: 60,
    price: 19.9,
    original_price: 30.0,
    discount: '超值优惠',
    sort_order: 2,
    is_popular: true,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    id: 'package_100',
    name: '专业包',
    description: '专业用户首选',
    credits: 100,
    price: 29.9,
    original_price: 50.0,
    discount: '6折特惠',
    sort_order: 3,
    is_popular: false,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    id: 'package_300',
    name: '企业包',
    description: '企业批量使用',
    credits: 300,
    price: 79.9,
    original_price: 150.0,
    discount: '5折优惠',
    sort_order: 4,
    is_popular: false,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date()
  }
];

// 初始化函数
async function initPackagesCollection() {
  try {
    const db = wx.cloud.database();

    // 检查集合是否已有数据
    const existingData = await db.collection('packages').get();

    if (existingData.data.length > 0) {
      console.log('✅ packages 集合已存在数据，无需初始化');
      console.log('现有套餐数量:', existingData.data.length);
      console.log('现有套餐:', existingData.data);
      return;
    }

    console.log('📝 packages 集合为空，开始添加默认套餐...');

    // 批量添加默认套餐
    for (let i = 0; i < defaultPackages.length; i++) {
      const pkg = defaultPackages[i];

      try {
        const result = await db.collection('packages').add({
          data: {
            _id: pkg.id,
            ...pkg
          }
        });
        console.log(`✅ 添加套餐 "${pkg.name}" 成功:`, result._id);
      } catch (error) {
        console.error(`❌ 添加套餐 "${pkg.name}" 失败:`, error);
      }
    }

    console.log('🎉 packages 集合初始化完成！');

    // 验证初始化结果
    const finalData = await db.collection('packages').get();
    console.log('📊 最终套餐数量:', finalData.data.length);

  } catch (error) {
    console.error('❌ 初始化 packages 集合失败:', error);

    // 如果是权限问题，给出提示
    if (error.errCode === -502001) {
      console.log('💡 提示：可能需要在云开发控制台手动创建 packages 集合');
    }
  }
}

// 执行初始化
initPackagesCollection();

console.log(`
📋 packages 集合初始化脚本

使用说明：
1. 运行此脚本会自动检查 packages 集合
2. 如果集合为空，会添加 4 个默认套餐
3. 如果已有数据，会跳过初始化

如果遇到权限问题，请：
1. 在云开发控制台手动创建 packages 集合
2. 设置适当的权限规则
3. 重新运行此脚本
`);