import { useState, useEffect, useRef, useCallback } from 'react';
import { Badge, Dropdown, List, Tag, Empty, Button } from 'antd';
import { BellOutlined, CheckOutlined } from '@ant-design/icons';
import { io as ioClient, Socket } from 'socket.io-client';
import { activityApi, SERVER_URL } from '../api/client';
import dayjs from 'dayjs';

const SOCKET_URL = SERVER_URL;

const actionColors: Record<string, string> = {
  create: 'green',
  update: 'blue',
  delete: 'red',
};

const actionLabels: Record<string, string> = {
  create: 'إضافة',
  update: 'تعديل',
  delete: 'حذف',
};

// إدارة AudioContext بشكل صحيح
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  } catch { return null; }
}

// فتح AudioContext عند أول تفاعل من المستخدم
function unlockAudio(): void {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume();
  }
}

function playNotificationSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // resume إذا كان معلقاً
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;

    // نغمتان قصيرتان
    [880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0, now + i * 0.15);
      gain.gain.linearRampToValueAtTime(0.3, now + i * 0.15 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.15 + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.15);
      osc.stop(now + i * 0.15 + 0.2);
    });
  } catch { /* ignore */ }
}

export function ActivityBell() {
  const [activities, setActivities] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const fetchActivities = useCallback(async () => {
    try {
      const res = await activityApi.getAll();
      setActivities(res.data.data || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchActivities();

    // فتح AudioContext عند أول تفاعل
    const unlock = () => { unlockAudio(); };
    document.addEventListener('click', unlock, { once: true });
    document.addEventListener('keydown', unlock, { once: true });

    // الاتصال بـ socket.io
    const socket = ioClient(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('📡 Socket.io متصل:', socket.id);
    });

    socket.on('connect_error', (err: any) => {
      console.warn('📡 Socket.io خطأ الاتصال:', err.message);
    });

    socket.on('newActivity', (activity: any) => {
      setActivities(prev => [activity, ...prev].slice(0, 50));
      setUnreadCount(prev => prev + 1);
      playNotificationSound();
    });

    return () => {
      socket.disconnect();
      document.removeEventListener('click', unlock);
      document.removeEventListener('keydown', unlock);
    };
  }, [fetchActivities]);

  const handleMarkRead = async () => {
    try {
      await activityApi.markRead();
      setUnreadCount(0);
    } catch { /* ignore */ }
  };

  const handleOpenChange = (visible: boolean) => {
    setOpen(visible);
    if (visible && unreadCount > 0) {
      setTimeout(handleMarkRead, 500);
    }
  };

  const dropdownContent = (
    <div style={{
      width: 360,
      maxHeight: 480,
      overflow: 'auto',
      background: '#fff',
      borderRadius: 10,
      boxShadow: '0 6px 24px rgba(0,0,0,0.12)',
      border: '1px solid #f0f0f0',
    }}>
      <div style={{
        padding: '10px 14px',
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#fafafa',
        borderRadius: '10px 10px 0 0',
      }}>
        <span style={{ fontWeight: 600, fontSize: 14, color: '#2c3e50' }}>الإشعارات</span>
        {unreadCount > 0 && (
          <Button type="link" size="small" icon={<CheckOutlined />} onClick={handleMarkRead}>
            تعليم الكل كمقروء
          </Button>
        )}
      </div>

      {activities.length === 0 ? (
        <div style={{ padding: 32 }}>
          <Empty description="لا توجد إشعارات" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </div>
      ) : (
        <List
          size="small"
          dataSource={activities.slice(0, 30)}
          renderItem={(item: any) => (
            <List.Item style={{ padding: '8px 14px', borderBottom: '1px solid #f5f5f5' }}>
              <div style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                  <Tag color={actionColors[item.action]} style={{ fontSize: 11, margin: 0 }}>
                    {actionLabels[item.action] || item.action}
                  </Tag>
                  <span style={{ fontSize: 11, color: '#bbb' }}>
                    {item.createdAt ? dayjs(item.createdAt).format('HH:mm') : ''}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: '#333', fontWeight: 500 }}>{item.description}</div>
                <div style={{ fontSize: 11, color: '#999' }}>
                  بواسطة {item.userName} · {item.moduleLabel}
                </div>
              </div>
            </List.Item>
          )}
        />
      )}
    </div>
  );

  return (
    <Dropdown
      dropdownRender={() => dropdownContent}
      trigger={['click']}
      open={open}
      onOpenChange={handleOpenChange}
      placement="bottomLeft"
    >
      <div style={{
        position: 'relative',
        cursor: 'pointer',
        padding: '6px',
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        transition: 'background 0.2s',
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
      >
        <Badge count={unreadCount} size="small" offset={[-2, 2]}>
          <BellOutlined style={{ fontSize: 18, color: '#2c3e50' }} />
        </Badge>
      </div>
    </Dropdown>
  );
}
