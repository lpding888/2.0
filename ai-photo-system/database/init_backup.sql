-- AI摄影师系统 - 完整数据库初始化脚本
-- 创建时间: 2025-01-12
-- 数据库: ai_photo

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- 1. 用户表
-- ----------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `openid` varchar(100) NOT NULL COMMENT '微信OpenID',
  `unionid` varchar(100) DEFAULT NULL COMMENT '微信UnionID',
  `nickname` varchar(100) DEFAULT NULL COMMENT '昵称',
  `avatar` varchar(500) DEFAULT NULL COMMENT '头像URL',
  `phone` varchar(20) DEFAULT NULL COMMENT '手机号',
  `email` varchar(100) DEFAULT NULL COMMENT '邮箱',
  `credits` int(11) NOT NULL DEFAULT '0' COMMENT '剩余积分',
  `total_credits` int(11) NOT NULL DEFAULT '0' COMMENT '累计获得积分',
  `total_consumed_credits` int(11) NOT NULL DEFAULT '0' COMMENT '累计消费积分',
  `role` varchar(20) NOT NULL DEFAULT 'user' COMMENT '角色：user-普通用户, vip-VIP用户, admin-管理员',
  `status` tinyint(4) NOT NULL DEFAULT '1' COMMENT '状态：0-禁用 1-正常',
  `last_login_at` datetime DEFAULT NULL COMMENT '最后登录时间',
  `last_login_ip` varchar(50) DEFAULT NULL COMMENT '最后登录IP',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_openid` (`openid`),
  KEY `idx_unionid` (`unionid`),
  KEY `idx_phone` (`phone`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- ----------------------------
-- 2. 作品表
-- ----------------------------
DROP TABLE IF EXISTS `works`;
CREATE TABLE `works` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL COMMENT '用户ID',
  `openid` varchar(100) NOT NULL COMMENT '用户OpenID（冗余，加快查询）',
  `task_id` varchar(100) NOT NULL COMMENT '任务ID',
  `type` varchar(20) NOT NULL COMMENT '类型：fitting-试衣 photography-摄影 travel-旅行',
  `status` varchar(20) NOT NULL DEFAULT 'pending' COMMENT '状态：pending-待处理 processing-处理中 completed-完成 failed-失败',
  `images` json DEFAULT NULL COMMENT '生成的图片数组 [{url, width, height}]',
  `original_images` json DEFAULT NULL COMMENT '原始上传图片',
  `parameters` json DEFAULT NULL COMMENT '生成参数',
  `scene_id` varchar(50) DEFAULT NULL COMMENT '场景ID',
  `scene_info` json DEFAULT NULL COMMENT '场景信息',
  `prompt` text COMMENT '使用的提示词',
  `model_used` varchar(100) DEFAULT NULL COMMENT '使用的AI模型',
  `generation_time` int(11) DEFAULT NULL COMMENT '生成耗时（毫秒）',
  `is_favorite` tinyint(4) NOT NULL DEFAULT '0' COMMENT '是否收藏：0-否 1-是',
  `is_public` tinyint(4) NOT NULL DEFAULT '0' COMMENT '是否公开：0-否 1-是',
  `view_count` int(11) NOT NULL DEFAULT '0' COMMENT '浏览次数',
  `share_count` int(11) NOT NULL DEFAULT '0' COMMENT '分享次数',
  `error_message` text COMMENT '错误信息（失败时）',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_task_id` (`task_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_openid` (`openid`),
  KEY `idx_type_status` (`type`, `status`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_is_public` (`is_public`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='作品表';

-- ----------------------------
-- 3. 任务队列表
-- ----------------------------
DROP TABLE IF EXISTS `task_queue`;
CREATE TABLE `task_queue` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `task_id` varchar(100) NOT NULL COMMENT '任务ID',
  `user_id` bigint(20) unsigned NOT NULL COMMENT '用户ID',
  `openid` varchar(100) NOT NULL COMMENT '用户OpenID',
  `type` varchar(20) NOT NULL COMMENT '任务类型：fitting, photography, travel',
  `status` varchar(20) NOT NULL DEFAULT 'pending' COMMENT '状态：pending, processing, completed, failed',
  `priority` int(11) NOT NULL DEFAULT '0' COMMENT '优先级：数字越大优先级越高',
  `params` json DEFAULT NULL COMMENT '任务参数',
  `result` json DEFAULT NULL COMMENT '任务结果',
  `error` text COMMENT '错误信息',
  `retry_count` int(11) NOT NULL DEFAULT '0' COMMENT '重试次数',
  `max_retry` int(11) NOT NULL DEFAULT '3' COMMENT '最大重试次数',
  `started_at` datetime DEFAULT NULL COMMENT '开始处理时间',
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
-- 4. 场景表
-- ----------------------------
DROP TABLE IF EXISTS `scenes`;
CREATE TABLE `scenes` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `scene_id` varchar(50) NOT NULL COMMENT '场景唯一标识',
  `name` varchar(100) NOT NULL COMMENT '场景名称',
  `category` varchar(50) DEFAULT NULL COMMENT '分类：indoor-室内 outdoor-户外 studio-影棚',
  `type` varchar(20) NOT NULL COMMENT '适用类型：fitting, photography, travel',
  `description` text COMMENT '场景描述',
  `thumbnail_url` varchar(500) DEFAULT NULL COMMENT '缩略图URL',
  `cover_url` varchar(500) DEFAULT NULL COMMENT '封面图URL',
  `prompt_template` text COMMENT '提示词模板',
  `parameters` json DEFAULT NULL COMMENT '默认参数',
  `tags` json DEFAULT NULL COMMENT '标签数组',
  `is_active` tinyint(4) NOT NULL DEFAULT '1' COMMENT '是否启用：0-禁用 1-启用',
  `sort_order` int(11) NOT NULL DEFAULT '0' COMMENT '排序（数字越大越靠前）',
  `use_count` int(11) NOT NULL DEFAULT '0' COMMENT '使用次数',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_scene_id` (`scene_id`),
  KEY `idx_type_active` (`type`, `is_active`),
  KEY `idx_sort_order` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='场景表';

-- ----------------------------
-- 5. 订单表
-- ----------------------------
DROP TABLE IF EXISTS `orders`;
CREATE TABLE `orders` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `order_no` varchar(50) NOT NULL COMMENT '订单号',
  `user_id` bigint(20) unsigned NOT NULL COMMENT '用户ID',
  `openid` varchar(100) NOT NULL COMMENT '用户OpenID',
  `type` varchar(20) NOT NULL COMMENT '订单类型：recharge-充值 vip-会员',
  `amount` decimal(10,2) NOT NULL COMMENT '订单金额（元）',
  `credits` int(11) NOT NULL DEFAULT '0' COMMENT '积分数量',
  `status` varchar(20) NOT NULL DEFAULT 'pending' COMMENT '状态：pending-待支付 paid-已支付 refunded-已退款 cancelled-已取消',
  `payment_method` varchar(20) DEFAULT NULL COMMENT '支付方式：wechat-微信支付 alipay-支付宝',
  `transaction_id` varchar(100) DEFAULT NULL COMMENT '第三方交易ID',
  `paid_at` datetime DEFAULT NULL COMMENT '支付时间',
  `refund_reason` varchar(500) DEFAULT NULL COMMENT '退款原因',
  `refunded_at` datetime DEFAULT NULL COMMENT '退款时间',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_order_no` (`order_no`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单表';

-- ----------------------------
-- 6. 积分记录表
-- ----------------------------
DROP TABLE IF EXISTS `credit_records`;
CREATE TABLE `credit_records` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL COMMENT '用户ID',
  `openid` varchar(100) NOT NULL COMMENT '用户OpenID',
  `type` varchar(20) NOT NULL COMMENT '类型：recharge-充值 consume-消费 refund-退款 gift-赠送',
  `amount` int(11) NOT NULL COMMENT '积分数量（正数为增加，负数为减少）',
  `balance_after` int(11) NOT NULL COMMENT '操作后余额',
  `description` varchar(500) DEFAULT NULL COMMENT '描述',
  `order_id` bigint(20) DEFAULT NULL COMMENT '关联订单ID',
  `work_id` bigint(20) DEFAULT NULL COMMENT '关联作品ID',
  `task_id` varchar(100) DEFAULT NULL COMMENT '关联任务ID',
  `operator_id` bigint(20) DEFAULT NULL COMMENT '操作人ID（管理员赠送时）',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_openid` (`openid`),
  KEY `idx_type` (`type`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='积分记录表';

-- ----------------------------
-- 7. 提示词模板表
-- ----------------------------
DROP TABLE IF EXISTS `prompt_templates`;
CREATE TABLE `prompt_templates` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL COMMENT '模板名称',
  `type` varchar(20) NOT NULL COMMENT '类型：fitting, photography, travel',
  `category` varchar(50) DEFAULT NULL COMMENT '分类',
  `template` text NOT NULL COMMENT '提示词模板（支持变量占位符）',
  `variables` json DEFAULT NULL COMMENT '变量说明',
  `default_params` json DEFAULT NULL COMMENT '默认参数',
  `priority` int(11) NOT NULL DEFAULT '0' COMMENT '优先级（数字越大越优先）',
  `is_active` tinyint(4) NOT NULL DEFAULT '1' COMMENT '是否启用：0-禁用 1-启用',
  `use_count` int(11) NOT NULL DEFAULT '0' COMMENT '使用次数',
  `created_by` bigint(20) DEFAULT NULL COMMENT '创建人ID',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_type_active` (`type`, `is_active`),
  KEY `idx_priority` (`priority`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='提示词模板表';

-- ----------------------------
-- 8. AI模型配置表
-- ----------------------------
DROP TABLE IF EXISTS `aimodels`;
CREATE TABLE `aimodels` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL COMMENT '模型名称',
  `model_name` varchar(100) NOT NULL COMMENT '模型标识（调用时使用）',
  `provider` varchar(50) NOT NULL COMMENT '提供商：gemini, openai, stability, etc',
  `api_url` varchar(500) NOT NULL COMMENT 'API地址',
  `api_key` varchar(200) NOT NULL COMMENT 'API密钥',
  `api_format` varchar(50) NOT NULL COMMENT 'API格式：openai_compatible, google_official',
  `model_type` varchar(50) NOT NULL COMMENT '模型类型：text-to-image, image-to-image',
  `capabilities` json DEFAULT NULL COMMENT '能力列表',
  `max_resolution` varchar(20) DEFAULT NULL COMMENT '最大分辨率',
  `cost_per_image` decimal(10,4) DEFAULT NULL COMMENT '每张图成本',
  `priority` int(11) NOT NULL DEFAULT '0' COMMENT '优先级',
  `is_active` tinyint(4) NOT NULL DEFAULT '1' COMMENT '是否启用',
  `status` varchar(20) NOT NULL DEFAULT 'online' COMMENT '状态：online-在线 offline-离线',
  `use_count` int(11) NOT NULL DEFAULT '0' COMMENT '使用次数',
  `success_count` int(11) NOT NULL DEFAULT '0' COMMENT '成功次数',
  `fail_count` int(11) NOT NULL DEFAULT '0' COMMENT '失败次数',
  `avg_response_time` int(11) DEFAULT NULL COMMENT '平均响应时间（毫秒）',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_provider` (`provider`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_priority` (`priority`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI模型配置表';

-- ----------------------------
-- 9. 系统配置表
-- ----------------------------
DROP TABLE IF EXISTS `system_config`;
CREATE TABLE `system_config` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `config_key` varchar(100) NOT NULL COMMENT '配置键',
  `config_value` text COMMENT '配置值',
  `config_type` varchar(20) NOT NULL DEFAULT 'string' COMMENT '配置类型：string, number, boolean, json',
  `description` varchar(500) DEFAULT NULL COMMENT '描述',
  `is_public` tinyint(4) NOT NULL DEFAULT '0' COMMENT '是否公开：0-否 1-是',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_config_key` (`config_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统配置表';

-- ----------------------------
-- 10. 管理员表
-- ----------------------------
DROP TABLE IF EXISTS `admins`;
CREATE TABLE `admins` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL COMMENT '用户名',
  `password` varchar(200) NOT NULL COMMENT '密码（bcrypt加密）',
  `nickname` varchar(100) DEFAULT NULL COMMENT '昵称',
  `email` varchar(100) DEFAULT NULL COMMENT '邮箱',
  `role` varchar(20) NOT NULL DEFAULT 'admin' COMMENT '角色：super-超级管理员 admin-管理员',
  `status` tinyint(4) NOT NULL DEFAULT '1' COMMENT '状态：0-禁用 1-正常',
  `last_login_at` datetime DEFAULT NULL COMMENT '最后登录时间',
  `last_login_ip` varchar(50) DEFAULT NULL COMMENT '最后登录IP',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='管理员表';

-- ----------------------------
-- 初始化数据
-- ----------------------------

-- 插入默认管理员（用户名：admin 密码：admin123）
INSERT INTO `admins` (`username`, `password`, `nickname`, `role`) VALUES
('admin', '$2b$10$YourHashedPasswordHere', '超级管理员', 'super');

-- 插入系统配置
INSERT INTO `system_config` (`config_key`, `config_value`, `config_type`, `description`, `is_public`) VALUES
('site_name', 'AI摄影师', 'string', '网站名称', 1),
('default_credits', '10', 'number', '新用户默认积分', 0),
('max_upload_size', '10', 'number', '最大上传文件大小（MB）', 0),
('max_batch_count', '10', 'number', '最大批量生成数量', 0);

-- 插入默认场景
INSERT INTO `scenes` (`scene_id`, `name`, `category`, `type`, `description`, `is_active`, `sort_order`) VALUES
('paris-street', '巴黎街头', 'outdoor', 'photography', '浪漫的巴黎街景，埃菲尔铁塔背景', 1, 100),
('studio-simple', '简约影棚', 'studio', 'fitting', '纯色背景影棚，适合试衣展示', 1, 90),
('beach-sunset', '海滩日落', 'outdoor', 'travel', '海滩日落美景，度假氛围', 1, 80);

SET FOREIGN_KEY_CHECKS = 1;

-- 完成
SELECT 'Database initialization completed!' AS message;
