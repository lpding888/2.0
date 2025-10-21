/**
 * 任务队列管理
 * 处理异步AI生成任务
 * 支持优先级队列、任务调度、失败重试等
 */

const { v4: uuidv4 } = require('uuid')
const EventEmitter = require('events')
const logger = require('../../utils/logger')

class TaskQueue extends EventEmitter {
  constructor() {
    super()
    this.queues = new Map() // 按类型分组的队列
    this.processing = new Map() // 正在处理的任务
    this.maxConcurrency = 5 // 最大并发数
    this.retryAttempts = 3 // 最大重试次数
    this.retryDelay = 5000 // 重试延迟（毫秒）
    this.isRunning = false
    this.processingCount = 0

    // 任务优先级定义
    this.priorities = {
      'high': 3,
      'medium': 2,
      'low': 1
    }
  }

  /**
   * 启动任务队列处理器
   */
  start() {
    if (this.isRunning) {
      logger.warn('任务队列已在运行')
      return
    }

    this.isRunning = true
    logger.info('任务队列处理器已启动')

    // 开始处理队列
    this.processQueues()
  }

  /**
   * 停止任务队列处理器
   */
  stop() {
    this.isRunning = false
    logger.info('任务队列处理器已停止')
  }

  /**
   * 添加任务到队列
   */
  async addTask(taskData) {
    try {
      const task = {
        id: uuidv4(),
        type: taskData.type,
        priority: taskData.priority || 'medium',
        data: taskData.data,
        attempts: 0,
        maxAttempts: taskData.maxAttempts || this.retryAttempts,
        createdAt: new Date(),
        scheduledAt: taskData.scheduledAt || new Date(),
        status: 'pending',
        result: null,
        error: null
      }

      // 获取或创建对应类型的队列
      const queue = this.getQueue(task.type)

      // 按优先级插入任务
      this.insertTaskByPriority(queue, task)

      logger.info('任务已添加到队列:', {
        taskId: task.id,
        type: task.type,
        priority: task.priority
      })

      // 触发任务处理
      this.emit('taskAdded', task)

      return task

    } catch (error) {
      logger.error('添加任务到队列失败:', error)
      throw error
    }
  }

  /**
   * 获取任务状态
   */
  getTaskStatus(taskId) {
    // 检查正在处理的任务
    if (this.processing.has(taskId)) {
      const task = this.processing.get(taskId)
      return {
        ...task,
        status: 'processing'
      }
    }

    // 检查所有队列中的任务
    for (const queue of this.queues.values()) {
      const task = queue.find(t => t.id === taskId)
      if (task) {
        return task
      }
    }

    return null
  }

  /**
   * 取消任务
   */
  cancelTask(taskId) {
    // 如果任务正在处理，无法取消
    if (this.processing.has(taskId)) {
      return false
    }

    // 从队列中移除任务
    for (const queue of this.queues.values()) {
      const index = queue.findIndex(t => t.id === taskId)
      if (index !== -1) {
        const task = queue.splice(index, 1)[0]
        task.status = 'cancelled'
        this.emit('taskCancelled', task)
        logger.info('任务已取消:', { taskId })
        return true
      }
    }

    return false
  }

  /**
   * 获取队列统计信息
   */
  getQueueStats() {
    const stats = {
      totalQueued: 0,
      totalProcessing: this.processingCount,
      queues: {}
    }

    for (const [type, queue] of this.queues.entries()) {
      const queueStats = {
        pending: queue.filter(t => t.status === 'pending').length,
        failed: queue.filter(t => t.status === 'failed').length,
        cancelled: queue.filter(t => t.status === 'cancelled').length,
        total: queue.length
      }

      stats.queues[type] = queueStats
      stats.totalQueued += queueStats.pending
    }

    return stats
  }

  /**
   * 处理队列
   */
  async processQueues() {
    while (this.isRunning) {
      try {
        // 检查是否达到最大并发数
        if (this.processingCount >= this.maxConcurrency) {
          await this.sleep(1000)
          continue
        }

        // 获取下一个要处理的任务
        const task = this.getNextTask()

        if (task) {
          // 处理任务
          this.processTask(task)
        } else {
          // 没有任务时等待
          await this.sleep(1000)
        }

      } catch (error) {
        logger.error('处理队列时发生错误:', error)
        await this.sleep(5000) // 出错时等待更长时间
      }
    }
  }

