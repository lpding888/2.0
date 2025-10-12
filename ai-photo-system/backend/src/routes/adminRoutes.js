const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { addCredits } = require('../services/creditService');

// 所有管理员路由都需要管理员权限
router.use(authMiddleware);
router.use(adminMiddleware);

// 获取系统统计
router.get('/stats/overview', async (req, res, next) => {
  try {
    // 用户统计
    const [userStats] = await query(
      `SELECT
        COUNT(*) as total_users,
        COUNT(CASE WHEN DATE(created_at) = CURDATE() THEN 1 END) as today_new_users,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_users
      FROM users`
    );

    // 作品统计
    const [workStats] = await query(
      `SELECT
        COUNT(*) as total_works,
        COUNT(CASE WHEN DATE(created_at) = CURDATE() THEN 1 END) as today_works,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_works,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_works
      FROM works`
    );

    // 任务统计
    const [taskStats] = await query(
      `SELECT
        COUNT(*) as total_tasks,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_tasks,
        COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_tasks,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tasks,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_tasks
      FROM task_queue`
    );

    // 订单统计
    const [orderStats] = await query(
      `SELECT
        COUNT(*) as total_orders,
        SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as total_revenue,
        SUM(CASE WHEN status = 'paid' AND DATE(paid_at) = CURDATE() THEN amount ELSE 0 END) as today_revenue
      FROM orders`
    );

    // 积分统计
    const [creditStats] = await query(
      `SELECT
        SUM(credits) as total_credits,
        SUM(total_credits) as total_recharged,
        SUM(total_consumed_credits) as total_consumed
      FROM users`
    );

    res.json({
      success: true,
      data: {
        users: userStats,
        works: workStats,
        tasks: taskStats,
        orders: orderStats,
        credits: creditStats
      }
    });

  } catch (error) {
    next(error);
  }
});

