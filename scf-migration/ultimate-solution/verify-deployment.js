/**
 * 部署验证脚本
 * 验证腾讯云SCF配置和代码是否符合官方规范
 */

const fs = require('fs')
const path = require('path')

console.log('🔍 开始验证腾讯云SCF部署配置...\n')

// 验证项目结构
function validateProjectStructure() {
  console.log('📁 验证项目结构...')

  const requiredFiles = [
    'serverless-simple.yml',
    'backend/src/handlers/scf-api-gateway.js',
    '.env',
    'package.json'
  ]

  let allValid = true
  for (const file of requiredFiles) {
    if (fs.existsSync(file)) {
      console.log(`  ✅ ${file}`)
    } else {
      console.log(`  ❌ ${file} - 缺失`)
      allValid = false
    }
  }

  return allValid
}

// 验证函数入口格式
function validateHandlerFormat() {
  console.log('\n🔧 验证函数入口格式...')

  try {
    const handlerContent = fs.readFileSync('backend/src/handlers/scf-api-gateway.js', 'utf8')

    if (handlerContent.includes('exports.main_handler')) {
      console.log('  ✅ 使用正确的 main_handler 格式')
    } else {
      console.log('  ❌ 未找到 main_handler 格式')
      return false
    }

    if (handlerContent.includes('async (event, context, callback)')) {
      console.log('  ✅ 正确的SCF函数签名')
    } else {
      console.log('  ⚠️  函数签名可能需要调整')
    }

    if (handlerContent.includes('callback(null, response)')) {
      console.log('  ✅ 正确使用callback返回结果')
    } else {
      console.log('  ⚠️  可能需要使用callback返回结果')
    }

    return true

  } catch (error) {
    console.log(`  ❌ 读取handler文件失败: ${error.message}`)
    return false
  }
}

// 验证serverless配置
function validateServerlessConfig() {
  console.log('\n⚙️  验证Serverless配置...')

  try {
    const yaml = require('js-yaml')
    const config = yaml.load(fs.readFileSync('serverless-simple.yml', 'utf8'))

    // 验证provider配置
    if (config.provider?.name === 'tencent') {
      console.log('  ✅ 正确的腾讯云provider配置')
    } else {
      console.log('  ❌ provider配置错误')
      return false
    }

    // 验证handler路径
    if (config.functions?.['simple-api']?.handler) {
      console.log(`  ✅ handler配置: ${config.functions['simple-api'].handler}`)
    } else {
      console.log('  ❌ handler配置缺失')
      return false
    }

    // 验证事件触发器
    if (config.functions?.['simple-api']?.events?.[0]?.apigw) {
      console.log('  ✅ API网关触发器配置正确')
    } else {
      console.log('  ❌ API网关触发器配置错误')
      return false
    }

    // 验证插件配置
    if (config.plugins?.includes('serverless-tencent-scf')) {
      console.log('  ✅ 腾讯云SCF插件配置正确')
    } else {
      console.log('  ❌ 缺少serverless-tencent-scf插件')
      return false
    }

    return true

  } catch (error) {
    console.log(`  ❌ 解析serverless配置失败: ${error.message}`)
    return false
  }
}

// 验证环境变量
function validateEnvironment() {
  console.log('\n🌍 验证环境变量...')

  try {
    require('dotenv').config()

    const requiredEnvVars = [
      'JWT_SECRET',
      'WECHAT_APP_ID',
      'COS_SECRET_ID',
      'COS_SECRET_KEY'
    ]

    let hasRealValues = false
    for (const envVar of requiredEnvVars) {
      const value = process.env[envVar]
      if (value && !value.includes('test_') && !value.includes('fake')) {
        console.log(`  ✅ ${envVar}: 已配置真实值`)
        hasRealValues = true
      } else if (value) {
        console.log(`  ⚠️  ${envVar}: 使用测试值`)
      } else {
        console.log(`  ❌ ${envVar}: 未配置`)
      }
    }

    if (!hasRealValues) {
      console.log('\n  📝 注意: 当前使用测试环境变量，部署前请配置真实值')
    }

    return true

  } catch (error) {
    console.log(`  ❌ 环境变量验证失败: ${error.message}`)
    return false
  }
}

// 验证依赖
function validateDependencies() {
  console.log('\n📦 验证依赖包...')

  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))

    // 检查核心依赖
    const requiredDeps = ['serverless', 'serverless-tencent-scf']
    for (const dep of requiredDeps) {
      if (packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep]) {
        console.log(`  ✅ ${dep}: 已安装`)
      } else {
        console.log(`  ❌ ${dep}: 未安装`)
        return false
      }
    }

    // 检查node_modules是否存在
    if (fs.existsSync('node_modules')) {
      console.log('  ✅ node_modules目录存在')
    } else {
      console.log('  ❌ node_modules目录不存在，请运行 npm install')
      return false
    }

    return true

  } catch (error) {
    console.log(`  ❌ 依赖验证失败: ${error.message}`)
    return false
  }
}

// 生成部署建议
function generateDeploymentAdvice() {
  console.log('\n🚀 部署建议:')
  console.log('')
  console.log('1. 确保腾讯云凭证配置正确:')
  console.log('   文件位置: ~/.tencentcloud/credentials.ini')
  console.log('   格式:')
  console.log('   [default]')
  console.log('   tencent_secret_id=你的SecretId')
  console.log('   tencent_secret_key=你的SecretKey')
  console.log('   tencent_app_id=你的APPID')
  console.log('')
  console.log('2. 部署命令:')
  console.log('   sls deploy --config serverless-simple.yml')
  console.log('')
  console.log('3. 测试API:')
  console.log('   部署成功后测试: curl -X POST https://your-api-url/release/test')
  console.log('')
  console.log('4. 查看日志:')
  console.log('   sls logs -f simple-api')
}

// 主验证流程
function main() {
  console.log('🎯 AI摄影师小程序 - 腾讯云SCF部署验证')
  console.log('=' .repeat(50))

  const results = [
    validateProjectStructure(),
    validateHandlerFormat(),
    validateServerlessConfig(),
    validateEnvironment(),
    validateDependencies()
  ]

  const allValid = results.every(result => result)

  console.log('\n' + '=' .repeat(50))

  if (allValid) {
    console.log('🎉 验证通过！配置符合腾讯云SCF规范')
    console.log('✅ 可以进行部署操作')
  } else {
    console.log('⚠️  发现问题，请根据上述提示修复后重新验证')
  }

  generateDeploymentAdvice()

  process.exit(allValid ? 0 : 1)
}

// 运行验证
if (require.main === module) {
  main()
}

module.exports = {
  validateProjectStructure,
  validateHandlerFormat,
  validateServerlessConfig,
  validateEnvironment,
  validateDependencies
}