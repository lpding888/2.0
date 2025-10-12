const Sentry = require('@sentry/node');
const { ProfilingIntegration } = require('@sentry/profiling-node');
const logger = require('./logger');

// Sentry配置
const initSentry = (app) => {
  // 仅在生产环境或配置了DSN时启用
  if (!process.env.SENTRY_DSN) {
    logger.warn('Sentry DSN not configured, error tracking disabled');
    return;
  }

  try {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',

      // 性能监控采样率
      tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE) || 0.1,

      // 性能分析
      profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE) || 0.1,

      integrations: [
        // HTTP请求追踪
        new Sentry.Integrations.Http({ tracing: true }),

        // Express集成
        new Sentry.Integrations.Express({ app }),

        // 性能分析
        new ProfilingIntegration(),
      ],

      // 忽略的错误类型
      ignoreErrors: [
        // 客户端错误
        'NetworkError',
        'Non-Error promise rejection',
        // 常见的无关紧要的错误
        'ResizeObserver loop limit exceeded',
        'cancelled',
      ],

      // 过滤敏感信息
      beforeSend(event, hint) {
        // 移除敏感数据
        if (event.request) {
          // 移除敏感请求头
          if (event.request.headers) {
            delete event.request.headers['authorization'];
            delete event.request.headers['cookie'];
          }

          // 移除敏感查询参数
          if (event.request.query_string) {
            event.request.query_string = event.request.query_string
              .replace(/token=[^&]*/gi, 'token=[FILTERED]')
              .replace(/password=[^&]*/gi, 'password=[FILTERED]')
              .replace(/secret=[^&]*/gi, 'secret=[FILTERED]');
          }

          // 移除敏感POST数据
          if (event.request.data) {
            const data = typeof event.request.data === 'string'
              ? JSON.parse(event.request.data)
              : event.request.data;

            if (data.password) data.password = '[FILTERED]';
            if (data.token) data.token = '[FILTERED]';
            if (data.secret) data.secret = '[FILTERED]';

            event.request.data = data;
          }
        }

        // 添加额外上下文
        if (hint.originalException) {
          logger.error('Sentry captured error', hint.originalException, {
            eventId: event.event_id,
            level: event.level
          });
        }

        return event;
      },

      // 自定义错误分组
      beforeBreadcrumb(breadcrumb, hint) {
        // 过滤不重要的面包屑
        if (breadcrumb.category === 'console' && breadcrumb.level === 'log') {
          return null;
        }

        // 截断过长的数据
        if (breadcrumb.data && JSON.stringify(breadcrumb.data).length > 1000) {
          breadcrumb.data = { truncated: true };
        }

        return breadcrumb;
      }
    });

    logger.info('Sentry initialized', {
      environment: process.env.NODE_ENV,
      tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE) || 0.1
    });

  } catch (error) {
    logger.error('Failed to initialize Sentry', error);
  }
};

// 手动捕获异常
const captureException = (error, context = {}) => {
  if (!process.env.SENTRY_DSN) return;

  Sentry.captureException(error, {
    tags: context.tags || {},
    extra: context.extra || {},
    user: context.user || null,
    level: context.level || 'error'
  });
};

// 手动捕获消息
const captureMessage = (message, level = 'info', context = {}) => {
  if (!process.env.SENTRY_DSN) return;

  Sentry.captureMessage(message, {
    level,
    tags: context.tags || {},
    extra: context.extra || {}
  });
};

// 设置用户上下文
const setUser = (user) => {
  if (!process.env.SENTRY_DSN) return;

  Sentry.setUser({
    id: user.user_id,
    username: user.nickname,
    email: user.email,
    ip_address: user.ip
  });
};

// 清除用户上下文
const clearUser = () => {
  if (!process.env.SENTRY_DSN) return;
  Sentry.setUser(null);
};

// 添加面包屑
const addBreadcrumb = (breadcrumb) => {
  if (!process.env.SENTRY_DSN) return;

  Sentry.addBreadcrumb({
    message: breadcrumb.message,
    category: breadcrumb.category || 'custom',
    level: breadcrumb.level || 'info',
    data: breadcrumb.data || {}
  });
};

// 创建事务（性能追踪）
const startTransaction = (name, op) => {
  if (!process.env.SENTRY_DSN) {
    return {
      finish: () => {},
      setStatus: () => {},
      setTag: () => {},
      setData: () => {}
    };
  }

  return Sentry.startTransaction({
    name,
    op,
    trimEnd: true
  });
};

// Express中间件
const requestHandler = () => {
  if (!process.env.SENTRY_DSN) {
    return (req, res, next) => next();
  }
  return Sentry.Handlers.requestHandler();
};

const tracingHandler = () => {
  if (!process.env.SENTRY_DSN) {
    return (req, res, next) => next();
  }
  return Sentry.Handlers.tracingHandler();
};

const errorHandler = () => {
  if (!process.env.SENTRY_DSN) {
    return (err, req, res, next) => next(err);
  }
  return Sentry.Handlers.errorHandler({
    shouldHandleError(error) {
      // 捕获所有500错误
      return error.status >= 500;
    }
  });
};

// 性能监控装饰器
const monitorPerformance = (name) => {
  return (target, propertyKey, descriptor) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args) {
      const transaction = startTransaction(
        `${target.constructor.name}.${propertyKey}`,
        name
      );

      try {
        const result = await originalMethod.apply(this, args);
        transaction.setStatus('ok');
        return result;
      } catch (error) {
        transaction.setStatus('internal_error');
        captureException(error, {
          tags: {
            function: propertyKey,
            class: target.constructor.name
          }
        });
        throw error;
      } finally {
        transaction.finish();
      }
    };

    return descriptor;
  };
};

// 数据库查询追踪
const traceQuery = async (queryName, queryFn) => {
  if (!process.env.SENTRY_DSN) {
    return await queryFn();
  }

  const span = Sentry.getCurrentHub().getScope().getSpan();
  const childSpan = span ? span.startChild({
    op: 'db.query',
    description: queryName
  }) : null;

  try {
    const result = await queryFn();
    if (childSpan) {
      childSpan.setStatus('ok');
    }
    return result;
  } catch (error) {
    if (childSpan) {
      childSpan.setStatus('internal_error');
    }
    throw error;
  } finally {
    if (childSpan) {
      childSpan.finish();
    }
  }
};

// HTTP请求追踪
const traceHttpRequest = async (requestName, requestFn) => {
  if (!process.env.SENTRY_DSN) {
    return await requestFn();
  }

  const span = Sentry.getCurrentHub().getScope().getSpan();
  const childSpan = span ? span.startChild({
    op: 'http.client',
    description: requestName
  }) : null;

  try {
    const result = await requestFn();
    if (childSpan) {
      childSpan.setStatus('ok');
      childSpan.setData('status_code', result.status || result.statusCode);
    }
    return result;
  } catch (error) {
    if (childSpan) {
      childSpan.setStatus('internal_error');
    }
    throw error;
  } finally {
    if (childSpan) {
      childSpan.finish();
    }
  }
};

module.exports = {
  initSentry,
  captureException,
  captureMessage,
  setUser,
  clearUser,
  addBreadcrumb,
  startTransaction,
  requestHandler,
  tracingHandler,
  errorHandler,
  monitorPerformance,
  traceQuery,
  traceHttpRequest
};
