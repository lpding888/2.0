// 测试photography云函数版本和异步处理
const cloud = require('wx-server-sdk')

cloud.init({
  env: 'cloudbase-0gu1afji26f514d2'
})

async function testPhotographyVersion() {
  try {
    console.log('开始测试photography云函数版本...')

    // 调用photography函数来生成一个测试任务
    const result = await cloud.callFunction({
      name: 'photography',
      data: {
        action: 'generate',
        images: [],
        parameters: {
          style: 'test',
          scenario: 'test'
        },
        count: 1
      }
    })

    console.log('Photography函数返回结果:', JSON.stringify(result, null, 2))

    if (result.result && result.result.data && result.result.data.task_id) {
      const taskId = result.result.data.task_id
      console.log('获得任务ID:', taskId)

      // 等待几秒钟，然后检查进度
      console.log('等待5秒后检查任务进度...')
      await new Promise(resolve => setTimeout(resolve, 5000))

      const progressResult = await cloud.callFunction({
        name: 'photography',
        data: {
          action: 'getProgress',
          task_id: taskId
        }
      })

      console.log('任务进度查询结果:', JSON.stringify(progressResult, null, 2))
    }

  } catch (error) {
    console.error('测试失败:', error)
  }
}

testPhotographyVersion()