# AI摄影师小程序 - 腾讯云SCF版

> 🎯 支持个人版+商业版双模式架构的AI摄影小程序

## 📋 项目概述

本项目是基于微信小程序的AI摄影服务平台，从微信云开发迁移至腾讯云SCF，支持虚拟试衣、AI服装摄影、数字分身等多种AI生成功能。

### 🏗️ 架构特点

- **双模式支持**：个人版（虚拟试衣）+ 商业版（商品摄影）
- **本地开发**：完整的本地开发环境和一键部署
- **多厂商AI路由**：Seedream 4.0、Gemini 2.0、DeepSeek等
- **数据万象集成**：智能抠图、图片修复、质量评估
- **最短停机迁移**：15分钟内完成从微信云到SCF的迁移

## 🚀 快速开始

### 环境要求

- Node.js >= 18.15.0
- npm >= 9.0.0
- 腾讯云账号
- 微信小程序开发者工具

### 安装步骤

1. **克隆项目**
```bash
git clone <your-repo-url>
cd ai-photography-ultimate
```

2. **安装依赖**
```bash
npm install
```

3. **配置环境变量**
```bash
# 复制环境变量模板
cp .env.example .env

# 编辑配置文件
# 填入腾讯云、AI服务、微信小程序等配置
```

4. **本地开发**
```bash
# 启动本地开发环境
npm run dev

# 或者使用Serverless Offline
serverless offline
```

## 📁 项目结构

```
ai-photography-ultimate/
├── backend/                    # SCF 后端代码
│   ├── src/                   # 源代码
│   │   ├── handlers/          # 云函数处理程序
│   │   │   ├── api-gateway.js        # 统一API网关
│   │   │   ├── user-service.js       # 用户管理服务
│   │   │   ├── ai-generation.js      # AI生成服务
│   │   │   ├── ci-service.js         # 数据万象服务
│   │   │   ├── payment-service.js    # 支付服务
│   │   │   └── admin-service.js      # 管理后台服务
│   │   ├── shared/             # 共享模块
│   │   │   ├── database/             # 数据库连接
│   │   │   ├── storage/              # 存储服务
│   │   │   ├── ai/                   # AI服务集成
│   │   │   └── utils/                # 工具函数
│   │   └── config/             # 配置文件
│   ├── layers/               # 共享依赖层
│   │   ├── common/           # 通用依赖
│   │   ├── ai/               # AI处理依赖
│   │   ├── ci/               # 数据万象依赖
│   │   └── image-processing/ # 图片处理依赖
│   └── package.json
├── frontend/                  # 小程序前端
│   ├── miniprogram/         # 小程序代码
│   ├── utils/               # API调用工具
│   └── components/          # 自定义组件
├── scripts/                  # 部署脚本
│   ├── deploy-dev.ps1       # 开发环境部署
│   ├── deploy-prod.ps1      # 生产环境部署
│   └── migrate-data.ps1     # 数据迁移脚本
├── .env.example             # 环境变量模板
├── serverless.yml           # Serverless配置
├── package.json             # 项目配置
└── README.md               # 项目文档
```

## 🔧 开发指南

### 本地开发

```bash
# 启动本地开发服务器
npm run dev

# 运行测试
npm test

# 代码检查
npm run lint

# 代码格式化
npm run format
```

### 部署

```bash
# 部署到开发环境
npm run deploy:dev

# 部署到生产环境
npm run deploy:prod

# 查看部署信息
npm run info:dev
npm run info:prod
```

### 数据迁移

```bash
# 测试迁移（干运行）
npm run migrate:dryrun

# 执行实际迁移
npm run migrate

# 查看日志
npm run logs:dev
npm run logs:prod
```

## 🎯 业务模式

### 个人版 (Personal)

- **虚拟试衣**：用户上传照片，AI生成试衣效果
- **数字分身**：创建个性化数字人模型
- **AI模型优先级**：Gemini 2.0 > Seedream Lite > DeepSeek Vision

### 商业版 (Commercial)

- **服装摄影**：商品图片AI生成专业摄影效果
- **模特生成**：AI生成虚拟模特展示服装
- **AI模型优先级**：Seedream 4.0 > Gemini 2.0 > GPT-4 Vision

### 混合版 (Hybrid)

- **全功能支持**：包含个人版和商业版所有功能
- **智能切换**：根据用户类型自动选择对应功能
- **成本优化**：动态选择最优AI模型

## 🤖 AI服务集成

### 多厂商路由策略

```javascript
// AI模型选择逻辑
const aiModelRoutes = {
  commercial: {
    primary: 'seedream-v4',      // 主力模型
    fallback: ['gemini-2.0'],    // 备用模型
    costOptimized: 'deepseek'    // 成本优化
  },
  personal: {
    primary: 'gemini-2.0',       // 主力模型
    fallback: ['seedream-lite'], // 备用模型
    free: 'gpt-3.5-turbo'        // 免费模型
  }
}
```

### 数据万象CI服务

- **智能抠图**：商品抠图、人像抠图
- **图片修复**：去除水印、划痕修复
- **智能裁剪**：AI优化图片构图
- **质量评估**：自动图片质量评分

## 📊 性能优化

### 函数配置优化

- **API服务**：256MB内存，30s超时，100并发
- **AI生成**：2048MB内存，300s超时，20并发
- **图片处理**：1024MB内存，120s超时，50并发

### 成本控制

- **预留实例**：减少冷启动延迟
- **按量付费**：精确的成本控制
- **智能路由**：自动选择成本最优方案

## 🔄 迁移指南

### 从微信云开发迁移

1. **环境准备**：15分钟
   - 安装Serverless Framework
   - 配置腾讯云环境
   - 设置环境变量

2. **数据迁移**：5-10分钟停机
   ```bash
   # 导出微信云数据
   npm run migrate:dryrun   # 测试
   npm run migrate           # 执行
   ```

3. **服务部署**：5分钟
   ```bash
   npm run deploy:dev        # 测试环境
   npm run deploy:prod       # 生产环境
   ```

4. **前端更新**：2分钟
   - 更新API调用地址
   - 重新发布小程序

**总停机时间：< 15分钟**

## 🛠️ 故障排除

### 常见问题

1. **部署失败**
   - 检查腾讯云权限配置
   - 验证环境变量设置
   - 查看部署日志

2. **AI服务异常**
   - 验证API密钥有效性
   - 检查网络连接
   - 查看错误日志

3. **数据库连接失败**
   - 检查MongoDB连接字符串
   - 验证网络权限
   - 测试连接性

### 日志查看

```bash
# 查看开发环境日志
npm run logs:dev

# 查看生产环境日志
npm run logs:prod

# 实时监控
serverless logs -f api-gateway --tail
```

## 📈 监控和告警

### 关键指标

- **函数调用次数**：API调用频率
- **错误率**：服务稳定性
- **响应时间**：性能监控
- **成本统计**：费用控制

### 告警设置

建议设置以下告警：
- 错误率 > 5%
- 响应时间 > 10s
- 调用次数异常增长
- 成本超预算

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 📞 支持

- 📧 邮箱：support@ai-photography.com
- 🐛 问题反馈：[GitHub Issues](https://github.com/your-org/ai-photography/issues)
- 📖 文档：[项目文档](https://docs.ai-photography.com)

---

**⚡ 让AI摄影变得更简单、更专业！**