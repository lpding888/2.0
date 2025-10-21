/**
 * 任务状态机处理器
 * 完全基于原有微信云函数task-processor的状态机逻辑
 * 负责推进任务队列状态，调用对应的Worker
 */

const logger = require('../utils/logger')
const { v4: uuidv4 } = require('uuid')

class TaskProcessor {
  constructor() {
    this.db = require('../shared/database/connection')
    this.MAX_RETRIES = 3
    this.RETRY_DELAY_BASE = 5000 // 5秒基础延迟
    this.stateHandlers = this.initializeStateHandlers()
  }

  /**
   * 主处理函数 - 处理所有待处理的任务
   */
  async processAllTasks() {
    try {
      logger.info('开始处理任务队列')

      const results = []

      // 获取所有状态处理器
      for (const [state, handler] of Object.entries(this.stateHandlers)) {
        try {
          const stateResults = await this.processState(state, handler)
          results.push(...stateResults)
        } catch (error) {
          logger.error(`处理状态 ${state} 时出错:`, error)
        }
      }

      logger.info('任务处理完成', {
        totalProcessed: results.length,
        successCount: results.filter(r => r.success).length,
        failedCount: results.filter(r => !r.success).length
      })

      return {
        success: true,
        data: {
          processed: results.length,
          results
        }
      }

    } catch (error) {
      logger.error('任务处理失败:', error)
      return {
        success: false,
        message: '任务处理失败'
      }
    }
  }

  /**
   * 处理特定状态的任务
   */
  async processState(state, handler) {
    try {
      // 获取该状态的所有待处理任务
      const tasks = await this.db.collection('task_queue')
        .find({
          state: state,
          status: { $in: ['pending', 'processing'] }
        })
        .sort({ created_at: 1, retry_count: 1 }) // 优先处理重试次数少的任务
        .limit(10) // 每次最多处理10个任务
        .toArray()

      const results = []

      for (const task of tasks) {
        try {
          const result = await handler.process(task, this.db)
          results.push({
            taskId: task._id,
            state: state,
            success: true,
            result
          })

          logger.debug('任务处理成功', {
            taskId: task._id,
            state: state,
            result: result
          })

        } catch (error) {
          // 处理失败的任务
          await this.handleTaskFailure(task, error, state)
          results.push({
            taskId: task._id,
            state: state,
            success: false,
            error: error.message
          })

          logger.error('任务处理失败', {
            taskId: task._id,
            state: state,
            error: error.message
          })
        }
      }

      return results

    } catch (error) {
      logger.error(`处理状态 ${state} 失败:`, error)
      throw error
    }
  }

  /**
   * 处理任务失败
   */
  async handleTaskFailure(task, error, currentState) {
    try {
      const newRetryCount = (task.retry_count || 0) + 1

      logger.warn('任务处理失败，准备重试或标记失败', {
        taskId: task._id,
        currentState,
        retryCount: newRetryCount,
        maxRetries: this.MAX_RETRIES,
        error: error.message
      })

      if (newRetryCount >= this.MAX_RETRIES) {
        // 达到最大重试次数，标记任务失败
        await this.markTaskFailed(task._id, error, 'max_retries')

        // 根据任务类型退还积分
        await this.refundCreditsIfNeeded(task)

      } else {
        // 计算重试延迟（指数退避）
        const retryDelay = this.RETRY_DELAY_BASE * Math.pow(2, newRetryCount - 1)

        // 更新重试信息
        await this.db.collection('task_queue').updateOne(
          { _id: task._id },
          {
            $set: {
              retry_count: newRetryCount,
              state: 'pending', // 重置为pending状态
              last_error: error.message,
              retry_after: new Date(Date.now() + retryDelay),
              updated_at: new Date()
            }
          }
        )

        logger.info('任务将重试', {
          taskId: task._id,
          retryCount: newRetryCount,
          retryDelay: `${retryDelay}ms`
        })
      }

    } catch (handleError) {
      logger.error('处理任务失败时出错:', handleError)
    }
  }

  /**
   * 标记任务失败
   */
  async markTaskFailed(taskId, error, reason = 'processing_failed') {
    try {
      // 更新任务队列状态
      await this.db.collection('task_queue').updateOne(
        { _id: taskId },
        {
          $set: {
            status: 'failed',
            state: 'failed',
            error: {
              message: error.message,
              stack: error.stack,
              reason: reason,
              timestamp: new Date()
            },
            completed_at: new Date(),
            updated_at: new Date()
          }
        }
      )

      // 更新作品状态
      await this.db.collection('works').updateOne(
        { task_id: taskId },
        {
          $set: {
            status: 'failed',
            error: error.message,
            completed_at: new Date(),
            updated_at: new Date()
          }
        }
      )

      logger.error('任务标记为失败', {
        taskId,
        reason,
        error: error.message
      })

    } catch (updateError) {
      logger.error('标记任务失败时出错:', updateError)
    }
  }

