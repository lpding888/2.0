// Next.js App入口
import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { useUserStore } from '@/lib/store';
import { wsManager } from '@/lib/websocket';
import '@/styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  const { token } = useUserStore();

  useEffect(() => {
    // 连接WebSocket
    if (token) {
      wsManager.connect(token);
    }

    // 清理
    return () => {
      wsManager.disconnect();
    };
  }, [token]);

  return (
    <>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#333',
            color: '#fff',
          },
          success: {
            iconTheme: {
              primary: '#50C878',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#E74C3C',
              secondary: '#fff',
            },
          },
        }}
      />
      <Component {...pageProps} />
    </>
  );
}
