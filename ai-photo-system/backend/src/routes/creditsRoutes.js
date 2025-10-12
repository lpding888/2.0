const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const {
  checkCredits,
  addCredits,
  getCreditRecords,
  getCreditStats
} = require('../services/creditService');

// 获取当前积分
router.get('/balance', authMiddleware, async (req, res, next) => {
  try {
    const users = await query(
      'SELECT credits, total_credits, total_consumed_credits FROM users WHERE user_id = ?',
      [req.user.user_id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    res.json({
      success: true,
      data: {
        credits: users[0].credits,
        total_credits: users[0].total_credits,
        total_consumed_credits: users[0].total_consumed_credits
      }
    });

  } catch (error) {
    next(error);
  }
});

// 获取积分记录
router.get('/records', authMiddleware, async (req, res, next) => {
  try {
    const {
      page = 1,
      pageSize = 20,
      type,
      startDate,
      endDate
    } = req.query;

    const result = await getCreditRecords(req.user.user_id, {
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      type,
      startDate,
      endDate
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    next(error);
  }
});

// 获取积分统计
router.get('/stats', authMiddleware, async (req, res, next) => {
  try {
    const stats = await getCreditStats(req.user.user_id);

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    next(error);
  }
});

// 获取充值套餐列表
router.get('/packages', async (req, res, next) => {
  try {
    const packages = [
      {
        package_id: 'basic',
        name: '基础套餐',
        credits: 10,
        price: 9.9,
        original_price: 10,
        discount: 0.99,
        description: '适合尝鲜用户',
        popular: false
      },
      {
        package_id: 'standard',
        name: '标准套餐',
        credits: 50,
        price: 39.9,
        original_price: 50,
        discount: 0.8,
        description: '最受欢迎',
        popular: true
      },
      {
        package_id: 'premium',
        name: '高级套餐',
        credits: 100,
        price: 69.9,
        original_price: 100,
        discount: 0.7,
        description: '超值优惠',
        popular: false
      },
      {
        package_id: 'enterprise',
        name: '企业套餐',
        credits: 500,
        price: 299,
        original_price: 500,
        discount: 0.6,
        description: '企业批量使用',
        popular: false
      }
    ];

    res.json({
      success: true,
      data: {
        packages
      }
    });

  } catch (error) {
    next(error);
  }
});

// 创建充值订单
router.post('/recharge', authMiddleware, async (req, res, next) => {
  try {
    const { package_id, payment_method = 'wechat' } = req.body;

    if (!package_id) {
      return res.status(400).json({
        success: false,
        message: '请选择充值套餐'
      });
    }

    // 获取套餐信息
    const packages = {
      'basic': { credits: 10, price: 9.9 },
      'standard': { credits: 50, price: 39.9 },
      'premium': { credits: 100, price: 69.9 },
      'enterprise': { credits: 500, price: 299 }
    };

    const pkg = packages[package_id];

    if (!pkg) {
      return res.status(400).json({
        success: false,
        message: '套餐不存在'
      });
    }

    // 生成订单号
    const orderNo = `ORDER${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // 创建订单记录
    await query(
      `INSERT INTO orders (user_id, order_no, amount, credits, payment_method, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.user.user_id, orderNo, pkg.price, pkg.credits, payment_method, 'pending']
    );

    // 这里应该调用支付接口，获取支付参数
    // 为了简化，这里直接返回订单信息

    res.json({
      success: true,
      message: '订单创建成功',
      data: {
        order_no: orderNo,
        amount: pkg.price,
        credits: pkg.credits,
        payment_method: payment_method,
        // 实际支付参数应该从支付接口获取
        payment_params: {
          // 微信支付参数或支付宝支付参数
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

// 支付回调（这里简化处理，实际应该验证签名）
router.post('/payment/callback', async (req, res, next) => {
  try {
    const { order_no } = req.body;

    // 查询订单
    const orders = await query(
      'SELECT * FROM orders WHERE order_no = ? AND status = ?',
      [order_no, 'pending']
    );

    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: '订单不存在或已处理'
      });
    }

    const order = orders[0];

    // 更新订单状态
    await query(
      'UPDATE orders SET status = ?, paid_at = NOW(), updated_at = NOW() WHERE order_id = ?',
      ['paid', order.order_id]
    );

    // 增加用户积分
    await addCredits(
      order.user_id,
      order.credits,
      'recharge',
      order.order_id,
      `充值订单: ${order_no}`
    );

    res.json({
      success: true,
      message: '支付成功'
    });

  } catch (error) {
    next(error);
  }
});

// 查询订单状态
router.get('/orders/:order_no', authMiddleware, async (req, res, next) => {
  try {
    const { order_no } = req.params;

    const orders = await query(
      'SELECT * FROM orders WHERE order_no = ? AND user_id = ?',
      [order_no, req.user.user_id]
    );

    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: '订单不存在'
      });
    }

    res.json({
      success: true,
      data: {
        order: orders[0]
      }
    });

  } catch (error) {
    next(error);
  }
});

// 获取订单列表
router.get('/orders', authMiddleware, async (req, res, next) => {
  try {
    const {
      page = 1,
      pageSize = 20,
      status
    } = req.query;

    let sql = 'SELECT * FROM orders WHERE user_id = ?';
    const params = [req.user.user_id];

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY created_at DESC';

    const offset = (page - 1) * pageSize;
    sql += ' LIMIT ? OFFSET ?';
    params.push(parseInt(pageSize), parseInt(offset));

    const orders = await query(sql, params);

    // 获取总数
    let countSql = 'SELECT COUNT(*) as total FROM orders WHERE user_id = ?';
    const countParams = [req.user.user_id];

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

module.exports = router;
