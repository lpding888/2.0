/**
 * AI模型管理工具脚本
 * 仅供管理员在本地使用，不部署到小程序中
 * 使用方法: node manage-ai-models.js [command] [options]
 */

const axios = require('axios')

class AIModelManager {
  constructor() {
    this.cloudBaseUrl = 'https://your-cloud-base-url.com' // 替换为实际的云开发URL
    this.adminToken = process.env.ADMIN_TOKEN || 'your-admin-token' // 管理员token
  }

  /**
   * 调用云函数
   */
  async callCloudFunction(functionName, data) {
    try {
      const response = await axios.post(`${this.cloudBaseUrl}/api/${functionName}`, {
        ...data,
        admin_token: this.adminToken
      })
      return response.data
    } catch (error) {
      console.error('云函数调用失败:', error.message)
      return null
    }
  }

  /**
   * 列出所有AI模型
   */
  async listModels() {
    console.log('📋 获取AI模型列表...')
    
    const result = await this.callCloudFunction('aimodels', {
      action: 'listModels'
    })

    if (result && result.success) {
      console.log('\n✅ AI模型列表:')
      console.table(result.data.map(model => ({
        ID: model._id,
        名称: model.name,
        提供商: model.provider,
        类型: model.model_type,
        状态: model.is_active ? '启用' : '禁用',
        优先级: model.priority,
        权重: model.weight
      })))
    } else {
      console.log('❌ 获取模型列表失败')
    }
  }

  /**
   * 添加新AI模型
   */
  async addModel(modelConfig) {
    console.log('➕ 添加新AI模型...')
    
    const result = await this.callCloudFunction('aimodels', {
      action: 'addModel',
      model_data: modelConfig
    })

    if (result && result.success) {
      console.log('✅ 模型添加成功:', modelConfig.name)
    } else {
      console.log('❌ 模型添加失败:', result?.message)
    }
  }

  /**
   * 更新AI模型
   */
  async updateModel(modelId, updates) {
    console.log(`🔄 更新AI模型: ${modelId}`)
    
    const result = await this.callCloudFunction('aimodels', {
      action: 'updateModel',
      model_id: modelId,
      updates: updates
    })

    if (result && result.success) {
      console.log('✅ 模型更新成功')
    } else {
      console.log('❌ 模型更新失败:', result?.message)
    }
  }

  /**
   * 删除AI模型
   */
  async deleteModel(modelId) {
    console.log(`🗑️ 删除AI模型: ${modelId}`)
    
    const result = await this.callCloudFunction('aimodels', {
      action: 'deleteModel',
      model_id: modelId
    })

    if (result && result.success) {
      console.log('✅ 模型删除成功')
    } else {
      console.log('❌ 模型删除失败:', result?.message)
    }
  }

  /**
   * 测试AI模型
   */
  async testModel(modelId) {
    console.log(`🧪 测试AI模型: ${modelId}`)
    
    const result = await this.callCloudFunction('aimodels', {
      action: 'callAIModel',
      model_id: modelId,
      prompt: 'A beautiful sunset landscape, test image',
      parameters: { count: 1, width: 512, height: 512 }
    })

    if (result && result.success) {
      console.log('✅ 模型测试成功')
      console.log('生成图片:', result.data.images)
    } else {
      console.log('❌ 模型测试失败:', result?.message)
    }
  }

  /**
   * 批量导入模型配置
   */
  async importModels(configFile) {
    const fs = require('fs')
    
    try {
      const config = JSON.parse(fs.readFileSync(configFile, 'utf8'))
      
      console.log(`📂 导入${config.models.length}个模型配置...`)
      
      for (const modelConfig of config.models) {
        await this.addModel(modelConfig)
        await new Promise(resolve => setTimeout(resolve, 1000)) // 延迟1秒
      }
      
      console.log('✅ 批量导入完成')
    } catch (error) {
      console.log('❌ 导入失败:', error.message)
    }
  }
}

// 命令行处理
async function main() {
  const manager = new AIModelManager()
  const command = process.argv[2]
  const args = process.argv.slice(3)

  switch (command) {
    case 'list':
      await manager.listModels()
      break

    case 'add':
      if (args.length < 4) {
        console.log('用法: node manage-ai-models.js add <name> <provider> <endpoint> <api_key>')
        return
      }
      await manager.addModel({
        name: args[0],
        provider: args[1],
        model_type: 'text-to-image',
        api_config: {
          endpoint: args[2],
          headers: {
            'Authorization': `Bearer ${args[3]}`,
            'Content-Type': 'application/json'
          }
        },
        parameters: {
          default: { width: 1024, height: 1024 }
        },
        is_active: true,
        priority: 5,
        weight: 5
      })
      break

    case 'update':
      if (args.length < 2) {
        console.log('用法: node manage-ai-models.js update <model_id> <field> <value>')
        return
      }
      await manager.updateModel(args[0], { [args[1]]: args[2] })
      break

    case 'delete':
      if (args.length < 1) {
        console.log('用法: node manage-ai-models.js delete <model_id>')
        return
      }
      await manager.deleteModel(args[0])
      break

    case 'test':
      if (args.length < 1) {
        console.log('用法: node manage-ai-models.js test <model_id>')
        return
      }
      await manager.testModel(args[0])
      break

    case 'import':
      if (args.length < 1) {
        console.log('用法: node manage-ai-models.js import <config.json>')
        return
      }
      await manager.importModels(args[0])
      break

    default:
      console.log(`
🤖 AI模型管理工具

可用命令:
  list                          - 列出所有AI模型
  add <name> <provider> <url> <key> - 添加新模型
  update <id> <field> <value>   - 更新模型配置
  delete <id>                   - 删除模型
  test <id>                     - 测试模型
  import <config.json>          - 批量导入模型

示例:
  node manage-ai-models.js list
  node manage-ai-models.js add "DALL-E 3" "openai" "https://api.openai.com/v1/images/generations" "sk-xxx"
  node manage-ai-models.js update "model_dalle3" "priority" "10"
  node manage-ai-models.js delete "model_old"
  node manage-ai-models.js test "model_dalle3"
      `)
  }
}

if (require.main === module) {
  main().catch(console.error)
}

module.exports = AIModelManager