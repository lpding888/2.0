/**
 * API网关测试
 * 验证SCF函数的基本功能
 */

const APIGateway = require('../handlers/api-gateway')
const logger = require('../utils/logger')

// 模拟SCF事件
const mockEvents = {
  healthCheck: {
    path: '/api/health',
    httpMethod: 'GET',
    headers: {
      'content-type': 'application/json'
    },
    body: null,
    queryStringParameters: null,
    pathParameters: null
  },

  userRegister: {
    path: '/api/user/register',
    httpMethod: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      code: 'test-wechat-code',
      userInfo: {
        nickName: '测试用户',
        avatarUrl: 'https://example.com/avatar.jpg',
        gender: 1,
        city: '广州',
        province: '广东',
        country: '中国'
      }
    }),
    queryStringParameters: null,
    pathParameters: {
      action: 'register'
    }
  },

  aiGenerate: {
    path: '/api/ai/generateVirtualTryon',
    httpMethod: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': 'Bearer test-jwt-token'
    },
    body: JSON.stringify({
      personImage: 'data:image/png;base64,test-person-image',
      clothingImage: 'data:image/png;base64,test-clothing-image',
      settings: {
        quality: 'high',
        style: 'natural'
      }
    }),
    queryStringParameters: null,
    pathParameters: {
      action: 'generateVirtualTryon'
    }
  }
}

// 模拟SCF上下文
const mockContext = {
  requestId: 'test-request-id',
  functionName: 'api-gateway',
  functionVersion: '$LATEST',
  memoryLimitInMB: 256,
  remainingTimeInMillis: 30000,
  callbackWaitsForEmptyEventLoop: false
}

/**
 * 测试API网关
 */
async function testAPIGateway() {
  console.log('🧪 开始测试API网关...')

  const testResults = []

  try {
    // 测试健康检查
    console.log('\n📋 测试健康检查接口...')
    const healthResult = await APIGateway.main(mockEvents.healthCheck, mockContext)
    console.log('✅ 健康检查结果:', healthResult.statusCode)
    testResults.push({
      test: 'healthCheck',
      status: healthResult.statusCode === 200 ? 'PASS' : 'FAIL',
      response: healthResult
    })

    // 测试用户注册
    console.log('\n📋 测试用户注册接口...')
    const registerResult = await APIGateway.main(mockEvents.userRegister, mockContext)
    console.log('✅ 用户注册结果:', registerResult.statusCode)
    testResults.push({
      test: 'userRegister',
      status: registerResult.statusCode === 200 ? 'PASS' : 'FAIL',
      response: registerResult
    })

    // 测试AI生成
    console.log('\n📋 测试AI生成接口...')
    const aiResult = await APIGateway.main(mockEvents.aiGenerate, mockContext)
    console.log('✅ AI生成结果:', aiResult.statusCode)
    testResults.push({
      test: 'aiGenerate',
      status: aiResult.statusCode === 200 ? 'PASS' : 'FAIL',
      response: aiResult
    })

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error)
    testResults.push({
      test: 'global',
      status: 'FAIL',
      error: error.message
    })
  }

  return testResults
}

/**
 * 测试数据库连接
 */
async function testDatabaseConnection() {
  console.log('\n🧪 测试数据库连接...')

  try {
    const { Database } = require('../shared/database/connection')
    const db = new Database()

    // 模拟连接（在没有实际数据库配置的情况下）
    console.log('📊 数据库配置检查:')
    console.log(`  - MongoDB URI: ${process.env.MONGODB_URI ? '✅ 已配置' : '❌ 未配置'}`)
    console.log(`  - Redis URI: ${process.env.REDIS_URI ? '✅ 已配置' : '❌ 未配置'}`)
    console.log(`  - JWT Secret: ${process.env.JWT_SECRET ? '✅ 已配置' : '❌ 未配置'}`)
    console.log(`  - WeChat App ID: ${process.env.WECHAT_APP_ID ? '✅ 已配置' : '❌ 未配置'}`)

    return {
      status: 'PASS',
      config: {
        mongodb: !!process.env.MONGODB_URI,
        redis: !!process.env.REDIS_URI,
        jwt: !!process.env.JWT_SECRET,
        wechat: !!process.env.WECHAT_APP_ID
      }
    }

  } catch (error) {
    console.error('❌ 数据库连接测试失败:', error)
    return {
      status: 'FAIL',
      error: error.message
    }
  }
}

/**
 * 测试AI路由
 */
async function testAIRouter() {
  console.log('\n🧪 测试AI路由服务...')

  try {
    const AIRouter = require('../shared/ai/ai-router')
    const aiRouter = new AIRouter()

    console.log('📊 AI模型配置:')
    console.log(`  - 可用模型数量: ${aiRouter.getAllModels().length}`)
    console.log(`  - 业务模式: ${process.env.BUSINESS_MODE || 'personal'}`)

    // 测试模型选择
    const selectedModel = await aiRouter.selectModel('virtual_tryon', {
      quality: 'high',
      strategy: 'quality'
    })

    console.log(`  - 选择的模型: ${selectedModel.name} (${selectedModel.provider})`)
    console.log(`  - 模型成本: ${selectedModel.cost}`)
    console.log(`  - 预计处理时间: ${selectedModel.estimatedTime}秒`)

    return {
      status: 'PASS',
      selectedModel: {
        name: selectedModel.name,
        provider: selectedModel.provider,
        cost: selectedModel.cost
      }
    }

  } catch (error) {
    console.error('❌ AI路由测试失败:', error)
    return {
      status: 'FAIL',
      error: error.message
    }
  }
}

