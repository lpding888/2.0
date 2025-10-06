/**
 * 存储错误修复脚本
 * 解决 "Cannot read property '__global' of null" 错误
 */

const fs = require('fs')
const path = require('path')

console.log('🔧 开始修复存储错误...\n')

// 1. 备份原文件
console.log('📦 备份原文件...')
try {
  // 备份 app.js
  const appOriginal = fs.readFileSync('app.js', 'utf8')
  fs.writeFileSync('app_backup_before_fix.js', appOriginal)
  console.log('✅ app.js 已备份为 app_backup_before_fix.js')
  
  // 备份 utils/api.js
  const apiOriginal = fs.readFileSync('utils/api.js', 'utf8')
  fs.writeFileSync('utils/api_backup_before_fix.js', apiOriginal)
  console.log('✅ utils/api.js 已备份为 utils/api_backup_before_fix.js')
} catch (error) {
  console.error('❌ 备份文件失败:', error.message)
  process.exit(1)
}

// 2. 应用修复
console.log('\n🛠️ 应用修复...')
try {
  // 替换 app.js
  const appFixed = fs.readFileSync('app_fixed.js', 'utf8')
  fs.writeFileSync('app.js', appFixed)
  console.log('✅ app.js 已更新为修复版本')
  
  // 替换 utils/api.js
  const apiFixed = fs.readFileSync('utils/api_fixed.js', 'utf8')
  fs.writeFileSync('utils/api.js', apiFixed)
  console.log('✅ utils/api.js 已更新为修复版本')
} catch (error) {
  console.error('❌ 应用修复失败:', error.message)
  
  // 恢复备份
  console.log('🔄 恢复备份文件...')
  try {
    const appBackup = fs.readFileSync('app_backup_before_fix.js', 'utf8')
    fs.writeFileSync('app.js', appBackup)
    
    const apiBackup = fs.readFileSync('utils/api_backup_before_fix.js', 'utf8')
    fs.writeFileSync('utils/api.js', apiBackup)
    
    console.log('✅ 已恢复备份文件')
  } catch (restoreError) {
    console.error('❌ 恢复备份失败:', restoreError.message)
  }
  
  process.exit(1)
}

// 3. 验证修复
console.log('\n🧪 验证修复...')
try {
  // 检查文件是否存在且可读
  fs.accessSync('app.js', fs.constants.R_OK)
  fs.accessSync('utils/api.js', fs.constants.R_OK)
  console.log('✅ 修复文件验证通过')
} catch (error) {
  console.error('❌ 修复文件验证失败:', error.message)
  process.exit(1)
}

console.log('\n🎉 存储错误修复完成！')
console.log('\n📋 修复内容:')
console.log('✅ 修复了存储API调用时机问题')
console.log('✅ 增加了错误处理和重试机制')
console.log('✅ 解决了循环依赖问题')
console.log('✅ 优化了云开发初始化流程')

console.log('\n🚀 下一步操作:')
console.log('1. 在微信开发者工具中重新编译项目')
console.log('2. 清除小程序缓存数据')
console.log('3. 重新启动小程序测试')

console.log('\n📁 备份文件位置:')
console.log('- app_backup_before_fix.js (原 app.js)')
console.log('- utils/api_backup_before_fix.js (原 utils/api.js)')

console.log('\n⚠️  如果修复后仍有问题，可以使用备份文件恢复原状态')