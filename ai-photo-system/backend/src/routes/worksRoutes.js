const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authMiddleware, optionalAuthMiddleware } = require('../middleware/auth');
const { validate, updateWorkSchema } = require('../middleware/validation');

// 获取作品列表
router.get('/', optionalAuthMiddleware, async (req, res, next) => {
  try {
    const {
      page = 1,
      pageSize = 20,
      type,
      status = 'completed',
      is_public,
      is_favorite,
      user_id
    } = req.query;

    let sql = 'SELECT * FROM works WHERE 1=1';
    const params = [];

    // 如果有登录用户，显示自己的作品
    if (req.user) {
      sql += ' AND user_id = ?';
      params.push(req.user.user_id);
    } else {
      // 未登录用户只能看公开作品
      sql += ' AND is_public = 1';
    }

    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    if (is_public !== undefined) {
      sql += ' AND is_public = ?';
      params.push(is_public === 'true' ? 1 : 0);
    }

    if (is_favorite !== undefined && req.user) {
      sql += ' AND is_favorite = ?';
      params.push(is_favorite === 'true' ? 1 : 0);
    }

    if (user_id && req.user && req.user.role === 'admin') {
      sql += ' AND user_id = ?';
      params.push(user_id);
    }

    sql += ' ORDER BY created_at DESC';

    // 分页
    const offset = (page - 1) * pageSize;
    sql += ' LIMIT ? OFFSET ?';
    params.push(parseInt(pageSize), parseInt(offset));

    const works = await query(sql, params);

    // 获取总数
    let countSql = 'SELECT COUNT(*) as total FROM works WHERE 1=1';
    const countParams = [];

    if (req.user) {
      countSql += ' AND user_id = ?';
      countParams.push(req.user.user_id);
    } else {
      countSql += ' AND is_public = 1';
    }

    if (type) {
      countSql += ' AND type = ?';
      countParams.push(type);
    }

    if (status) {
      countSql += ' AND status = ?';
      countParams.push(status);
    }

    if (is_public !== undefined) {
      countSql += ' AND is_public = ?';
      countParams.push(is_public === 'true' ? 1 : 0);
    }

    if (is_favorite !== undefined && req.user) {
      countSql += ' AND is_favorite = ?';
      countParams.push(is_favorite === 'true' ? 1 : 0);
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

// 获取单个作品详情
router.get('/:work_id', optionalAuthMiddleware, async (req, res, next) => {
  try {
    const { work_id } = req.params;

    let sql = 'SELECT * FROM works WHERE work_id = ?';
    const params = [work_id];

    // 如果未登录，只能查看公开作品
    if (!req.user) {
      sql += ' AND is_public = 1';
    } else {
      // 登录用户只能查看自己的作品或公开作品
      sql += ' AND (user_id = ? OR is_public = 1)';
      params.push(req.user.user_id);
    }

    const works = await query(sql, params);

    if (works.length === 0) {
      return res.status(404).json({
        success: false,
        message: '作品不存在'
      });
    }

    res.json({
      success: true,
      data: {
        work: works[0]
      }
    });

  } catch (error) {
    next(error);
  }
});

// 更新作品
router.put('/:work_id', authMiddleware, validate(updateWorkSchema), async (req, res, next) => {
  try {
    const { work_id } = req.params;
    const updates = req.validatedBody;

    // 验证作品所有权
    const works = await query(
      'SELECT * FROM works WHERE work_id = ? AND user_id = ?',
      [work_id, req.user.user_id]
    );

    if (works.length === 0) {
      return res.status(404).json({
        success: false,
        message: '作品不存在或无权操作'
      });
    }

    // 构建更新SQL
    const updateFields = [];
    const updateValues = [];

    if (updates.is_favorite !== undefined) {
      updateFields.push('is_favorite = ?');
      updateValues.push(updates.is_favorite ? 1 : 0);
    }

    if (updates.is_public !== undefined) {
      updateFields.push('is_public = ?');
      updateValues.push(updates.is_public ? 1 : 0);
    }

    if (updates.tags !== undefined) {
      updateFields.push('tags = ?');
      updateValues.push(JSON.stringify(updates.tags));
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: '没有需要更新的字段'
      });
    }

    updateFields.push('updated_at = NOW()');
    updateValues.push(work_id);

    await query(
      `UPDATE works SET ${updateFields.join(', ')} WHERE work_id = ?`,
      updateValues
    );

    // 获取更新后的作品
    const updatedWorks = await query(
      'SELECT * FROM works WHERE work_id = ?',
      [work_id]
    );

    res.json({
      success: true,
      message: '更新成功',
      data: {
        work: updatedWorks[0]
      }
    });

  } catch (error) {
    next(error);
  }
});

// 删除作品
router.delete('/:work_id', authMiddleware, async (req, res, next) => {
  try {
    const { work_id } = req.params;

    // 验证作品所有权
    const works = await query(
      'SELECT * FROM works WHERE work_id = ? AND user_id = ?',
      [work_id, req.user.user_id]
    );

    if (works.length === 0) {
      return res.status(404).json({
        success: false,
        message: '作品不存在或无权操作'
      });
    }

    // 删除作品
    await query('DELETE FROM works WHERE work_id = ?', [work_id]);

    res.json({
      success: true,
      message: '删除成功'
    });

  } catch (error) {
    next(error);
  }
});

// 批量删除作品
router.post('/batch/delete', authMiddleware, async (req, res, next) => {
  try {
    const { work_ids } = req.body;

    if (!Array.isArray(work_ids) || work_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供要删除的作品ID列表'
      });
    }

    // 验证所有作品的所有权
    const placeholders = work_ids.map(() => '?').join(',');
    const works = await query(
      `SELECT work_id FROM works WHERE work_id IN (${placeholders}) AND user_id = ?`,
      [...work_ids, req.user.user_id]
    );

    if (works.length !== work_ids.length) {
      return res.status(403).json({
        success: false,
        message: '部分作品不存在或无权操作'
      });
    }

    // 批量删除
    await query(
      `DELETE FROM works WHERE work_id IN (${placeholders}) AND user_id = ?`,
      [...work_ids, req.user.user_id]
    );

    res.json({
      success: true,
      message: `成功删除 ${work_ids.length} 个作品`
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
