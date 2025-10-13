# 造型规划器完整开发计划

## 🎯 项目目标

**核心定位**：从"创意工具"升级为"个人形象管理助手"
**核心问题**：解决"我明天/下周/下个月的重要场合，该穿什么？"
**交付时间**：今晚完成所有功能

---

## 📋 开发阶段总览

```
阶段一：重构"我的衣柜"（基础数据源）       [2小时]
阶段二：创建"造型规划器"核心模块           [3小时]
阶段三：实现"AI造型师建议"               [1.5小时]
阶段四：整合所有功能模块                  [1.5小时]
阶段五：测试和文档编写                    [1小时]
----------------------------------------------
总计：9小时
```

---

## 🔧 阶段一：重构"我的衣柜" [2小时]

### 目标
完成衣物管理的核心功能，作为规划器的数据来源

### 任务清单

#### 1.1 简化界面结构 [30分钟]
- ✅ 移除"套装视图"Tab，专注于单品管理
- ✅ 重构顶部导航：标题 + 搜索图标
- ✅ 优化分类筛选：横向滚动标签（全部/上装/下装/连衣裙/鞋子/配饰）
- ✅ 优化衣物网格：每行2-3件，图片清爽展示
- ✅ 添加悬浮FAB按钮（右下角大圆形"+"）

**文件修改**：
- `wardrobe.wxml` - 重构界面结构
- `wardrobe.wxss` - 优化样式
- `wardrobe.js` - 移除套装相关逻辑

#### 1.2 实现添加衣物完整流程 [60分钟]

**流程设计**：
```
点击FAB按钮
    ↓
Step 1: 拍照/选择照片
    ↓
Step 2: AI抠图处理（魔法时刻）
    - 显示加载动画："AI正在打理您的衣物…"
    - 调用腾讯云CI抠图API
    - 展示前后对比
    - 提供裁剪、旋转工具
    ↓
Step 3: 补充信息
    - 顶部显示抠图后的干净衣物
    - 名称输入框
    - 分类选择（标签按钮）
    - 智能标签（AI分析建议：#牛仔 #蓝色 #休闲）
    - 大按钮："存入我的衣柜"
    ↓
保存成功（烟花动画）→ 返回衣柜主界面
```

**需要创建的文件**：
- `pages/wardrobe/add-clothing/add-clothing.wxml` - 添加衣物页面
- `pages/wardrobe/add-clothing/add-clothing.wxss`
- `pages/wardrobe/add-clothing/add-clothing.js`
- `pages/wardrobe/add-clothing/add-clothing.json`

**需要创建的工具函数**：
- `utils/tencent-ci.js` - 腾讯云CI抠图服务封装

#### 1.3 集成腾讯云CI抠图 [30分钟]

**API集成**：
```javascript
// utils/tencent-ci.js
export async function mattingImage(imageUrl) {
  // 1. 调用腾讯云数据万象抠图API
  // 2. 返回处理后的图片URL
  // 3. 错误处理
}
```

**费用提示**：
- 0.15元/张（已有资源包）
- 在确认前提示用户

#### 1.4 完善衣物详情和编辑 [10分钟]

**功能**：
- 点击衣物卡片：进入详情页
- 长按：弹出快捷菜单（编辑/删除/设为常穿）
- 详情页展示：大图、名称、标签、使用记录

---

## 🗓️ 阶段二：创建"造型规划器"核心模块 [3小时]

### 目标
创建以月历为中心的造型规划和回忆管理系统

### 任务清单

#### 2.1 创建页面文件结构 [10分钟]

**新建文件**：
```
pages/
  styling-planner/
    ├── styling-planner.wxml
    ├── styling-planner.wxss
    ├── styling-planner.js
    ├── styling-planner.json
    └── components/
        ├── calendar/           # 月历组件
        │   ├── calendar.wxml
        │   ├── calendar.wxss
        │   ├── calendar.js
        │   └── calendar.json
        ├── event-card/         # 事件详情卡片
        │   └── ...
        └── outfit-selector/    # 造型选择器
            └── ...
```

