// AI摄影小程序专用 Gemini API 代理
// 支持图片生成、编辑、多模态等功能

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);

  // 处理 CORS 预检请求
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: getCorsHeaders(),
    });
  }

  // 主要 API 路由
  if (url.pathname.startsWith('/v1/chat/completions')) {
    return handleChatCompletions(request);
  }

  // 健康检查端点
  if (url.pathname === '/health') {
    return new Response(JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0-ai-photography'
    }), {
      headers: { ...getCorsHeaders(), 'Content-Type': 'application/json' }
    });
  }

  // 使用说明页面
  return new Response(getUsageInfo(url.origin), {
    headers: { ...getCorsHeaders(), 'Content-Type': 'text/html; charset=utf-8' }
  });
}

async function handleChatCompletions(request) {
  try {
    const startTime = Date.now();

    // 验证请求方法
    if (request.method !== 'POST') {
      return errorResponse('Method not allowed', 405);
    }

    // 获取并验证 API Key
    const apiKey = extractApiKey(request);
    if (!apiKey) {
      return errorResponse('Missing or invalid Authorization header', 401);
    }

    // 解析请求体
    const requestBody = await request.json();
    console.log('📥 请求模型:', requestBody.model);
    console.log('📥 消息数量:', requestBody.messages?.length || 0);

    // 转换为 Gemini 格式
    const geminiRequest = convertToGeminiFormat(requestBody);
    console.log('🔄 Gemini parts数量:', geminiRequest.contents[0]?.parts?.length || 0);

    // 调用 Gemini API
    const geminiResponse = await callGeminiAPI(apiKey, geminiRequest);

    // 转换响应格式
    const openaiResponse = convertToOpenAIFormat(geminiResponse, startTime);
    console.log('📤 返回内容长度:', openaiResponse.choices[0]?.message?.content?.length || 0);

    return new Response(JSON.stringify(openaiResponse), {
      headers: { ...getCorsHeaders(), 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ 处理请求失败:', error);
    return errorResponse(`Internal Error: ${error.message}`, 500);
  }
}

function extractApiKey(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

function convertToGeminiFormat(openaiRequest) {
  const parts = [];

  // 处理消息内容
  if (openaiRequest.messages && openaiRequest.messages.length > 0) {
    const lastMessage = openaiRequest.messages[openaiRequest.messages.length - 1];

    if (Array.isArray(lastMessage.content)) {
      // 多模态内容（文字+图片）
      for (const content of lastMessage.content) {
        if (content.type === 'text') {
          parts.push({ text: content.text });
        } else if (content.type === 'image_url') {
          const imageUrl = content.image_url.url;

          if (imageUrl.startsWith('data:image/')) {
            // Base64 图片
            const matches = imageUrl.match(/^data:image\/([^;]+);base64,(.+)$/);
            if (matches) {
              parts.push({
                inline_data: {
                  mime_type: `image/${matches[1]}`,
                  data: matches[2]
                }
              });
              console.log(`✅ 图片${matches[1]}:${Math.round(matches[2].length/1000)}KB`);
            }
          } else {
            console.warn('⚠️ 检测到远程图片URL，建议预处理为base64格式');
            parts.push({ text: `[参考图片: ${imageUrl}]` });
          }
        }
      }
    } else if (typeof lastMessage.content === 'string') {
      // 纯文本内容
      parts.push({ text: lastMessage.content });
    }
  }

  // 如果没有内容，添加默认提示
  if (parts.length === 0) {
    parts.push({ text: "请生成一张高质量的图片" });
  }

  // 根据请求类型选择合适的配置
  const isImageGeneration = parts.some(part =>
    part.text && (
      part.text.includes('生成') ||
      part.text.includes('画') ||
      part.text.includes('图片') ||
      part.text.includes('create') ||
      part.text.includes('generate')
    )
  );

  const config = {
    contents: [{ parts: parts }],
    generationConfig: {
      temperature: 0.8,
      topP: 0.95,
      topK: 40
    }
  };

  // 如果是图片生成，添加图片模态配置
  if (isImageGeneration || parts.length > 1) {
    config.generationConfig.responseModalities = ["TEXT", "IMAGE"];
  }

  return config;
}

async function callGeminiAPI(apiKey, geminiRequest) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(geminiRequest),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('🚨 Gemini API错误:', errorText);

    let errorMessage = 'Gemini API调用失败';
    if (response.status === 401) {
      errorMessage = 'API密钥无效，请检查您的Gemini API Key';
    } else if (response.status === 429) {
      errorMessage = 'API调用频率限制，请稍后重试';
    } else if (response.status === 400) {
      errorMessage = '请求参数错误，请检查输入内容';
    }

    throw new Error(`${errorMessage} (${response.status}): ${errorText}`);
  }

  return await response.json();
}

function convertToOpenAIFormat(geminiResponse, startTime) {
  try {
    const choices = [];
    const processingTime = Date.now() - startTime;

    console.log('🔍 候选数量:', geminiResponse.candidates?.length || 0);

    if (geminiResponse.candidates && geminiResponse.candidates.length > 0) {
      const candidate = geminiResponse.candidates[0];
      let content = '';
      let imageCount = 0;

      console.log('🔍 Parts数量:', candidate.content?.parts?.length || 0);

      if (candidate.content && candidate.content.parts) {
        for (let i = 0; i < candidate.content.parts.length; i++) {
          const part = candidate.content.parts[i];

          if (part.text) {
            content += part.text;
            console.log(`📝 P${i}:文本${part.text.length}字符`);
          } else if (part.inlineData || part.inline_data) {
            // 处理生成的图片 - 兼容两种字段名
            const imageData = part.inlineData || part.inline_data;
            const mimeType = imageData.mimeType || imageData.mime_type;
            const data = imageData.data;
            const dataUrl = `data:${mimeType};base64,${data}`;

            imageCount++;
            content += `![AI生成图片 ${imageCount}](${dataUrl})\n`;

            console.log(`🖼️ P${i}:图片${mimeType}${Math.round(data.length * 0.75 / 1024)}KB`);
          } else {
            console.log(`⚠️ P${i}:未知${Object.keys(part).join(',')}`);
          }
        }
      } else {
        console.log('❌ 没有找到parts');
      }

      // 如果没有文本但有图片，添加友好的描述
      if (!content.trim() && imageCount > 0) {
        content = `✨ 已为您生成 ${imageCount} 张AI图片\n\n`;
        // 重新添加图片（这里需要重新处理parts）
        for (let i = 0; i < candidate.content.parts.length; i++) {
          const part = candidate.content.parts[i];
          if (part.inlineData || part.inline_data) {
            const imageData = part.inlineData || part.inline_data;
            const mimeType = imageData.mimeType || imageData.mime_type;
            const dataUrl = `data:${mimeType};base64,${imageData.data}`;
            content += `![AI生成图片 ${i+1}](${dataUrl})\n`;
          }
        }
      }

      choices.push({
        index: 0,
        message: {
          role: 'assistant',
          content: content || '抱歉，生成失败，请尝试调整您的描述。'
        },
        finish_reason: 'stop'
      });

      console.log(`⚡ 完成:${processingTime}ms,图片:${imageCount}张`);

    } else {
      // 处理无候选结果的情况
      console.warn('⚠️ Gemini没有返回候选结果');
      choices.push({
        index: 0,
        message: {
          role: 'assistant',
          content: '抱歉，无法生成内容。请尝试:\n• 调整描述更加具体\n• 检查输入是否包含敏感内容\n• 稍后重试'
        },
        finish_reason: 'content_filter'
      });
    }

    return {
      id: `chatcmpl-${Date.now()}-ai-photo`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: 'gemini-2.5-flash-image',
      choices: choices,
      usage: estimateUsage(geminiResponse),
      // 添加自定义元数据
      metadata: {
        processing_time_ms: processingTime,
        provider: 'gemini-via-cloudflare',
        version: '1.0.0'
      }
    };

  } catch (error) {
    console.error('❌ 转换响应格式失败:', error);
    return {
      id: `chatcmpl-${Date.now()}-error`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: 'gemini-2.5-flash-image',
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: '响应处理失败，请重试。如果问题持续存在，请联系技术支持。'
        },
        finish_reason: 'error'
      }],
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
    };
  }
}

