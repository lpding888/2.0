const Joi = require('joi');

// 通用验证中间件
function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        message: '参数验证失败',
        errors
      });
    }

    req.validatedBody = value;
    next();
  };
}

// 用户登录验证
const loginSchema = Joi.object({
  code: Joi.string().required().messages({
    'string.empty': '登录凭证不能为空',
    'any.required': '登录凭证是必填项'
  }),
  userInfo: Joi.object({
    nickname: Joi.string().allow(''),
    avatar_url: Joi.string().uri().allow('')
  }).optional()
});

// 创建任务验证
const createTaskSchema = Joi.object({
  type: Joi.string().valid('fitting', 'photography', 'travel').required().messages({
    'any.only': '任务类型必须是 fitting, photography 或 travel',
    'any.required': '任务类型是必填项'
  }),
  batch_count: Joi.number().integer().min(1).max(50).default(1).messages({
    'number.min': '批量数量最少为1',
    'number.max': '批量数量最多为50'
  }),
  images: Joi.array().items(Joi.string()).min(1).required().messages({
    'array.min': '至少需要上传1张图片',
    'any.required': '图片是必填项'
  }),
  scene_id: Joi.string().optional(),
  parameters: Joi.object().optional(),
  custom_description: Joi.string().max(500).allow('').optional()
});

// 更新作品验证
const updateWorkSchema = Joi.object({
  is_favorite: Joi.boolean().optional(),
  is_public: Joi.boolean().optional(),
  tags: Joi.array().items(Joi.string()).optional()
});

// 充值验证
const rechargeSchema = Joi.object({
  package_id: Joi.string().required().messages({
    'any.required': '套餐ID是必填项'
  }),
  payment_method: Joi.string().valid('wechat', 'alipay').default('wechat')
});

// 管理员登录验证
const adminLoginSchema = Joi.object({
  username: Joi.string().min(3).max(50).required().messages({
    'string.min': '用户名至少3个字符',
    'string.max': '用户名最多50个字符',
    'any.required': '用户名是必填项'
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': '密码至少6个字符',
    'any.required': '密码是必填项'
  })
});

// 创建场景验证
const createSceneSchema = Joi.object({
  scene_name: Joi.string().max(100).required(),
  category: Joi.string().valid('indoor', 'outdoor', 'studio').required(),
  description: Joi.string().max(500).allow('').optional(),
  prompt_template: Joi.string().required(),
  cover_image: Joi.string().uri().optional(),
  parameters: Joi.object().optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  status: Joi.string().valid('active', 'inactive').default('active')
});

module.exports = {
  validate,
  loginSchema,
  createTaskSchema,
  updateWorkSchema,
  rechargeSchema,
  adminLoginSchema,
  createSceneSchema
};
