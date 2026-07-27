import { useEffect, useRef } from 'react';
import { notification, Progress } from 'antd';
import { CloudSyncOutlined, CheckCircleOutlined, ReloadOutlined, ApiOutlined } from '@ant-design/icons';
import api from '../api/client';

const BACKEND_VERSION_KEY = 'lexpro_backend_version';
const CHECK_INTERVAL = 5 * 60 * 1000; // 5 دقائق

export function UpdateNotification() {
  const notifiedRef = useRef<Set<string>>(new Set());

  // كشف تحديثات الباك إند
  useEffect(() => {
    let cancelled = false;

    const checkBackendVersion = async () => {
      try {
        const res = await api.get('/version');
        const serverVersion = res.data?.data?.version;
        if (!serverVersion || cancelled) return;

        const storedVersion = localStorage.getItem(BACKEND_VERSION_KEY);
        if (storedVersion && storedVersion !== serverVersion) {
          notification.info({
            key: 'backend-update',
            message: 'تم تحديث الخادم',
            description: 'تم تحديث الباك إند إلى إصدار جديد. يُنصح بإعادة تشغيل التطبيق لضمان عمل كل الميزات.',
            icon: <ApiOutlined style={{ color: '#2980b9' }} />,
            placement: 'bottomRight',
            duration: 0,
          });
        }
        localStorage.setItem(BACKEND_VERSION_KEY, serverVersion);
      } catch {
        // تجاهل الأخطاء
      }
    };

    checkBackendVersion();
    const interval = setInterval(checkBackendVersion, CHECK_INTERVAL);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // كشف تحديثات التطبيق (Electron)

  useEffect(() => {
    if (!window.electronAPI?.onUpdateStatus) return;

    const unsubscribe = window.electronAPI.onUpdateStatus((status) => {
      switch (status.event) {
        case 'update-available':
          if (notifiedRef.current.has('update-available')) return;
          notifiedRef.current.add('update-available');
          notification.info({
            key: 'update-available',
            message: 'يتوفر تحديث جديد',
            description: status.version
              ? `الإصدار ${status.version} — جاري التنزيل تلقائياً...`
              : 'جاري تنزيل التحديث تلقائياً...',
            icon: <CloudSyncOutlined style={{ color: '#C9A227' }} />,
            placement: 'bottomRight',
            duration: 5,
          });
          break;

        case 'download-progress':
          notification.open({
            key: 'download-progress',
            message: 'جاري تنزيل التحديث',
            description: (
              <Progress
                percent={Math.round(status.percent || 0)}
                size="small"
                status="active"
                strokeColor="#C9A227"
              />
            ),
            icon: <CloudSyncOutlined style={{ color: '#C9A227' }} />,
            placement: 'bottomRight',
            duration: 0,
          });
          break;

        case 'update-downloaded':
          notification.destroy('download-progress');
          notification.destroy('update-available');
          notification.success({
            key: 'update-downloaded',
            message: 'التحديث جاهز للتثبيت',
            description: status.version
              ? `الإصدار ${status.version} — اضغط للتثبيت وإعادة التشغيل`
              : 'اضغط للتثبيت وإعادة التشغيل',
            icon: <CheckCircleOutlined style={{ color: '#27ae60' }} />,
            placement: 'bottomRight',
            duration: 0,
            btn: (
              <a
                onClick={() => {
                  window.electronAPI?.installUpdate();
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  color: '#27ae60',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <ReloadOutlined />
                تثبيت وإعادة التشغيل
              </a>
            ),
          });
          break;

        case 'error':
          notification.destroy('download-progress');
          notification.error({
            key: 'update-error',
            message: 'تعذر تحديث التطبيق',
            description: status.message || 'حدث خطأ غير متوقع',
            placement: 'bottomRight',
            duration: 5,
          });
          break;
      }
    });

    return unsubscribe;
  }, []);

  return null;
}
