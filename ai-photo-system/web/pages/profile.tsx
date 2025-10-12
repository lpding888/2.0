import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useUserStore } from '../lib/store';
import { creditsAPI } from '../lib/api';
import { toast } from 'react-hot-toast';

interface CreditRecord {
  record_id: number;
  user_id: number;
  type: 'purchase' | 'deduct' | 'refund' | 'gift';
  amount: number;
  balance_after: number;
  related_type?: string;
  related_id?: string;
  description?: string;
  created_at: string;
}

interface CreditPackage {
  package_id: string;
  package_name: string;
  credits: number;
  price: number;
  original_price?: number;
  description?: string;
  is_popular: boolean;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, setUser, logout } = useUserStore();

  const [activeTab, setActiveTab] = useState<'info' | 'credits' | 'records'>('info');
  const [creditRecords, setCreditRecords] = useState<CreditRecord[]>([]);
  const [creditPackages, setCreditPackages] = useState<CreditPackage[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // 检查登录
  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  // 加载积分记录
  useEffect(() => {
    if (user && activeTab === 'records') {
      loadCreditRecords();
    }
  }, [user, activeTab, currentPage]);

  // 加载积分套餐
  useEffect(() => {
    if (user && activeTab === 'credits') {
      loadCreditPackages();
    }
  }, [user, activeTab]);

  const loadCreditRecords = async () => {
    setLoading(true);
    try {
      const response = await creditsAPI.getRecords({ page: currentPage, pageSize: 20 });
      if (response.success) {
        setCreditRecords(response.data.records);
        setTotalPages(response.data.pagination.totalPages);
      }
    } catch (error) {
      toast.error('加载记录失败');
    } finally {
      setLoading(false);
    }
  };

  const loadCreditPackages = async () => {
    try {
      const response = await creditsAPI.getPackages();
      if (response.success) {
        setCreditPackages(response.data.packages);
      }
    } catch (error) {
      toast.error('加载套餐失败');
    }
  };

  const handlePurchase = async (packageId: string) => {
    try {
      toast.loading('正在创建订单...', { id: 'purchase' });
      const response = await creditsAPI.purchase(packageId);

      if (response.success) {
        const { order_no, payment_url } = response.data;
        toast.success('订单创建成功', { id: 'purchase' });

        // 实际应用中，这里应该跳转到支付页面
        // window.location.href = payment_url;
        toast('演示环境：模拟支付成功', { icon: '💰' });

        // 刷新用户信息
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    } catch (error: any) {
      toast.error(error.message || '购买失败', { id: 'purchase' });
    }
  };

  const handleLogout = () => {
    if (confirm('确定要退出登录吗？')) {
      logout();
      router.push('/');
    }
  };

  const getRecordTypeLabel = (type: string) => {
    const labels: Record<string, { text: string; color: string }> = {
      purchase: { text: '充值', color: 'text-green-600' },
      deduct: { text: '消费', color: 'text-red-600' },
      refund: { text: '退款', color: 'text-blue-600' },
      gift: { text: '赠送', color: 'text-purple-600' }
    };
    return labels[type] || { text: type, color: 'text-gray-600' };
  };

  const getRoleBadge = (role: string) => {
    const configs: Record<string, { label: string; class: string }> = {
      user: { label: '普通用户', class: 'bg-gray-100 text-gray-800' },
      vip: { label: 'VIP用户', class: 'bg-yellow-100 text-yellow-800' },
      admin: { label: '管理员', class: 'bg-red-100 text-red-800' }
    };
    const config = configs[role] || configs.user;
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${config.class}`}>
        {config.label}
      </span>
    );
  };

  if (!user) {
    return null;
  }

  return (
    <>
      <Head>
        <title>个人中心 - AI摄影系统</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* 顶部导航 */}
        <nav className="bg-white shadow-sm sticky top-0 z-50">
          <div className="container-custom py-4">
            <div className="flex justify-between items-center">
              <Link href="/" className="flex items-center space-x-2">
                <span className="text-2xl">📸</span>
                <span className="text-xl font-bold text-gray-800">AI摄影系统</span>
              </Link>

              <div className="flex items-center space-x-4">
                <Link href="/studio" className="text-gray-600 hover:text-gray-900">
                  创作工作室
                </Link>
                <Link href="/works" className="text-gray-600 hover:text-gray-900">
                  我的作品
                </Link>
              </div>
            </div>
          </div>
        </nav>

        <div className="container-custom py-8">
          <div className="grid lg:grid-cols-4 gap-6">
            {/* 左侧：用户信息卡片 */}
            <div className="lg:col-span-1">
              <div className="card text-center">
                {/* 头像 */}
                <div className="w-24 h-24 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-full mx-auto mb-4 flex items-center justify-center text-white text-3xl font-bold">
                  {user.nickname ? user.nickname.charAt(0).toUpperCase() : 'U'}
                </div>

                {/* 昵称 */}
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  {user.nickname || '未命名'}
                </h2>

                {/* 角色 */}
                <div className="mb-4">
                  {getRoleBadge(user.role)}
                </div>

                {/* 积分 */}
                <div className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg p-4 mb-4">
                  <div className="text-sm opacity-90 mb-1">当前积分</div>
                  <div className="text-3xl font-bold">{user.credits}</div>
                </div>

                {/* 快捷操作 */}
                <div className="space-y-2">
                  <button
                    onClick={() => setActiveTab('credits')}
                    className="w-full btn btn-primary"
                  >
                    充值积分
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full btn btn-outline text-red-600 border-red-600 hover:bg-red-50"
                  >
                    退出登录
                  </button>
                </div>

                {/* 注册时间 */}
                <div className="mt-6 pt-6 border-t text-xs text-gray-500">
                  注册时间: {new Date(user.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>

            {/* 右侧：详细信息 */}
            <div className="lg:col-span-3">
              {/* 标签切换 */}
              <div className="card mb-6">
                <div className="flex border-b border-gray-200">
                  <button
                    onClick={() => setActiveTab('info')}
                    className={`px-6 py-3 font-medium transition-colors ${
                      activeTab === 'info'
                        ? 'text-purple-600 border-b-2 border-purple-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    基本信息
                  </button>
                  <button
                    onClick={() => setActiveTab('credits')}
                    className={`px-6 py-3 font-medium transition-colors ${
                      activeTab === 'credits'
                        ? 'text-purple-600 border-b-2 border-purple-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    积分充值
                  </button>
                  <button
                    onClick={() => setActiveTab('records')}
                    className={`px-6 py-3 font-medium transition-colors ${
                      activeTab === 'records'
                        ? 'text-purple-600 border-b-2 border-purple-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    消费记录
                  </button>
                </div>
              </div>

              {/* 基本信息 */}
              {activeTab === 'info' && (
                <div className="card">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">基本信息</h3>

                  <div className="space-y-4">
                    <div className="flex py-3 border-b border-gray-100">
                      <div className="w-32 text-gray-600">用户ID:</div>
                      <div className="flex-1 text-gray-900">{user.user_id}</div>
                    </div>
                    <div className="flex py-3 border-b border-gray-100">
                      <div className="w-32 text-gray-600">昵称:</div>
                      <div className="flex-1 text-gray-900">{user.nickname || '-'}</div>
                    </div>
                    <div className="flex py-3 border-b border-gray-100">
                      <div className="w-32 text-gray-600">OpenID:</div>
                      <div className="flex-1 text-gray-900 font-mono text-sm">{user.openid}</div>
                    </div>
                    <div className="flex py-3 border-b border-gray-100">
                      <div className="w-32 text-gray-600">账户角色:</div>
                      <div className="flex-1">{getRoleBadge(user.role)}</div>
                    </div>
                    <div className="flex py-3 border-b border-gray-100">
                      <div className="w-32 text-gray-600">账户状态:</div>
                      <div className="flex-1">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {user.status === 'active' ? '正常' : '已禁用'}
                        </span>
                      </div>
                    </div>
                    <div className="flex py-3 border-b border-gray-100">
                      <div className="w-32 text-gray-600">当前积分:</div>
                      <div className="flex-1 text-purple-600 font-bold text-lg">{user.credits}</div>
                    </div>
                    <div className="flex py-3">
                      <div className="w-32 text-gray-600">注册时间:</div>
                      <div className="flex-1 text-gray-900">
                        {new Date(user.created_at).toLocaleString('zh-CN')}
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">💡 使用提示</h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      <li>• 每次生成消耗1积分</li>
                      <li>• 批量生成按实际生成数量计费</li>
                      <li>• 生成失败会自动退款</li>
                      <li>• 首次注册赠送10积分体验额度</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* 积分充值 */}
              {activeTab === 'credits' && (
                <div>
                  <div className="mb-6">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">积分套餐</h3>
                    <p className="text-gray-600">选择合适的套餐，享受更多创作乐趣</p>
                  </div>

                  <div className="grid md:grid-cols-3 gap-6">
                    {creditPackages.length === 0 ? (
                      <div className="col-span-3 text-center py-12 text-gray-500">
                        暂无套餐
                      </div>
                    ) : (
                      creditPackages.map(pkg => (
                        <div
                          key={pkg.package_id}
                          className={`card relative ${
                            pkg.is_popular ? 'border-2 border-purple-500' : ''
                          }`}
                        >
                          {pkg.is_popular && (
                            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                              <span className="bg-purple-500 text-white text-xs px-3 py-1 rounded-full">
                                🔥 热门
                              </span>
                            </div>
                          )}

                          <div className="text-center">
                            <h4 className="text-xl font-bold text-gray-900 mb-2">
                              {pkg.package_name}
                            </h4>
                            <div className="text-4xl font-bold text-purple-600 mb-1">
                              {pkg.credits}
                            </div>
                            <div className="text-sm text-gray-600 mb-4">积分</div>

                            <div className="mb-4">
                              <span className="text-3xl font-bold text-gray-900">
                                ¥{pkg.price}
                              </span>
                              {pkg.original_price && (
                                <span className="ml-2 text-sm text-gray-500 line-through">
                                  ¥{pkg.original_price}
                                </span>
                              )}
                            </div>

                            {pkg.description && (
                              <p className="text-sm text-gray-600 mb-4">{pkg.description}</p>
                            )}

                            <button
                              onClick={() => handlePurchase(pkg.package_id)}
                              className={`w-full btn ${
                                pkg.is_popular ? 'btn-primary' : 'btn-outline'
                              }`}
                            >
                              立即购买
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="mt-8 p-6 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-4">支付说明</h4>
                    <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-700">
                      <div>
                        <div className="font-medium mb-2">✓ 支持支付方式</div>
                        <ul className="space-y-1 ml-4">
                          <li>• 微信支付</li>
                          <li>• 支付宝</li>
                        </ul>
                      </div>
                      <div>
                        <div className="font-medium mb-2">✓ 购买须知</div>
                        <ul className="space-y-1 ml-4">
                          <li>• 积分永久有效</li>
                          <li>• 支付后即时到账</li>
                          <li>• 不支持退款</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 消费记录 */}
              {activeTab === 'records' && (
                <div className="card">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">消费记录</h3>

                  {loading ? (
                    <div className="text-center py-12">
                      <div className="spinner mx-auto mb-4"></div>
                      <p className="text-gray-600">加载中...</p>
                    </div>
                  ) : creditRecords.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      暂无记录
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">时间</th>
                              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">类型</th>
                              <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">变动</th>
                              <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">余额</th>
                              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">说明</th>
                            </tr>
                          </thead>
                          <tbody>
                            {creditRecords.map(record => {
                              const typeInfo = getRecordTypeLabel(record.type);
                              return (
                                <tr key={record.record_id} className="border-b border-gray-100 hover:bg-gray-50">
                                  <td className="py-3 px-4 text-sm text-gray-600">
                                    {new Date(record.created_at).toLocaleString('zh-CN')}
                                  </td>
                                  <td className="py-3 px-4">
                                    <span className={`text-sm font-medium ${typeInfo.color}`}>
                                      {typeInfo.text}
                                    </span>
                                  </td>
                                  <td className={`py-3 px-4 text-right font-medium ${
                                    record.amount > 0 ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    {record.amount > 0 ? '+' : ''}{record.amount}
                                  </td>
                                  <td className="py-3 px-4 text-right text-gray-900">
                                    {record.balance_after}
                                  </td>
                                  <td className="py-3 px-4 text-sm text-gray-600">
                                    {record.description || '-'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* 分页 */}
                      {totalPages > 1 && (
                        <div className="flex justify-center items-center space-x-4 mt-6 pt-6 border-t">
                          <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="btn btn-outline disabled:opacity-50"
                          >
                            上一页
                          </button>
                          <span className="text-gray-600">
                            第 {currentPage} / {totalPages} 页
                          </span>
                          <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="btn btn-outline disabled:opacity-50"
                          >
                            下一页
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
