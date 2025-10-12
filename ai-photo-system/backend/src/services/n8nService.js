const axios = require('axios');
const { query } = require('../config/database');
const { cacheHelper } = require('../config/redis');

// n8n Webhook基础URL
const N8N_BASE_URL = process.env.N8N_WEBHOOK_BASE_URL || 'http://localhost:5678/webhook';

// 调用n8n Webhook
async function triggerN8NWebhook(webhookName, data) {
  try {
    const url = `${N8N_BASE_URL}/${webhookName}`;

    console.log(`🚀 调用n8n webhook: ${webhookName}`);

    const response = await axios.post(url, data, {
      timeout: 120000, // 2分钟超时
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log(`✅ n8n webhook响应:`, response.data);

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error(`❌ n8n webhook调用失败:`, error.message);

    return {
      success: false,
      error: error.message,
      details: error.response?.data
    };
  }
}

// 触发试衣间批量生成
async function triggerFittingBatch(taskData) {
  const webhookName = process.env.N8N_FITTING_WEBHOOK || 'fitting-batch';

  return await triggerN8NWebhook(webhookName, {
    task_id: taskData.task_id,
    user_id: taskData.user_id,
    type: 'fitting',
    images: taskData.images,
    parameters: taskData.parameters,
    scene_id: taskData.scene_id,
    custom_description: taskData.custom_description,
    batch_count: taskData.batch_count
  });
}

// 触发摄影批量生成
async function triggerPhotographyBatch(taskData) {
  const webhookName = process.env.N8N_PHOTOGRAPHY_WEBHOOK || 'photography-batch';

  return await triggerN8NWebhook(webhookName, {
    task_id: taskData.task_id,
    user_id: taskData.user_id,
    type: 'photography',
    images: taskData.images,
    parameters: taskData.parameters,
    scene_id: taskData.scene_id,
    custom_description: taskData.custom_description,
    batch_count: taskData.batch_count
  });
}

// 触发旅行照片生成
async function triggerTravelBatch(taskData) {
  const webhookName = process.env.N8N_PHOTOGRAPHY_WEBHOOK || 'photography-batch';

  return await triggerN8NWebhook(webhookName, {
    task_id: taskData.task_id,
    user_id: taskData.user_id,
    type: 'travel',
    images: taskData.images,
    destination: taskData.destination,
    parameters: taskData.parameters,
    custom_description: taskData.custom_description,
    batch_count: taskData.batch_count
  });
}

// 触发通知
async function triggerNotification(notificationData) {
  const webhookName = process.env.N8N_NOTIFICATION_WEBHOOK || 'notification';

  return await triggerN8NWebhook(webhookName, notificationData);
}

// 检查n8n服务是否可用
async function checkN8NHealth() {
  try {
    // 尝试调用一个健康检查endpoint（需要在n8n中配置）
    const url = `${N8N_BASE_URL}/health-check`;
    const response = await axios.get(url, { timeout: 5000 });

    return {
      available: true,
      status: response.status
    };
  } catch (error) {
    console.warn('⚠️ n8n服务不可用:', error.message);
    return {
      available: false,
      error: error.message
    };
  }
}

// 获取场景prompt模板
async function getScenePrompt(sceneId) {
  if (!sceneId) {
    return null;
  }

  // 尝试从缓存获取
  const cacheKey = `scene:prompt:${sceneId}`;
  const cached = await cacheHelper.get(cacheKey);
  if (cached) {
    return cached;
  }

  // 从数据库获取
  try {
    const scenes = await query(
      'SELECT prompt_template, parameters FROM scenes WHERE scene_id = ? AND status = ?',
      [sceneId, 'active']
    );

    if (scenes.length > 0) {
      const promptData = {
        template: scenes[0].prompt_template,
        parameters: scenes[0].parameters
      };

      // 缓存1小时
      await cacheHelper.set(cacheKey, promptData, 3600);

      return promptData;
    }
  } catch (error) {
    console.error('❌ 获取场景prompt失败:', error);
  }

  return null;
}

// 构建完整的AI请求参数
async function buildAIRequestParams(taskData) {
  const scenePrompt = await getScenePrompt(taskData.scene_id);

  let promptText = '';

  // 基础prompt
  if (scenePrompt && scenePrompt.template) {
    promptText = scenePrompt.template;
  } else {
    // 默认prompt
    switch (taskData.type) {
      case 'fitting':
        promptText = '专业服装展示照片，高质量摄影，时尚风格';
        break;
      case 'photography':
        promptText = '专业摄影作品，高质量，商业摄影风格';
        break;
      case 'travel':
        promptText = `在${taskData.destination?.name || '旅游景点'}的旅行照片，自然真实`;
        break;
    }
  }

  // 添加自定义描述
  if (taskData.custom_description) {
    promptText += `, ${taskData.custom_description}`;
  }

  return {
    prompt: promptText,
    parameters: {
      ...scenePrompt?.parameters,
      ...taskData.parameters
    }
  };
}

module.exports = {
  triggerN8NWebhook,
  triggerFittingBatch,
  triggerPhotographyBatch,
  triggerTravelBatch,
  triggerNotification,
  checkN8NHealth,
  buildAIRequestParams
};
