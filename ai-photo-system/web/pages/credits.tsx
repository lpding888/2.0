import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Header from '../components/Header';
import { useUserStore } from '../lib/store';
import { creditsAPI } from '../lib/api';
import { toast } from 'react-hot-toast';
import { FiCreditCard, FiDollarSign, FiGift, FiTrendingUp, FiClock } from 'react-icons/fi';

interface Package {
  id: string;
  name: string;
  credits: number;
  price: number;
  bonus: number;
  popular?: boolean;
  icon: string;
}

interface CreditRecord {
  id: string;
  type: 'recharge' | 'consume' | 'bonus';
  amount: number;
  balance: number;
  description: string;
  created_at: string;
}

export default function CreditsPage() {
  const router = useRouter();
  const { user, updateCredits } = useUserStore();
  const [packages, setPackages] = useState<Package[]>([]);
  const [records, setRecords] = useState<CreditRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [recordsLoading, setRecordsLoading] = useState(false);

  // 充值套餐
  const defaultPackages: Package[] = [
    {
      id: 'basic',
      name: '基础套餐',
      credits: 100,
      price: 9.9,
      bonus: 0,
      icon: '🌟'
    },
    {
      id: 'standard',
      name: '标准套餐',
      credits: 500,
      price: 49.9,
      bonus: 50,
      icon: '💎'
    },
    {
      id: 'premium',
      name: '豪华套餐',
      credits: 1000,
      price: 89.9,
      bonus: 200,
      popular: true,
      icon: '👑'
    },
    {
      id: 'ultimate',
      name: '至尊套餐',
      credits: 3000,
      price: 199.9,
      bonus: 800,
      icon: '🎖️'
    },
  ];

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    setPackages(defaultPackages);
    loadRecords();
  }, [user, router]);

  const loadRecords = async () => {
    setRecordsLoading(true);
    try {
      const response = await creditsAPI.getRecords({ page: 1, pageSize: 20 });
      if (response.success) {
        setRecords(response.data.records);
      }
    } catch (error) {
      console.error('加载积分记录失败:', error);
    } finally {
      setRecordsLoading(false);
    }
  };

  const handleRecharge = async (pkg: Package) => {
    setLoading(true);
    try {
      toast.loading('正在创建订单...', { id: 'recharge' });

      // TODO: 调用支付API
      // const response = await paymentAPI.createOrder({
      //   package_id: pkg.id,
      //   amount: pkg.price
      // });

      // 模拟支付成功
      await new Promise(resolve => setTimeout(resolve, 1500));

      const totalCredits = pkg.credits + pkg.bonus;
      updateCredits(user!.credits + totalCredits);

      toast.success(`充值成功！获得 ${totalCredits} 积分`, { id: 'recharge' });
      loadRecords();
    } catch (error: any) {
      toast.error(error.message || '充值失败，请重试', { id: 'recharge' });
    } finally {
      setLoading(false);
    }
  };

  const getRecordIcon = (type: string) => {
    switch (type) {
      case 'recharge':
        return '💰';
      case 'consume':
        return '📸';
      case 'bonus':
        return '🎁';
      default:
        return '📝';
    }
  };

  const getRecordColor = (type: string) => {
    switch (type) {
      case 'recharge':
      case 'bonus':
        return 'text-green-600';
      case 'consume':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  if (!user) {
    return null;
  }

  return (
    <>
      <Head>
        <title>积分中心 - AI摄影系统</title>
      </Head>

      <div className="min-h-screen bg-beige">
        <Header />

        <div className="container-custom py-8">
          {/* 积分概览 */}
          <div className="mb-8">
            <div className="relative bg-gradient-primary rounded-3xl p-8 text-white overflow-hidden">
              {/* 装饰元素 */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-24 -translate-x-24"></div>

              <div className="relative z-10">
                <div className="flex items-center space-x-3 mb-4">
                  <FiCreditCard className="w-8 h-8" />
                  <h2 className="text-2xl font-bold">我的积分</h2>
                </div>
                <div className="flex items-baseline space-x-2 mb-6">
                  <span className="text-6xl font-bold">{user.credits || 0}</span>
                  <span className="text-xl opacity-80">积分</span>
                </div>
                <div className="flex items-center space-x-6 text-sm opacity-90">
                  <div className="flex items-center space-x-2">
                    <FiTrendingUp className="w-4 h-4" />
                    <span>1 积分 = 1 次AI生成</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <FiGift className="w-4 h-4" />
                    <span>首充双倍奖励</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* 充值套餐 */}
            <div className="lg:col-span-2">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">充值套餐</h3>
              <div className="grid sm:grid-cols-2 gap-6">
                {packages.map((pkg) => (
                  <div
                    key={pkg.id}
                    className={`relative card-hover ${
                      pkg.popular ? 'ring-2 ring-secondary' : ''
                    }`}
                  >
                    {/* 推荐标签 */}
                    {pkg.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-secondary text-white text-sm font-semibold rounded-full shadow-secondary">
                        🔥 最受欢迎
                      </div>
                    )}

                    <div className="text-center">
                      {/* 图标 */}
                      <div className="text-5xl mb-4">{pkg.icon}</div>

                      {/* 套餐名称 */}
                      <h4 className="text-xl font-bold text-gray-900 mb-2">{pkg.name}</h4>

                      {/* 积分数量 */}
                      <div className="mb-4">
                        <div className="flex items-baseline justify-center space-x-2">
                          <span className="text-4xl font-bold text-gradient-primary">
                            {pkg.credits}
                          </span>
                          <span className="text-lg text-gray-600">积分</span>
                        </div>
                        {pkg.bonus > 0 && (
                          <div className="flex items-center justify-center space-x-1 mt-2">
                            <FiGift className="w-4 h-4 text-secondary" />
                            <span className="text-sm text-secondary font-semibold">
                              额外赠送 {pkg.bonus} 积分
                            </span>
                          </div>
                        )}
                      </div>

                      {/* 价格 */}
                      <div className="mb-6">
                        <div className="flex items-baseline justify-center space-x-1">
                          <span className="text-sm text-gray-600">¥</span>
                          <span className="text-3xl font-bold text-gray-900">{pkg.price}</span>
                        </div>
                        {pkg.bonus > 0 && (
                          <div className="text-xs text-gray-500 mt-1">
                            实得 {pkg.credits + pkg.bonus} 积分
                          </div>
                        )}
                      </div>

                      {/* 按钮 */}
                      <button
                        onClick={() => handleRecharge(pkg)}
                        disabled={loading}
                        className={`w-full ${
                          pkg.popular ? 'btn-secondary' : 'btn-primary'
                        }`}
                      >
                        {loading ? (
                          <>
                            <span className="spinner mr-2"></span>
                            处理中...
                          </>
                        ) : (
                          <>
                            <FiDollarSign className="inline mr-1" />
                            立即充值
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* 说明 */}
              <div className="mt-8 p-6 bg-blue-50 rounded-2xl">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <span className="text-xl mr-2">💡</span>
                  使用说明
                </h4>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>1 积分可进行 1 次AI图片生成</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>积分永久有效，不会过期</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>充值成功后积分立即到账</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>支持微信支付、支付宝支付</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* 消费记录 */}
            <div className="lg:col-span-1">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <FiClock className="mr-2" />
                消费记录
              </h3>

              {recordsLoading ? (
                <div className="card text-center py-12">
                  <div className="spinner-primary mx-auto mb-4"></div>
                  <p className="text-gray-500">加载中...</p>
                </div>
              ) : records.length === 0 ? (
                <div className="card text-center py-12">
                  <div className="text-6xl mb-4">📝</div>
                  <p className="text-gray-500">暂无消费记录</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {records.map((record) => (
                    <div
                      key={record.id}
                      className="card hover:shadow-md transition-shadow duration-300"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <div className="text-2xl">{getRecordIcon(record.type)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 truncate">
                              {record.description}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {new Date(record.created_at).toLocaleString('zh-CN')}
                            </div>
                          </div>
                        </div>
                        <div className="text-right ml-3">
                          <div className={`text-lg font-bold ${getRecordColor(record.type)}`}>
                            {record.amount > 0 ? '+' : ''}{record.amount}
                          </div>
                          <div className="text-xs text-gray-500">
                            余额: {record.balance}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
