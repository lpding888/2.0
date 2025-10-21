/**
 * 高级缓存服务
 * 提供多级缓存策略：内存缓存 + Redis + CDN缓存
 * 支持智能缓存策略、缓存预热、缓存更新等高级功能
 */

const crypto = require('crypto')
const logger = require('../utils/logger')

class CacheService {
  constructor() {
    this.memoryCache = new Map() // 内存缓存
    this.cacheStats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    }
    this.config = {
      maxMemoryItems: 1000,
      defaultTTL: 3600, // 1小时
      cleanupInterval: 60000 // 1分钟清理一次
    }

    // 启动定期清理
    this.startCleanupTimer()
  }

  /**
   * 获取缓存
   */
  async get(key, options = {}) {
    try {
      const {
        level = 'auto', // memory, redis, cdn, auto
        fallbackToMemory = true,
        returnMeta = false
      } = options

      // 生成缓存键的哈希值
      const hashKey = this.generateCacheKey(key)

      // 自动选择缓存级别
      if (level === 'auto') {
        return await this.getFromAutoLevel(hashKey, options)
      }

      // 指定缓存级别获取
      let result
      switch (level) {
        case 'memory':
          result = await this.getFromMemory(hashKey)
          break
        case 'redis':
          result = await this.getFromRedis(hashKey)
          if (fallbackToMemory && !result) {
            result = await this.getFromMemory(hashKey)
          }
          break
        case 'cdn':
          result = await this.getFromCDN(key)
          break
        default:
          throw new Error(`不支持的缓存级别: ${level}`)
      }

      // 更新统计
      if (result) {
        this.cacheStats.hits++
        logger.debug('缓存命中', { key: hashKey, level })
      } else {
        this.cacheStats.misses++
        logger.debug('缓存未命中', { key: hashKey, level })
      }

      return returnMeta ? {
        data: result,
        meta: {
          key: hashKey,
          level,
          hit: !!result,
          timestamp: new Date()
        }
      } : result

    } catch (error) {
      logger.error('缓存获取失败:', error)
      return null
    }
  }

  /**
   * 设置缓存
   */
  async set(key, value, options = {}) {
    try {
      const {
        ttl = this.config.defaultTTL,
        level = 'auto', // memory, redis, cdn, all
        tags = [], // 缓存标签，便于批量管理
        priority = 'normal' // high, normal, low
      } = options

      const hashKey = this.generateCacheKey(key)
      const expireTime = Date.now() + (ttl * 1000)

      // 缓存数据包装
      const cacheData = {
        value,
        expireTime,
        tags,
        priority,
        createdAt: Date.now(),
        accessCount: 0
      }

      // 设置到指定缓存级别
      const promises = []
      switch (level) {
        case 'auto':
          // 根据数据大小和访问频率自动选择
          if (this.shouldUseMemory(value, priority)) {
            promises.push(this.setToMemory(hashKey, cacheData))
          } else {
            promises.push(this.setToRedis(hashKey, cacheData))
          }
          break
        case 'memory':
          promises.push(this.setToMemory(hashKey, cacheData))
          break
        case 'redis':
          promises.push(this.setToRedis(hashKey, cacheData))
          break
        case 'cdn':
          promises.push(this.setToCDN(key, value, ttl))
          break
        case 'all':
          promises.push(
            this.setToMemory(hashKey, cacheData),
            this.setToRedis(hashKey, cacheData)
          )
          break
        default:
          throw new Error(`不支持的缓存级别: ${level}`)
      }

      await Promise.allSettled(promises)

      this.cacheStats.sets++
      logger.debug('缓存设置成功', { key: hashKey, level, ttl })

      return true

    } catch (error) {
      logger.error('缓存设置失败:', error)
      return false
    }
  }

  /**
   * 删除缓存
   */
  async delete(key, options = {}) {
    try {
      const { level = 'all', tags = [] } = options
      const hashKey = this.generateCacheKey(key)

      const promises = []

      // 根据标签删除
      if (tags.length > 0) {
        promises.push(this.deleteByTags(tags))
      }

      // 根据键删除
      switch (level) {
        case 'memory':
          promises.push(this.deleteFromMemory(hashKey))
          break
        case 'redis':
          promises.push(this.deleteFromRedis(hashKey))
          break
        case 'cdn':
          promises.push(this.deleteFromCDN(key))
          break
        case 'all':
          promises.push(
            this.deleteFromMemory(hashKey),
            this.deleteFromRedis(hashKey),
            this.deleteFromCDN(key)
          )
          break
      }

      await Promise.allSettled(promises)

      this.cacheStats.deletes++
      logger.debug('缓存删除成功', { key: hashKey, level })

      return true

    } catch (error) {
      logger.error('缓存删除失败:', error)
      return false
    }
  }

  /**
   * 批量获取缓存
   */
  async mget(keys, options = {}) {
    try {
      const { level = 'auto' } = options
      const promises = keys.map(key => this.get(key, { ...options, level }))

      const results = await Promise.allSettled(promises)

      return results.map((result, index) => ({
        key: keys[index],
        success: result.status === 'fulfilled',
        data: result.status === 'fulfilled' ? result.value : null,
        error: result.status === 'rejected' ? result.reason : null
      }))

    } catch (error) {
      logger.error('批量获取缓存失败:', error)
      return keys.map(key => ({
        key,
        success: false,
        data: null,
        error: error.message
      }))
    }
  }

  /**
   * 批量设置缓存
   */
  async mset(items, options = {}) {
    try {
      const promises = items.map(item => this.set(item.key, item.value, options))

      const results = await Promise.allSettled(promises)

      const summary = {
        total: items.length,
        success: results.filter(r => r.status === 'fulfilled').length,
        failed: results.filter(r => r.status === 'rejected').length
      }

      return summary

    } catch (error) {
      logger.error('批量设置缓存失败:', error)
      return {
        total: items.length,
        success: 0,
        failed: items.length,
        error: error.message
      }
    }
  }

  /**
   * 缓存预热
   */
  async warmup(preloadItems, options = {}) {
    try {
      const { concurrency = 5, delay = 100 } = options
      const results = []

      // 分批处理，避免过载
      for (let i = 0; i < preloadItems.length; i += concurrency) {
        const batch = preloadItems.slice(i, i + concurrency)
        const batchPromises = batch.map(item => this.preloadItem(item))

        const batchResults = await Promise.allSettled(batchPromises)
        results.push(...batchResults)

        // 批次间延迟
        if (i + concurrency < preloadItems.length) {
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }

      const summary = {
        total: preloadItems.length,
        success: results.filter(r => r.status === 'fulfilled').length,
        failed: results.filter(r => r.status === 'rejected').length
      }

      logger.info('缓存预热完成', summary)
      return summary

    } catch (error) {
      logger.error('缓存预热失败:', error)
      throw error
    }
  }

  /**
   * 预加载单个缓存项
   */
  async preloadItem(item) {
    try {
      const { key, loader, options = {} } = item

      // 如果缓存已存在，跳过
      const existing = await this.get(key, { ...options, returnMeta: true })
      if (existing && existing.meta.hit) {
        return { key, status: 'exists', data: existing.data }
      }

      // 加载数据
      const data = await loader()
      if (data) {
        await this.set(key, data, options)
        return { key, status: 'loaded', data }
      }

      return { key, status: 'failed', error: 'No data loaded' }

    } catch (error) {
      logger.error('预加载项失败:', { key, error: error.message })
      return { key, status: 'failed', error: error.message }
    }
  }

  /**
   * 自动级别缓存获取
   */
  async getFromAutoLevel(hashKey, options) {
    // 1. 首先尝试内存缓存
    let result = await this.getFromMemory(hashKey)
    if (result) return result

    // 2. 尝试Redis缓存
    result = await this.getFromRedis(hashKey)
    if (result) {
      // 将Redis缓存的数据回填到内存缓存
      await this.setToMemory(hashKey, {
        value: result,
        expireTime: Date.now() + (options.ttl || this.config.defaultTTL) * 1000,
        accessCount: 1
      })
      return result
    }

    // 3. 尝试CDN缓存（如果是公开数据）
    if (options.allowCDN) {
      result = await this.getFromCDN(hashKey)
      if (result) {
        // 回填到本地缓存
        await this.set(hashKey, result, { ...options, level: 'auto' })
        return result
      }
    }

    return null
  }

  /**
   * 内存缓存操作
   */
  async getFromMemory(hashKey) {
    const item = this.memoryCache.get(hashKey)
    if (!item) return null

    // 检查过期
    if (Date.now() > item.expireTime) {
      this.memoryCache.delete(hashKey)
      return null
    }

    // 更新访问统计
    item.accessCount++
    item.lastAccess = Date.now()

    return item.value
  }

  async setToMemory(hashKey, data) {
    // 检查内存缓存容量
    if (this.memoryCache.size >= this.config.maxMemoryItems) {
      this.evictLeastUsed()
    }

    this.memoryCache.set(hashKey, data)
    return true
  }

  deleteFromMemory(hashKey) {
    return this.memoryCache.delete(hashKey)
  }

  /**
   * Redis缓存操作
   */
  async getFromRedis(hashKey) {
    try {
      const Redis = require('../shared/database/redis-connection')
      const redis = new Redis()
      const result = await redis.get(hashKey)

      if (result) {
        const parsed = JSON.parse(result)
        // 检查过期时间
        if (Date.now() > parsed.expireTime) {
          await redis.delete(hashKey)
          return null
        }
        return parsed.value
      }

      return null

    } catch (error) {
      logger.warn('Redis获取失败:', error)
      return null
    }
  }

  async setToRedis(hashKey, data) {
    try {
      const Redis = require('../shared/database/redis-connection')
      const redis = new Redis()
      const ttl = Math.ceil((data.expireTime - Date.now()) / 1000)

      await redis.set(hashKey, JSON.stringify(data), 'EX', ttl)
      return true

    } catch (error) {
      logger.warn('Redis设置失败:', error)
      return false
    }
  }

  deleteFromRedis(hashKey) {
    try {
      const Redis = require('../shared/database/redis-connection')
      const redis = new Redis()
      return redis.delete(hashKey)
    } catch (error) {
      logger.warn('Redis删除失败:', error)
      return false
    }
  }

  /**
   * CDN缓存操作（简化实现）
   */
  async getFromCDN(key) {
    // 这里应该调用实际的CDN API
    // 目前返回null，表示CDN缓存未实现
    return null
  }

  async setToCDN(key, value, ttl) {
    // CDN缓存设置逻辑
    logger.debug('CDN缓存设置（未实现）', { key, ttl })
    return true
  }

  deleteFromCDN(key) {
    // CDN缓存删除逻辑
    logger.debug('CDN缓存删除（未实现）', { key })
    return true
  }

  /**
   * 根据标签删除缓存
   */
  async deleteByTags(tags) {
    const keysToDelete = []

    // 从内存缓存中查找匹配标签的键
    for (const [key, data] of this.memoryCache.entries()) {
      if (data.tags && data.tags.some(tag => tags.includes(tag))) {
        keysToDelete.push(key)
      }
    }

    // 删除匹配的缓存
    for (const key of keysToDelete) {
      this.memoryCache.delete(key)
    }

    // TODO: 也需要从Redis中删除匹配标签的缓存

    logger.debug('按标签删除缓存', { tags, deletedCount: keysToDelete.length })
    return keysToDelete.length
  }

  /**
   * 判断是否应该使用内存缓存
   */
  shouldUseMemory(value, priority) {
    // 根据数据大小和优先级判断
    const size = this.calculateSize(value)
    const maxSize = priority === 'high' ? 1024 * 100 : 1024 * 50 // 100KB/50KB

    return size <= maxSize
  }

  /**
   * 计算数据大小
   */
  calculateSize(value) {
    return JSON.stringify(value).length * 2 // 粗略计算UTF-16字符大小
  }

  /**
   * 生成缓存键
   */
  generateCacheKey(key) {
    if (typeof key === 'string') {
      return crypto.createHash('md5').update(key).digest('hex')
    }
    return crypto.createHash('md5').update(JSON.stringify(key)).digest('hex')
  }

  /**
   * 淘汰最少使用的缓存项
   */
  evictLeastUsed() {
    let leastUsedKey = null
    let leastUsedTime = Date.now()
    let leastAccessCount = Infinity

    for (const [key, data] of this.memoryCache.entries()) {
      // 优先淘汰低优先级和低访问次数的项
      const score = (data.priority === 'low' ? 0 : data.priority === 'normal' ? 1 : 2) * 1000 + data.accessCount
      if (score < leastAccessCount || (score === leastAccessCount && data.lastAccess < leastUsedTime)) {
        leastUsedKey = key
        leastUsedTime = data.lastAccess
        leastAccessCount = score
      }
    }

    if (leastUsedKey) {
      this.memoryCache.delete(leastUsedKey)
      logger.debug('淘汰内存缓存项', { key: leastUsedKey })
    }
  }

  /**
   * 启动定期清理定时器
   */
  startCleanupTimer() {
    setInterval(() => {
      this.cleanup()
    }, this.config.cleanupInterval)
  }

  /**
   * 清理过期缓存
   */
  cleanup() {
    const now = Date.now()
    let cleanedCount = 0

    // 清理内存缓存
    for (const [key, data] of this.memoryCache.entries()) {
      if (now > data.expireTime) {
        this.memoryCache.delete(key)
        cleanedCount++
      }
    }

    if (cleanedCount > 0) {
      logger.debug('清理过期缓存', { count: cleanedCount })
    }
  }

  /**
   * 获取缓存统计信息
   */
  getStats() {
    const hitRate = this.cacheStats.hits + this.cacheStats.misses > 0
      ? (this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses) * 100).toFixed(2)
      : 0

    return {
      ...this.cacheStats,
      hitRate: `${hitRate}%`,
      memorySize: this.memoryCache.size,
      memoryUsage: this.calculateMemoryUsage()
    }
  }

  /**
   * 计算内存使用量
   */
  calculateMemoryUsage() {
    let totalSize = 0
    for (const [key, data] of this.memoryCache.entries()) {
      totalSize += this.calculateSize(data)
    }
    return `${(totalSize / 1024).toFixed(2)} KB`
  }

  /**
   * 清空所有缓存
   */
  async clear(options = {}) {
    const { level = 'all' } = options

    try {
      const promises = []

      if (level === 'all' || level === 'memory') {
        this.memoryCache.clear()
      }

      if (level === 'all' || level === 'redis') {
        const Redis = require('../shared/database/redis-connection')
        const redis = new Redis()
        promises.push(redis.flushDb())
      }

      await Promise.allSettled(promises)

      logger.info('缓存清空完成', { level })
      return true

    } catch (error) {
      logger.error('缓存清空失败:', error)
      return false
    }
  }
}

// 创建全局缓存实例
const cacheService = new CacheService()

// SCF入口函数
exports.main_handler = async (event, context) => {
  try {
    const { action, ...data } = event

    // 根据action调用对应方法
    const methodMap = {
      'get': 'get',
      'set': 'set',
      'delete': 'delete',
      'mget': 'mget',
      'mset': 'mset',
      'warmup': 'warmup',
      'stats': 'getStats',
      'clear': 'clear'
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
          message: `不支持的缓存操作: ${action}`
        })
      }
    }

    const result = await cacheService[methodName](data)

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        data: result
      })
    }

  } catch (error) {
    logger.error('缓存服务处理失败:', error)

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        message: '缓存服务处理失败'
      })
    }
  }
}

module.exports = CacheService