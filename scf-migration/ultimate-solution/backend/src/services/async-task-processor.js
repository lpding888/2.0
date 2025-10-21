/**
 * 异步任务处理器
 * 专门处理需要长时间运行的AI生成任务，突破60秒限制
 * 支持任务分片、进度跟踪、自动重试、失败恢复等高级功能
 */

const { v4: uuidv4 } = require('uuid')
const EventEmitter = require('events')
const logger = require('../utils/logger')
const CacheService = require('./cache-service')

class AsyncTaskProcessor extends EventEmitter {
  constructor() {
    super()
    this.tasks = new Map() // 当前运行的任务
    this.taskQueue = [] // 任务队列
    this.maxConcurrentTasks = 5 // 最大并发任务数
    this.defaultTimeout = 900000 // 15分钟默认超时（突破60秒限制）
    this.checkInterval = 5000 // 5秒检查一次任务状态
    this.cacheService = new CacheService()

    // 启动任务监控
    this.startTaskMonitor()

    // 任务状态枚举
    this.TASK_STATUS = {
      PENDING: 'pending',       // 等待执行
      RUNNING: 'running',       // 正在执行
      PAUSED: 'paused',         // 暂停
      COMPLETED: 'completed',   // 完成
      FAILED: 'failed',         // 失败
      CANCELLED: 'cancelled',   // 取消
      TIMEOUT: 'timeout'        // 超时
    }
  }

  /**
   * 创建异步任务
   */
  async createTask(taskConfig) {
    try {
      const {
        type,           // 任务类型：ai-generation, image-processing, batch-operation
        priority = 'normal', // 优先级：high, normal, low
        timeout = this.defaultTimeout,
        retryConfig = {
          maxRetries: 3,
          retryDelay: 5000,
          backoffMultiplier: 2
        },
        progressCallback,
        data,           // 任务数据
        metadata = {}   // 元数据
      } = taskConfig

      // 创建任务实例
      const task = {
        id: uuidv4(),
        type,
        priority,
        status: this.TASK_STATUS.PENDING,
        progress: 0,
        result: null,
        error: null,
        createdAt: new Date(),
        startedAt: null,
        completedAt: null,
        timeout,
        retryConfig,
        currentRetry: 0,
        data,
        metadata,
        subtasks: [], // 子任务列表
        progressCallback
      }

      // 保存任务
      this.tasks.set(task.id, task)

      // 添加到队列
      this.addToQueue(task)

      // 缓存任务信息
      await this.cacheTaskInfo(task)

      logger.info('异步任务创建', { taskId: task.id, type, priority })

      // 发出事件
      this.emit('taskCreated', task)

      return {
        success: true,
        data: {
          taskId: task.id,
          status: task.status,
          estimatedDuration: this.estimateTaskDuration(type)
        }
      }

    } catch (error) {
      logger.error('创建异步任务失败:', error)
      return {
        success: false,
        message: '创建任务失败',
        error: error.message
      }
    }
  }

  /**
   * 添加任务到队列
   */
  addToQueue(task) {
    // 根据优先级插入队列
    let insertIndex = this.taskQueue.length

    for (let i = 0; i < this.taskQueue.length; i++) {
      const queueTask = this.taskQueue[i]
      if (this.comparePriority(task.priority, queueTask.priority) > 0) {
        insertIndex = i
        break
      }
    }

    this.taskQueue.splice(insertIndex, 0, task)

    // 尝试立即执行任务
    this.processQueue()
  }

  /**
   * 处理任务队列
   */
  async processQueue() {
    // 检查是否还能处理更多任务
    const runningTasks = Array.from(this.tasks.values())
      .filter(task => task.status === this.TASK_STATUS.RUNNING)

    if (runningTasks.length >= this.maxConcurrentTasks) {
      return
    }

    // 从队列中取出任务
    while (this.taskQueue.length > 0 && runningTasks.length < this.maxConcurrentTasks) {
      const task = this.taskQueue.shift()

      if (task.status === this.TASK_STATUS.PENDING) {
        this.executeTask(task)
        runningTasks.push(task)
      }
    }
  }

