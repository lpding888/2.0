import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { useUserStore } from '../lib/store';

export default function HomePage() {
  const router = useRouter();
  const { user } = useUserStore();
  const [stats, setStats] = useState({ users: 0, works: 0, scenes: 0 });

  useEffect(() => {
    // 加载统计数据
    setStats({ users: 50000, works: 120000, scenes: 50 });
  }, []);

  const features = [
    {
      icon: '👗',
      title: 'AI试衣间',
      description: '上传服装照片，AI自动将服装穿到您的身上，一键生成多款穿搭效果',
      color: 'from-pink-500 to-rose-500'
    },
    {
      icon: '📸',
      title: 'AI摄影师',
      description: '选择场景模板，AI为您生成专业级摄影作品，支持各类风格',
      color: 'from-purple-500 to-indigo-500'
    },
    {
      icon: '✈️',
      title: '全球旅行',
      description: '无需出门，AI带您游遍全球，生成逼真的旅行打卡照片',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: '⚡',
      title: '批量生成',
      description: '一次上传10-50张照片，批量生成，大幅提升创作效率',
      color: 'from-yellow-500 to-orange-500'
    }
  ];

  const examples = [
    { url: '/examples/fitting-1.jpg', type: 'AI试衣间' },
    { url: '/examples/photo-1.jpg', type: 'AI摄影' },
    { url: '/examples/travel-1.jpg', type: '全球旅行' },
    { url: '/examples/fitting-2.jpg', type: 'AI试衣间' },
    { url: '/examples/photo-2.jpg', type: 'AI摄影' },
    { url: '/examples/travel-2.jpg', type: '全球旅行' }
  ];

  return (
    <>
      <Head>
        <title>AI摄影系统 - 专业的AI图像生成平台</title>
        <meta name="description" content="AI试衣间、AI摄影师、全球旅行，一站式AI图像生成服务" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {/* 导航栏 */}
        <nav className="bg-white shadow-sm sticky top-0 z-50">
          <div className="container-custom py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <span className="text-2xl">📸</span>
                <span className="text-xl font-bold text-gray-800">AI摄影系统</span>
              </div>
              <div className="flex items-center space-x-4">
                <Link href="/studio" className="text-gray-600 hover:text-gray-900">
                  创作工作室
                </Link>
                <Link href="/works" className="text-gray-600 hover:text-gray-900">
                  我的作品
                </Link>
                {user ? (
                  <Link href="/profile" className="btn btn-primary">
                    {user.nickname || '个人中心'}
                  </Link>
                ) : (
                  <Link href="/login" className="btn btn-primary">
                    登录
                  </Link>
                )}
              </div>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="py-20 px-4">
          <div className="container-custom text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              AI摄影，让创作更简单
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              专业的AI图像生成平台，支持试衣间、摄影、旅行等多种场景
              <br />
              批量处理，一键生成，效率提升10倍
            </p>
            <div className="flex justify-center space-x-4">
              <Link href="/studio" className="btn btn-primary text-lg px-8 py-3">
                立即开始创作 →
              </Link>
              <Link href="#examples" className="btn btn-outline text-lg px-8 py-3">
                查看示例
              </Link>
            </div>

            {/* 统计数据 */}
            <div className="grid grid-cols-3 gap-8 mt-16 max-w-3xl mx-auto">
              <div className="text-center">
                <div className="text-4xl font-bold text-purple-600">{stats.users.toLocaleString()}+</div>
                <div className="text-gray-600 mt-2">用户数量</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-purple-600">{stats.works.toLocaleString()}+</div>
                <div className="text-gray-600 mt-2">生成作品</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-purple-600">{stats.scenes}+</div>
                <div className="text-gray-600 mt-2">场景模板</div>
              </div>
            </div>
          </div>
        </section>

        {/* 功能特性 */}
        <section className="py-20 px-4 bg-white">
          <div className="container-custom">
            <h2 className="text-4xl font-bold text-center text-gray-900 mb-4">
              强大的AI功能
            </h2>
            <p className="text-center text-gray-600 mb-12">
              多种场景，满足您的各种创作需求
            </p>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => (
                <div key={index} className="card hover:shadow-xl transition-shadow">
                  <div className={`w-16 h-16 rounded-full bg-gradient-to-r ${feature.color} flex items-center justify-center text-3xl mb-4`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 作品示例 */}
        <section id="examples" className="py-20 px-4">
          <div className="container-custom">
            <h2 className="text-4xl font-bold text-center text-gray-900 mb-4">
              AI生成作品展示
            </h2>
            <p className="text-center text-gray-600 mb-12">
              看看其他用户的精彩创作
            </p>

            <div className="image-grid">
              {examples.map((example, index) => (
                <div key={index} className="relative group overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-shadow">
                  <div className="w-full h-64 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                    <span className="text-gray-400 text-sm">示例图片 {index + 1}</span>
                  </div>
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center">
                    <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity font-semibold">
                      {example.type}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center mt-12">
              <Link href="/studio" className="btn btn-primary text-lg px-8 py-3">
                我也要创作 →
              </Link>
            </div>
          </div>
        </section>

        {/* 使用流程 */}
        <section className="py-20 px-4 bg-white">
          <div className="container-custom">
            <h2 className="text-4xl font-bold text-center text-gray-900 mb-12">
              简单三步，开启创作
            </h2>

            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-purple-600">1</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">上传照片</h3>
                <p className="text-gray-600">选择您的照片，支持批量上传10-50张</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-purple-600">2</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">选择场景</h3>
                <p className="text-gray-600">从50+场景模板中选择您喜欢的风格</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-purple-600">3</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">一键生成</h3>
                <p className="text-gray-600">AI快速处理，实时查看生成进度</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4 bg-gradient-to-r from-purple-600 to-indigo-600">
          <div className="container-custom text-center">
            <h2 className="text-4xl font-bold text-white mb-4">
              准备好开始创作了吗？
            </h2>
            <p className="text-xl text-purple-100 mb-8">
              立即注册，免费获得10积分体验额度
            </p>
            <Link href={user ? "/studio" : "/login"} className="btn bg-white text-purple-600 hover:bg-gray-100 text-lg px-8 py-3 inline-block">
              {user ? "进入工作室" : "立即注册"} →
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-900 text-gray-400 py-12 px-4">
          <div className="container-custom">
            <div className="grid md:grid-cols-4 gap-8">
              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <span className="text-2xl">📸</span>
                  <span className="text-lg font-bold text-white">AI摄影系统</span>
                </div>
                <p className="text-sm">专业的AI图像生成平台</p>
              </div>

              <div>
                <h4 className="text-white font-semibold mb-4">产品</h4>
                <ul className="space-y-2 text-sm">
                  <li><Link href="/studio">创作工作室</Link></li>
                  <li><Link href="/works">我的作品</Link></li>
                  <li><Link href="/profile">个人中心</Link></li>
                </ul>
              </div>

              <div>
                <h4 className="text-white font-semibold mb-4">支持</h4>
                <ul className="space-y-2 text-sm">
                  <li><a href="#">使用教程</a></li>
                  <li><a href="#">常见问题</a></li>
                  <li><a href="#">联系客服</a></li>
                </ul>
              </div>

              <div>
                <h4 className="text-white font-semibold mb-4">关于</h4>
                <ul className="space-y-2 text-sm">
                  <li><a href="#">关于我们</a></li>
                  <li><a href="#">隐私政策</a></li>
                  <li><a href="#">服务条款</a></li>
                </ul>
              </div>
            </div>

            <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
              <p>© 2024 AI摄影系统. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