  /**
   * 根据需要退还积分
   */
  async refundCreditsIfNeeded(task) {
    try {
      // 获取作品信息获取消费积分数量
      const work = await this.db.collection('works').findOne({ task_id: task._id })

      if (work && work.credits_consumed > 0) {
        // 更新用户积分
        await this.db.collection('users').updateOne(
          { openid: task.user_openid },
          {
            $inc: {
              credits: work.credits_consumed,
              total_consumed_credits: -work.credits_consumed
            },
            $set: {
              updated_at: new Date()
            }
          }
        )

        // 记录积分退还
        await this.db.collection('credit_records').insertOne({
          user_openid: task.user_openid,
          type: 'refund',
          amount: work.credits_consumed,
          description: `${task.type}任务失败退款`,
          metadata: {
            task_id: task._id,
            reason: 'max_retries'
          },
          created_at: new Date()
        })

        logger.info('积分退还成功', {
          taskId: task._id,
          amount: work.credits_consumed,
          userOpenid: task.user_openid
        })
      }

    } catch (refundError) {
      logger.error('退还积分时出错:', refundError)
    }
  }

  /**
   * 初始化状态处理器
   */
  initializeStateHandlers() {
    return {
      'pending': new PendingStateHandler(),
      'downloading': new DownloadingStateHandler(),
      'downloaded': new DownloadedStateHandler(),
      'ai_calling': new AICallingStateHandler(),
      'ai_processing': new AIProcessingStateHandler(),
      'ai_completed': new AICompletedStateHandler(),
      'watermarking': new WatermarkingStateHandler(),
      'uploading': new UploadingStateHandler()
    }
  }

  /**
   * 获取任务统计信息
   */
  async getTaskStats() {
    try {
      const stats = await this.db.collection('task_queue').aggregate([
        {
          $group: {
            _id: '$state',
            count: { $sum: 1 }
          }
        }
      ]).toArray()

      const totalTasks = stats.reduce((sum, stat) => sum + stat.count, 0)

      const statusStats = await this.db.collection('task_queue').aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]).toArray()

      return {
        success: true,
        data: {
          byState: stats,
          byStatus: statusStats,
          totalTasks,
          summary: {
            pending: stats.find(s => s._id === 'pending')?.count || 0,
            processing: stats.filter(s => ['downloading', 'ai_calling', 'ai_processing', 'uploading'].includes(s._id)).reduce((sum, s) => sum + s.count, 0),
            completed: stats.find(s => s._id === 'completed')?.count || 0,
            failed: stats.find(s => s._id === 'failed')?.count || 0
          }
        }
      }

    } catch (error) {
      logger.error('获取任务统计失败:', error)
      return {
        success: false,
        message: '获取任务统计失败'
      }
    }
  }

  /**
   * 清理过期任务
   */
  async cleanupExpiredTasks() {
    try {
      const expiredThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000) // 24小时前
      const expiredTasks = await this.db.collection('task_queue')
        .find({
          status: { $in: ['failed', 'completed'] },
          updated_at: { $lt: expiredThreshold }
        })
        .toArray()

      if (expiredTasks.length > 0) {
        // 删除过期的任务记录
        const taskIds = expiredTasks.map(task => task._id)
        await this.db.collection('task_queue').deleteMany({
          _id: { $in: taskIds }
        })

        logger.info('清理过期任务', {
          count: expiredTasks.length,
          taskIds
        })
      }

      return {
        success: true,
        data: {
          cleanedCount: expiredTasks.length
        }
      }

    } catch (error) {
      logger.error('清理过期任务失败:', error)
      return {
        success: false,
        message: '清理过期任务失败'
      }
    }
  }
}

// 状态处理器基类
class BaseStateHandler {
  async process(task, db) {
    throw new Error('子类必须实现process方法')
  }

  async updateTaskState(taskId, newState, db, additionalData = {}) {
    try {
      await db.collection('task_queue').updateOne(
        { _id: taskId },
        {
          $set: {
            state: newState,
            state_data: additionalData,
            updated_at: new Date()
          }
        }
      )
    } catch (error) {
      logger.error(`更新任务状态失败 (${newState}):`, error)
      throw error
    }
  }

  async callWorker(task, db) {
    try {
      // 根据任务类型选择对应的Worker
      const workerName = this.getWorkerName(task.type)

      // 在SCF中，我们调用异步任务处理器
      const AsyncTaskProcessor = require('./async-task-processor')
      const taskProcessor = new AsyncTaskProcessor()

      await taskProcessor.createTask({
        type: 'ai-generation',
        priority: this.getTaskPriority(task),
        timeout: this.getTaskTimeout(task),
        data: {
          service_type: task.type,
          task_id: task._id,
          task_data: task.params,
          worker_type: workerName,
          current_state: task.state
        },
        metadata: {
          user_openid: task.user_openid,
          business_mode: task.business_mode
        }
      })

      logger.info('Worker调用成功', {
        taskId: task._id,
        workerName,
        taskType: task.type
      })

    } catch (error) {
      logger.error('调用Worker失败:', error)
      throw error
    }
  }

