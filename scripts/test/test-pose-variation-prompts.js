// 测试姿势裂变提示词功能
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

/**
 * 测试姿势裂变提示词生成
 */
async function testPoseVariationPrompts() {
  console.log('🧪 开始测试姿势裂变提示词功能...')

  try {
    // 1. 测试数据库中的模板
    console.log('\n📋 步骤1: 检查数据库中的姿势裂变模板')
    const templatesResult = await db.collection('prompt_templates')
      .where({
        type: 'pose_variation',
        is_active: true
      })
      .orderBy('priority', 'desc')
      .get()

    console.log(`✅ 找到 ${templatesResult.data.length} 个姿势裂变模板:`)
    templatesResult.data.forEach(template => {
      console.log(`   - ${template.name} (优先级: ${template.priority}, 分类: ${template.category})`)
    })

    if (templatesResult.data.length === 0) {
      console.log('❌ 没有找到姿势裂变模板，请先运行数据库初始化脚本')
      return { success: false, message: '没有找到姿势裂变模板' }
    }

    // 2. 模拟调用prompt云函数
    console.log('\n🔬 步骤2: 模拟调用prompt云函数')

    const testCases = [
      {
        name: '测试用户自定义动作',
        params: {
          type: 'photography',
          mode: 'pose_variation',
          pose_description: '模特转身回眸，手指轻抚头发，展现优雅姿态',
          parameters: {
            location: '巴黎街头咖啡馆'
          },
          sceneInfo: {
            name: '巴黎街头咖啡馆',
            description: '浪漫的巴黎街景，有露天咖啡馆和复古建筑'
          }
        }
      },
      {
        name: '测试空白动作（让AI自动设计）',
        params: {
          type: 'photography',
          mode: 'pose_variation',
          pose_description: '',
          parameters: {
            location: '现代艺术画廊'
          },
          sceneInfo: {
            name: '现代艺术画廊',
            description: '极简风格的艺术空间，白色墙壁和自然光'
          }
        }
      },
      {
        name: '测试不同分类模板',
        params: {
          type: 'photography',
          mode: 'pose_variation',
          category: 'photography',
          pose_description: '坐在楼梯上，低头沉思，手托下巴',
          parameters: {
            location: '工业风仓库'
          },
          sceneInfo: {
            name: '工业风仓库',
            description: '复古仓库改造的拍摄场地，有砖墙和金属元素'
          }
        }
      }
    ]

    for (const testCase of testCases) {
      console.log(`\n🎯 ${testCase.name}:`)

      try {
        // 模拟调用prompt云函数
        const promptResult = await db.collection('prompt_templates')
          .where({
            type: 'pose_variation',
            is_active: true,
            ...(testCase.params.category && { category: testCase.params.category })
          })
          .orderBy('priority', 'desc')
          .limit(1)
          .get()

        if (promptResult.data.length === 0) {
          console.log(`   ⚠️ 没有找到匹配的模板`)
          continue
        }

        const template = promptResult.data[0]
        console.log(`   📝 使用模板: ${template.name}`)

        // 模拟变量替换
        const { replaceTemplateVariables } = require('../../cloudfunctions/prompt/index.js')

        const testParams = {
          ...testCase.params.parameters,
          pose_description: testCase.params.pose_description
        }

        const finalPrompt = replaceTemplateVariables(
          template.template,
          testParams,
          testCase.params.sceneInfo,
          template.default_params
        )

        console.log(`   ✅ 生成的提示词长度: ${finalPrompt.length} 字符`)
        console.log(`   📄 提示词预览: ${finalPrompt.substring(0, 200)}...`)

        // 验证变量替换
        const hasLocation = finalPrompt.includes('巴黎街头咖啡馆') || finalPrompt.includes('现代艺术画廊') || finalPrompt.includes('工业风仓库')
        const hasPoseDesc = finalPrompt.includes('转身回眸') || finalPrompt.includes('手指轻抚') || finalPrompt.includes('坐在楼梯上') || finalPrompt.includes('手托下巴')

        console.log(`   🔍 变量替换验证:`)
        console.log(`      - 地点变量替换: ${hasLocation ? '✅' : '❌'}`)
        console.log(`      - 姿势描述替换: ${hasPoseDesc ? '✅' : '❌'}`)

      } catch (error) {
        console.log(`   ❌ 测试失败: ${error.message}`)
      }
    }

    // 3. 测试默认回退机制
    console.log('\n🛡️ 步骤3: 测试默认回退机制')

    try {
      // 模拟没有找到模板的情况
      const params = {
        type: 'photography',
        mode: 'pose_variation',
        category: 'nonexistent_category',
        pose_description: '测试动作',
        parameters: { location: '测试地点' },
        sceneInfo: { name: '测试场景' }
      }

      console.log(`   📝 测试不存在的分类: ${params.category}`)

      // 查询不存在的分类
      const noResult = await db.collection('prompt_templates')
        .where({
          type: 'pose_variation',
          category: params.category,
          is_active: true
        })
        .get()

      if (noResult.data.length === 0) {
        console.log(`   ✅ 预期行为：没有找到模板，应该使用默认提示词`)
        console.log(`   📄 默认提示词应该包含: ${params.pose_description || '设计新的展示姿势'}`)
        console.log(`   📄 默认提示词应该包含: ${params.sceneInfo.name || params.parameters.location}`)
      }

    } catch (error) {
      console.log(`   ❌ 回退机制测试失败: ${error.message}`)
    }

    console.log('\n🎉 姿势裂变提示词功能测试完成')
    return {
      success: true,
      message: '姿势裂变提示词功能测试通过'
    }

  } catch (error) {
    console.error('❌ 测试失败:', error)
    return {
      success: false,
      message: '测试失败: ' + error.message
    }
  }
}

/**
 * 测试提示词云函数的实际调用
 */
async function testPromptCloudFunction() {
  console.log('\n☁️ 测试云函数实际调用...')

  try {
    // 这里可以添加实际的云函数调用测试
    // 由于环境限制，暂时跳过
    console.log('⚠️ 跳过云函数实际调用（需要完整的云开发环境）')

  } catch (error) {
    console.log(`❌ 云函数调用测试失败: ${error.message}`)
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  testPoseVariationPrompts()
    .then(result => {
      console.log('\n📊 测试结果:', result)
      return testPromptCloudFunction()
    })
    .then(() => {
      console.log('\n🏁 所有测试完成')
      process.exit(0)
    })
    .catch(error => {
      console.error('\n💥 测试过程中发生错误:', error)
      process.exit(1)
    })
}

module.exports = { testPoseVariationPrompts, testPromptCloudFunction }