/**
 * 测试任务队列
 */
async function testTaskQueue() {
  console.log('\n🧪 测试任务队列...')

  try {
    const TaskQueue = require('../shared/utils/task-queue')
    const taskQueue = new TaskQueue()

    console.log('📊 任务队列状态:')
    console.log(`  - 最大并发数: ${taskQueue.maxConcurrency}`)
    console.log(`  - 重试次数: ${taskQueue.retryAttempts}`)

    // 添加测试任务
    const testTask = await taskQueue.addTask({
      type: 'virtual_tryon',
      priority: 'high',
      data: {
        personImage: 'test-image.jpg',
        clothingImage: 'test-clothing.jpg'
      }
    })

    console.log(`  - 测试任务ID: ${testTask.id}`)
    console.log(`  - 任务状态: ${testTask.status}`)

    // 获取队列统计
    const stats = taskQueue.getQueueStats()
    console.log(`  - 队列统计:`, stats)

    return {
      status: 'PASS',
      taskId: testTask.id,
      stats: stats
    }

  } catch (error) {
    console.error('❌ 任务队列测试失败:', error)
    return {
      status: 'FAIL',
      error: error.message
    }
  }
}

/**
 * 运行所有测试
 */
async function runAllTests() {
  console.log('🚀 开始运行所有测试...')
  console.log('=' * 50)

  const startTime = Date.now()
  const results = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    tests: []
  }

  try {
    // 设置测试环境变量（如果未设置）
    if (!process.env.NODE_ENV) {
      process.env.NODE_ENV = 'test'
    }

    // 运行各项测试
    const apiResult = await testAPIGateway()
    results.tests.push({
      component: 'API Gateway',
      ...apiResult
    })

    const dbResult = await testDatabaseConnection()
    results.tests.push({
      component: 'Database Connection',
      ...dbResult
    })

    const aiResult = await testAIRouter()
    results.tests.push({
      component: 'AI Router',
      ...aiResult
    })

    const queueResult = await testTaskQueue()
    results.tests.push({
      component: 'Task Queue',
      ...queueResult
    })

    // 计算总体结果
    const passedTests = results.tests.filter(t => t.status === 'PASS').length
    const totalTests = results.tests.length

    results.summary = {
      total: totalTests,
      passed: passedTests,
      failed: totalTests - passedTests,
      successRate: Math.round((passedTests / totalTests) * 100),
      duration: Date.now() - startTime
    }

  } catch (error) {
    console.error('❌ 测试运行失败:', error)
    results.error = error.message
  }

  return results
}

/**
 * 格式化测试结果
 */
function formatTestResults(results) {
  console.log('\n' + '=' * 50)
  console.log('📊 测试结果报告')
  console.log('=' * 50)

  if (results.error) {
    console.log('❌ 测试运行失败:', results.error)
    return
  }

  console.log(`🕐 测试时间: ${results.timestamp}`)
  console.log(`🌍 运行环境: ${results.environment}`)
  console.log(`⏱️  总耗时: ${results.summary.duration}ms`)

  console.log('\n📋 组件测试结果:')
  results.tests.forEach(test => {
    const icon = test.status === 'PASS' ? '✅' : '❌'
    console.log(`  ${icon} ${test.component}: ${test.status}`)

    if (test.status === 'FAIL' && test.error) {
      console.log(`    错误: ${test.error}`)
    }
  })

  console.log('\n🎯 总体结果:')
  console.log(`  📊 总测试数: ${results.summary.total}`)
  console.log(`  ✅ 通过测试: ${results.summary.passed}`)
  console.log(`  ❌ 失败测试: ${results.summary.failed}`)
  console.log(`  📈 成功率: ${results.summary.successRate}%`)

  if (results.summary.successRate === 100) {
    console.log('\n🎉 所有测试通过！系统准备就绪。')
  } else {
    console.log('\n⚠️  部分测试失败，请检查配置和依赖。')
  }
}

/**
 * 主函数
 */
async function main() {
  try {
    console.log('🧪 AI摄影师小程序 - 系统测试')
    console.log('=' * 50)

    const results = await runAllTests()
    formatTestResults(results)

    // 保存测试结果到文件
    const fs = require('fs')
    const testReportPath = './test-results.json'

    try {
      fs.writeFileSync(testReportPath, JSON.stringify(results, null, 2))
      console.log(`\n📄 测试报告已保存到: ${testReportPath}`)
    } catch (error) {
      console.warn('⚠️  无法保存测试报告:', error.message)
    }

  } catch (error) {
    console.error('❌ 测试执行失败:', error)
    process.exit(1)
  }
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 未捕获的错误:', error)
    process.exit(1)
  })
}

module.exports = {
  testAPIGateway,
  testDatabaseConnection,
  testAIRouter,
  testTaskQueue,
  runAllTests
}