**更新app.json**：
```json
{
  "pages": [
    "pages/styling-planner/styling-planner"
  ],
  "tabBar": {
    "list": [
      {
        "pagePath": "pages/styling-planner/styling-planner",
        "text": "规划",
        "iconPath": "images/calendar.png",
        "selectedIconPath": "images/calendar-active.png"
      }
    ]
  }
}
```

#### 2.2 实现月历视图 [60分钟]

**核心功能**：
- 月历网格布局（7列 × 5-6行）
- 左右滑动切换月份
- 今天高亮标记
- 自动获取未来7天天气预报

**日期格子显示逻辑**：
```javascript
// 每个日期格子
{
  date: "2025-01-10",

  // 显示元素
  display: {
    dot: "🔴",           // 事件标记点
    thumbnail: "url",    // 造型缩略图
    weather: "☀️ 25°"    // 天气（仅未来7天）
  },

  // 数据
  event: { ... },        // 规划事件
  memory: { ... }        // 回忆记录
}
```

**交互设计**：
- 点击未来日期 → 进入"规划流程"
- 点击有内容的日期 → 查看详情
- 点击过去日期 → 查看回忆

#### 2.3 实现规划流程 [90分钟]

**Step 1: 创建事件弹窗** [30分钟]

```xml
<!-- event-create-modal.wxml -->
<view class="modal">
  <view class="modal-header">
    <text>为 {{selectedDate}} 创建事件</text>
  </view>

  <input placeholder="事件名称" />

  <view class="event-types">
    <view class="type-btn" data-type="business">💼 商务</view>
    <view class="type-btn" data-type="party">🎉 聚会</view>
    <view class="type-btn" data-type="date">💝 约会</view>
    <view class="type-btn" data-type="photo">📸 拍照</view>
    <view class="type-btn" data-type="travel">✈️ 旅行</view>
    <view class="type-btn" data-type="other">其他</view>
  </view>

  <view class="weather-display">
    <text>天气预报：{{weather}}</text>
  </view>

  <button bindtap="nextStep">下一步：选择造型</button>
</view>
```

**Step 2: 造型选择器** [40分钟]

```xml
<!-- outfit-selector.wxml -->
<view class="outfit-selector">
  <!-- Tab切换 -->
  <view class="tabs">
    <view class="tab active">我的衣柜</view>
    <view class="tab">我的套装</view>
    <view class="tab">新创建</view>
  </view>

  <!-- Tab1: 我的衣柜 -->
  <view class="wardrobe-view">
    <!-- 分类区域 -->
    <view class="category-section">
      <text>上装</text>
      <scroll-view scroll-x>
        <view class="item" wx:for="{{tops}}" bindtap="selectItem">
          <image src="{{item.url}}" />
        </view>
      </scroll-view>
    </view>

    <!-- 中央数字人预览 -->
    <view class="avatar-preview">
      <image src="{{composedLook}}" />
    </view>

    <!-- AI建议按钮 -->
    <button class="ai-btn" bindtap="getAISuggestion">
      <text>✨ AI造型师建议</text>
    </button>
  </view>

  <!-- 底部确认 -->
  <button bindtap="confirmOutfit">确定规划这套造型</button>
</view>
```

**Step 3: 确认保存** [20分钟]

```javascript
// 数据结构
const plannedEvent = {
  id: `plan_${Date.now()}`,
  date: "2025-01-10",
  event: {
    title: "朋友婚礼",
    type: "party",
    weather: { icon: "☀️", desc: "晴", temp: "18-25℃" }
  },
  outfit: {
    items: [itemId1, itemId2, itemId3],
    preview: "cloud://composed-look.png",
    aiSuggestion: "优雅半正式Look...",
    source: "wardrobe" // wardrobe | saved_outfit | new
  },
  status: "planned",
  createdAt: new Date().toISOString()
}

// 保存到本地存储
wx.setStorageSync('styling_planner_events', events)
```

#### 2.4 实现回忆记录功能 [30分钟]

