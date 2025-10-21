/**
 * 数据库连接服务
 * 替代微信云开发的 cloud.database()
 * 支持 MongoDB 和 TDSQL-C
 */

const { MongoClient } = require('mongodb')
const Redis = require('redis')
const logger = require('../../utils/logger')

class Database {
  constructor() {
    this.mongoClient = null
    this.mongoDb = null
    this.redisClient = null
    this.isConnected = false
  }

  /**
   * 初始化数据库连接
   */
  async connect() {
    try {
      if (this.isConnected) {
        return this.mongoDb
      }

      // 连接 MongoDB
      if (process.env.MONGODB_URI) {
        await this.connectMongoDB()
      }

      // 连接 Redis（可选）
      if (process.env.REDIS_URI) {
        await this.connectRedis()
      }

      this.isConnected = true
      logger.info('数据库连接成功')
      return this.mongoDb

    } catch (error) {
      logger.error('数据库连接失败:', error)
      throw new Error('数据库连接失败')
    }
  }

  /**
   * 连接 MongoDB
   */
  async connectMongoDB() {
    try {
      const mongoUri = process.env.MONGODB_URI
      const dbName = process.env.DB_NAME || 'ai-photography'

      this.mongoClient = new MongoClient(mongoUri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        bufferMaxEntries: 0,
        bufferCommands: false,
        useNewUrlParser: true,
        useUnifiedTopology: true
      })

      await this.mongoClient.connect()
      this.mongoDb = this.mongoClient.db(dbName)

      // 设置索引
      await this.setupIndexes()

      logger.info('MongoDB 连接成功:', { dbName })

    } catch (error) {
      logger.error('MongoDB 连接失败:', error)
      throw error
    }
  }

  /**
   * 连接 Redis
   */
  async connectRedis() {
    try {
      this.redisClient = Redis.createClient({
        url: process.env.REDIS_URI,
        retry_strategy: (options) => {
          if (options.error && options.error.code === 'ECONNREFUSED') {
            return new Error('Redis服务器拒绝连接')
          }
          if (options.total_retry_time > 1000 * 60 * 60) {
            return new Error('重试时间已用尽')
          }
          if (options.attempt > 10) {
            return undefined
          }
          return Math.min(options.attempt * 100, 3000)
        }
      })

      this.redisClient.on('error', (err) => {
        logger.error('Redis 连接错误:', err)
      })

      this.redisClient.on('connect', () => {
        logger.info('Redis 连接成功')
      })

      await this.redisClient.connect()

    } catch (error) {
      logger.error('Redis 连接失败:', error)
      // Redis 连接失败不影响主要功能，只记录警告
      logger.warn('Redis 不可用，将使用内存缓存')
    }
  }

  /**
   * 设置数据库索引
   */
  async setupIndexes() {
    try {
      const collections = ['users', 'works', 'task_queue', 'orders', 'credit_records']

      for (const collectionName of collections) {
        const collection = this.mongoDb.collection(collectionName)

        switch (collectionName) {
          case 'users':
            await collection.createIndex({ openid: 1 }, { unique: true })
            await collection.createIndex({ 'status': 1 })
            await collection.createIndex({ 'createdAt': -1 })
            break

          case 'works':
            await collection.createIndex({ openid: 1, 'createdAt': -1 })
            await collection.createIndex({ type: 1 })
            await collection.createIndex({ isPublic: 1, 'createdAt': -1 })
            await collection.createIndex({ tags: 1 })
            break

          case 'task_queue':
            await collection.createIndex({ openid: 1, 'createdAt': -1 })
            await collection.createIndex({ status: 1, 'createdAt': -1 })
            await collection.createIndex({ type: 1 })
            break

          case 'orders':
            await collection.createIndex({ openid: 1, 'createdAt': -1 })
            await collection.createIndex({ status: 1 })
            await collection.createIndex({ type: 1 })
            break

          case 'credit_records':
            await collection.createIndex({ openid: 1, 'createdAt': -1 })
            await collection.createIndex({ type: 1 })
            break
        }
      }

      logger.info('数据库索引设置完成')

    } catch (error) {
      logger.error('设置数据库索引失败:', error)
      // 索引设置失败不影响启动
    }
  }

  /**
   * 获取集合
   */
  collection(name) {
    if (!this.mongoDb) {
      throw new Error('数据库未连接')
    }
    return this.mongoDb.collection(name)
  }

  /**
   * 执行事务
   */
  async transaction(operations) {
    if (!this.mongoDb) {
      throw new Error('数据库未连接')
    }

    const session = this.mongoClient.startSession()

    try {
      await session.withTransaction(async () => {
        for (const operation of operations) {
          await operation(this.mongoDb, session)
        }
      })
    } finally {
      await session.endSession()
    }
  }

  /**
   * 缓存操作
   */
  async cacheSet(key, value, ttl = 3600) {
    try {
      if (this.redisClient) {
        await this.redisClient.setEx(key, ttl, JSON.stringify(value))
      } else {
        // 使用内存缓存（简单实现）
        if (!this.memoryCache) {
          this.memoryCache = new Map()
        }
        this.memoryCache.set(key, {
          value,
          expireAt: Date.now() + ttl * 1000
        })
      }
    } catch (error) {
      logger.error('缓存设置失败:', error)
    }
  }

  async cacheGet(key) {
    try {
      if (this.redisClient) {
        const value = await this.redisClient.get(key)
        return value ? JSON.parse(value) : null
      } else {
        // 使用内存缓存
        if (this.memoryCache && this.memoryCache.has(key)) {
          const item = this.memoryCache.get(key)
          if (item.expireAt > Date.now()) {
            return item.value
          } else {
            this.memoryCache.delete(key)
          }
        }
        return null
      }
    } catch (error) {
      logger.error('缓存获取失败:', error)
      return null
    }
  }

  async cacheDel(key) {
    try {
      if (this.redisClient) {
        await this.redisClient.del(key)
      } else {
        if (this.memoryCache) {
          this.memoryCache.delete(key)
        }
      }
    } catch (error) {
      logger.error('缓存删除失败:', error)
    }
  }

  /**
   * 健康检查
   */
  async healthCheck() {
    try {
      const results = {
        mongodb: false,
        redis: false,
        timestamp: new Date().toISOString()
      }

      // 检查 MongoDB
      if (this.mongoDb) {
        await this.mongoDb.admin().ping()
        results.mongodb = true
      }

      // 检查 Redis
      if (this.redisClient) {
        await this.redisClient.ping()
        results.redis = true
      }

      return results

    } catch (error) {
      logger.error('数据库健康检查失败:', error)
      return {
        mongodb: false,
        redis: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }
    }
  }

  /**
   * 关闭连接
   */
  async close() {
    try {
      if (this.mongoClient) {
        await this.mongoClient.close()
        this.mongoClient = null
        this.mongoDb = null
      }

      if (this.redisClient) {
        await this.redisClient.quit()
        this.redisClient = null
      }

      this.isConnected = false
      logger.info('数据库连接已关闭')

    } catch (error) {
      logger.error('关闭数据库连接失败:', error)
    }
  }

  /**
   * 聚合查询辅助方法
   */
  async aggregate(collection, pipeline, options = {}) {
    try {
      const coll = this.collection(collection)
      return await coll.aggregate(pipeline, options).toArray()
    } catch (error) {
      logger.error('聚合查询失败:', error)
      throw error
    }
  }

  /**
   * 分页查询辅助方法
   */
  async paginate(collection, query = {}, options = {}) {
    try {
      const {
        page = 1,
        pageSize = 10,
        sort = { createdAt: -1 },
        projection = null
      } = options

      const skip = (page - 1) * pageSize
      const limit = pageSize

      const coll = this.collection(collection)

      // 获取总数
      const total = await coll.countDocuments(query)

      // 获取数据
      const cursor = coll.find(query, { projection })
        .sort(sort)
        .skip(skip)
        .limit(limit)

      const data = await cursor.toArray()

      return {
        data,
        pagination: {
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          total,
          totalPages: Math.ceil(total / pageSize),
          hasNext: page * pageSize < total,
          hasPrev: page > 1
        }
      }

    } catch (error) {
      logger.error('分页查询失败:', error)
      throw error
    }
  }

  /**
   * 批量操作辅助方法
   */
  async bulkWrite(collection, operations) {
    try {
      const coll = this.collection(collection)
      const result = await coll.bulkWrite(operations)

      return {
        success: true,
        insertedCount: result.insertedCount,
        modifiedCount: result.modifiedCount,
        deletedCount: result.deletedCount,
        upsertedCount: result.upsertedCount
      }

    } catch (error) {
      logger.error('批量操作失败:', error)
      throw error
    }
  }

  /**
   * 软删除辅助方法
   */
  async softDelete(collection, query, deletedBy = null) {
    try {
      const coll = this.collection(collection)
      const result = await coll.updateMany(
        query,
        {
          $set: {
            isDeleted: true,
            deletedAt: new Date(),
            deletedBy
          }
        }
      )

      return {
        success: true,
        deletedCount: result.modifiedCount
      }

    } catch (error) {
      logger.error('软删除失败:', error)
      throw error
    }
  }

  /**
   * 数据统计辅助方法
   */
  async getStats(collection, query = {}) {
    try {
      const coll = this.collection(collection)

      const [total, stats] = await Promise.all([
        coll.countDocuments(query),
        coll.aggregate([
          { $match: query },
          {
            $group: {
              _id: null,
              count: { $sum: 1 },
              avg: { $avg: '$value' }, // 如果有value字段
              max: { $max: '$value' },
              min: { $min: '$value' },
              sum: { $sum: '$value' }
            }
          }
        ]).toArray()
      ])

      return {
        total,
        stats: stats[0] || { count: 0 }
      }

    } catch (error) {
      logger.error('数据统计失败:', error)
      throw error
    }
  }
}

// 单例模式
let dbInstance = null

/**
 * 获取数据库实例
 */
function getDatabase() {
  if (!dbInstance) {
    dbInstance = new Database()
  }
  return dbInstance
}

/**
 * 连接数据库
 */
async function connectDatabase() {
  const db = getDatabase()
  await db.connect()
  return db
}

module.exports = {
  Database,
  getDatabase,
  connectDatabase
}