// 测试worker函数部署状态
const cloud = require('wx-server-sdk')

cloud.init({
  env: 'cloudbase-0gu1afji26f514d2'
})

async function testWorkerDeployment() {
  try {
    console.log('测试photography-worker函数是否可用...')

    // 尝试直接调用photography-worker
    const result = await cloud.callFunction({
      name: 'photography-worker',
      data: {
        taskId: 'test_task_' + Date.now(),
        originalEvent: {
          images: [],
          parameters: { test: true },
          count: 1
        },
        wxContext: { OPENID: 'test_user' }
      }
    })

    console.log('photography-worker调用结果:', JSON.stringify(result, null, 2))

    if (result.result) {
      console.log('✅ photography-worker函数可用')
    } else {
      console.log('❌ photography-worker函数返回异常')
    }

  } catch (error) {
    console.error('❌ photography-worker函数调用失败:', error)

    if (error.message && error.message.includes('does not exist')) {
      console.log('💡 建议：photography-worker函数可能没有部署成功')
      console.log('请运行: .\\deploy-worker-functions.ps1')
    }
  }
}

testWorkerDeployment()