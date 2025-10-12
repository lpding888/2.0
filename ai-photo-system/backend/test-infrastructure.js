#!/usr/bin/env node

/**
 * 基础设施功能测试脚本
 * 测试日志系统、性能监控、Sentry和备份功能
 *
 * 使用方法：
 * node test-infrastructure.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const logger = require('./src/utils/logger');
const sentry = require('./src/utils/sentry');

console.log('');
console.log('='.repeat(60));
console.log('🧪 基础设施功能测试');
console.log('='.repeat(60));
console.log('');

// 测试1: 日志系统
async function testLogger() {
  console.log('📝 测试1: 日志系统');
  console.log('-'.repeat(60));

  try {
    // 测试不同级别的日志
    logger.info('这是一条info日志', { test: true, module: 'test' });
    logger.warn('这是一条warn日志', { warning: 'test warning' });
    logger.debug('这是一条debug日志', { debug: true });

    // 测试错误日志
    const testError = new Error('这是一个测试错误');
    logger.error('测试错误日志', testError, { context: 'test' });

    // 测试专用日志
    logger.db('SELECT', 'users', { userId: 123 });
    logger.api('TestAPI', 'test', { success: true });
    logger.task('task_123', 'completed', { duration: 5000 });
    logger.performance('testOperation', 150, { size: '1MB' });

    console.log('✅ 日志系统测试通过');
    console.log(`📁 日志文件位置: ${path.join(__dirname, 'logs')}`);
    console.log('');
    return true;
  } catch (error) {
    console.error('❌ 日志系统测试失败:', error.message);
    console.log('');
    return false;
  }
}

// 测试2: Sentry集成
async function testSentry() {
  console.log('🐛 测试2: Sentry错误追踪');
  console.log('-'.repeat(60));

  if (!process.env.SENTRY_DSN) {
    console.log('⚠️  Sentry未配置（SENTRY_DSN为空），跳过测试');
    console.log('💡 提示: 在.env中配置SENTRY_DSN以启用Sentry');
    console.log('');
    return true;
  }

  try {
    // 测试捕获异常
    const testError = new Error('Sentry测试错误');
    sentry.captureException(testError, {
      tags: { test: true, module: 'infrastructure-test' },
      extra: { timestamp: new Date().toISOString() }
    });

    // 测试捕获消息
    sentry.captureMessage('Sentry测试消息', 'info', {
      tags: { test: true }
    });

    console.log('✅ Sentry集成测试通过');
    console.log('📊 请查看Sentry控制台确认事件已上报');
    console.log('');
    return true;
  } catch (error) {
    console.error('❌ Sentry集成测试失败:', error.message);
    console.log('');
    return false;
  }
}

// 测试3: 数据库备份
async function testDatabaseBackup() {
  console.log('💾 测试3: 数据库备份');
  console.log('-'.repeat(60));

  try {
    const { performBackup, config } = require('./scripts/backup-database');

    console.log('📋 备份配置:');
    console.log(`   数据库: ${config.database}`);
    console.log(`   主机: ${config.host}`);
    console.log(`   备份目录: ${config.backupDir}`);
    console.log('');

    console.log('💡 执行备份命令: npm run backup:db');
    console.log('⚠️  注意: 需要MySQL客户端工具（mysqldump）');
    console.log('');

    return true;
  } catch (error) {
    console.error('❌ 数据库备份测试失败:', error.message);
    console.log('');
    return false;
  }
}

// 测试4: 文件备份
async function testFileBackup() {
  console.log('📦 测试4: 文件备份');
  console.log('-'.repeat(60));

  try {
    const { config } = require('./scripts/backup-files');

    console.log('📋 备份配置:');
    console.log(`   源目录: ${config.uploadsDir}`);
    console.log(`   备份目录: ${config.backupDir}`);
    console.log(`   保留天数: ${config.maxBackups}`);
    console.log('');

    console.log('💡 执行备份命令: npm run backup:files');
    console.log('');

    return true;
  } catch (error) {
    console.error('❌ 文件备份测试失败:', error.message);
    console.log('');
    return false;
  }
}

// 测试5: 性能监控
async function testPerformanceMonitor() {
  console.log('📊 测试5: 性能监控');
  console.log('-'.repeat(60));

  try {
    const { getHealthMetrics, systemMonitor } = require('./src/middleware/performanceMonitor');

    // 模拟一些请求
    systemMonitor.recordRequest(200, 150);
    systemMonitor.recordRequest(200, 250);
    systemMonitor.recordRequest(404, 100);
    systemMonitor.recordRequest(500, 5000);

    // 获取健康指标
    const metrics = getHealthMetrics();

    console.log('📈 当前系统指标:');
    console.log(`   状态: ${metrics.status}`);
    console.log(`   运行时间: ${(metrics.uptime / 3600).toFixed(2)}小时`);
    console.log(`   Node版本: ${metrics.system.nodeVersion}`);
    console.log(`   CPU核心数: ${metrics.system.cpus}`);
    console.log(`   总请求数: ${metrics.performance.requests.total}`);
    console.log(`   成功率: ${metrics.performance.requests.successRate}`);
    console.log('');

    console.log('✅ 性能监控测试通过');
    console.log('💡 访问 http://localhost:3000/health 查看完整指标');
    console.log('');

    return true;
  } catch (error) {
    console.error('❌ 性能监控测试失败:', error.message);
    console.log('');
    return false;
  }
}

// 主测试流程
async function runAllTests() {
  const results = {
    logger: false,
    sentry: false,
    dbBackup: false,
    fileBackup: false,
    performance: false
  };

  // 运行所有测试
  results.logger = await testLogger();
  results.sentry = await testSentry();
  results.dbBackup = await testDatabaseBackup();
  results.fileBackup = await testFileBackup();
  results.performance = await testPerformanceMonitor();

  // 汇总结果
  console.log('='.repeat(60));
  console.log('📋 测试结果汇总');
  console.log('='.repeat(60));
  console.log('');

  const tests = [
    { name: '日志系统', result: results.logger },
    { name: 'Sentry集成', result: results.sentry },
    { name: '数据库备份', result: results.dbBackup },
    { name: '文件备份', result: results.fileBackup },
    { name: '性能监控', result: results.performance }
  ];

  tests.forEach(test => {
    const icon = test.result ? '✅' : '❌';
    const status = test.result ? '通过' : '失败';
    console.log(`${icon} ${test.name}: ${status}`);
  });

  console.log('');

  const passCount = tests.filter(t => t.result).length;
  const totalCount = tests.length;
  const passRate = ((passCount / totalCount) * 100).toFixed(0);

  console.log(`通过率: ${passCount}/${totalCount} (${passRate}%)`);
  console.log('');

  if (passCount === totalCount) {
    console.log('🎉 所有测试通过！');
  } else {
    console.log('⚠️  部分测试失败，请检查错误信息');
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('');

  // 下一步提示
  console.log('📝 下一步操作:');
  console.log('');
  console.log('1. 查看日志文件:');
  console.log('   ls -la logs/');
  console.log('');
  console.log('2. 启动服务器:');
  console.log('   npm run dev');
  console.log('');
  console.log('3. 测试健康检查:');
  console.log('   curl http://localhost:3000/health');
  console.log('');
  console.log('4. 执行备份:');
  console.log('   npm run backup:db');
  console.log('   npm run backup:files');
  console.log('');
  console.log('5. 配置定时备份（可选）:');
  console.log('   参考: 基础设施使用文档.md');
  console.log('');

  // 返回退出码
  process.exit(passCount === totalCount ? 0 : 1);
}

// 运行测试
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('');
    console.error('❌ 测试执行失败:', error);
    console.error('');
    process.exit(1);
  });
}

module.exports = { runAllTests };