function estimateUsage(geminiResponse) {
  try {
    let promptTokens = 0;
    let completionTokens = 0;

    // 简单的token估算
    if (geminiResponse.usageMetadata) {
      promptTokens = geminiResponse.usageMetadata.promptTokenCount || 0;
      completionTokens = geminiResponse.usageMetadata.candidatesTokenCount || 0;
    } else {
      // 如果没有使用数据，进行粗略估算
      const responseText = JSON.stringify(geminiResponse);
      const estimatedTokens = Math.ceil(responseText.length / 4);
      promptTokens = Math.floor(estimatedTokens * 0.3);
      completionTokens = Math.floor(estimatedTokens * 0.7);
    }

    return {
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: promptTokens + completionTokens
    };
  } catch {
    return { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
  }
}

function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400',
  };
}

function errorResponse(message, status = 400) {
  return new Response(JSON.stringify({
    error: {
      message: message,
      type: 'api_error',
      code: status
    }
  }), {
    status: status,
    headers: { ...getCorsHeaders(), 'Content-Type': 'application/json' }
  });
}

function getUsageInfo(origin) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI摄影小程序 - Gemini API 代理</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
               max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px; }
        .section { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        code { background: #e9ecef; padding: 2px 6px; border-radius: 4px; font-family: 'Monaco', 'Consolas', monospace; }
        .status { color: #28a745; font-weight: bold; }
        .endpoint { background: #343a40; color: #f8f9fa; padding: 10px; border-radius: 5px; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎨 AI摄影小程序 Gemini API 代理</h1>
        <p>状态: <span class="status">✅ 运行正常</span></p>
    </div>

    <div class="section">
        <h2>📡 API 端点</h2>
        <div class="endpoint">POST ${origin}/v1/chat/completions</div>
        <p>兼容 OpenAI ChatGPT API 格式，支持多模态输入</p>
    </div>

    <div class="section">
        <h2>🌟 主要功能</h2>
        <ul>
            <li>✨ <strong>AI图片生成</strong> - 文字转图片，支持各种风格</li>
            <li>🎨 <strong>图片编辑</strong> - 基于自然语言的图片修改</li>
            <li>🖼️ <strong>多模态输入</strong> - 同时支持文字和图片输入</li>
            <li>🔄 <strong>格式转换</strong> - 自动转换 OpenAI ↔ Gemini 格式</li>
            <li>⚡ <strong>高性能</strong> - Cloudflare CDN 全球加速</li>
        </ul>
    </div>

    <div class="section">
        <h2>🔧 使用方法</h2>
        <p>在请求头中添加你的 Gemini API Key:</p>
        <code>Authorization: Bearer YOUR_GEMINI_API_KEY</code>

        <p>请求体格式与 OpenAI API 相同:</p>
        <pre><code>{
  "model": "gemini-2.5-flash-image",
  "messages": [
    {
      "role": "user",
      "content": "画一只可爱的小猫"
    }
  ]
}</code></pre>
    </div>

    <div class="section">
        <h2>📋 健康检查</h2>
        <p>访问 <code>${origin}/health</code> 查看服务状态</p>
    </div>

    <div class="section">
        <h2>💡 技术支持</h2>
        <p>本服务专为AI摄影小程序优化，支持:</p>
        <ul>
            <li>Gemini 2.5 Flash Image 模型</li>
            <li>Base64 图片处理</li>
            <li>智能错误处理</li>
            <li>详细日志记录</li>
        </ul>
    </div>
</body>
</html>`;
}