// 获取用户列表
router.get('/users', async (req, res, next) => {
  try {
    const {
      page = 1,
      pageSize = 20,
      keyword,
      role,
      status
    } = req.query;

    let sql = 'SELECT * FROM users WHERE 1=1';
    const params = [];

    if (keyword) {
      sql += ' AND (nickname LIKE ? OR openid LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    if (role) {
      sql += ' AND role = ?';
      params.push(role);
    }

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY created_at DESC';

    const offset = (page - 1) * pageSize;
    sql += ' LIMIT ? OFFSET ?';
    params.push(parseInt(pageSize), parseInt(offset));

    const users = await query(sql, params);

    // 获取总数
    let countSql = 'SELECT COUNT(*) as total FROM users WHERE 1=1';
    const countParams = [];

    if (keyword) {
      countSql += ' AND (nickname LIKE ? OR openid LIKE ?)';
      countParams.push(`%${keyword}%`, `%${keyword}%`);
    }

    if (role) {
      countSql += ' AND role = ?';
      countParams.push(role);
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
        users,
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

// 更新用户
router.put('/users/:user_id', async (req, res, next) => {
  try {
    const { user_id } = req.params;
    const { role, status, credits_adjustment, adjustment_reason } = req.body;

    // 检查用户是否存在
    const users = await query(
      'SELECT * FROM users WHERE user_id = ?',
      [user_id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    const updateFields = [];
    const updateValues = [];

    if (role !== undefined) {
      updateFields.push('role = ?');
      updateValues.push(role);
    }

    if (status !== undefined) {
      updateFields.push('status = ?');
      updateValues.push(status);
    }

    if (updateFields.length > 0) {
      updateFields.push('updated_at = NOW()');
      updateValues.push(user_id);

      await query(
        `UPDATE users SET ${updateFields.join(', ')} WHERE user_id = ?`,
        updateValues
      );
    }

    // 调整积分
    if (credits_adjustment && credits_adjustment !== 0) {
      await addCredits(
        user_id,
        credits_adjustment,
        credits_adjustment > 0 ? 'gift' : 'consume',
        null,
        adjustment_reason || '管理员调整'
      );
    }

    const updatedUsers = await query(
      'SELECT * FROM users WHERE user_id = ?',
      [user_id]
    );

    res.json({
      success: true,
      message: '用户更新成功',
      data: {
        user: updatedUsers[0]
      }
    });

  } catch (error) {
    next(error);
  }
});

// 获取所有作品（管理）
router.get('/works', async (req, res, next) => {
  try {
    const {
      page = 1,
      pageSize = 20,
      type,
      status,
      user_id
    } = req.query;

    let sql = 'SELECT w.*, u.nickname, u.avatar_url FROM works w LEFT JOIN users u ON w.user_id = u.user_id WHERE 1=1';
    const params = [];

    if (type) {
      sql += ' AND w.type = ?';
      params.push(type);
    }

    if (status) {
      sql += ' AND w.status = ?';
      params.push(status);
    }

    if (user_id) {
      sql += ' AND w.user_id = ?';
      params.push(user_id);
    }

    sql += ' ORDER BY w.created_at DESC';

    const offset = (page - 1) * pageSize;
    sql += ' LIMIT ? OFFSET ?';
    params.push(parseInt(pageSize), parseInt(offset));

    const works = await query(sql, params);

    // 获取总数
    let countSql = 'SELECT COUNT(*) as total FROM works WHERE 1=1';
    const countParams = [];

    if (type) {
      countSql += ' AND type = ?';
      countParams.push(type);
    }

    if (status) {
      countSql += ' AND status = ?';
      countParams.push(status);
    }

    if (user_id) {
      countSql += ' AND user_id = ?';
      countParams.push(user_id);
    }

    const [countResult] = await query(countSql, countParams);
    const total = countResult.total;

    res.json({
      success: true,
      data: {
        works,
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

// 删除作品（管理）
router.delete('/works/:work_id', async (req, res, next) => {
  try {
    const { work_id } = req.params;

    await query('DELETE FROM works WHERE work_id = ?', [work_id]);

    res.json({
      success: true,
      message: '作品删除成功'
    });

  } catch (error) {
    next(error);
  }
});

// 获取任务列表（管理）
router.get('/tasks', async (req, res, next) => {
  try {
    const {
      page = 1,
      pageSize = 20,
      type,
      status
    } = req.query;

    let sql = 'SELECT t.*, u.nickname FROM task_queue t LEFT JOIN users u ON t.user_id = u.user_id WHERE 1=1';
    const params = [];

    if (type) {
      sql += ' AND t.type = ?';
      params.push(type);
    }

    if (status) {
      sql += ' AND t.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY t.created_at DESC';

    const offset = (page - 1) * pageSize;
    sql += ' LIMIT ? OFFSET ?';
    params.push(parseInt(pageSize), parseInt(offset));

    const tasks = await query(sql, params);

    // 获取总数
    let countSql = 'SELECT COUNT(*) as total FROM task_queue WHERE 1=1';
    const countParams = [];

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

// 获取订单列表（管理）
router.get('/orders', async (req, res, next) => {
  try {
    const {
      page = 1,
      pageSize = 20,
      status
    } = req.query;

    let sql = 'SELECT o.*, u.nickname FROM orders o LEFT JOIN users u ON o.user_id = u.user_id WHERE 1=1';
    const params = [];

    if (status) {
      sql += ' AND o.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY o.created_at DESC';

    const offset = (page - 1) * pageSize;
    sql += ' LIMIT ? OFFSET ?';
    params.push(parseInt(pageSize), parseInt(offset));

    const orders = await query(sql, params);

    // 获取总数
    let countSql = 'SELECT COUNT(*) as total FROM orders WHERE 1=1';
    const countParams = [];

    if (status) {
      countSql += ' AND status = ?';
      countParams.push(status);
    }

    const [countResult] = await query(countSql, countParams);
    const total = countResult.total;

    res.json({
      success: true,
      data: {
        orders,
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

// 获取系统配置
router.get('/config', async (req, res, next) => {
  try {
    const configs = await query('SELECT * FROM system_config ORDER BY config_key');

    const configMap = {};
    configs.forEach(config => {
      let value = config.config_value;

      // 根据类型转换值
      if (config.value_type === 'number') {
        value = parseFloat(value);
      } else if (config.value_type === 'boolean') {
        value = value === 'true' || value === '1';
      } else if (config.value_type === 'json') {
        try {
          value = JSON.parse(value);
        } catch (e) {
          value = config.config_value;
        }
      }

      configMap[config.config_key] = value;
    });

    res.json({
      success: true,
      data: {
        configs: configMap,
        raw: configs
      }
    });

  } catch (error) {
    next(error);
  }
});

// 更新系统配置
router.put('/config/:config_key', async (req, res, next) => {
  try {
    const { config_key } = req.params;
    const { config_value } = req.body;

    if (config_value === undefined) {
      return res.status(400).json({
        success: false,
        message: '配置值不能为空'
      });
    }

    // 更新配置
    const result = await query(
      'UPDATE system_config SET config_value = ?, updated_at = NOW() WHERE config_key = ?',
      [String(config_value), config_key]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: '配置不存在'
      });
    }

    res.json({
      success: true,
      message: '配置更新成功'
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
