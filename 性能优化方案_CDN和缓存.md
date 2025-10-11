# 性能优化方案 - CDN和缓存

## 一、优化目标

### 当前性能瓶颈
1. **图片加载慢**：云存储文件访问速度受限于地域和网络
2. **重复生成**：相同参数的AI生成任务重复消耗积分
3. **临时URL过期**：2小时过期导致频繁重新获取
4. **并发压力**：高并发时云函数冷启动延迟

### 优化目标
- 图片加载速度提升 70%+
- 减少 30% 的重复AI生成
- 降低 50% 的临时URL请求
- 优化云函数响应时间 40%+

---

## 二、CDN优化方案

### 2.1 微信云存储CDN配置

#### 方案1：使用微信云开发自带CDN（推荐）

**优点**：
- 免配置，自动启用
- 与云存储深度集成
- 按量计费，成本可控

**配置步骤**：
1. 登录微信开发者工具
2. 云开发控制台 → 存储 → 设置
3. 开启"CDN加速"（部分环境默认开启）
4. 配置缓存规则：
   - 图片文件：缓存30天
   - 临时文件：缓存1天

**代码优化**：无需修改代码，云存储URL自动走CDN

---

#### 方案2：使用腾讯云CDN（高级）

**优点**：
- 更精细的控制
- 支持自定义域名
- 更多缓存策略

**配置步骤**：
1. 开通腾讯云CDN服务
2. 添加加速域名（需备案）
3. 配置源站为云存储域名
4. 设置缓存规则：
   ```
   .jpg, .jpeg, .png, .webp - 缓存30天
   .gif - 缓存7天
   其他 - 缓存1天
   ```

**代码修改**：需要替换云存储URL为CDN域名

---

### 2.2 图片格式优化

#### WebP转换策略

**优势**：文件大小减少 30-50%，加载速度提升明显

**实现方案**：

##### 选项1：云存储内置图片处理（推荐）

微信云存储支持URL参数处理：
```javascript
// 原始URL
const originalUrl = 'cloud://xxx.jpg'

// 添加处理参数（压缩+转WebP）
const optimizedUrl = originalUrl + '?imageMogr2/format/webp/quality/85'
```

##### 选项2：上传时转换

在上传图片到云存储前进行处理（需要修改上传逻辑）

---

### 2.3 图片尺寸优化

#### 缩略图生成策略

**当前问题**：作品列表加载原图（768x1024），浪费带宽

**优化方案**：
```javascript
// 列表缩略图：300x400
const thumbnailUrl = originalUrl + '?imageMogr2/thumbnail/300x400/quality/80'

// 详情预览图：600x800
const previewUrl = originalUrl + '?imageMogr2/thumbnail/600x800/quality/85'

// 原图：用户点击查看大图时加载
const fullUrl = originalUrl
```

---

## 三、缓存优化方案

### 3.1 临时URL缓存（高优先级）

#### 问题分析
- 云存储临时URL有效期2小时
- 每次访问都调用getTempFileURL浪费资源
- 高并发时可能触发限流

#### 解决方案：Redis缓存 + 本地缓存

##### 方案A：使用云数据库缓存（简单）

创建缓存集合：
```javascript
// 集合名：file_url_cache
{
  _id: "fileId的hash",
  file_id: "cloud://xxx",
  temp_url: "https://xxx",
  expire_time: Date,  // 过期时间（1.5小时后）
  created_at: Date
}
```

**实现代码**：见下方实现部分

---

##### 方案B：使用云开发Redis（高性能）

**优点**：
- 读写速度快（ms级）
- 自动过期机制
- 支持高并发

**配置步骤**：
1. 云开发控制台 → 扩展能力 → Redis
2. 创建Redis实例
3. 获取连接信息

**实现代码**：见下方实现部分

---

### 3.2 场景数据缓存

#### 问题分析
- 场景数据（destinations、scenes）基本不变
- 每次生成都查询数据库，浪费资源

#### 解决方案：全局内存缓存

```javascript
// 在云函数中
let scenesCache = null
let cacheTime = 0
const CACHE_DURATION = 30 * 60 * 1000 // 30分钟

async function getScenes() {
  const now = Date.now()

  // 缓存有效
  if (scenesCache && (now - cacheTime) < CACHE_DURATION) {
    console.log('✅ 使用场景缓存')
    return scenesCache
  }

  // 缓存过期，重新查询
  console.log('🔄 刷新场景缓存')
  const result = await db.collection('scenes').get()
  scenesCache = result.data
  cacheTime = now

  return scenesCache
}
```

---

### 3.3 用户数据缓存

#### 问题分析
- 积分查询频繁
- 用户信息基本不变

#### 解决方案：请求级缓存

在单次云函数调用中缓存用户数据：
```javascript
// 在云函数入口
const userCache = {}

async function getUserInfo(openid) {
  if (userCache[openid]) {
    return userCache[openid]
  }

  const result = await db.collection('users').where({ openid }).get()
  userCache[openid] = result.data[0]
  return userCache[openid]
}
```

---

### 3.4 AI生成结果缓存（可选）

#### 使用场景
- 姿势预设模式（相同预设+相同服装=相同结果）
- 旅行目的地（相同用户照片+相同目的地≈相似结果）

#### 注意事项
⚠️ **慎重实现**：
1. 用户期望每次生成都是"新"的
2. 缓存命中会让用户觉得"没生成"
3. 需要明确告知用户使用了缓存

#### 实现建议
**不推荐全面启用**，可以在以下场景使用：
- 重试失败任务时，复用之前成功的结果
- 用户明确选择"使用上次结果"

---

## 四、前端缓存优化

### 4.1 图片懒加载优化

