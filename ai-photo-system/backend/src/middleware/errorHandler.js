// 全局错误处理中间件
function errorHandler(err, req, res, next) {
  console.error('❌ 服务器错误:', err);

  // 默认错误信息
  let status = err.status || 500;
  let message = err.message || '服务器内部错误';
  let errors = err.errors || undefined;

  // MySQL错误处理
  if (err.code && err.code.startsWith('ER_')) {
    status = 400;
    switch (err.code) {
      case 'ER_DUP_ENTRY':
        message = '数据已存在';
        break;
      case 'ER_NO_REFERENCED_ROW_2':
        message = '关联数据不存在';
        break;
      case 'ER_ROW_IS_REFERENCED_2':
        message = '数据正在被引用，无法删除';
        break;
      case 'ER_PARSE_ERROR':
        message = 'SQL语法错误';
        break;
      default:
        message = '数据库操作失败';
    }
  }

  // JWT错误处理
  if (err.name === 'JsonWebTokenError') {
    status = 401;
    message = '无效的认证令牌';
  } else if (err.name === 'TokenExpiredError') {
    status = 401;
    message = '认证令牌已过期';
  }

  // 文件上传错误
  if (err.code === 'LIMIT_FILE_SIZE') {
    status = 400;
    message = '文件大小超出限制';
  } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    status = 400;
    message = '上传的文件字段不正确';
  }

  // 返回错误响应
  res.status(status).json({
    success: false,
    message,
    errors,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

// 404处理中间件
function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    message: '请求的资源不存在',
    path: req.originalUrl
  });
}

// 自定义错误类
class AppError extends Error {
  constructor(message, status = 500, errors = null) {
    super(message);
    this.status = status;
    this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = {
  errorHandler,
  notFoundHandler,
  AppError
};
