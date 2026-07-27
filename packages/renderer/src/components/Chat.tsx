import { useState, useEffect, useRef, useCallback } from 'react';
import { Drawer, Avatar, Badge, Input, Button, List, Spin, Empty, Tag } from 'antd';
import { MessageOutlined, ArrowRightOutlined, SendOutlined, UserOutlined } from '@ant-design/icons';
import { io as ioClient, Socket } from 'socket.io-client';
import { chatApi } from '../api/client';
import { useAuthStore } from '../store/auth';
import dayjs from 'dayjs';

const SOCKET_URL = 'http://localhost:3001';

const roleLabels: Record<string, string> = {
  admin: 'مدير',
  lawyer: 'محامي',
  secretary: 'سكرتير',
};

const roleColors: Record<string, string> = {
  admin: '#C9A227',
  lawyer: '#2980b9',
  secretary: '#27ae60',
};

// AudioContext مشترك
let chatAudioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext | null {
  try {
    if (!chatAudioCtx) {
      chatAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (chatAudioCtx.state === 'suspended') {
      chatAudioCtx.resume();
    }
    return chatAudioCtx;
  } catch { return null; }
}

function playMessageSound(): void {
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    const now = ctx.currentTime;
    // نغمتان متتاليتان
    [988, 1319].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0, now + i * 0.12);
      gain.gain.linearRampToValueAtTime(0.3, now + i * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.12 + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.25);
    });
  } catch { /* ignore */ }
}

interface ChatUser {
  _id: string;
  name: string;
  username: string;
  role: string;
  avatar?: string;
  online?: boolean;
}