**从AI摄影保存**：
```javascript
// 在photography页面生成结果后
bindtap="saveToPlanner"

// 弹窗选择日期
showModal({
  title: "保存到造型规划器",
  content: "选择日期",
  datePicker: true
})

// 保存数据
const memory = {
  id: `memory_${Date.now()}`,
  date: selectedDate,
  image: resultImageUrl,
  outfit: usedOutfitId,
  location: "东京",
  note: "美好的一天",
  type: "memory"
}
```

**月历显示**：
- 有回忆的日期显示照片缩略图
- 点击查看详情（大图+回忆描述）

---

## 🤖 阶段三：实现"AI造型师建议" [1.5小时]

### 目标
基于事件、天气、衣柜内容提供智能搭配建议

### 任务清单

#### 3.1 创建AI建议服务 [30分钟]

**文件**：`utils/ai-stylist.js`

```javascript
// AI提示词生成
function generateStylistPrompt(event, weather, wardrobeItems) {
  return `你是一位专业的时尚造型师。

用户信息：
- 计划日期：${event.date}
- 事件类型：${event.type}（${getEventDescription(event.type)}）
- 天气预报：${weather.desc}，${weather.temp}

用户衣柜单品（共${wardrobeItems.length}件）：
${wardrobeItems.map(item =>
  `- ${item.name}（${item.category}，${item.color}，${item.tags.join('、')}）`
).join('\n')}

任务：
1. 从用户衣柜中选择3-5件单品组成一套完整造型
2. 考虑场合的正式度、天气的适宜性、色彩搭配和谐性
3. 给出搭配理由（2-3句话）

返回JSON格式：
{
  "outfitName": "造型名称",
  "items": ["单品ID1", "单品ID2", "单品ID3"],
  "reason": "推荐理由"
}`
}

// 调用LLM
export async function getAIStylingAdvice(event, weather, wardrobeItems) {
  const prompt = generateStylistPrompt(event, weather, wardrobeItems)

  // 调用云函数
  const res = await wx.cloud.callFunction({
    name: 'ai-stylist',
    data: { prompt }
  })

  return res.result
}
```

#### 3.2 创建AI建议云函数 [30分钟]

**文件**：`cloudfunctions/ai-stylist/index.js`

```javascript
const cloud = require('wx-server-sdk')
cloud.init()

exports.main = async (event, context) => {
  const { prompt } = event

  try {
    // 调用OpenAI API或其他LLM
    const response = await callLLM({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: '你是专业时尚造型师' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' }
    })

    const suggestion = JSON.parse(response.content)

    return {
      success: true,
      data: suggestion
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}
```

#### 3.3 实现建议展示和应用 [30分钟]

**UI设计**：
```xml
<!-- ai-suggestion-modal.wxml -->
<view class="ai-modal">
  <view class="loading" wx:if="{{loading}}">
    <view class="spinner"></view>
    <text>AI造型师正在思考...</text>
  </view>

  <view class="suggestion" wx:else>
    <text class="title">{{suggestion.outfitName}}</text>

    <view class="items-preview">
      <image wx:for="{{suggestion.itemsWithImages}}" src="{{item.url}}" />
    </view>

    <view class="reason">
      <text>💡 推荐理由</text>
      <text>{{suggestion.reason}}</text>
    </view>

    <view class="actions">
      <button bindtap="close">换一个建议</button>
      <button class="primary" bindtap="applySuggestion">采纳建议</button>
    </view>
  </view>
</view>
```

---

## 🔗 阶段四：整合所有功能模块 [1.5小时]

### 目标
打通数据流，实现完整的用户旅程

### 任务清单

#### 4.1 数据管理统一 [30分钟]

**创建全局数据管理**：`utils/data-manager.js`

```javascript
class DataManager {
  // 衣柜数据
  getWardrobeItems() { }
  addWardrobeItem(item) { }
  updateWardrobeItem(id, data) { }
  deleteWardrobeItem(id) { }

  // 规划器数据
  getPlannerEvents(startDate, endDate) { }
  addPlannerEvent(event) { }
  updatePlannerEvent(id, data) { }
  deletePlannerEvent(id) { }

  // 回忆数据
  getMemories(startDate, endDate) { }
  addMemory(memory) { }

  // 统计数据
  getItemUsageStats() { }
  getMostUsedItems(limit) { }

  // 同步到云端（可选）
  syncToCloud() { }
}

export default new DataManager()
```