  /**
   * 获取下一个要处理的任务
   */
  getNextTask() {
    const now = new Date()
    let nextTask = null
    let nextPriority = 0
    let nextQueueKey = null

    // 遍历所有队列，找到优先级最高且到达执行时间的任务
    for (const [type, queue] of this.queues.entries()) {
      for (const task of queue) {
        if (task.status !== 'pending' || task.scheduledAt > now) {
          continue
        }

        const priority = this.priorities[task.priority] || 1
        if (priority > nextPriority) {
          nextTask = task
          nextPriority = priority
          nextQueueKey = type
        }
      }
    }

    // 从队列中移除任务
    if (nextTask && nextQueueKey) {
      const queue = this.queues.get(nextQueueKey)
      const index = queue.findIndex(t => t.id === nextTask.id)
      if (index !== -1) {
        queue.splice(index, 1)
      }
    }

    return nextTask
  }

  /**
   * 处理单个任务
   */
  async processTask(task) {
    try {
      // 标记任务为处理中
      task.status = 'processing'
      task.startedAt = new Date()
      this.processing.set(task.id, task)
      this.processingCount++

      logger.info('开始处理任务:', {
        taskId: task.id,
        type: task.type,
        attempt: task.attempts + 1
      })

      this.emit('taskStarted', task)

      // 根据任务类型调用对应的处理器
      const result = await this.executeTask(task)

      // 任务成功完成
      task.status = 'completed'
      task.result = result
      task.completedAt = new Date()

      this.emit('taskCompleted', task)
      logger.info('任务处理成功:', {
        taskId: task.id,
        duration: task.completedAt - task.startedAt
      })

    } catch (error) {
      logger.error('任务处理失败:', {
        taskId: task.id,
        error: error.message,
        attempt: task.attempts + 1
      })

      // 任务处理失败
      task.error = error.message
      task.attempts++

      // 检查是否需要重试
      if (task.attempts < task.maxAttempts) {
        task.status = 'retrying'
        task.scheduledAt = new Date(Date.now() + this.retryDelay)

        // 重新加入队列
        const queue = this.getQueue(task.type)
        this.insertTaskByPriority(queue, task)

        logger.info('任务将重试:', {
          taskId: task.id,
          nextAttempt: task.scheduledAt
        })

      } else {
        task.status = 'failed'
        task.failedAt = new Date()

        this.emit('taskFailed', task)
        logger.error('任务最终失败:', {
          taskId: task.id,
          totalAttempts: task.attempts
        })
      }

    } finally {
      // 从处理中移除
      this.processing.delete(task.id)
      this.processingCount--
    }
  }

  /**
   * 执行具体任务
   */
  async executeTask(task) {
    switch (task.type) {
      case 'virtual_tryon':
        return await this.executeVirtualTryOn(task.data)

      case 'fashion_photo':
        return await this.executeFashionPhoto(task.data)

      case 'digital_avatar':
        return await this.executeDigitalAvatar(task.data)

      case 'product_photo':
        return await this.executeProductPhoto(task.data)

      case 'image_processing':
        return await this.executeImageProcessing(task.data)

      default:
        throw new Error(`不支持的任务类型: ${task.type}`)
    }
  }

  /**
   * 执行虚拟试衣任务
   */
  async executeVirtualTryOn(data) {
    // 这里调用具体的AI服务
    logger.info('执行虚拟试衣任务:', data)

    // 模拟处理时间
    await this.sleep(30000)

    return {
      success: true,
      images: ['result1.jpg', 'result2.jpg'],
      processingTime: 30000
    }
  }

  /**
   * 执行时尚摄影任务
   */
  async executeFashionPhoto(data) {
    logger.info('执行时尚摄影任务:', data)

    await this.sleep(45000)

    return {
      success: true,
      images: ['fashion_result.jpg'],
      processingTime: 45000
    }
  }

  /**
   * 执行数字分身任务
   */
  async executeDigitalAvatar(data) {
    logger.info('执行数字分身任务:', data)

    await this.sleep(60000)

    return {
      success: true,
      images: ['avatar_result.jpg'],
      processingTime: 60000
    }
  }