  /**
   * 执行任务
   */
  async executeTask(task) {
    try {
      // 更新任务状态
      task.status = this.TASK_STATUS.RUNNING
      task.startedAt = new Date()

      await this.updateTaskCache(task)

      logger.info('开始执行异步任务', { taskId: task.id, type: task.type })

      // 发出事件
      this.emit('taskStarted', task)

      // 根据任务类型执行不同的处理逻辑
      let result
      switch (task.type) {
        case 'ai-generation':
          result = await this.executeAIGenerationTask(task)
          break
        case 'image-processing':
          result = await this.executeImageProcessingTask(task)
          break
        case 'batch-operation':
          result = await this.executeBatchOperationTask(task)
          break
        default:
          throw new Error(`不支持的任务类型: ${task.type}`)
      }

      // 任务完成
      await this.completeTask(task, result)

    } catch (error) {
      logger.error('任务执行失败:', { taskId: task.id, error: error.message })

      // 检查是否需要重试
      if (this.shouldRetry(task)) {
        await this.retryTask(task)
      } else {
        await this.failTask(task, error)
      }
    }
  }

  /**
   * 执行AI生成任务
   */
  async executeAIGenerationTask(task) {
    const {
      aiModel,
      inputImages,
      prompt,
      parameters = {},
      subtaskConfig = {}
    } = task.data

    // 将AI生成任务分解为多个子任务
    const subtasks = this.createSubtasks(task, {
      type: 'ai-subtask',
      totalSteps: 5, // AI生成的典型步骤数
      ...subtaskConfig
    })

    // 执行子任务
    for (let i = 0; i < subtasks.length; i++) {
      const subtask = subtasks[i]

      try {
        // 更新进度
        await this.updateTaskProgress(task, i * 20, `执行步骤 ${i + 1}/5`)

        // 执行具体的子任务
        const subtaskResult = await this.executeSubtask(subtask)

        // 合并结果
        if (i === 0) {
          task.result = subtaskResult
        } else {
          task.result = this.mergeResults(task.result, subtaskResult)
        }

        // 保存中间结果
        await this.cacheTaskResult(task, false)

      } catch (error) {
        logger.error('子任务执行失败:', {
          taskId: task.id,
          subtaskIndex: i,
          error: error.message
        })
        throw error
      }
    }

    // 最终处理
    await this.updateTaskProgress(task, 100, 'AI生成完成')

    return task.result
  }

  /**
   * 执行图片处理任务
   */
  async executeImageProcessingTask(task) {
    const {
      operations, // 图片操作列表
      inputImages,
      outputOptions
    } = task.data

    const subtasks = this.createSubtasks(task, {
      type: 'image-subtask',
      totalSteps: operations.length
    })

    for (let i = 0; i < operations.length; i++) {
      const operation = operations[i]
      const subtask = subtasks[i]

      try {
        await this.updateTaskProgress(task,
          Math.floor((i / operations.length) * 100),
          `处理图片 ${i + 1}/${operations.length}`
        )

        subtask.data.operation = operation
        subtask.data.inputImage = inputImages[i] || inputImages[0]

        const result = await this.executeSubtask(subtask)

        if (i === 0) {
          task.result = { processedImages: [result] }
        } else {
          task.result.processedImages.push(result)
        }

        await this.cacheTaskResult(task, false)

      } catch (error) {
        logger.error('图片处理子任务失败:', {
          taskId: task.id,
          operation: operation.type,
          error: error.message
        })
        throw error
      }
    }

    await this.updateTaskProgress(task, 100, '图片处理完成')
    return task.result
  }

