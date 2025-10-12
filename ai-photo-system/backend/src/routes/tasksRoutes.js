const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, transaction } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { validate, createTaskSchema } = require('../middleware/validation');
const { checkCredits, deductCredits } = require('../services/creditService');
const { addJob, getQueueStats } = require('../config/queue');

// 创建任务
router.post('/create', authMiddleware, validate(createTaskSchema), async (req, res, next) => {
  try {
    const {
      type,
      batch_count = 1,
      images,
      scene_id,
      parameters = {},
      custom_description = '',
      destination
    } = req.validatedBody;

    const userId = req.user.user_id;

    // 检查积分
    const requiredCredits = batch_count;
    const creditCheck = await checkCredits(userId, requiredCredits);

    if (!creditCheck.sufficient) {
      return res.status(400).json({
        success: false,
        message: '积分不足',
        data: {
          required: requiredCredits,
          current: creditCheck.current,
          shortage: creditCheck.shortage
        }
      });
    }

    // 使用事务创建任务
    const result = await transaction(async (connection) => {
      const taskId = uuidv4();

      // 扣除积分
      await deductCredits(userId, requiredCredits, 'consume', taskId, `${type}任务生成`);

      // 创建任务记录
      await connection.execute(
        `INSERT INTO task_queue (task_id, user_id, type, batch_count, status, priority, parameters, custom_description)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          taskId,
          userId,
          type,
          batch_count,
          'pending',
          5, // 默认优先级
          JSON.stringify(parameters),
          custom_description
        ]
      );

      // 创建作品记录
      await connection.execute(
        `INSERT INTO works (user_id, type, task_id, scene_id, status, original_images, parameters, custom_description)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          type,
          taskId,
          scene_id || null,
          'pending',
          JSON.stringify(images),
          JSON.stringify(parameters),
          custom_description
        ]
      );

      return taskId;
    });

    const taskId = result;

    // 添加任务到队列
    const jobData = {
      task_id: taskId,
      user_id: userId,
      type,
      batch_count,
      images,
      scene_id,
      parameters,
      custom_description,
      destination: destination || null
    };

    await addJob(type, jobData);

    console.log(`✅ 任务已创建并加入队列: ${taskId}`);

    res.json({
      success: true,
      message: '任务创建成功',
      data: {
        task_id: taskId,
        type,
        batch_count,
        status: 'pending',
        credits_deducted: requiredCredits
      }
    });

  } catch (error) {
    next(error);
  }
});

// 获取任务状态
router.get('/:task_id', authMiddleware, async (req, res, next) => {
  try {
    const { task_id } = req.params;

    const tasks = await query(
      'SELECT * FROM task_queue WHERE task_id = ? AND user_id = ?',
      [task_id, req.user.user_id]
    );

    if (tasks.length === 0) {
      return res.status(404).json({
        success: false,
        message: '任务不存在'
      });
    }

    const task = tasks[0];

    // 如果任务完成，获取对应的作品
    let work = null;
    if (task.status === 'completed') {
      const works = await query(
        'SELECT * FROM works WHERE task_id = ?',
        [task_id]
      );

      if (works.length > 0) {
        work = works[0];
      }
    }

    res.json({
      success: true,
      data: {
        task,
        work
      }
    });

  } catch (error) {
    next(error);
  }
});

// 获取用户任务列表
router.get('/user/list', authMiddleware, async (req, res, next) => {
  try {
    const {
      page = 1,
      pageSize = 20,
      type,
      status
    } = req.query;

    let sql = 'SELECT * FROM task_queue WHERE user_id = ?';
    const params = [req.user.user_id];

    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY created_at DESC';

    const offset = (page - 1) * pageSize;
    sql += ' LIMIT ? OFFSET ?';
    params.push(parseInt(pageSize), parseInt(offset));

    const tasks = await query(sql, params);

    // 获取总数
    let countSql = 'SELECT COUNT(*) as total FROM task_queue WHERE user_id = ?';
    const countParams = [req.user.user_id];

    if (type) {
      countSql += ' AND type = ?';
      countParams.push(type);
    }

    if (status) {
      countSql += ' AND status = ?';
      countParams.push(status);
    }

    const [countResult] = await query(countSql, countParams);
    const total = countResult.total;

    res.json({
      success: true,
      data: {
        tasks,
        pagination: {
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          total,
          totalPages: Math.ceil(total / pageSize)
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

// 取消任务
router.post('/:task_id/cancel', authMiddleware, async (req, res, next) => {
  try {
    const { task_id } = req.params;

    // 查询任务
    const tasks = await query(
      'SELECT * FROM task_queue WHERE task_id = ? AND user_id = ?',
      [task_id, req.user.user_id]
    );

    if (tasks.length === 0) {
      return res.status(404).json({
        success: false,
        message: '任务不存在'
      });
    }

    const task = tasks[0];

    // 只能取消待处理或处理中的任务
    if (task.status !== 'pending' && task.status !== 'processing') {
      return res.status(400).json({
        success: false,
        message: '只能取消待处理或处理中的任务'
      });
    }

    // 更新任务状态
    await query(
      'UPDATE task_queue SET status = ?, error = ?, updated_at = NOW() WHERE task_id = ?',
      ['cancelled', '用户取消', task_id]
    );

    await query(
      'UPDATE works SET status = ?, error = ?, updated_at = NOW() WHERE task_id = ?',
      ['cancelled', '用户取消', task_id]
    );

    // 退还积分
    await deductCredits(
      req.user.user_id,
      -task.batch_count,
      'refund',
      task_id,
      '任务取消退款'
    );

    res.json({
      success: true,
      message: '任务已取消，积分已退还'
    });

  } catch (error) {
    next(error);
  }
});

// 获取队列统计信息
router.get('/stats/queue', authMiddleware, async (req, res, next) => {
  try {
    const fittingStats = await getQueueStats('fitting');
    const photographyStats = await getQueueStats('photography');
    const travelStats = await getQueueStats('travel');

    res.json({
      success: true,
      data: {
        fitting: fittingStats,
        photography: photographyStats,
        travel: travelStats
      }
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
