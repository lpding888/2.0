/**
 * 初始化姿势预设集合
 * 运行方式：在云开发控制台的云函数中临时执行，或通过本地调试运行
 */

const cloud = require('wx-server-sdk')
cloud.init({
  env: 'cloudbase-0gu1afji26f514d2' // 替换为你的环境ID
})

const db = cloud.database()

const initialPoses = [
  {
    _id: 'pose_001',
    name: '标准站姿',
    description: '直立站姿，双手自然下垂，展示服装正面',
    prompt: '模特保持直立站姿，双手自然下垂或轻放身侧，面向镜头，微笑自然，展示服装的正面完整效果',
    category: 'standing',
    sort_order: 1,
    is_active: true,
    icon_emoji: '👤',
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    _id: 'pose_002',
    name: 'S型曲线',
    description: '重心偏移，展现优雅曲线',
    prompt: '模特一腿微曲，重心偏向一侧，形成优雅的S型身体曲线，一只手轻放腰部或头发，展现服装的动态美感',
    category: 'dynamic',
    sort_order: 2,
    is_active: true,
    icon_emoji: '💃',
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    _id: 'pose_003',
    name: '优雅坐姿',
    description: '坐姿展示，轻松优雅',
    prompt: '模特优雅地坐在简约的白色方凳上，双腿自然交叠或并拢，手部姿态优雅自然，展现服装的休闲质感',
    category: 'sitting',
    sort_order: 3,
    is_active: true,
    icon_emoji: '🪑',
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    _id: 'pose_004',
    name: '45度侧身',
    description: '侧身展示服装轮廓',
    prompt: '模特身体转向45度角，脸部看向镜头，一只手轻搭腰部，展示服装的侧面轮廓和立体剪裁',
    category: 'side',
    sort_order: 4,
    is_active: true,
    icon_emoji: '↗️',
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    _id: 'pose_005',
    name: '回眸展示',
    description: '背面展示，优雅回眸',
    prompt: '模特背对镜头，优雅地回头看向相机，展示服装的背面设计细节和整体效果',
    category: 'back',
    sort_order: 5,
    is_active: true,
    icon_emoji: '👀',
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    _id: 'pose_006',
    name: '行走动态',
    description: '自然行走的瞬间',
    prompt: '模特做出自然行走的动作，一腿向前迈步，展现服装的动态流动感和穿着效果',
    category: 'walking',
    sort_order: 6,
    is_active: true,
    icon_emoji: '🚶',
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    _id: 'pose_007',
    name: '双手叉腰',
    description: '自信力量感姿势',
    prompt: '模特双脚分开与肩同宽，双手叉腰，展现自信和力量感，适合展示职业装和外套',
    category: 'power',
    sort_order: 7,
    is_active: true,
    icon_emoji: '💪',
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    _id: 'pose_008',
    name: '手托下巴',
    description: '优雅思考姿势',
    prompt: '模特一只手轻托下巴，呈现思考或优雅的姿态，展现服装的精致感和细节',
    category: 'elegant',
    sort_order: 8,
    is_active: true,
    icon_emoji: '🤔',
    created_at: new Date(),
    updated_at: new Date()
  }
]

async function initPosePresets() {
  try {
    console.log('开始初始化姿势预设集合...')

    // 检查集合是否存在数据
    const existingResult = await db.collection('pose_presets').count()

    if (existingResult.total > 0) {
      console.log(`⚠️ pose_presets集合已有${existingResult.total}条数据，跳过初始化`)
      console.log('如需重新初始化，请先清空集合')
      return {
        success: false,
        message: '集合已有数据，跳过初始化'
      }
    }

    // 批量添加姿势预设
    const promises = initialPoses.map(pose =>
      db.collection('pose_presets').add({
        data: pose
      })
    )

    await Promise.all(promises)

    console.log(`✅ 成功初始化${initialPoses.length}个姿势预设`)

    return {
      success: true,
      message: `成功初始化${initialPoses.length}个姿势预设`,
      count: initialPoses.length
    }

  } catch (error) {
    console.error('❌ 初始化失败:', error)
    return {
      success: false,
      message: error.message,
      error: error
    }
  }
}

// 如果在云函数中运行
exports.main = async (event, context) => {
  return await initPosePresets()
}

// 如果在本地运行
if (require.main === module) {
  initPosePresets().then(result => {
    console.log('执行结果:', result)
    process.exit(0)
  })
}