  /**
   * 执行批量操作任务
   */
  async executeBatchOperationTask(task) {
    const {
      items,
      operation,
      batchSize = 5,
      delay = 1000
    } = task.data

    const totalBatches = Math.ceil(items.length / batchSize)
    const subtasks = this.createSubtasks(task, {
      type: 'batch-subtask',
      totalSteps: totalBatches
    })

    task.result = { processedItems: [], failedItems: [] }

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const startIdx = batchIndex * batchSize
      const endIdx = Math.min(startIdx + batchSize, items.length)
      const batchItems = items.slice(startIdx, endIdx)

      const subtask = subtasks[batchIndex]
      subtask.data.batchItems = batchItems
      subtask.data.operation = operation

      try {
        await this.updateTaskProgress(task,
          Math.floor((batchIndex / totalBatches) * 100),
          `处理批次 ${batchIndex + 1}/${totalBatches}`
        )

        const batchResult = await this.executeSubtask(subtask)

        // 合并批量结果
        task.result.processedItems.push(...batchResult.successful)
        task.result.failedItems.push(...batchResult.failed)

        await this.cacheTaskResult(task, false)

        // 批次间延迟
        if (delay > 0 && batchIndex < totalBatches - 1) {
          await new Promise(resolve => setTimeout(resolve, delay))
        }

      } catch (error) {
        logger.error('批量操作子任务失败:', {
          taskId: task.id,
          batchIndex,
          error: error.message
        })

        // 记录失败的批次
        task.result.failedItems.push(...batchItems.map(item => ({
          item,
          error: error.message
        })))
      }
    }

