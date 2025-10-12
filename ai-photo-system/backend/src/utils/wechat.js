const axios = require('axios');
const { cacheHelper } = require('../config/redis');

// 微信API配置
const WECHAT_API = {
  CODE2SESSION: 'https://api.weixin.qq.com/sns/jscode2session',
  GET_ACCESS_TOKEN: 'https://api.weixin.qq.com/cgi-bin/token',
  SEND_TEMPLATE_MESSAGE: 'https://api.weixin.qq.com/cgi-bin/message/wxopen/template/send'
};

// 获取AccessToken（带缓存）
async function getAccessToken() {
  const cacheKey = 'wechat:access_token';

  // 尝试从缓存获取
  const cached = await cacheHelper.get(cacheKey);
  if (cached) {
    return cached;
  }

  // 从微信API获取
  try {
    const response = await axios.get(WECHAT_API.GET_ACCESS_TOKEN, {
      params: {
        grant_type: 'client_credential',
        appid: process.env.WECHAT_APP_ID,
        secret: process.env.WECHAT_APP_SECRET
      }
    });

    if (response.data.access_token) {
      const accessToken = response.data.access_token;
      const expiresIn = response.data.expires_in || 7200;

      // 缓存（提前5分钟过期）
      await cacheHelper.set(cacheKey, accessToken, expiresIn - 300);

      return accessToken;
    } else {
      throw new Error(`获取AccessToken失败: ${response.data.errmsg}`);
    }
  } catch (error) {
    console.error('❌ 获取AccessToken失败:', error.message);
    throw error;
  }
}

// 登录凭证校验
async function code2Session(code) {
  try {
    const response = await axios.get(WECHAT_API.CODE2SESSION, {
      params: {
        appid: process.env.WECHAT_APP_ID,
        secret: process.env.WECHAT_APP_SECRET,
        js_code: code,
        grant_type: 'authorization_code'
      }
    });

    if (response.data.openid) {
      return {
        openid: response.data.openid,
        session_key: response.data.session_key,
        unionid: response.data.unionid
      };
    } else {
      throw new Error(`登录失败: ${response.data.errmsg || '未知错误'}`);
    }
  } catch (error) {
    console.error('❌ code2Session失败:', error.message);
    throw error;
  }
}

// 发送模板消息
async function sendTemplateMessage(openid, templateId, data, page = '') {
  try {
    const accessToken = await getAccessToken();

    const response = await axios.post(
      `${WECHAT_API.SEND_TEMPLATE_MESSAGE}?access_token=${accessToken}`,
      {
        touser: openid,
        template_id: templateId,
        page: page,
        data: data
      }
    );

    if (response.data.errcode === 0) {
      return true;
    } else {
      throw new Error(`发送模板消息失败: ${response.data.errmsg}`);
    }
  } catch (error) {
    console.error('❌ 发送模板消息失败:', error.message);
    return false;
  }
}

// 生成带参数的小程序码（需要先申请接口权限）
async function getWXACodeUnlimit(scene, page = 'pages/index/index') {
  try {
    const accessToken = await getAccessToken();

    const response = await axios.post(
      `https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=${accessToken}`,
      {
        scene: scene,
        page: page,
        width: 280,
        auto_color: false,
        line_color: { r: 0, g: 0, b: 0 }
      },
      {
        responseType: 'arraybuffer'
      }
    );

    // 返回Buffer
    return Buffer.from(response.data);
  } catch (error) {
    console.error('❌ 生成小程序码失败:', error.message);
    throw error;
  }
}

module.exports = {
  getAccessToken,
  code2Session,
  sendTemplateMessage,
  getWXACodeUnlimit
};