  /**
   * 执行商品摄影任务
   */
  async executeProductPhoto(data) {
    logger.info('执行商品摄影任务:', data)

    await this.sleep(25000)

    return {
      success: true,
      images: ['product_result.jpg'],
      processingTime: 25000
    }
  }

  /**
   * 执行图片处理任务
   */
  async executeImageProcessing(data) {
    logger.info('执行图片处理任务:', data)

    await this.sleep(15000)

    return {
      success: true,
      processedImage: 'processed_image.jpg',
      processingTime: 15000
    }
  }

  /**
   * 获取或创建队列
   */
  getQueue(type) {
    if (!this.queues.has(type)) {
      this.queues.set(type, [])
    }
    return this.queues.get(type)
  }

  /**
   * 按优先级插入任务
   */
  insertTaskByPriority(queue, task) {
    const priority = this.priorities[task.priority] || 1

    // 找到插入位置（按优先级降序）
    let insertIndex = queue.length
    for (let i = 0; i < queue.length; i++) {
      const existingPriority = this.priorities[queue[i].priority] || 1
      if (priority > existingPriority) {
        insertIndex = i
        break
      }
    }

    queue.splice(insertIndex, 0, task)
  }

  /**
   * 清理过期任务
   */
  cleanupExpiredTasks() {
    const now = new Date()
    const expiredThreshold = 24 * 60 * 60 * 1000 // 24小时

    for (const queue of this.queues.values()) {
      const expiredTasks = queue.filter(task =>
        (task.status === 'failed' || task.status === 'cancelled') &&
        (now - task.createdAt > expiredThreshold)
      )

      expiredTasks.forEach(task => {
        const index = queue.indexOf(task)
        if (index !== -1) {
          queue.splice(index, 1)
        }
      })

      if (expiredTasks.length > 0) {
        logger.info('清理过期任务:', {
          count: expiredTasks.length,
          types: expiredTasks.map(t => t.type)
        })
      }
    }
  }

  /**
   * 暂停指定类型的任务处理
   */
  pauseTaskType(type) {
    // 这里可以实现暂停特定类型任务的逻辑
    logger.info('暂停任务类型:', { type })
  }

  /**
   * 恢复指定类型的任务处理
   */
  resumeTaskType(type) {
    logger.info('恢复任务类型:', { type })
  }

  /**
   * 获取任务列表
   */
  getTasks(type = null, status = null, limit = 50) {
    const tasks = []

    if (type) {
      const queue = this.queues.get(type)
      if (queue) {
        tasks.push(...queue)
      }
    } else {
      for (const queue of this.queues.values()) {
        tasks.push(...queue)
      }
    }

    // 添加正在处理的任务
    for (const task of this.processing.values()) {
      if (!type || task.type === type) {
        tasks.push(task)
      }
    }

    // 按状态过滤
    let filteredTasks = tasks
    if (status) {
      filteredTasks = tasks.filter(task => task.status === status)
    }

    // 按创建时间排序
    filteredTasks.sort((a, b) => b.createdAt - a.createdAt)

    // 限制返回数量
    return filteredTasks.slice(0, limit)
  }

  /**
   * 重新排队失败的任务
   */
  requeueFailedTasks(type = null) {
    let requeuedCount = 0

    for (const queue of this.queues.values()) {
      if (type && queue !== this.queues.get(type)) {
        continue
      }

      const failedTasks = queue.filter(task => task.status === 'failed')

      failedTasks.forEach(task => {
        task.status = 'pending'
        task.attempts = 0
        task.error = null
        task.scheduledAt = new Date()
        requeuedCount++
      })

      logger.info('重新排队失败任务:', {
        type: queue === this.queues.get(type) ? type : 'all',
        count: requeuedCount
      })
    }

    return requeuedCount
  }

  /**
   * 睡眠函数
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 设置最大并发数
   */
  setMaxConcurrency(maxConcurrency) {
    this.maxConcurrency = maxConcurrency
    logger.info('设置最大并发数:', { maxConcurrency })
  }

  /**
   * 设置重试参数
   */
  setRetryConfig(maxAttempts, delay) {
    this.retryAttempts = maxAttempts
    this.retryDelay = delay
    logger.info('设置重试配置:', { maxAttempts, delay })
  }
}

module.exports = TaskQueue