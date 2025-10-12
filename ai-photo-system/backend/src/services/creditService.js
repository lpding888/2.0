const { query, transaction } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');

// 检查用户积分是否充足
async function checkCredits(userId, requiredCredits) {
  const users = await query(
    'SELECT credits FROM users WHERE user_id = ?',
    [userId]
  );

  if (users.length === 0) {
    throw new AppError('用户不存在', 404);
  }

  const currentCredits = users[0].credits;

  return {
    sufficient: currentCredits >= requiredCredits,
    current: currentCredits,
    required: requiredCredits,
    shortage: Math.max(0, requiredCredits - currentCredits)
  };
}

// 扣除积分
async function deductCredits(userId, amount, type, relatedId = null, description = '') {
  return await transaction(async (connection) => {
    // 锁定用户行，防止并发扣款
    const [users] = await connection.execute(
      'SELECT user_id, credits FROM users WHERE user_id = ? FOR UPDATE',
      [userId]
    );

    if (users.length === 0) {
      throw new AppError('用户不存在', 404);
    }

    const currentCredits = users[0].credits;

    if (currentCredits < amount) {
      throw new AppError('积分不足', 400);
    }

    // 扣除积分
    const newCredits = currentCredits - amount;
    await connection.execute(
      'UPDATE users SET credits = ?, total_consumed_credits = total_consumed_credits + ?, updated_at = NOW() WHERE user_id = ?',
      [newCredits, amount, userId]
    );

    // 记录积分变动
    await connection.execute(
      'INSERT INTO credit_records (user_id, type, amount, balance_after, related_id, description) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, type, -amount, newCredits, relatedId, description]
    );

    return {
      success: true,
      previous: currentCredits,
      current: newCredits,
      deducted: amount
    };
  });
}

// 增加积分
async function addCredits(userId, amount, type, relatedId = null, description = '') {
  return await transaction(async (connection) => {
    // 锁定用户行
    const [users] = await connection.execute(
      'SELECT user_id, credits FROM users WHERE user_id = ? FOR UPDATE',
      [userId]
    );

    if (users.length === 0) {
      throw new AppError('用户不存在', 404);
    }

    const currentCredits = users[0].credits;
    const newCredits = currentCredits + amount;

    // 增加积分
    await connection.execute(
      'UPDATE users SET credits = ?, total_credits = total_credits + ?, updated_at = NOW() WHERE user_id = ?',
      [newCredits, amount, userId]
    );

    // 记录积分变动
    await connection.execute(
      'INSERT INTO credit_records (user_id, type, amount, balance_after, related_id, description) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, type, amount, newCredits, relatedId, description]
    );

    return {
      success: true,
      previous: currentCredits,
      current: newCredits,
      added: amount
    };
  });
}

// 退还积分
async function refundCredits(userId, amount, relatedId, description) {
  return await addCredits(userId, amount, 'refund', relatedId, description);
}

// 获取积分记录
async function getCreditRecords(userId, options = {}) {
  const {
    page = 1,
    pageSize = 20,
    type = null,
    startDate = null,
    endDate = null
  } = options;

  let sql = 'SELECT * FROM credit_records WHERE user_id = ?';
  const params = [userId];

  if (type) {
    sql += ' AND type = ?';
    params.push(type);
  }

  if (startDate) {
    sql += ' AND created_at >= ?';
    params.push(startDate);
  }

  if (endDate) {
    sql += ' AND created_at <= ?';
    params.push(endDate);
  }

  sql += ' ORDER BY created_at DESC';

  // 添加分页
  const offset = (page - 1) * pageSize;
  sql += ' LIMIT ? OFFSET ?';
  params.push(pageSize, offset);

  const records = await query(sql, params);

  // 获取总数
  let countSql = 'SELECT COUNT(*) as total FROM credit_records WHERE user_id = ?';
  const countParams = [userId];

  if (type) {
    countSql += ' AND type = ?';
    countParams.push(type);
  }

  if (startDate) {
    countSql += ' AND created_at >= ?';
    countParams.push(startDate);
  }

  if (endDate) {
    countSql += ' AND created_at <= ?';
    countParams.push(endDate);
  }

  const [countResult] = await query(countSql, countParams);
  const total = countResult.total;

  return {
    records,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize)
    }
  };
}

// 获取积分统计
async function getCreditStats(userId) {
  const [stats] = await query(
    `SELECT
      credits as current_balance,
      total_credits as total_recharged,
      total_consumed_credits as total_consumed,
      (SELECT COUNT(*) FROM credit_records WHERE user_id = ? AND type = 'recharge') as recharge_count,
      (SELECT COUNT(*) FROM credit_records WHERE user_id = ? AND type = 'consume') as consume_count
    FROM users WHERE user_id = ?`,
    [userId, userId, userId]
  );

  return stats || {
    current_balance: 0,
    total_recharged: 0,
    total_consumed: 0,
    recharge_count: 0,
    consume_count: 0
  };
}

module.exports = {
  checkCredits,
  deductCredits,
  addCredits,
  refundCredits,
  getCreditRecords,
  getCreditStats
};
