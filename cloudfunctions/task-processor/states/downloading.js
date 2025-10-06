// downloading 状态处理器
// downloading → downloaded

const BaseStateHandler = require('./base')

class DownloadingHandler extends BaseStateHandler {
  constructor() {
    super('downloading')
  }

  async process(task, db, cloud) {
    console.log(`📥 下载图片: ${task._id}`)

    const imageIds = task.params.images || []

    if (imageIds.length === 0) {
      // 没有图片，直接跳到 downloaded
      await this.updateState(task._id, 'downloaded', {
        ...task.state_data,
        downloaded_images: []
      }, db)
      return { message: 'No images to download' }
    }

    const downloadedImages = []

    // 下载所有图片（限时操作）
    for (const imageId of imageIds) {
      try {
        const result = await cloud.downloadFile({
          fileID: imageId
        })

        // 检查是否为base64预处理模式
        const fileContent = result.fileContent.toString('utf8')
        let base64Data, mimeType

        if (fileContent.startsWith('data:image/')) {
          // Base64预处理模式
          const matches = fileContent.match(/^data:image\/([^;]+);base64,(.+)$/)
          if (matches) {
            mimeType = `image/${matches[1]}`
            base64Data = matches[2]
          }
        } else {
          // 传统模式
          base64Data = result.fileContent.toString('base64')
          mimeType = 'image/jpeg'
        }

        downloadedImages.push({
          fileId: imageId,
          base64Data: base64Data,
          mimeType: mimeType,
          size: base64Data.length
        })

      } catch (error) {
        console.error(`下载图片失败: ${imageId}`, error)
      }
    }

    if (downloadedImages.length === 0) {
      throw new Error('所有图片下载失败')
    }

    // 更新状态为 downloaded
    await this.updateState(task._id, 'downloaded', {
      ...task.state_data,
      downloaded_images: downloadedImages
    }, db)

    return {
      message: `Downloaded ${downloadedImages.length} images`
    }
  }
}

module.exports = new DownloadingHandler()
