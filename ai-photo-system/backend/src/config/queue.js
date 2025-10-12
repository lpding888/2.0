const Queue = require('bull');
const dotenv = require('dotenv');

dotenv.config();

// Redis连接配置
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined
};

// 创建队列实例
const fittingQueue = new Queue('fitting-batch', {
  redis: redisConfig,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000
    },
    removeOnComplete: 100,
    removeOnFail: 50
  }
});

const photographyQueue = new Queue('photography-batch', {
  redis: redisConfig,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000
    },
    removeOnComplete: 100,
    removeOnFail: 50
  }
});

const travelQueue = new Queue('travel-batch', {
  redis: redisConfig,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000
    },
    removeOnComplete: 100,
    removeOnFail: 50
  }
});

// 队列事件监听
function setupQueueEvents(queue, queueName) {
  queue.on('active', (job) => {
    console.log(`🚀 [${queueName}] 任务开始: ${job.id}`);
  });

  queue.on('completed', (job, result) => {
    console.log(`✅ [${queueName}] 任务完成: ${job.id}`);
  });

  queue.on('failed', (job, err) => {
    console.error(`❌ [${queueName}] 任务失败: ${job.id}`, err.message);
  });

  queue.on('stalled', (job) => {
    console.warn(`⚠️ [${queueName}] 任务停滞: ${job.id}`);
  });

  queue.on('error', (error) => {
    console.error(`❌ [${queueName}] 队列错误:`, error);
  });
}

setupQueueEvents(fittingQueue, 'fitting-batch');
setupQueueEvents(photographyQueue, 'photography-batch');
setupQueueEvents(travelQueue, 'travel-batch');

// 导出队列和工具函数
module.exports = {
  fittingQueue,
  photographyQueue,
  travelQueue,

  // 添加任务到队列
  async addJob(queueType, data, options = {}) {
    let queue;
    switch (queueType) {
      case 'fitting':
        queue = fittingQueue;
        break;
      case 'photography':
        queue = photographyQueue;
        break;
      case 'travel':
        queue = travelQueue;
        break;
      default:
        throw new Error(`未知的队列类型: ${queueType}`);
    }

    const job = await queue.add(data, {
      priority: options.priority || 5,
      ...options
    });

    return job;
  },

  // 获取队列状态
  async getQueueStats(queueType) {
    let queue;
    switch (queueType) {
      case 'fitting':
        queue = fittingQueue;
        break;
      case 'photography':
        queue = photographyQueue;
        break;
      case 'travel':
        queue = travelQueue;
        break;
      default:
        throw new Error(`未知的队列类型: ${queueType}`);
    }

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount()
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed
    };
  },

  // 清空队列
  async cleanQueue(queueType, grace = 0) {
    let queue;
    switch (queueType) {
      case 'fitting':
        queue = fittingQueue;
        break;
      case 'photography':
        queue = photographyQueue;
        break;
      case 'travel':
        queue = travelQueue;
        break;
      default:
        throw new Error(`未知的队列类型: ${queueType}`);
    }

    await queue.clean(grace, 'completed');
    await queue.clean(grace, 'failed');
  }
};
