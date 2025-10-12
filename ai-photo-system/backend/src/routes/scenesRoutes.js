const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authMiddleware, adminMiddleware, optionalAuthMiddleware } = require('../middleware/auth');
const { validate, createSceneSchema } = require('../middleware/validation');

// 获取场景列表
router.get('/', optionalAuthMiddleware, async (req, res, next) => {
  try {
    const {
      page = 1,
      pageSize = 50,
      category,
      status = 'active',
      keyword
    } = req.query;

    let sql = 'SELECT * FROM scenes WHERE 1=1';
    const params = [];

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    if (keyword) {
      sql += ' AND (scene_name LIKE ? OR description LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    sql += ' ORDER BY display_order ASC, created_at DESC';

    // 分页
    const offset = (page - 1) * pageSize;
    sql += ' LIMIT ? OFFSET ?';
    params.push(parseInt(pageSize), parseInt(offset));

    const scenes = await query(sql, params);

    // 获取总数
    let countSql = 'SELECT COUNT(*) as total FROM scenes WHERE 1=1';
    const countParams = [];

    if (category) {
      countSql += ' AND category = ?';
      countParams.push(category);
    }

    if (status) {
      countSql += ' AND status = ?';
      countParams.push(status);
    }

    if (keyword) {
      countSql += ' AND (scene_name LIKE ? OR description LIKE ?)';
      countParams.push(`%${keyword}%`, `%${keyword}%`);
    }

    const [countResult] = await query(countSql, countParams);
    const total = countResult.total;

    res.json({
      success: true,
      data: {
        scenes,
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

// 获取单个场景详情
router.get('/:scene_id', optionalAuthMiddleware, async (req, res, next) => {
  try {
    const { scene_id } = req.params;

    const scenes = await query(
      'SELECT * FROM scenes WHERE scene_id = ?',
      [scene_id]
    );

    if (scenes.length === 0) {
      return res.status(404).json({
        success: false,
        message: '场景不存在'
      });
    }

    res.json({
      success: true,
      data: {
        scene: scenes[0]
      }
    });

  } catch (error) {
    next(error);
  }
});

// 创建场景（管理员）
router.post('/', authMiddleware, adminMiddleware, validate(createSceneSchema), async (req, res, next) => {
  try {
    const {
      scene_name,
      category,
      description = '',
      prompt_template,
      cover_image = null,
      parameters = {},
      tags = [],
      status = 'active'
    } = req.validatedBody;

    const result = await query(
      `INSERT INTO scenes (scene_name, category, description, prompt_template, cover_image, parameters, tags, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        scene_name,
        category,
        description,
        prompt_template,
        cover_image,
        JSON.stringify(parameters),
        JSON.stringify(tags),
        status
      ]
    );

    const newScene = await query(
      'SELECT * FROM scenes WHERE scene_id = ?',
      [result.insertId]
    );

    res.json({
      success: true,
      message: '场景创建成功',
      data: {
        scene: newScene[0]
      }
    });

  } catch (error) {
    next(error);
  }
});

// 更新场景（管理员）
router.put('/:scene_id', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const { scene_id } = req.params;
    const updates = req.body;

    // 验证场景是否存在
    const scenes = await query(
      'SELECT * FROM scenes WHERE scene_id = ?',
      [scene_id]
    );

    if (scenes.length === 0) {
      return res.status(404).json({
        success: false,
        message: '场景不存在'
      });
    }

    // 构建更新SQL
    const updateFields = [];
    const updateValues = [];

    const allowedFields = [
      'scene_name', 'category', 'description', 'prompt_template',
      'cover_image', 'status', 'display_order'
    ];

    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        updateValues.push(updates[field]);
      }
    });

    if (updates.parameters !== undefined) {
      updateFields.push('parameters = ?');
      updateValues.push(JSON.stringify(updates.parameters));
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
    updateValues.push(scene_id);

    await query(
      `UPDATE scenes SET ${updateFields.join(', ')} WHERE scene_id = ?`,
      updateValues
    );

    const updatedScene = await query(
      'SELECT * FROM scenes WHERE scene_id = ?',
      [scene_id]
    );

    res.json({
      success: true,
      message: '场景更新成功',
      data: {
        scene: updatedScene[0]
      }
    });

  } catch (error) {
    next(error);
  }
});

// 删除场景（管理员）
router.delete('/:scene_id', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const { scene_id } = req.params;

    const scenes = await query(
      'SELECT * FROM scenes WHERE scene_id = ?',
      [scene_id]
    );

    if (scenes.length === 0) {
      return res.status(404).json({
        success: false,
        message: '场景不存在'
      });
    }

    await query('DELETE FROM scenes WHERE scene_id = ?', [scene_id]);

    res.json({
      success: true,
      message: '场景删除成功'
    });

  } catch (error) {
    next(error);
  }
});

// 获取场景分类列表
router.get('/meta/categories', async (req, res, next) => {
  try {
    const categories = await query(
      'SELECT DISTINCT category, COUNT(*) as count FROM scenes WHERE status = ? GROUP BY category',
      ['active']
    );

    res.json({
      success: true,
      data: {
        categories
      }
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
