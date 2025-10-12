import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { authAPI } from '../lib/api';
import { useUserStore } from '../lib/store';
import { toast } from 'react-hot-toast';

export default function LoginPage() {
  const router = useRouter();
  const { setUser, setToken, user } = useUserStore();
  const [qrCode, setQrCode] = useState('');
  const [loginMethod, setLoginMethod] = useState<'wechat' | 'demo'>('wechat');
  const [checkInterval, setCheckInterval] = useState<NodeJS.Timeout | null>(null);

  // 如果已登录，重定向到工作室
  useEffect(() => {
    if (user) {
      router.push('/studio');
    }
  }, [user, router]);

  // 生成微信登录二维码
  const generateWeChatQRCode = async () => {
    try {
      // 这里应该调用后端API生成二维码
      // 暂时使用模拟数据
      const mockQRCode = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=wxlogin_${Date.now()}`;
      setQrCode(mockQRCode);

      // 开始轮询检查登录状态
      const interval = setInterval(async () => {
        // 这里应该调用后端API检查登录状态
        // 如果登录成功，清除定时器并跳转
      }, 2000);

      setCheckInterval(interval);

      // 5分钟后自动停止轮询
      setTimeout(() => {
        if (interval) {
          clearInterval(interval);
          toast.error('二维码已过期，请重新获取');
          setQrCode('');
        }
      }, 300000);
    } catch (error) {
      toast.error('生成二维码失败');
    }
  };

  // 演示登录（开发用）
  const handleDemoLogin = async () => {
    try {
      // 模拟登录，实际应该调用后端API
      const mockUser = {
        user_id: 1,
        openid: 'demo_user',
        nickname: '演示用户',
        avatar_url: '',
        credits: 100,
        role: 'user' as const,
        status: 'active' as const,
        created_at: new Date().toISOString()
      };

      const mockToken = 'demo_token_' + Date.now();

      setUser(mockUser);
      setToken(mockToken);

      toast.success('登录成功');
      router.push('/studio');
    } catch (error) {
      toast.error('登录失败');
    }
  };

  // 清理定时器
  useEffect(() => {
    return () => {
      if (checkInterval) {
        clearInterval(checkInterval);
      }
    };
  }, [checkInterval]);

  // 微信登录UI
  const renderWeChatLogin = () => (
    <div className="text-center">
      <div className="mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
          <svg className="w-10 h-10 text-green-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.478c-.019.07-.048.141-.048.213 0 .163.13.295.285.295a.775.775 0 0 0 .334-.107l1.663-.955a.59.59 0 0 1 .568-.013c.998.405 2.068.608 3.064.608 4.8 0 8.691-3.288 8.691-7.342 0-4.054-3.891-7.342-8.691-7.342zm-3.066 9.61a1.015 1.015 0 1 1 0-2.031 1.015 1.015 0 0 1 0 2.031zm6.132 0a1.015 1.015 0 1 1 0-2.031 1.015 1.015 0 0 1 0 2.031z"/>
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">微信扫码登录</h3>
        <p className="text-gray-600 text-sm">使用微信扫描下方二维码登录</p>
      </div>

      {qrCode ? (
        <div className="bg-white p-4 rounded-lg inline-block shadow-sm">
          <img src={qrCode} alt="微信登录二维码" className="w-48 h-48" />
          <div className="mt-4 flex items-center justify-center text-sm text-gray-500">
            <div className="spinner mr-2"></div>
            等待扫码...
          </div>
        </div>
      ) : (
        <button
          onClick={generateWeChatQRCode}
          className="btn btn-primary px-8"
        >
          获取登录二维码
        </button>
      )}

      {qrCode && (
        <div className="mt-4">
          <button
            onClick={() => {
              setQrCode('');
              if (checkInterval) clearInterval(checkInterval);
            }}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            重新获取二维码
          </button>
        </div>
      )}
    </div>
  );

  // 演示登录UI
  const renderDemoLogin = () => (
    <div className="text-center">
      <div className="mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
          <svg className="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">演示登录</h3>
        <p className="text-gray-600 text-sm mb-6">快速体验系统功能（开发测试用）</p>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-yellow-800">
          <strong>注意：</strong> 这是演示账号，数据会定期清理
        </p>
      </div>

      <button
        onClick={handleDemoLogin}
        className="btn btn-primary px-8"
      >
        使用演示账号登录
      </button>

      <div className="mt-6 space-y-2 text-sm text-gray-600">
        <p>• 初始积分：100</p>
        <p>• 可体验所有功能</p>
        <p>• 生成的作品会保存</p>
      </div>
    </div>
  );

  return (
    <>
      <Head>
        <title>登录 - AI摄影系统</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50 flex items-center justify-center p-4">
        {/* 返回首页 */}
        <Link href="/" className="absolute top-4 left-4 text-gray-600 hover:text-gray-900 flex items-center">
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          返回首页
        </Link>

        <div className="max-w-md w-full">
          {/* Logo */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center space-x-2">
              <span className="text-4xl">📸</span>
              <span className="text-2xl font-bold text-gray-900">AI摄影系统</span>
            </Link>
            <p className="text-gray-600 mt-2">登录开始创作之旅</p>
          </div>

          {/* 登录卡片 */}
          <div className="card">
            {/* 登录方式切换 */}
            <div className="flex border-b border-gray-200 mb-6">
              <button
                onClick={() => setLoginMethod('wechat')}
                className={`flex-1 py-3 text-center font-medium transition-colors ${
                  loginMethod === 'wechat'
                    ? 'text-purple-600 border-b-2 border-purple-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                微信登录
              </button>
              <button
                onClick={() => setLoginMethod('demo')}
                className={`flex-1 py-3 text-center font-medium transition-colors ${
                  loginMethod === 'demo'
                    ? 'text-purple-600 border-b-2 border-purple-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                演示登录
              </button>
            </div>

            {/* 登录内容 */}
            <div className="py-6">
              {loginMethod === 'wechat' ? renderWeChatLogin() : renderDemoLogin()}
            </div>
          </div>

          {/* 服务条款 */}
          <div className="text-center mt-6 text-xs text-gray-500">
            登录即表示您同意
            <a href="#" className="text-purple-600 hover:underline mx-1">服务条款</a>
            和
            <a href="#" className="text-purple-600 hover:underline mx-1">隐私政策</a>
          </div>

          {/* 功能预览 */}
          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl mb-2">👗</div>
              <div className="text-xs text-gray-600">AI试衣间</div>
            </div>
            <div>
              <div className="text-2xl mb-2">📸</div>
              <div className="text-xs text-gray-600">AI摄影</div>
            </div>
            <div>
              <div className="text-2xl mb-2">✈️</div>
              <div className="text-xs text-gray-600">全球旅行</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
