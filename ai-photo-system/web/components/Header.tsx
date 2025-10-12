import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useUserStore } from '../lib/store';
import { FiMenu, FiX, FiUser, FiLogOut, FiCreditCard } from 'react-icons/fi';

export default function Header() {
  const router = useRouter();
  const { user, logout } = useUserStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const navigation = [
    { name: '首页', href: '/', icon: '🏠' },
    { name: 'AI工作室', href: '/studio', icon: '🎨' },
    { name: '我的作品', href: '/works', icon: '📸' },
    { name: '积分中心', href: '/credits', icon: '💎' },
  ];

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-50 bg-white shadow-soft backdrop-blur-lg bg-white/95">
      <nav className="container-custom">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="text-3xl group-hover:scale-110 transition-transform duration-300">
              📸
            </div>
            <span className="text-xl font-bold text-gradient-primary hidden sm:block">
              AI摄影系统
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                  router.pathname === item.href
                    ? 'bg-gradient-primary text-white shadow-primary'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="mr-2">{item.icon}</span>
                {item.name}
              </Link>
            ))}
          </div>

          {/* User Menu */}
          {user ? (
            <div className="hidden md:flex items-center space-x-4">
              {/* Credits Badge */}
              <Link
                href="/credits"
                className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-secondary text-white shadow-secondary hover:scale-105 transition-transform duration-300"
              >
                <span className="text-lg">💎</span>
                <span className="font-semibold">{user.credits || 0}</span>
              </Link>

              {/* User Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-3 px-4 py-2 rounded-xl hover:bg-gray-100 transition-colors duration-300"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-white font-semibold">
                    {user.nickname?.charAt(0) || 'U'}
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {user.nickname || '用户'}
                  </span>
                </button>

                {/* Dropdown Menu */}
                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setUserMenuOpen(false)}
                    ></div>
                    <div className="dropdown-menu">
                      <Link
                        href="/profile"
                        className="dropdown-item"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <FiUser className="inline mr-2" />
                        个人中心
                      </Link>
                      <Link
                        href="/credits"
                        className="dropdown-item"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <FiCreditCard className="inline mr-2" />
                        积分充值
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="dropdown-item w-full text-left text-red-600"
                      >
                        <FiLogOut className="inline mr-2" />
                        退出登录
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <Link
              href="/login"
              className="hidden md:block btn-primary"
            >
              登录
            </Link>
          )}

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {mobileMenuOpen ? (
              <FiX className="w-6 h-6" />
            ) : (
              <FiMenu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200 animate-fade-in">
            <div className="flex flex-col space-y-2">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    router.pathname === item.href
                      ? 'bg-gradient-primary text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.name}
                </Link>
              ))}

              {user && (
                <>
                  <div className="border-t border-gray-200 my-2"></div>
                  <div className="px-4 py-2 flex items-center justify-between">
                    <span className="text-sm text-gray-600">我的积分</span>
                    <span className="px-3 py-1 rounded-full bg-gradient-secondary text-white font-semibold">
                      {user.credits || 0}
                    </span>
                  </div>
                  <Link
                    href="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-4 py-3 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100"
                  >
                    <FiUser className="inline mr-2" />
                    个人中心
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 text-left"
                  >
                    <FiLogOut className="inline mr-2" />
                    退出登录
                  </button>
                </>
              )}

              {!user && (
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="mx-4 btn-primary text-center"
                >
                  登录
                </Link>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
