# 静态资源说明

本目录存放Web应用的静态资源文件。

## 目录结构

### /music
视频相册功能使用的背景音乐（VideoAlbum组件）
- `gentle.mp3` - 温柔时光（180s）
- `cheerful.mp3` - 欢快旋律（200s）
- `romantic.mp3` - 浪漫情怀（220s）
- `epic.mp3` - 史诗配乐（240s）

**注意**: 这些音频文件需要自行准备或使用占位文件

### /videos
示例视频文件
- `sample-album.mp4` - 视频相册示例（演示用）

**注意**: 此文件为演示用，实际应用中由后端动态生成

### /examples
首页展示的示例图片
- `fitting-1.jpg` / `fitting-2.jpg` - AI试衣间示例
- `photography-1.jpg` / `photography-2.jpg` - AI摄影示例
- `travel-1.jpg` / `travel-2.jpg` - 全球旅行示例

**注意**: 这些示例图片需要自行准备

## 开发建议

在开发环境中，可以：
1. 使用占位图片/音频（如空白文件）
2. 修改代码使用外部CDN链接
3. 暂时注释掉相关功能代码

在生产环境中，建议：
1. 使用真实的示例资源
2. 将大型媒体文件存储到CDN
3. 配置Next.js的静态资源优化