    await this.updateTaskProgress(task, 100, '批量操作完成')
    return task.result
  }

  /**
   * 创建子任务
   */
  createSubtasks(parentTask, config) {
    const { type, totalSteps } = config
    const subtasks = []

    for (let i = 0; i < totalSteps; i++) {
      const subtask = {
        id: `${parentTask.id}-subtask-${i + 1}`,
        parentId: parentTask.id,
        type,
        index: i,
        status: this.TASK_STATUS.PENDING,
        createdAt: new Date()
      }

      subtasks.push(subtask)
      parentTask.subtasks.push(subtask)
    }

    return subtasks
  }

  /**
   * 执行子任务
   */
  async executeSubtask(subtask) {
    // 这里应该根据子任务类型调用具体的处理逻辑
    // 目前返回模拟结果
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000))

    return {
      subtaskId: subtask.id,
      completedAt: new Date(),
      data: `模拟结果 - ${subtask.type}`
    }
  }

  /**
   * 合并结果
   */
  mergeResults(result1, result2) {
    // 根据任务类型合并结果
    if (result1 && result2) {
      return {
        ...result1,
        ...result2,
        mergedAt: new Date()
      }
    }
    return result2 || result1
  }

  /**
   * 更新任务进度
   */
  async updateTaskProgress(task, progress, message = '') {
    task.progress = Math.max(0, Math.min(100, progress))

    if (message) {
      task.metadata.statusMessage = message
    }

    // 更新缓存
    await this.updateTaskCache(task)

    // 调用进度回调
    if (task.progressCallback) {
      try {
        await task.progressCallback({
          taskId: task.id,
          progress: task.progress,
          message,
          status: task.status
        })
      } catch (error) {
        logger.warn('进度回调执行失败:', error)
      }
    }

    // 发出进度事件
    this.emit('taskProgress', task)
  }

  /**
   * 完成任务
   */
  async completeTask(task, result) {
    task.status = this.TASK_STATUS.COMPLETED
    task.completedAt = new Date()
    task.result = result
    task.progress = 100

    await this.updateTaskCache(task)
    await this.cacheTaskResult(task, true)

    logger.info('任务完成', {
      taskId: task.id,
      duration: task.completedAt - task.startedAt,
      result: result ? 'success' : 'no result'
    })

    this.emit('taskCompleted', task)

    // 处理队列中的下一个任务
    this.processQueue()
  }

  /**
   * 任务失败
   */
  async failTask(task, error) {
    task.status = this.TASK_STATUS.FAILED
    task.completedAt = new Date()
    task.error = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date()
    }

    await this.updateTaskCache(task)

    logger.error('任务失败', {
      taskId: task.id,
      error: error.message,
      retryCount: task.currentRetry
    })

    this.emit('taskFailed', task)

    // 处理队列中的下一个任务
    this.processQueue()
  }

  /**
   * 重试任务
   */
  async retryTask(task) {
    task.currentRetry++
    task.status = this.TASK_STATUS.PENDING
    task.startedAt = null

    // 计算重试延迟
    const delay = task.retryConfig.retryDelay *
      Math.pow(task.retryConfig.backoffMultiplier, task.currentRetry - 1)

    logger.info('准备重试任务', {
      taskId: task.id,
      retryCount: task.currentRetry,
      delay
    })

    // 延迟后重新加入队列
    setTimeout(() => {
      this.addToQueue(task)
      this.emit('taskRetry', task)
    }, delay)

    await this.updateTaskCache(task)
  }

  /**
   * 判断是否应该重试
   */
  shouldRetry(task) {
    return task.currentRetry < task.retryConfig.maxRetries
  }

  /**
   * 取消任务
   */
  async cancelTask(taskId) {
    const task = this.tasks.get(taskId)
    if (!task) {
      return {
        success: false,
        message: '任务不存在'
      }
    }

    if (task.status === this.TASK_STATUS.RUNNING) {
      // 标记为取消，让正在执行的任务自己停止
      task.status = this.TASK_STATUS.CANCELLED
      await this.updateTaskCache(task)

      this.emit('taskCancelled', task)

      return {
        success: true,
        message: '任务已取消'
      }
    } else if (task.status === this.TASK_STATUS.PENDING) {
      // 从队列中移除
      const queueIndex = this.taskQueue.findIndex(t => t.id === taskId)
      if (queueIndex !== -1) {
        this.taskQueue.splice(queueIndex, 1)
      }

      this.tasks.delete(taskId)

      return {
        success: true,
        message: '任务已从队列中移除'
      }
    }

    return {
      success: false,
      message: `任务状态无法取消: ${task.status}`
    }
  }

  /**
   * 获取任务状态
   */
  async getTaskStatus(taskId) {
    const task = this.tasks.get(taskId)
    if (!task) {
      // 尝试从缓存中获取
      const cached = await this.cacheService.get(`task:${taskId}`)
      if (cached) {
        return {
          success: true,
          data: cached
        }
      }

      return {
        success: false,
        message: '任务不存在'
      }
    }

    return {
      success: true,
      data: {
        taskId: task.id,
        status: task.status,
        progress: task.progress,
        type: task.type,
        createdAt: task.createdAt,
        startedAt: task.startedAt,
        completedAt: task.completedAt,
        result: task.result,
        error: task.error,
        metadata: task.metadata,
        subtasks: task.subtasks.map(st => ({
          id: st.id,
          status: st.status,
          index: st.index
        }))
      }
    }
  }

  /**
   * 获取任务列表
   */
  async getTaskList(filters = {}) {
    const {
      status,
      type,
      limit = 50,
      offset = 0,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = filters

    let tasks = Array.from(this.tasks.values())

    // 应用过滤器
    if (status) {
      tasks = tasks.filter(task => task.status === status)
    }
    if (type) {
      tasks = tasks.filter(task => task.type === type)
    }

    // 排序
    tasks.sort((a, b) => {
      const aVal = a[sortBy]
      const bVal = b[sortBy]
      const order = sortOrder === 'desc' ? -1 : 1

      if (aVal < bVal) return -1 * order
      if (aVal > bVal) return 1 * order
      return 0
    })

    // 分页
    const total = tasks.length
    const paginatedTasks = tasks.slice(offset, offset + limit)

    return {
      success: true,
      data: {
        tasks: paginatedTasks.map(task => ({
          taskId: task.id,
          status: task.status,
          progress: task.progress,
          type: task.type,
          createdAt: task.createdAt,
          startedAt: task.startedAt,
          completedAt: task.completedAt,
          metadata: task.metadata
        })),
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      }
    }
  }

  /**
   * 启动任务监控
   */
  startTaskMonitor() {
    setInterval(async () => {
      await this.checkTaskTimeouts()
      await this.cleanupCompletedTasks()
    }, this.checkInterval)
  }

  /**
   * 检查任务超时
   */
  async checkTaskTimeouts() {
    const now = Date.now()

    for (const task of this.tasks.values()) {
      if (task.status === this.TASK_STATUS.RUNNING && task.startedAt) {
        const duration = now - task.startedAt.getTime()

        if (duration > task.timeout) {
          logger.warn('任务超时', {
            taskId: task.id,
            duration,
            timeout: task.timeout
          })

          task.status = this.TASK_STATUS.TIMEOUT
          task.error = {
            message: `任务执行超时 (${duration}ms > ${task.timeout}ms)`,
            timestamp: new Date()
          }

          await this.updateTaskCache(task)
          this.emit('taskTimeout', task)

          // 检查是否需要重试
          if (this.shouldRetry(task)) {
            await this.retryTask(task)
          }
        }
      }
    }
  }

  /**
   * 清理已完成的任务
   */
  async cleanupCompletedTasks() {
    const now = Date.now()
    const cleanupThreshold = 24 * 60 * 60 * 1000 // 24小时

    const tasksToRemove = []

    for (const [taskId, task] of this.tasks.entries()) {
      const isCompleted = task.status === this.TASK_STATUS.COMPLETED ||
                         task.status === this.TASK_STATUS.FAILED ||
                         task.status === this.TASK_STATUS.CANCELLED ||
                         task.status === this.TASK_STATUS.TIMEOUT

      if (isCompleted && task.completedAt) {
        const age = now - task.completedAt.getTime()
        if (age > cleanupThreshold) {
          tasksToRemove.push(taskId)
        }
      }
    }

    for (const taskId of tasksToRemove) {
      this.tasks.delete(taskId)
      logger.debug('清理已完成任务', { taskId })
    }
  }

  /**
   * 缓存任务信息
   */
  async cacheTaskInfo(task) {
    await this.cacheService.set(`task:${task.id}`, {
      taskId: task.id,
      status: task.status,
      progress: task.progress,
      type: task.type,
      createdAt: task.createdAt,
      metadata: task.metadata
    }, {
      ttl: 7 * 24 * 3600, // 7天
      level: 'redis'
    })
  }

  /**
   * 更新任务缓存
   */
  async updateTaskCache(task) {
    await this.cacheService.set(`task:${task.id}`, {
      taskId: task.id,
      status: task.status,
      progress: task.progress,
      type: task.type,
      createdAt: task.createdAt,
      startedAt: task.startedAt,
      completedAt: task.completedAt,
      metadata: task.metadata
    }, {
      ttl: 7 * 24 * 3600,
      level: 'redis'
    })
  }

  /**
   * 缓存任务结果
   */
  async cacheTaskResult(task, isFinal = false) {
    if (task.result) {
      await this.cacheService.set(`task:${task.id}:result`, task.result, {
        ttl: isFinal ? 30 * 24 * 3600 : 7 * 24 * 3600, // 最终结果保存30天
        level: 'redis'
      })
    }
  }

  /**
   * 比较优先级
   */
  comparePriority(p1, p2) {
    const priorityOrder = { high: 3, normal: 2, low: 1 }
    return priorityOrder[p1] - priorityOrder[p2]
  }

  /**
   * 估算任务执行时间
   */
  estimateTaskDuration(type) {
    const estimates = {
      'ai-generation': 300000,    // 5分钟
      'image-processing': 120000, // 2分钟
      'batch-operation': 600000   // 10分钟
    }
    return estimates[type] || 180000 // 默认3分钟
  }

  /**
   * 获取系统统计信息
   */
  getSystemStats() {
    const tasks = Array.from(this.tasks.values())

    const stats = {
      total: tasks.length,
      running: tasks.filter(t => t.status === this.TASK_STATUS.RUNNING).length,
      pending: tasks.filter(t => t.status === this.TASK_STATUS.PENDING).length,
      completed: tasks.filter(t => t.status === this.TASK_STATUS.COMPLETED).length,
      failed: tasks.filter(t => t.status === this.TASK_STATUS.FAILED).length,
      queueLength: this.taskQueue.length,
      maxConcurrent: this.maxConcurrentTasks
    }

    return stats
  }
}

// 创建全局任务处理器实例
const taskProcessor = new AsyncTaskProcessor()

// SCF入口函数
exports.main_handler = async (event, context) => {
  try {
    const { action, ...data } = event

    // 根据action调用对应方法
    const methodMap = {
      'create': 'createTask',
      'getStatus': 'getTaskStatus',
      'getList': 'getTaskList',
      'cancel': 'cancelTask',
      'getStats': 'getSystemStats'
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
    logger.error('异步任务处理器处理失败:', error)

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        message: '任务处理失败'
      })
    }
  }
}

module.exports = AsyncTaskProcessor