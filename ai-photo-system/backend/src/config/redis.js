const redis = require('redis');
const dotenv = require('dotenv');

dotenv.config();

// Redis连接配置（v4 API）
const redisConfig = {
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        console.error('❌ Redis重试次数过多，停止重试');
        return new Error('Redis重试次数过多');
      }
      // 指数退避，最长3秒
      const delay = Math.min(retries * 100, 3000);
      console.log(`⚠️ Redis重连中... (第${retries}次，${delay}ms后重试)`);
      return delay;
    }
  }
};

// 如果设置了密码，添加到配置中
if (process.env.REDIS_PASSWORD) {
  redisConfig.password = process.env.REDIS_PASSWORD;
}

// 创建Redis客户端（v4）
const redisClient = redis.createClient(redisConfig);

// 连接状态标志
let isConnected = false;
let isConnecting = false;

// 事件监听
redisClient.on('error', (err) => {
  console.error('❌ Redis错误:', err.message);
  isConnected = false;
});

redisClient.on('connect', () => {
  console.log('🔄 Redis正在连接...');
});

redisClient.on('ready', () => {
  console.log('✅ Redis连接就绪');
  isConnected = true;
  isConnecting = false;
});

redisClient.on('end', () => {
  console.log('⚠️ Redis连接断开');
  isConnected = false;
});

redisClient.on('reconnecting', () => {
  console.log('🔄 Redis正在重新连接...');
});

// 确保Redis已连接
async function ensureConnection() {
  if (isConnected) {
    return true;
  }

  if (isConnecting) {
    // 等待连接完成
    await new Promise(resolve => setTimeout(resolve, 100));
    return ensureConnection();
  }

  try {
    isConnecting = true;
    await redisClient.connect();
    isConnected = true;
    isConnecting = false;
    return true;
  } catch (error) {
    isConnecting = false;
    console.error('❌ Redis连接失败:', error.message);
    return false;
  }
}

// 测试Redis连接
async function testConnection() {
  try {
    await ensureConnection();
    await redisClient.ping();
    console.log('✅ Redis连接测试成功');
    return true;
  } catch (error) {
    console.error('❌ Redis连接测试失败:', error.message);
    return false;
  }
}

// 缓存助手函数（v4 API）
const cacheHelper = {
  // 设置缓存（带过期时间）
  async set(key, value, expiresIn = 3600) {
    try {
      await ensureConnection();
      await redisClient.setEx(key, expiresIn, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('❌ Redis SET失败:', error.message);
      return false;
    }
  },

  // 获取缓存
  async get(key) {
    try {
      await ensureConnection();
      const value = await redisClient.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('❌ Redis GET失败:', error.message);
      return null;
    }
  },

  // 删除缓存
  async del(key) {
    try {
      await ensureConnection();
      await redisClient.del(key);
      return true;
    } catch (error) {
      console.error('❌ Redis DEL失败:', error.message);
      return false;
    }
  },

  // 检查缓存是否存在
  async exists(key) {
    try {
      await ensureConnection();
      const result = await redisClient.exists(key);
      return result === 1;
    } catch (error) {
      console.error('❌ Redis EXISTS失败:', error.message);
      return false;
    }
  },

  // 批量删除（通过模式匹配）
  async delPattern(pattern) {
    try {
      await ensureConnection();
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
      return keys.length;
    } catch (error) {
      console.error('❌ Redis DEL PATTERN失败:', error.message);
      return 0;
    }
  },

  // 获取Redis客户端（确保已连接）
  async getClient() {
    await ensureConnection();
    return redisClient;
  }
};

module.exports = {
  redisClient,
  cacheHelper,
  testConnection
};