  getWorkerName(taskType) {
    const workerMap = {
      'photography': 'photography-worker',
      'fitting': 'fitting-worker',
      'personal': 'personal-worker'
    }
    return workerMap[taskType] || 'default-worker'
  }

  getTaskPriority(task) {
    // 根据业务模式和任务类型确定优先级
    const priorityMap = {
      'commercial': 'high',
      'personal': 'normal',
      'hybrid': 'normal'
    }
    return priorityMap[task.business_mode] || 'normal'
  }

  getTaskTimeout(task) {
    // 根据任务复杂度确定超时时间
    const timeoutMap = {
      'photography': 900000, // 15分钟
      'fitting': 600000,    // 10分钟
      'personal': 600000    // 10分钟
    }
    return timeoutMap[task.type] || 600000
  }
}

// 待处理状态处理器
class PendingStateHandler extends BaseStateHandler {
  async process(task, db) {
    logger.info('处理待处理任务', { taskId: task._id })

    // 检查是否到了重试时间
    if (task.retry_after && new Date() < new Date(task.retry_after)) {
      logger.info('任务还未到重试时间', {
        taskId: task._id,
        retryAfter: task.retry_after
      })
      return { skipped: true, reason: 'retry_not_yet' }
    }

    // 更新状态为downloading
    await this.updateTaskState(task._id, 'downloading', db, {
      download_started_at: new Date()
    })

    return { state: 'downloading' }
  }
}

// 下载状态处理器
class DownloadingStateHandler extends BaseStateHandler {
  async process(task, db) {
    logger.info('处理下载任务', { taskId: task._id })

    // 在实际实现中，这里会下载和处理图片
    // 现在直接标记为已下载
    await this.updateTaskState(task._id, 'downloaded', db, {
      download_completed_at: new Date(),
      downloaded_files: Object.keys(task.params.clothing_images || {}).length + 1
    })

    return { state: 'downloaded' }
  }
}

// 已下载状态处理器
class DownloadedStateHandler extends BaseStateHandler {
  async process(task, db) {
    logger.info('处理已下载任务', { taskId: task._id })

    // 准备AI调用
    await this.updateTaskState(task._id, 'ai_calling', db, {
      ai_call_started_at: new Date()
    })

    // 调用对应的Worker
    await this.callWorker(task, db)

    // Worker在独立容器中处理，这里立即标记为completed
    await this.updateTaskState(task._id, 'completed', db, {
      worker_called_at: new Date(),
      worker_name: this.getWorkerName(task.type)
    })

    return { state: 'completed' }
  }
}

// AI调用状态处理器
class AICallingStateHandler extends BaseStateHandler {
  async process(task, db) {
    logger.info('处理AI调用任务', { taskId: task._id })

    // 这个状态在独立容器Worker中处理
    // 这里只是监控状态
    return { monitoring: true }
  }
}

// AI处理状态处理器
class AIProcessingStateHandler extends BaseStateHandler {
  async process(task, db) {
    logger.info('处理AI处理任务', { taskId: task._id })

    // 这个状态在独立容器Worker中处理
    return { monitoring: true }
  }
}

// AI完成状态处理器
class AICompletedStateHandler extends BaseStateHandler {
  async process(task, db) {
    logger.info('处理AI完成任务', { taskId: task._id })

    // 准备上传结果
    await this.updateTaskState(task._id, 'uploading', db, {
      upload_started_at: new Date()
    })

    // 模拟上传过程
    await this.updateTaskState(task._id, 'completed', db, {
      upload_completed_at: new Date()
    })

    return { state: 'completed' }
  }
}

// 水印状态处理器
class WatermarkingStateHandler extends BaseStateHandler {
  async process(task, db) {
    logger.info('处理水印任务', { taskId: task._id })

    // 模拟水印处理
    await this.updateTaskState(task._id, 'uploading', db, {
      watermark_completed_at: new Date()
    })

    return { state: 'uploading' }
  }
}

// 上传状态处理器
class UploadingStateHandler extends BaseStateHandler {
  async process(task, db) {
    logger.info('处理上传任务', { taskId: task._id })

    // 标记任务完成
    await this.updateTaskState(task._id, 'completed', db, {
      upload_completed_at: new Date(),
      completed_at: new Date()
    })

    return { state: 'completed' }
  }
}

// SCF入口函数
exports.main_handler = async (event, context) => {
  try {
    const { action, ...data } = event

    // 创建任务处理器实例
    const taskProcessor = new TaskProcessor()

    // 根据action调用对应方法
    const methodMap = {
      'processAll': 'processAllTasks',
      'getStats': 'getTaskStats',
      'cleanup': 'cleanupExpiredTasks'
    }

    const methodName = methodMap[action]
    if (!methodName) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          message: `不支持的任务操作: ${action}`
        })
      }
    }

    const result = await taskProcessor[methodName](data)

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(result)
    }

  } catch (error) {
    logger.error('任务处理器处理失败:', error)

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        message: '服务器内部错误'
      })
    }
  }
}

module.exports = TaskProcessor