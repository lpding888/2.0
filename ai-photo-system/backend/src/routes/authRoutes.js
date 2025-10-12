const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const { code2Session } = require('../utils/wechat');
const { validate, loginSchema, adminLoginSchema } = require('../middleware/validation');
const { authMiddleware } = require('../middleware/auth');

// 小程序登录
router.post('/wechat/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { code, userInfo } = req.validatedBody;

    // 调用微信接口获取openid
    const wechatData = await code2Session(code);

    if (!wechatData.openid) {
      return res.status(400).json({
        success: false,
        message: '微信登录失败'
      });
    }

    // 查询用户是否存在
    let users = await query(
      'SELECT * FROM users WHERE openid = ?',
      [wechatData.openid]
    );

    let user;

    if (users.length === 0) {
      // 新用户，创建记录
      const defaultCredits = parseInt(process.env.DEFAULT_USER_CREDITS || '10');

      const result = await query(
        `INSERT INTO users (openid, nickname, avatar_url, credits, register_source)
         VALUES (?, ?, ?, ?, ?)`,
        [
          wechatData.openid,
          userInfo?.nickname || '用户',
          userInfo?.avatar_url || '',
          defaultCredits,
          'wechat_miniprogram'
        ]
      );

      // 获取新创建的用户
      users = await query(
        'SELECT * FROM users WHERE user_id = ?',
        [result.insertId]
      );

      user = users[0];

      console.log(`✅ 新用户注册: ${user.user_id} (${user.nickname})`);
    } else {
      user = users[0];

      // 更新用户信息（如果有新的）
      if (userInfo) {
        await query(
          'UPDATE users SET nickname = ?, avatar_url = ?, last_login_at = NOW(), updated_at = NOW() WHERE user_id = ?',
          [userInfo.nickname || user.nickname, userInfo.avatar_url || user.avatar_url, user.user_id]
        );
      } else {
        await query(
          'UPDATE users SET last_login_at = NOW(), updated_at = NOW() WHERE user_id = ?',
          [user.user_id]
        );
      }

      console.log(`✅ 用户登录: ${user.user_id} (${user.nickname})`);
    }

    // 生成JWT Token
    const token = jwt.sign(
      { userId: user.user_id, openid: user.openid },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      success: true,
      message: '登录成功',
      data: {
        token,
        user: {
          user_id: user.user_id,
          nickname: user.nickname,
          avatar_url: user.avatar_url,
          credits: user.credits,
          role: user.role,
          is_new_user: users.length === 0
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

// 获取当前用户信息
router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: {
        user: req.user
      }
    });
  } catch (error) {
    next(error);
  }
});

// 管理员登录
router.post('/admin/login', validate(adminLoginSchema), async (req, res, next) => {
  try {
    const { username, password } = req.validatedBody;

    // 查询管理员
    const admins = await query(
      'SELECT * FROM admins WHERE username = ? AND status = ?',
      [username, 'active']
    );

    if (admins.length === 0) {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
    }

    const admin = admins[0];

    // 验证密码
    const isValidPassword = await bcrypt.compare(password, admin.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
    }

    // 更新最后登录时间
    await query(
      'UPDATE admins SET last_login_at = NOW(), updated_at = NOW() WHERE admin_id = ?',
      [admin.admin_id]
    );

    // 生成JWT Token
    const token = jwt.sign(
      { userId: admin.admin_id, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: '登录成功',
      data: {
        token,
        admin: {
          admin_id: admin.admin_id,
          username: admin.username,
          role: admin.role,
          nickname: admin.nickname
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

// 刷新Token
router.post('/refresh', authMiddleware, async (req, res, next) => {
  try {
    const newToken = jwt.sign(
      { userId: req.user.user_id, openid: req.user.openid },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      success: true,
      data: {
        token: newToken
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