#### 当前问题
- 作品列表一次性加载所有图片
- 滚动时才显示但已经下载

#### 优化方案
已实现：works.wxml 中的 `shouldLoad` 机制

**进一步优化**：
```javascript
// works.js
onReachBottom() {
  // 加载更多时，预加载下一页的缩略图
  const nextPageWorks = this.getNextPageWorks()
  nextPageWorks.forEach(work => {
    wx.preloadImage({
      url: work.thumbnail
    })
  })
}
```

---

### 4.2 本地缓存策略

#### 缓存作品列表

```javascript
// 保存到本地存储（最近100个作品）
wx.setStorageSync('recent_works', works.slice(0, 100))

// 下次启动时先显示缓存，后台刷新
onLoad() {
  const cachedWorks = wx.getStorageSync('recent_works')
  if (cachedWorks) {
    this.setData({ works: cachedWorks })
  }

  // 后台刷新
  this.loadWorks()
}
```

---

### 4.3 分包加载优化

#### 当前问题
- 所有页面打包在一起
- 首次加载慢

#### 优化方案
修改 app.json，配置分包：
```json
{
  "pages": [
    "pages/index/index",
    "pages/works/works",
    "pages/profile/profile"
  ],
  "subPackages": [
    {
      "root": "packages/photography",
      "pages": [
        "pages/photography/photography",
        "pages/scene-select/scene-select"
      ]
    },
    {
      "root": "packages/personal",
      "pages": [
        "pages/fitting-personal/fitting-personal",
        "pages/travel/travel"
      ]
    }
  ],
  "preloadRule": {
    "pages/index/index": {
      "network": "all",
      "packages": ["packages/photography"]
    }
  }
}
```

---

## 五、实现计划

### 阶段1：快速见效（本周）

#### 1.1 临时URL缓存（必做）
- 实现数据库缓存方案
- 修改所有获取临时URL的地方
- 预期效果：减少50% getTempFileURL调用

#### 1.2 图片URL参数优化（必做）
- 添加WebP转换参数
- 添加缩略图尺寸参数
- 预期效果：图片大小减少40%，加载速度提升50%

#### 1.3 场景数据缓存（必做）
- 实现全局内存缓存
- 预期效果：场景查询时间从50ms降到1ms

---

### 阶段2：深度优化（下周）

#### 2.1 Redis缓存（可选）
- 开通Redis实例
- 迁移临时URL缓存到Redis
- 预期效果：缓存读取速度提升10倍

#### 2.2 CDN配置（必做）
- 开启云存储CDN加速
- 配置缓存规则
- 预期效果：图片加载速度提升70%

#### 2.3 前端分包（可选）
- 拆分代码包
- 配置预加载规则
- 预期效果：首屏加载时间减少30%

---

### 阶段3：长期维护（本月）

#### 3.1 监控指标
- 图片加载耗时统计
- 缓存命中率监控
- CDN流量统计
- 云函数执行时间

#### 3.2 持续优化
- 根据监控数据调整缓存策略
- 优化缓存过期时间
- 清理过期缓存数据

---

## 六、成本分析

### CDN成本
**微信云存储CDN**：
- 流量费：0.18元/GB
- 每月预估：1000用户 × 50张图片 × 500KB ≈ 24GB ≈ 4.3元/月

**腾讯云CDN**（如果使用）：
- 流量费：0.24元/GB
- 更贵但功能更强

### Redis成本
**云开发Redis**：
- 最小规格：256MB，19元/月
- 适合10万级缓存条目

### 缓存集合成本
**数据库存储**：
- 免费额度：5GB
- 缓存占用：约100MB（10万条URL缓存）
- 成本：免费

### 建议方案
**初期（月活<5000）**：
- 使用数据库缓存（免费）
- 开启云存储CDN（4元/月）
- 总成本：约5元/月

**中期（月活5000-50000）**：
- 升级到Redis缓存（19元/月）
- 继续使用云存储CDN（20元/月）
- 总成本：约40元/月

---

## 七、风险评估

### 技术风险
1. **缓存一致性**：URL变更时缓存可能过期
   - 解决：设置较短过期时间（1.5小时）

2. **缓存穿透**：大量请求同时未命中缓存
   - 解决：实现请求合并机制

3. **存储成本**：缓存数据占用存储空间
   - 解决：定期清理过期缓存

### 业务风险
1. **CDN延迟**：CDN刷新有延迟（5-10分钟）
   - 解决：重要更新时清除CDN缓存

2. **缓存错误**：错误的URL被缓存
   - 解决：实现缓存失效机制

---

## 八、监控指标

### 关键指标
1. **缓存命中率**：目标 >70%
2. **图片加载时间**：目标 <500ms
3. **CDN流量占比**：目标 >80%
4. **云函数执行时间**：目标 <1000ms

### 监控方法
```javascript
// 在云函数中添加性能日志
console.log('[PERF] getTempURL - cache hit:', cacheHit)
console.log('[PERF] image load time:', loadTime, 'ms')
```

---

## 总结

### 优先级排序
1. **P0（立即实施）**：
   - 临时URL缓存（数据库方案）
   - 图片URL参数优化（WebP + 缩略图）
   - 场景数据缓存

2. **P1（本周实施）**：
   - 开启云存储CDN
   - 前端本地缓存优化
   - 图片懒加载优化

3. **P2（下周实施）**：
   - Redis缓存（可选）
   - 前端分包（可选）
   - 监控指标实施

### 预期效果
- 图片加载速度：提升 **70%**
- 云函数响应：优化 **40%**
- 用户体验：显著提升
- 运营成本：增加约 **5-40元/月**

---

**编写人**：Claude Code
**编写时间**：2025-10-11
**版本**：v1.0
