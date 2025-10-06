// 调试管理员权限问题的脚本
// 在小程序中运行此脚本来排查权限问题

console.log('=== 开始调试管理员权限问题 ===')

// 步骤1: 获取当前用户openid
wx.cloud.callFunction({
  name: 'auth',
  data: {
    action: 'getAdminInfo'
  },
  success: res => {
    console.log('🔍 步骤1 - 获取当前用户信息:')
    console.log('响应结果:', res.result)
    
    // 无论成功失败，都获取openid
    const openid = res.result?.openid || '从WXContext获取失败'
    console.log('🆔 当前用户openid:', openid)
    
    // 步骤2: 检查环境变量
    wx.cloud.callFunction({
      name: 'debug-scenes',
      data: {
        action: 'debugAdminPermission',
        targetOpenid: openid
      },
      success: debugRes => {
        console.log('🔍 步骤2 - 环境变量检查:')
        console.log('调试结果:', debugRes.result)
        
        // 步骤3: 检查admin_users集合
        wx.cloud.callFunction({
          name: 'auth',
          data: {
            action: 'checkPermission'
          },
          success: checkRes => {
            console.log('🔍 步骤3 - 数据库权限检查:')
            console.log('检查结果:', checkRes.result)
            
            // 汇总诊断结果
            console.log('\n📋 === 诊断汇总 ===')
            console.log('1. 用户openid:', openid)
            console.log('2. 环境变量状态:', debugRes.result?.envCheck || '未知')
            console.log('3. 数据库权限:', checkRes.result?.success ? '✅ 通过' : '❌ 失败')
            console.log('4. 失败原因:', checkRes.result?.error || '无')
          },
          fail: checkErr => {
            console.error('❌ 步骤3失败:', checkErr)
          }
        })
      },
      fail: debugErr => {
        console.error('❌ 步骤2失败:', debugErr)
      }
    })
  },
  fail: err => {
    console.error('❌ 步骤1失败:', err)
    
    // 尝试备用方法获取openid
    wx.cloud.callFunction({
      name: 'user',
      data: {
        action: 'getUserInfo'
      },
      success: backupRes => {
        console.log('🔄 备用方法获取用户信息:', backupRes.result)
      },
      fail: backupErr => {
        console.error('❌ 备用方法也失败:', backupErr)
      }
    })
  }
})

// 步骤4: 手动测试权限
setTimeout(() => {
  console.log('\n🧪 === 开始手动权限测试 ===')
  
  // 测试AI模型管理权限
  wx.cloud.callFunction({
    name: 'aimodels',
    data: {
      action: 'checkAdminPermission'
    },
    success: res => {
      console.log('🔍 AI模型管理权限:', res.result)
    },
    fail: err => {
      console.error('❌ AI模型管理权限测试失败:', err)
    }
  })
  
  // 测试提示词管理权限
  wx.cloud.callFunction({
    name: 'prompt',
    data: {
      action: 'getTemplates',
      type: 'photography'
    },
    success: res => {
      console.log('🔍 提示词查看权限:', res.result?.success ? '✅ 通过' : '❌ 失败')
      
      // 尝试添加测试模板（需要管理员权限）
      wx.cloud.callFunction({
        name: 'prompt',
        data: {
          action: 'addTemplate',
          template_data: {
            type: 'photography',
            category: 'test',
            name: '测试模板',
            template: '测试提示词内容',
            description: '权限测试用的临时模板'
          }
        },
        success: addRes => {
          console.log('🔍 提示词添加权限:', addRes.result)
          
          // 如果添加成功，立即删除
          if (addRes.result?.success && addRes.result?.data?.template_id) {
            wx.cloud.callFunction({
              name: 'prompt',
              data: {
                action: 'deleteTemplate',
                template_id: addRes.result.data.template_id
              },
              success: delRes => {
                console.log('🧹 清理测试模板:', delRes.result?.message || '删除完成')
              }
            })
          }
        },
        fail: addErr => {
          console.error('❌ 提示词添加权限测试失败:', addErr)
        }
      })
    },
    fail: err => {
      console.error('❌ 提示词权限测试失败:', err)
    }
  })
}, 2000)

console.log('📝 请查看控制台输出的详细诊断信息')