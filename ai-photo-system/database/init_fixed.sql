-- AI摄影师系统 - 修复后的数据库初始化脚本
-- 创建时间: 2025-01-12
-- 数据库: ai_photo
-- 版本: v1.0.1 (修复版)

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- 1. 用户表 (FIXED)
-- ----------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `user_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT '用户ID',
  `openid` varchar(100) NOT NULL COMMENT '微信OpenID',
  `nickname` varchar(100) DEFAULT NULL COMMENT '昵称',
  `avatar_url` varchar(500) DEFAULT NULL COMMENT '头像URL',
  `email` varchar(100) DEFAULT NULL COMMENT '邮箱',
  `register_source` varchar(50) DEFAULT 'wechat_miniprogram' COMMENT '注册来源',
  `credits` int(11) NOT NULL DEFAULT '0' COMMENT '剩余积分',
  `role` enum('user','vip','admin') NOT NULL DEFAULT 'user' COMMENT '角色',
  `status` enum('active','inactive') NOT NULL DEFAULT 'active' COMMENT '状态',
  `last_login_at` datetime DEFAULT NULL COMMENT '最后登录时间',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `uk_openid` (`openid`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- ----------------------------
-- 2. 作品表 (FIXED)
-- ----------------------------
DROP TABLE IF EXISTS `works`;
CREATE TABLE `works` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `work_id` varchar(50) NOT NULL COMMENT '作品唯一标识(UUID)',
  `user_id` bigint(20) unsigned NOT NULL COMMENT '用户ID',
  `task_id` varchar(100) NOT NULL COMMENT '任务ID',
  `type` varchar(20) NOT NULL COMMENT '类型：fitting-试衣 photography-摄影 travel-旅行',
  `status` varchar(20) NOT NULL DEFAULT 'pending' COMMENT '状态：pending-待处理 processing-处理中 completed-完成 failed-失败',
  `images` json DEFAULT NULL COMMENT '生成的图片数组 [{url, width, height}]',
  `ai_description` text COMMENT 'AI生成的描述',
  `scene_id` varchar(50) DEFAULT NULL COMMENT '场景ID',
  `error` text COMMENT '错误信息（失败时）',
  `is_favorite` tinyint(4) NOT NULL DEFAULT '0' COMMENT '是否收藏：0-否 1-是',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_work_id` (`work_id`),
  UNIQUE KEY `uk_task_id` (`task_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_type_status` (`type`, `status`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='作品表';

-- ----------------------------
-- 3. 任务队列表
-- ----------------------------
DROP TABLE IF EXISTS `task_queue`;
CREATE TABLE `task_queue` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `task_id` varchar(100) NOT NULL COMMENT '任务ID',
  `user_id` bigint(20) unsigned NOT NULL COMMENT '用户ID',
  `type` varchar(20) NOT NULL COMMENT '任务类型：fitting, photography, travel',
  `status` varchar(20) NOT NULL DEFAULT 'pending' COMMENT '状态：pending, processing, completed, failed',
  `priority` int(11) NOT NULL DEFAULT '5' COMMENT '优先级：数字越大优先级越高',
  `batch_count` int(11) NOT NULL DEFAULT '1' COMMENT '批量生成数量',
  `parameters` json DEFAULT NULL COMMENT '任务参数',
  `error` text COMMENT '错误信息',
  `retry_count` int(11) NOT NULL DEFAULT '0' COMMENT '重试次数',
  `completed_at` datetime DEFAULT NULL COMMENT '完成时间',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_task_id` (`task_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_status` (`status`),
  KEY `idx_type_status` (`type`, `status`),
  KEY `idx_priority` (`priority`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='任务队列表';

-- ----------------------------
-- 4. 场景表 (FIXED)
-- ----------------------------
DROP TABLE IF EXISTS `scenes`;
CREATE TABLE `scenes` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `scene_id` varchar(50) NOT NULL COMMENT '场景唯一标识',
  `scene_name` varchar(100) NOT NULL COMMENT '场景名称',
  `category` varchar(50) DEFAULT NULL COMMENT '分类：indoor-室内 outdoor-户外 studio-影棚',
  `description` text COMMENT '场景描述',
  `cover_image` varchar(500) DEFAULT NULL COMMENT '封面图URL',
  `prompt_template` text COMMENT '提示词模板',
  `display_order` int(11) NOT NULL DEFAULT '0' COMMENT '排序（数字越小越靠前）',
  `status` enum('active','inactive') NOT NULL DEFAULT 'active' COMMENT '状态',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_scene_id` (`scene_id`),
  KEY `idx_status` (`status`),
  KEY `idx_display_order` (`display_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='场景表';

-- ----------------------------
-- 5. 订单表
-- ----------------------------
DROP TABLE IF EXISTS `orders`;
CREATE TABLE `orders` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `order_no` varchar(50) NOT NULL COMMENT '订单号',
  `user_id` bigint(20) unsigned NOT NULL COMMENT '用户ID',
  `amount` decimal(10,2) NOT NULL COMMENT '订单金额（元）',
  `credits` int(11) NOT NULL DEFAULT '0' COMMENT '积分数量',
  `status` varchar(20) NOT NULL DEFAULT 'pending' COMMENT '状态：pending-待支付 paid-已支付 cancelled-已取消',
  `payment_method` varchar(20) DEFAULT NULL COMMENT '支付方式：wechat-微信支付 alipay-支付宝',
  `paid_at` datetime DEFAULT NULL COMMENT '支付时间',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_order_no` (`order_no`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单表';

-- ----------------------------
-- 6. 积分记录表 (FIXED)
-- ----------------------------
DROP TABLE IF EXISTS `credit_records`;
CREATE TABLE `credit_records` (
  `record_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT '记录ID',
  `user_id` bigint(20) unsigned NOT NULL COMMENT '用户ID',
  `type` varchar(20) NOT NULL COMMENT '类型：purchase-充值 deduct-消费 refund-退款 gift-赠送',
  `amount` int(11) NOT NULL COMMENT '积分数量（正数为增加，负数为减少）',
  `balance_after` int(11) NOT NULL COMMENT '操作后余额',
  `description` varchar(500) DEFAULT NULL COMMENT '描述',
  `related_type` varchar(50) DEFAULT NULL COMMENT '关联类型：order, task, work',
  `related_id` varchar(100) DEFAULT NULL COMMENT '关联ID',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`record_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_type` (`type`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='积分记录表';

-- ----------------------------
-- 7. 系统配置表
-- ----------------------------
DROP TABLE IF EXISTS `system_config`;
CREATE TABLE `system_config` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `config_key` varchar(100) NOT NULL COMMENT '配置键',
  `config_value` text COMMENT '配置值',
  `description` varchar(500) DEFAULT NULL COMMENT '描述',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_config_key` (`config_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统配置表';

-- ----------------------------
-- 8. 管理员表 (FIXED)
-- ----------------------------
DROP TABLE IF EXISTS `admins`;
CREATE TABLE `admins` (
  `admin_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT '管理员ID',
  `username` varchar(50) NOT NULL COMMENT '用户名',
  `password_hash` varchar(200) NOT NULL COMMENT '密码（bcrypt加密）',
  `nickname` varchar(100) DEFAULT NULL COMMENT '昵称',
  `role` varchar(20) NOT NULL DEFAULT 'admin' COMMENT '角色：super-超级管理员 admin-管理员',
  `status` enum('active','inactive') NOT NULL DEFAULT 'active' COMMENT '状态',
  `last_login_at` datetime DEFAULT NULL COMMENT '最后登录时间',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`admin_id`),
  UNIQUE KEY `uk_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='管理员表';

-- ----------------------------
-- 9. 积分套餐表 (NEW)
-- ----------------------------
DROP TABLE IF EXISTS `credit_packages`;
CREATE TABLE `credit_packages` (
  `package_id` varchar(50) NOT NULL COMMENT '套餐ID',
  `package_name` varchar(100) NOT NULL COMMENT '套餐名称',
  `credits` int(11) NOT NULL COMMENT '积分数量',
  `price` decimal(10,2) NOT NULL COMMENT '价格（元）',
  `original_price` decimal(10,2) DEFAULT NULL COMMENT '原价',
  `description` varchar(500) DEFAULT NULL COMMENT '描述',
  `is_popular` tinyint(4) NOT NULL DEFAULT '0' COMMENT '是否热门',
  `is_active` tinyint(4) NOT NULL DEFAULT '1' COMMENT '是否启用',
  `sort_order` int(11) NOT NULL DEFAULT '0' COMMENT '排序',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`package_id`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_sort_order` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='积分套餐表';

-- ----------------------------
-- 初始化数据
-- ----------------------------

-- 插入默认管理员（用户名：admin 密码：admin123）
-- 密码hash: $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy (admin123)
INSERT INTO `admins` (`username`, `password_hash`, `nickname`, `role`) VALUES
('admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '超级管理员', 'super');

-- 插入系统配置
INSERT INTO `system_config` (`config_key`, `config_value`, `description`) VALUES
('site_name', 'AI摄影系统', '网站名称'),
('default_credits', '10', '新用户默认积分'),
('max_upload_size', '10', '最大上传文件大小（MB）'),
('max_batch_count', '50', '最大批量生成数量'),
('default_batch_count', '10', '默认批量生成数量'),
('queue_concurrency', '5', '队列并发数'),
('ai_api_url', 'https://kuai.host', 'AI API地址'),
('default_temperature', '1.0', '默认温度参数'),
('default_topk', '40', '默认topK参数'),
('default_topp', '0.95', '默认topP参数');

-- 插入默认场景
INSERT INTO `scenes` (`scene_id`, `scene_name`, `category`, `description`, `prompt_template`, `display_order`, `status`) VALUES
('paris-street', '巴黎街头', 'outdoor', '浪漫的巴黎街景，埃菲尔铁塔背景', 'Paris street, Eiffel Tower background, romantic atmosphere, professional photography, high quality', 1, 'active'),
('studio-simple', '简约影棚', 'indoor', '纯色背景影棚，适合试衣展示', 'Simple studio, clean background, professional lighting, fashion photography', 2, 'active'),
('beach-sunset', '海滩日落', 'outdoor', '海滩日落美景，度假氛围', 'Beach sunset, golden hour, vacation vibes, travel photography, beautiful scenery', 3, 'active');

-- 插入积分套餐
INSERT INTO `credit_packages` (`package_id`, `package_name`, `credits`, `price`, `original_price`, `description`, `is_popular`, `sort_order`) VALUES
('basic', '基础套餐', 100, 9.90, 19.90, '适合轻度使用', 0, 1),
('standard', '标准套餐', 500, 39.90, 79.90, '适合日常使用，性价比高', 1, 2),
('premium', '高级套餐', 1000, 69.90, 149.90, '适合重度使用', 0, 3),
('ultimate', '至尊套餐', 3000, 199.90, 399.90, '超值大礼包，无限创作', 0, 4);

SET FOREIGN_KEY_CHECKS = 1;

-- 完成
SELECT '数据库初始化完成 (修复版)!' AS message;
SELECT '默认管理员账号: admin / admin123' AS admin_info;