#### 4.2 页面跳转流程梳理 [20分钟]

**完整用户旅程**：

```
【入口1：从规划器新增衣物】
规划器造型选择 → "去衣柜添加" → 衣柜添加页面
→ AI抠图 → 信息补充 → 保存 → 返回规划器

【入口2：从AI摄影保存回忆】
AI摄影结果页 → "保存到规划器" → 选择日期弹窗
→ 确认 → 跳转到规划器（定位到该日期）

【入口3：从衣柜使用单品】
衣柜列表 → 点击单品 → 详情页 → "用于规划"
→ 跳转到规划器选择日期

【入口4：查看历史穿搭】
规划器月历 → 点击过去日期 → 查看详情
→ "重新穿这套" → 跳转试衣间
```

**实现页面参数传递**：
```javascript
// 携带数据跳转
wx.navigateTo({
  url: '/pages/styling-planner/styling-planner?action=create&itemId=123'
})

// 接收参数
onLoad(options) {
  if (options.action === 'create') {
    this.preSelectItem(options.itemId)
  }
}
```

#### 4.3 实现数字人换装预览 [40分钟]

**方案选择**：
- 方案A：纯前端Canvas合成（快速，但效果一般）
- 方案B：调用AI试衣API（效果好，但需要时间）

**推荐方案A（本次实现）**：
```javascript
// utils/outfit-composer.js
export async function composeOutfit(avatarImage, clothingItems) {
  const canvas = wx.createCanvasContext('outfit-canvas')

  // 1. 绘制数字人底图
  canvas.drawImage(avatarImage, 0, 0, 375, 600)

  // 2. 按层级绘制衣物（下装 → 上装 → 配饰）
  clothingItems
    .sort((a, b) => a.layer - b.layer)
    .forEach(item => {
      canvas.drawImage(item.url, item.x, item.y, item.width, item.height)
    })

  // 3. 导出图片
  return new Promise((resolve) => {
    canvas.draw(false, () => {
      wx.canvasToTempFilePath({
        canvasId: 'outfit-canvas',
        success: res => resolve(res.tempFilePath)
      })
    })
  })
}
```

---

## 📝 阶段五：测试和文档编写 [1小时]

### 任务清单

#### 5.1 功能测试 [30分钟]

**测试用例**：

1. **衣柜功能**
   - [ ] 添加衣物（拍照 → AI抠图 → 保存）
   - [ ] 查看衣物列表（分类筛选、搜索）
   - [ ] 编辑衣物信息
   - [ ] 删除衣物

2. **规划器功能**
   - [ ] 查看月历（切换月份）
   - [ ] 创建事件（输入信息 → 选择造型 → 保存）
   - [ ] 查看规划详情
   - [ ] 修改/删除规划

3. **AI建议**
   - [ ] 点击"AI造型师建议"
   - [ ] 查看建议内容
   - [ ] 采纳建议

4. **回忆记录**
   - [ ] 从AI摄影保存照片
   - [ ] 查看历史回忆

5. **数据流转**
   - [ ] 衣柜 → 规划器
   - [ ] AI摄影 → 规划器
   - [ ] 规划器 → 试衣间

#### 5.2 编写功能文档 [30分钟]

**创建文档**：

1. **用户手册** - `docs/user-manual-styling-planner.md`
   - 功能介绍
   - 使用步骤（图文）
   - 常见问题

2. **开发文档** - `docs/developer-guide-styling-planner.md`
   - 架构设计
   - 数据结构
   - API接口
   - 扩展指南

3. **部署文档** - `docs/deployment-styling-planner.md`
   - 云函数部署
   - 腾讯云CI配置
   - 环境变量配置

---

## 📦 交付清单

### 代码文件

