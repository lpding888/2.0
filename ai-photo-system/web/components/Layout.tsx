import { ReactNode, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useUserStore } from '../lib/store';

interface LayoutProps {
  children: ReactNode;
  title?: string;
  showNav?: boolean;
  showFooter?: boolean;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
}

export default function Layout({
  children,
  title,
  showNav = true,
  showFooter = true,
  maxWidth = 'xl',
  className = ''
}: LayoutProps) {
  const router = useRouter();
  const { user, logout } = useUserStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // 关闭移动菜单
  useEffect(() => {
    setMobileMenuOpen(false);
    setUserMenuOpen(false);
  }, [router.pathname]);

  const handleLogout = () => {
    if (confirm('确定要退出登录吗？')) {
      logout();
      router.push('/');
    }
  };

  const isActive = (path: string) => {
    return router.pathname === path;
  };

  const maxWidthClass = {
    sm: 'max-w-screen-sm',
    md: 'max-w-screen-md',
    lg: 'max-w-screen-lg',
    xl: 'max-w-screen-xl',
    full: 'max-w-full'
  }[maxWidth];

  const navLinks = [
    { href: '/', label: '首页', icon: '🏠' },
    { href: '/studio', label: '创作工作室', icon: '🎨', requireAuth: true },
    { href: '/works', label: '我的作品', icon: '🖼️', requireAuth: true }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* 顶部导航 */}
      {showNav && (
        <nav className="bg-white shadow-sm sticky top-0 z-40">
          <div className={`${maxWidthClass} mx-auto px-4`}>
            <div className="flex justify-between items-center h-16">
              {/* Logo */}
              <Link href="/" className="flex items-center space-x-2">
                <span className="text-2xl">📸</span>
                <span className="text-xl font-bold text-gray-900 hidden sm:inline">
                  AI摄影系统
                </span>
              </Link>

              {/* 桌面端导航链接 */}
              <div className="hidden md:flex items-center space-x-1">
                {navLinks.map(link => {
                  if (link.requireAuth && !user) return null;

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive(link.href)
                          ? 'bg-purple-50 text-purple-600'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <span className="mr-1">{link.icon}</span>
                      {link.label}
                    </Link>
                  );
                })}
              </div>

              {/* 用户信息/登录按钮 */}
              <div className="flex items-center space-x-4">
                {user ? (
                  <>
                    {/* 积分显示 */}
                    <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 bg-purple-50 rounded-lg">
                      <span className="text-xs text-gray-600">积分:</span>
                      <span className="text-sm font-bold text-purple-600">{user.credits}</span>
                    </div>

                    {/* 用户菜单 */}
                    <div className="relative">
                      <button
                        onClick={() => setUserMenuOpen(!userMenuOpen)}
                        className="flex items-center space-x-2 hover:bg-gray-100 rounded-lg px-3 py-2 transition-colors"
                      >
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                          {user.nickname ? user.nickname.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <span className="text-sm text-gray-700 hidden sm:inline">
                          {user.nickname || '用户'}
                        </span>
                        <svg
                          className={`w-4 h-4 text-gray-500 transition-transform ${
                            userMenuOpen ? 'transform rotate-180' : ''
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {/* 下拉菜单 */}
                      {userMenuOpen && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 border border-gray-200">
                          <Link
                            href="/profile"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            👤 个人中心
                          </Link>
                          <Link
                            href="/works"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            🖼️ 我的作品
                          </Link>
                          <div className="border-t border-gray-200 my-1"></div>
                          <button
                            onClick={handleLogout}
                            className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                          >
                            🚪 退出登录
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <Link href="/login" className="btn btn-primary text-sm">
                    登录
                  </Link>
                )}

                {/* 移动端菜单按钮 */}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="md:hidden p-2 rounded-lg hover:bg-gray-100"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {mobileMenuOpen ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    )}
                  </svg>
                </button>
              </div>
            </div>

            {/* 移动端导航菜单 */}
            {mobileMenuOpen && (
              <div className="md:hidden border-t border-gray-200 py-4">
                {user && (
                  <div className="px-4 py-2 bg-purple-50 rounded-lg mb-2">
                    <div className="text-xs text-gray-600">当前积分</div>
                    <div className="text-lg font-bold text-purple-600">{user.credits}</div>
                  </div>
                )}
                {navLinks.map(link => {
                  if (link.requireAuth && !user) return null;

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`block px-4 py-3 rounded-lg text-sm font-medium ${
                        isActive(link.href)
                          ? 'bg-purple-50 text-purple-600'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <span className="mr-2">{link.icon}</span>
                      {link.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </nav>
      )}

      {/* 页面标题（可选） */}
      {title && (
        <div className="bg-white border-b border-gray-200">
          <div className={`${maxWidthClass} mx-auto px-4 py-6`}>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{title}</h1>
          </div>
        </div>
      )}

      {/* 主内容区域 */}
      <main className={`flex-1 ${className}`}>
        <div className={`${maxWidthClass} mx-auto px-4 py-6`}>
          {children}
        </div>
      </main>

      {/* 页脚 */}
      {showFooter && (
        <footer className="bg-gray-900 text-gray-400 mt-auto">
          <div className={`${maxWidthClass} mx-auto px-4 py-12`}>
            <div className="grid md:grid-cols-4 gap-8">
              {/* Logo和简介 */}
              <div className="md:col-span-1">
                <div className="flex items-center space-x-2 mb-4">
                  <span className="text-2xl">📸</span>
                  <span className="text-lg font-bold text-white">AI摄影系统</span>
                </div>
                <p className="text-sm">专业的AI图像生成平台</p>
              </div>

              {/* 产品链接 */}
              <div>
                <h4 className="text-white font-semibold mb-4">产品</h4>
                <ul className="space-y-2 text-sm">
                  <li><Link href="/studio" className="hover:text-white">创作工作室</Link></li>
                  <li><Link href="/works" className="hover:text-white">我的作品</Link></li>
                  <li><Link href="/profile" className="hover:text-white">个人中心</Link></li>
                </ul>
              </div>

              {/* 支持链接 */}
              <div>
                <h4 className="text-white font-semibold mb-4">支持</h4>
                <ul className="space-y-2 text-sm">
                  <li><a href="#" className="hover:text-white">使用教程</a></li>
                  <li><a href="#" className="hover:text-white">常见问题</a></li>
                  <li><a href="#" className="hover:text-white">联系客服</a></li>
                </ul>
              </div>

              {/* 关于链接 */}
              <div>
                <h4 className="text-white font-semibold mb-4">关于</h4>
                <ul className="space-y-2 text-sm">
                  <li><a href="#" className="hover:text-white">关于我们</a></li>
                  <li><a href="#" className="hover:text-white">隐私政策</a></li>
                  <li><a href="#" className="hover:text-white">服务条款</a></li>
                </ul>
              </div>
            </div>

            {/* 版权信息 */}
            <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
              <p>© 2024 AI摄影系统. All rights reserved.</p>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