export function Chat() {
  const { user } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [activeUser, setActiveUser] = useState<ChatUser | null>(null);
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [unreadChats, setUnreadChats] = useState(0);
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // refs للقيم المستخدمة في socket handlers (لتجنب إعادة إنشاء الاتصال)
  const activeUserRef = useRef<ChatUser | null>(null);
  const openRef = useRef(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await chatApi.getOnlineUsers();
      const all = res.data.data || [];
      setUsers(all.filter((u: ChatUser) => u._id !== user?.id));
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [user]);

  const loadMessages = useCallback(async (otherId: string) => {
    setLoadingMsgs(true);
    try {
      const res = await chatApi.getMessages(otherId);
      setMessages(res.data.data || []);
    } catch { /* ignore */ }
    finally { setLoadingMsgs(false); }
  }, []);

  // تحديث refs عند تغيير القيم
  useEffect(() => { activeUserRef.current = activeUser; }, [activeUser]);
  useEffect(() => { openRef.current = open; }, [open]);

  // إنشاء socket مرة واحدة فقط
  useEffect(() => {
    // فتح AudioContext عند أول تفاعل
    const unlock = () => { getAudioCtx(); };
    document.addEventListener('click', unlock, { once: true });
    document.addEventListener('keydown', unlock, { once: true });

    const socket = ioClient(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('💬 Chat socket متصل:', socket.id);
      if (user?.id) {
        socket.emit('userOnline', user.id);
      }
    });

    socket.on('connect_error', (err: any) => {
      console.warn('💬 Chat socket خطأ:', err.message);
    });

    socket.on('usersUpdate', () => {
      if (openRef.current) fetchUsers();
    });

    socket.on('newMessage', (msg: any) => {
      const senderId = msg.senderId?._id || msg.senderId?.toString() || msg.senderId;
      const activeUserVal = activeUserRef.current;

      if (activeUserVal && senderId === activeUserVal._id) {
        // الرسالة من المستخدم النشط — أضفها للمحادثة
        setMessages(prev => [...prev, msg]);
      } else {
        // رسالة من مستخدم آخر — إشعار + نغمة
        setUnreadChats(prev => prev + 1);
        playMessageSound();
      }
    });

    return () => {
      socket.disconnect();
      document.removeEventListener('click', unlock);
      document.removeEventListener('keydown', unlock);
    };
  }, [user, fetchUsers]);

  useEffect(() => {
    if (open) fetchUsers();
  }, [open, fetchUsers]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSelectUser = (u: ChatUser) => {
    setActiveUser(u);
    loadMessages(u._id);
  };

  const handleSend = async () => {
    if (!input.trim() || !activeUser) return;
    const text = input.trim();
    setInput('');
    try {
      const res = await chatApi.sendMessage(activeUser._id, text);
      setMessages(prev => [...prev, res.data.data]);
    } catch { /* ignore */ }
  };

  const handleBack = () => {
    setActiveUser(null);
    setMessages([]);
  };

  const handleOpen = (visible: boolean) => {
    setOpen(visible);
    if (visible) {
      setUnreadChats(0);
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <Badge count={unreadChats} size="small" offset={[-2, 2]}>
        <div
          onClick={() => handleOpen(!open)}
          style={{
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
          <MessageOutlined style={{ fontSize: 18, color: '#2c3e50' }} />
        </div>
      </Badge>

      <Drawer
        open={open}
        onClose={() => handleOpen(false)}
        placement="left"
        width={300}
        styles={{ body: { padding: 0 } }}
        title={
          activeUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Button type="text" icon={<ArrowRightOutlined />} onClick={handleBack} />
              <Avatar
                size={32}
                src={activeUser.avatar || undefined}
                icon={!activeUser.avatar && <UserOutlined />}
                style={{ background: roleColors[activeUser.role] || '#2c3e50' }}
              />
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{activeUser.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: activeUser.online ? '#52c41a' : '#ccc',
                    display: 'inline-block',
                  }} />
                  <span style={{ fontSize: 11, color: '#999' }}>
                    {activeUser.online ? 'نشط' : 'غير متصل'}
                  </span>
                </div>
              </div>
            </div>
          ) : 'المحادثات'
        }
      >
        {!activeUser ? (
          <div style={{ height: '100%', overflow: 'auto' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
            ) : users.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center' }}>
                <Empty description="لا يوجد مستخدمون آخرون" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              </div>
            ) : (
              <List
                dataSource={users}
                renderItem={(u: ChatUser) => (
                  <List.Item
                    onClick={() => handleSelectUser(u)}
                    style={{ padding: '10px 14px', cursor: 'pointer', transition: 'background 0.2s' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <List.Item.Meta
                      avatar={
                        <div style={{ position: 'relative' }}>
                          <Avatar
                            src={u.avatar || undefined}
                            icon={!u.avatar && <UserOutlined />}
                            style={{ background: roleColors[u.role] || '#2c3e50' }}
                          />
                          <span style={{
                            position: 'absolute',
                            bottom: 0, right: 0,
                            width: 10, height: 10,
                            borderRadius: '50%',
                            background: u.online ? '#52c41a' : '#ccc',
                            border: '2px solid #fff',
                          }} />
                        </div>
                      }
                      title={
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 14, fontWeight: 600 }}>{u.name}</span>
                          <Tag color={roleColors[u.role]} style={{ fontSize: 10, margin: 0 }}>
                            {roleLabels[u.role]}
                          </Tag>
                        </div>
                      }
                      description={
                        <span style={{ fontSize: 12, color: u.online ? '#52c41a' : '#999' }}>
                          {u.online ? '● نشط الآن' : 'غير متصل'}
                        </span>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* الرسائل */}
            <div style={{ flex: 1, overflow: 'auto', padding: '12px 14px', background: '#f0f2f5' }}>
              {loadingMsgs ? (
                <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#999', fontSize: 13 }}>
                  لا توجد رسائل بعد. ابدأ المحادثة!
                </div>
              ) : (
                messages.map((msg, i) => {
                  const senderId = msg.senderId?._id || msg.senderId?.toString() || msg.senderId;
                  const isMine = senderId === user?.id;
                  return (
                    <div key={i} style={{
                      display: 'flex',
                      justifyContent: isMine ? 'flex-start' : 'flex-end',
                      marginBottom: 8,
                    }}>
                      <div style={{
                        maxWidth: '75%',
                        background: isMine ? '#dcf8c6' : '#fff',
                        borderRadius: 10,
                        padding: '6px 12px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                      }}>
                        <div style={{ fontSize: 13, color: '#333' }}>{msg.text}</div>
                        <div style={{ fontSize: 10, color: '#999', textAlign: 'left', marginTop: 2 }}>
                          {msg.createdAt ? dayjs(msg.createdAt).format('HH:mm') : ''}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* إدخال الرسالة */}
            <div style={{ padding: '8px 12px', background: '#fff', borderTop: '1px solid #f0f0f0', display: 'flex', gap: 8 }}>
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onPressEnter={handleSend}
                placeholder="اكتب رسالة..."
                style={{ borderRadius: 20 }}
              />
              <Button
                type="primary"
                shape="circle"
                icon={<SendOutlined />}
                onClick={handleSend}
                disabled={!input.trim()}
                style={{ background: '#27ae60', borderColor: '#27ae60' }}
              />
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