```
miniprogram/
├── pages/
│   ├── wardrobe/                      # 衣柜（重构）
│   │   ├── wardrobe.wxml
│   │   ├── wardrobe.wxss
│   │   ├── wardrobe.js
│   │   ├── wardrobe.json
│   │   └── add-clothing/              # 添加衣物
│   │       ├── add-clothing.wxml
│   │       ├── add-clothing.wxss
│   │       ├── add-clothing.js
│   │       └── add-clothing.json
│   │
│   └── styling-planner/               # 造型规划器（新增）
│       ├── styling-planner.wxml
│       ├── styling-planner.wxss
│       ├── styling-planner.js
│       ├── styling-planner.json
│       └── components/
│           ├── calendar/              # 月历组件
│           ├── event-card/            # 事件卡片
│           └── outfit-selector/       # 造型选择器
│
├── utils/
│   ├── data-manager.js                # 数据管理（新增）
│   ├── tencent-ci.js                  # 腾讯云CI抠图（新增）
│   ├── ai-stylist.js                  # AI造型师（新增）
│   └── outfit-composer.js             # 造型合成（新增）
│
└── app.json                           # 更新TabBar

cloudfunctions/
└── ai-stylist/                        # AI建议云函数（新增）
    ├── index.js
    └── package.json

docs/
├── styling-planner-development-plan.md      # 本文档
├── user-manual-styling-planner.md           # 用户手册
├── developer-guide-styling-planner.md       # 开发文档
└── deployment-styling-planner.md            # 部署文档
```

### 数据结构

**本地存储Key**：
```
wardrobe_items                    # 衣柜单品列表
styling_planner_events            # 规划事件列表
styling_planner_memories          # 回忆记录列表
styling_planner_saved_outfits     # 保存的套装列表
```

### 云函数

```
ai-stylist                        # AI造型师建议
tencent-ci-matting               # 腾讯云CI抠图（可选封装）
```

---

## ⚡ 开发节奏

### 时间分配（9小时）

```
22:00 - 00:00  阶段一：重构衣柜          [2h]
00:00 - 03:00  阶段二：创建规划器        [3h]
03:00 - 04:30  阶段三：AI建议            [1.5h]
04:30 - 06:00  阶段四：功能整合          [1.5h]
06:00 - 07:00  阶段五：测试和文档        [1h]
```

### 里程碑检查点

- **00:00** - 衣柜重构完成，可添加衣物并AI抠图
- **03:00** - 规划器月历可用，可创建事件和选择造型
- **04:30** - AI建议功能可用
- **06:00** - 所有功能打通，数据流转正常
- **07:00** - 测试通过，文档完成

---

## 🎯 成功标准

1. ✅ 用户可以通过拍照添加衣物，AI自动抠图
2. ✅ 用户可以在月历上为未来日期规划造型
3. ✅ 用户可以点击"AI建议"获得智能搭配推荐
4. ✅ 用户可以从AI摄影保存照片到月历作为回忆
5. ✅ 月历上清晰展示：事件标记、造型缩略图、天气信息
6. ✅ 所有功能数据互通，无孤岛
7. ✅ 界面美观、交互流畅、体验完整

---

## 🔄 备用方案

### 如果时间不够

**优先级排序**：
1. **P0（必须）**：衣柜基础功能 + 规划器月历 + 事件创建
2. **P1（重要）**：造型选择 + 保存规划 + 查看详情
3. **P2（锦上添花）**：AI建议 + 回忆记录 + 数字人预览

### 技术简化

- AI建议：如果LLM调用有问题，先用规则引擎（根据场合类型返回预设建议）
- 数字人预览：如果Canvas合成复杂，先用列表展示选中单品
- 天气API：如果对接有问题，先用假数据或手动输入

---

## 📌 注意事项

1. **代码规范**：保持与现有项目一致的命名和结构
2. **数据安全**：本地存储做好错误处理，防止数据丢失
3. **用户体验**：每个异步操作都要有Loading提示
4. **性能优化**：图片压缩、懒加载、防抖节流
5. **错误处理**：网络异常、API失败都要有友好提示

---

## 🚀 开始执行

准备好了！让我们开始第一阶段：重构"我的衣柜"！

当前时间记录：开始执行
预计完成时间：9小时后

**Let's build something amazing! 🎨👔📅**
