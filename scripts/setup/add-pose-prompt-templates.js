// 添加姿势裂变提示词模板
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

/**
 * 添加姿势裂变提示词模板
 */
async function addPosePromptTemplates() {
  console.log('开始添加姿势裂变提示词模板...')

  try {
    // 姿势裂变提示词模板
    const poseTemplates = [
      {
        name: '姿势裂变-时尚摄影总监模板',
        type: 'pose_variation',
        category: 'professional',
        template: `# 角色
你是一位世界顶级的时尚摄影总监，正在指挥一次动态的广告大片拍摄。你的任务不是复制，而是基于刚刚完成的成功作品，去捕捉下一个更具创意和表现力的镜头，共同构成一个有叙事感的视觉系列。

# 核心输入
1. **上一张成功作品图片 (CONTEXT_IMAGE)**: 这是你用来**分析**和**提取**"风格DNA"的灵感来源。
2. **原始服装产品图 (PRODUCT_IMAGE)**: 这是你用来**校准**服装细节的绝对真理。

# 背景与核心原则
1. **"视觉DNA"演绎心法**: 你的核心任务是**分析 CONTEXT_IMAGE 的视觉DNA**（包括其整体色调、光线质感是软是硬、情绪是浪漫还是冷酷），然后用这套DNA去**创作一个全新的镜头**。新照片应该看起来像是出自同一位摄影师之手，但又是一个完全独立的、崭新的作品。
2. **绝对保真原则 (必须遵循)**:
    * **模特保真**: 新照片中的模特，必须与 CONTEXT_IMAGE 中的姿态不同的专业姿态，并为其量身打造一套全新的光影和构图方案。
3. **生成**: 基于以上决策，融合两张参考图的信息，以"演绎风格，而非复制元素"的原则，去"拍摄"下一张照片。
4. **交付**:
    * **[图片]**
    * **[文本]** 之后，用【简体中文】附上一段简短的创作手记，解释你的新镜头是如何延续并发展了上一张作品的风格。

# 变量
* **上一张作品的场景描述**: {location}
* **用户输入的新姿势描述**: {pose_description}`,
        description: '世界顶级时尚摄影总监风格的姿势裂变提示词模板',
        priority: 100,
        is_active: 'true',
        created_at: new Date(),
        updated_at: new Date(),
        created_time: Date.now(),
        updated_time: Date.now()
      },
      {
        name: '姿势裂变-默认模板',
        type: 'pose_variation',
        category: 'default',
        template: `保持图片的主体不变，如果用户输入动作为空 你就以服装摄影师的身份设计出下一个展示服装的动作和角度  如果用户有输入动作，严格按照用户输入的动作指导继续拍摄  拍摄地点是{location} 用户输入动作{pose_description}  输出图片输出给用户，作为摄影师想说什么就说什么吧`,
        description: '姿势裂变默认提示词模板，保持原有的简单风格',
        priority: 80,
        is_active: 'true',
        created_at: new Date(),
        updated_at: new Date(),
        created_time: Date.now(),
        updated_time: Date.now()
      },
      {
        name: '姿势裂变-专业摄影师模板',
        type: 'pose_variation',
        category: 'photography',
        template: `作为一名专业的服装摄影师，请保持当前图片的主体人物和服装不变，根据用户的动作要求调整姿势和拍摄角度。

拍摄环境：{location}
用户要求的动作：{pose_description}

请确保：
1. 保持服装主体不变，只调整姿势和角度
2. 如果用户没有指定动作，请设计一个能更好展示服装特色的专业姿势
3. 拍摄角度要突出服装的质感和设计细节
4. 姿势要自然、专业，符合时尚摄影标准

请生成展示服装的专业摄影作品。`,
        description: '专业摄影师风格的姿势裂变提示词模板',
        priority: 90,
        is_active: 'true',
        created_at: new Date(),
        updated_at: new Date(),
        created_time: Date.now(),
        updated_time: Date.now()
      }
    ]

    console.log(`准备添加 ${poseTemplates.length} 个姿势裂变模板...`)

    // 逐个添加模板
    for (const template of poseTemplates) {
      try {
        // 检查是否已存在相同名称的模板
        const existingResult = await db.collection('prompt_templates')
          .where({
            name: template.name,
            type: template.type
          })
          .get()

        if (existingResult.data.length > 0) {
          console.log(`⚠️ 模板"${template.name}"已存在，跳过添加`)
          continue
        }

        const result = await db.collection('prompt_templates').add({
          data: template
        })

        console.log(`✅ 成功添加姿势裂变模板: ${template.name} (ID: ${result._id})`)
      } catch (error) {
        console.error(`❌ 添加模板"${template.name}"失败:`, error)
      }
    }

    console.log('🎉 姿势裂变提示词模板添加完成')

    // 验证添加结果
    const verifyResult = await db.collection('prompt_templates')
      .where({
        type: 'pose_variation'
      })
      .get()

    console.log(`✅ 数据库中共有 ${verifyResult.data.length} 个姿势裂变模板`)
    verifyResult.data.forEach(template => {
      console.log(`   - ${template.name} (${template.category})`)
    })

    return {
      success: true,
      message: `成功添加姿势裂变提示词模板`,
      count: verifyResult.data.length
    }

  } catch (error) {
    console.error('❌ 添加姿势裂变提示词模板失败:', error)
    return {
      success: false,
      message: '添加姿势裂变提示词模板失败: ' + error.message
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  addPosePromptTemplates()
    .then(result => {
      console.log('执行结果:', result)
      process.exit(0)
    })
    .catch(error => {
      console.error('执行失败:', error)
      process.exit(1)
    })
}

module.exports = { addPosePromptTemplates }