const { fittingQueue, photographyQueue, travelQueue } = require('../config/queue');
const { query } = require('../config/database');
const {
  triggerFittingBatch,
  triggerPhotographyBatch,
  triggerTravelBatch,
  buildAIRequestParams
} = require('../services/n8nService');
const {
  sendTaskProgress,
  sendTaskComplete,
  sendTaskFailed
} = require('../services/websocket');

// 处理试衣间任务
fittingQueue.process(async (job) => {
  const { task_id, user_id, images, parameters, scene_id, custom_description, batch_count } = job.data;

  console.log(`🎨 开始处理试衣间任务: ${task_id}`);

  try {
    // 更新任务状态为处理中
    await query(
      'UPDATE task_queue SET status = ?, updated_at = NOW() WHERE task_id = ?',
      ['processing', task_id]
    );

    // 发送WebSocket进度通知
    sendTaskProgress(user_id, task_id, 10, '任务开始处理...');

    // 构建AI请求参数
    const aiParams = await buildAIRequestParams({
      type: 'fitting',
      scene_id,
      custom_description,
      images,
      parameters
    });

    sendTaskProgress(user_id, task_id, 30, '准备调用AI服务...');

    // 调用n8n webhook触发AI生成
    const result = await triggerFittingBatch({
      task_id,
      user_id,
      images,
      parameters: aiParams.parameters,
      prompt: aiParams.prompt,
      scene_id,
      custom_description,
      batch_count
    });

    if (!result.success) {
      throw new Error(result.error || 'n8n调用失败');
    }

    sendTaskProgress(user_id, task_id, 90, 'AI生成完成，保存结果...');

    // 更新任务状态为完成
    await query(
      'UPDATE task_queue SET status = ?, completed_at = NOW(), updated_at = NOW(), result = ? WHERE task_id = ?',
      ['completed', JSON.stringify(result.data), task_id]
    );

    // 更新作品状态（假设n8n会创建works记录，这里只更新状态）
    await query(
      'UPDATE works SET status = ?, completed_at = NOW(), updated_at = NOW() WHERE task_id = ?',
      ['completed', task_id]
    );

    sendTaskProgress(user_id, task_id, 100, '任务完成！');
    sendTaskComplete(user_id, task_id, result.data);

    console.log(`✅ 试衣间任务完成: ${task_id}`);

    return { success: true, task_id, result: result.data };

  } catch (error) {
    console.error(`❌ 试衣间任务失败: ${task_id}`, error);

    // 更新任务状态为失败
    await query(
      'UPDATE task_queue SET status = ?, error = ?, updated_at = NOW() WHERE task_id = ?',
      ['failed', error.message, task_id]
    );

    await query(
      'UPDATE works SET status = ?, error = ?, updated_at = NOW() WHERE task_id = ?',
      ['failed', error.message, task_id]
    );

    sendTaskFailed(user_id, task_id, error.message);

    throw error;
  }
});

// 处理摄影任务
photographyQueue.process(async (job) => {
  const { task_id, user_id, images, parameters, scene_id, custom_description, batch_count } = job.data;

  console.log(`📸 开始处理摄影任务: ${task_id}`);

  try {
    await query(
      'UPDATE task_queue SET status = ?, updated_at = NOW() WHERE task_id = ?',
      ['processing', task_id]
    );

    sendTaskProgress(user_id, task_id, 10, '任务开始处理...');

    const aiParams = await buildAIRequestParams({
      type: 'photography',
      scene_id,
      custom_description,
      images,
      parameters
    });

    sendTaskProgress(user_id, task_id, 30, '准备调用AI服务...');

    const result = await triggerPhotographyBatch({
      task_id,
      user_id,
      images,
      parameters: aiParams.parameters,
      prompt: aiParams.prompt,
      scene_id,
      custom_description,
      batch_count
    });

    if (!result.success) {
      throw new Error(result.error || 'n8n调用失败');
    }

    sendTaskProgress(user_id, task_id, 90, 'AI生成完成，保存结果...');

    await query(
      'UPDATE task_queue SET status = ?, completed_at = NOW(), updated_at = NOW(), result = ? WHERE task_id = ?',
      ['completed', JSON.stringify(result.data), task_id]
    );

    await query(
      'UPDATE works SET status = ?, completed_at = NOW(), updated_at = NOW() WHERE task_id = ?',
      ['completed', task_id]
    );

    sendTaskProgress(user_id, task_id, 100, '任务完成！');
    sendTaskComplete(user_id, task_id, result.data);

    console.log(`✅ 摄影任务完成: ${task_id}`);

    return { success: true, task_id, result: result.data };

  } catch (error) {
    console.error(`❌ 摄影任务失败: ${task_id}`, error);

    await query(
      'UPDATE task_queue SET status = ?, error = ?, updated_at = NOW() WHERE task_id = ?',
      ['failed', error.message, task_id]
    );

    await query(
      'UPDATE works SET status = ?, error = ?, updated_at = NOW() WHERE task_id = ?',
      ['failed', error.message, task_id]
    );

    sendTaskFailed(user_id, task_id, error.message);

    throw error;
  }
});

// 处理旅行照片任务
travelQueue.process(async (job) => {
  const { task_id, user_id, images, destination, parameters, custom_description, batch_count } = job.data;

  console.log(`✈️ 开始处理旅行照片任务: ${task_id}`);

  try {
    await query(
      'UPDATE task_queue SET status = ?, updated_at = NOW() WHERE task_id = ?',
      ['processing', task_id]
    );

    sendTaskProgress(user_id, task_id, 10, '任务开始处理...');

    const aiParams = await buildAIRequestParams({
      type: 'travel',
      destination,
      custom_description,
      images,
      parameters
    });

    sendTaskProgress(user_id, task_id, 30, '准备调用AI服务...');

    const result = await triggerTravelBatch({
      task_id,
      user_id,
      images,
      destination,
      parameters: aiParams.parameters,
      prompt: aiParams.prompt,
      custom_description,
      batch_count
    });

    if (!result.success) {
      throw new Error(result.error || 'n8n调用失败');
    }

    sendTaskProgress(user_id, task_id, 90, 'AI生成完成，保存结果...');

    await query(
      'UPDATE task_queue SET status = ?, completed_at = NOW(), updated_at = NOW(), result = ? WHERE task_id = ?',
      ['completed', JSON.stringify(result.data), task_id]
    );

    await query(
      'UPDATE works SET status = ?, completed_at = NOW(), updated_at = NOW() WHERE task_id = ?',
      ['completed', task_id]
    );

    sendTaskProgress(user_id, task_id, 100, '任务完成！');
    sendTaskComplete(user_id, task_id, result.data);

    console.log(`✅ 旅行照片任务完成: ${task_id}`);

    return { success: true, task_id, result: result.data };

  } catch (error) {
    console.error(`❌ 旅行照片任务失败: ${task_id}`, error);

    await query(
      'UPDATE task_queue SET status = ?, error = ?, updated_at = NOW() WHERE task_id = ?',
      ['failed', error.message, task_id]
    );

    await query(
      'UPDATE works SET status = ?, error = ?, updated_at = NOW() WHERE task_id = ?',
      ['failed', error.message, task_id]
    );

    sendTaskFailed(user_id, task_id, error.message);

    throw error;
  }
});

console.log('✅ 任务Worker已启动，正在监听队列...');

module.exports = {
  fittingQueue,
  photographyQueue,
  travelQueue
};
