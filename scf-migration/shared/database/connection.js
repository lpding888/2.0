/**
 * 腾讯云数据库连接配置
 * 替换微信云开发的 cloud.database()
 */

const { MongoClient } = require('mongodb')

class DatabaseService {
  constructor() {
    this.client = null
    this.db = null
    this.isConnected = false
  }

  /**
   * 连接到腾讯云 MongoDB/TencentDB
   */
  async connect() {
    if (this.isConnected) {
      return this.db
    }

    try {
      // 从环境变量获取数据库连接字符串
      const mongoUri = process.env.MONGODB_URI || process.env.TENCENTDB_URI
      if (!mongoUri) {
        throw new Error('未配置数据库连接字符串 MONGODB_URI 或 TENCENTDB_URI')
      }

      this.client = new MongoClient(mongoUri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 30000
      })

      await this.client.connect()

      // 获取数据库名称，默认为 'ai-photography'
      const dbName = process.env.DB_NAME || 'ai-photography'
      this.db = this.client.db(dbName)

      this.isConnected = true
      console.log('✅ 数据库连接成功:', dbName)

      return this.db
    } catch (error) {
      console.error('❌ 数据库连接失败:', error)
      throw error
    }
  }

  /**
   * 获取数据库实例
   */
  async getDatabase() {
    if (!this.isConnected) {
      await this.connect()
    }
    return this.db
  }

  /**
   * 获取集合（表）
   */
  async getCollection(collectionName) {
    const db = await this.getDatabase()
    return db.collection(collectionName)
  }

  /**
   * 查询文档
   */
  async find(collectionName, query = {}, options = {}) {
    const collection = await this.getCollection(collectionName)
    return collection.find(query, options).toArray()
  }

  /**
   * 查询单个文档
   */
  async findOne(collectionName, query = {}) {
    const collection = await this.getCollection(collectionName)
    return collection.findOne(query)
  }

  /**
   * 插入文档
   */
  async insertOne(collectionName, document) {
    const collection = await this.getCollection(collectionName)

    // 添加时间戳
    const docWithTimestamp = {
      ...document,
      created_at: new Date(),
      updated_at: new Date()
    }

    const result = await collection.insertOne(docWithTimestamp)
    return { ...result, insertedId: result.insertedId.toString() }
  }

  /**
   * 更新文档
   */
  async updateOne(collectionName, query, update, options = {}) {
    const collection = await this.getCollection(collectionName)

    // 添加更新时间
    const updateWithTimestamp = {
      ...update,
      $set: {
        ...update.$set,
        updated_at: new Date()
      }
    }

    const result = await collection.updateOne(query, updateWithTimestamp, options)
    return result
  }

  /**
   * 删除文档
   */
  async deleteOne(collectionName, query) {
    const collection = await this.getCollection(collectionName)
    return collection.deleteOne(query)
  }

  /**
   * 聚合查询
   */
  async aggregate(collectionName, pipeline) {
    const collection = await this.getCollection(collectionName)
    return collection.aggregate(pipeline).toArray()
  }

  /**
   * 计数
   */
  async count(collectionName, query = {}) {
    const collection = await this.getCollection(collectionName)
    return collection.countDocuments(query)
  }

  /**
   * 事务支持
   */
  async withTransaction(callback) {
    const session = this.client.startSession()
    try {
      session.startTransaction()
      const result = await callback(session)
      await session.commitTransaction()
      return result
    } catch (error) {
      await session.abortTransaction()
      throw error
    } finally {
      session.endSession()
    }
  }

  /**
   * 关闭连接
   */
  async close() {
    if (this.client) {
      await this.client.close()
      this.isConnected = false
      console.log('🔌 数据库连接已关闭')
    }
  }
}

// 单例模式
const databaseService = new DatabaseService()

module.exports = databaseService