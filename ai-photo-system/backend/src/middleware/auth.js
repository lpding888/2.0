const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

// 验证JWT Token
async function authMiddleware(req, res, next) {
  try {
    // 从请求头获取token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: '未提供认证令牌'
      });
    }

    const token = authHeader.substring(7);

    // 验证token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 查询用户信息
    const users = await query(
      'SELECT user_id, openid, nickname, avatar_url, role, credits FROM users WHERE user_id = ? AND status = ?',
      [decoded.userId, 'active']
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: '用户不存在或已被禁用'
      });
    }

    // 将用户信息附加到请求对象
    req.user = users[0];
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: '无效的认证令牌'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: '认证令牌已过期'
      });
    }
    return res.status(500).json({
      success: false,
      message: '认证失败',
      error: error.message
    });
  }
}

// 验证管理员权限
async function adminMiddleware(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '请先登录'
      });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '需要管理员权限'
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: '权限验证失败',
      error: error.message
    });
  }
}

// 可选的认证中间件（不强制要求登录）
async function optionalAuthMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const users = await query(
      'SELECT user_id, openid, nickname, avatar_url, role, credits FROM users WHERE user_id = ? AND status = ?',
      [decoded.userId, 'active']
    );

    if (users.length > 0) {
      req.user = users[0];
    }

    next();
  } catch (error) {
    next();
  }
}

module.exports = {
  authMiddleware,
  adminMiddleware,
  optionalAuthMiddleware
};
