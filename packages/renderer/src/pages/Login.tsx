import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { authApi } from '../api/client';
import { useAuthStore } from '../store/auth';

export default function Login() {
  const navigate = useNavigate();
  const { setUser, setToken } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [userName, setUserName] = useState('');

  const handleSubmit = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      const res = await authApi.login(values.username, values.password);
      const { token, user } = res.data.data;
      setToken(token);
      setUser(user);
      setUserName(user.name);
      setSuccess(true);
      setTimeout(() => navigate('/'), 2400);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'حدث خطأ أثناء تسجيل الدخول';
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const particles = Array.from({ length: 12 }, (_, i) => {
    const angle = (i / 12) * Math.PI * 2;
    return {
      tx: `${Math.cos(angle) * 80}px`,
      ty: `${Math.sin(angle) * 80}px`,
      delay: `${i * 0.03}s`,
    };
  });

  return (
    <>
      <style>{`
        @keyframes lp-breathe {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.06); }
        }
        @keyframes lp-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes lp-glow-border {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
        @keyframes lp-pulse-ring {
          0% { transform: scale(0.95); opacity: 0.5; }
          50% { transform: scale(1.05); opacity: 0.2; }
          100% { transform: scale(0.95); opacity: 0.5; }
        }
        .lp-input .ant-input-affix-wrapper {
          transition: border-color 0.25s ease, background 0.25s ease, box-shadow 0.25s ease !important;
        }
        .lp-input:hover .ant-input-affix-wrapper {
          border-color: rgba(201,162,39,0.35) !important;
          background: rgba(255,255,255,0.05) !important;
        }
        .lp-input .ant-input-affix-wrapper-focused {
          border-color: #C9A227 !important;
          background: rgba(255,255,255,0.06) !important;
          box-shadow: 0 0 0 3px rgba(201,162,39,0.08) !important;
        }
        .lp-input .ant-input::placeholder,
        .lp-input .ant-input-affix-wrapper input::placeholder {
          color: rgba(232,232,232,0.25) !important;
        }
        .lp-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 12px;
          padding: 1px;
          background: linear-gradient(135deg, rgba(255,215,100,0.6), rgba(201,162,39,0.1));
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          opacity: 0;
          transition: opacity 0.3s;
        }
        .lp-btn:hover::before { opacity: 1; }
        .lp-btn:hover {
          box-shadow: 0 8px 30px rgba(201,162,39,0.4) !important;
          transform: translateY(-1px);
        }
        .lp-btn:active { transform: translateY(0); }

        @keyframes lp-success-overlay {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes lp-success-scale {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.15); opacity: 1; }
          70% { transform: scale(0.95); }
          85% { transform: scale(1.02); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes lp-success-ring {
          0% { transform: scale(0.5); opacity: 0.8; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        @keyframes lp-success-ring2 {
          0% { transform: scale(0.5); opacity: 0.6; }
          100% { transform: scale(3.5); opacity: 0; }
        }
        @keyframes lp-success-particle {
          0% { transform: translate(0, 0) scale(1); opacity: 1; }
          100% { transform: translate(var(--tx), var(--ty)) scale(0); opacity: 0; }
        }
        @keyframes lp-success-text {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes lp-success-sub {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 0.5; transform: translateY(0); }
        }
        @keyframes lp-success-check {
          0% { stroke-dashoffset: 100; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes lp-success-logo {
          0% { opacity: 0; transform: scale(0.5) rotate(-20deg); }
          100% { opacity: 0.15; transform: scale(1) rotate(0); }
        }
      `}</style>

      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#060b16',
        position: 'relative',
        overflow: 'hidden',
        padding: '20px 0',
      }}>
        {/* خلفية متدرجة */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: `
            radial-gradient(ellipse at 20% 30%, rgba(15,28,46,0.9) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 70%, rgba(20,35,57,0.8) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 100%, rgba(201,162,39,0.04) 0%, transparent 40%),
            #060b16
          `,
        }} />

        {/* شبكة نقطية */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(circle, rgba(201,162,39,0.06) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
          opacity: 0.4,
        }} />

        {/* توهج ذهبي علوي */}
        <div style={{
          position: 'absolute',
          top: '-200px',
          right: '-150px',
          width: 550,
          height: 550,
          background: 'radial-gradient(circle, rgba(201,162,39,0.08) 0%, transparent 60%)',
          borderRadius: '50%',
          animation: 'lp-breathe 6s ease-in-out infinite',
        }} />
        {/* توهج ذهبي سفلي */}
        <div style={{
          position: 'absolute',
          bottom: '-220px',
          left: '-180px',
          width: 600,
          height: 600,
          background: 'radial-gradient(circle, rgba(201,162,39,0.05) 0%, transparent 60%)',
          borderRadius: '50%',
          animation: 'lp-breathe 8s ease-in-out infinite 1s',
        }} />

        {/* خطوط زخرفية */}
        <div style={{
          position: 'absolute',
          top: '15%',
          left: 0,
          right: 0,
          height: 1,
          background: 'linear-gradient(90deg, transparent 10%, rgba(201,162,39,0.08) 50%, transparent 90%)',
        }} />
        <div style={{
          position: 'absolute',
          bottom: '15%',
          left: 0,
          right: 0,
          height: 1,
          background: 'linear-gradient(90deg, transparent 10%, rgba(201,162,39,0.06) 50%, transparent 90%)',
        }} />

        <div style={{
          width: '100%',
          maxWidth: 460,
          padding: '0 24px',
          position: 'relative',
          zIndex: 1,
        }}>
          {/* الشعار */}
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            {/* حلقة نبض */}
            <div style={{
              position: 'relative',
              display: 'inline-block',
              animation: 'lp-float 4s ease-in-out infinite',
            }}>
              <div style={{
                position: 'absolute',
                inset: -8,
                borderRadius: 28,
                border: '1px solid rgba(201,162,39,0.15)',
                animation: 'lp-pulse-ring 3s ease-in-out infinite',
              }} />
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 90,
                height: 90,
                borderRadius: 24,
                background: 'linear-gradient(145deg, rgba(15,28,46,0.95), rgba(6,11,22,0.95))',
                border: '1px solid rgba(201,162,39,0.18)',
                boxShadow: `
                  0 16px 48px rgba(0,0,0,0.6),
                  inset 0 1px 0 rgba(255,255,255,0.06),
                  0 0 30px rgba(201,162,39,0.08)
                `,
              }}>
                <svg viewBox="0 0 60 60" width="48" height="48" fill="none">
                  <circle cx="30" cy="30" r="26" stroke="#C9A227" strokeWidth="1.2" fill="none" opacity="0.4" />
                  <line x1="30" y1="12" x2="30" y2="48" stroke="#C9A227" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="30" cy="12" r="2.5" fill="#C9A227" />
                  <line x1="12" y1="20" x2="48" y2="20" stroke="#C9A227" strokeWidth="2" strokeLinecap="round" />
                  <line x1="12" y1="20" x2="8" y2="30" stroke="#C9A227" strokeWidth="1" strokeLinecap="round" />
                  <line x1="12" y1="20" x2="16" y2="30" stroke="#C9A227" strokeWidth="1" strokeLinecap="round" />
                  <path d="M6 30 Q12 40 18 30" stroke="#C9A227" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                  <line x1="48" y1="20" x2="44" y2="30" stroke="#C9A227" strokeWidth="1" strokeLinecap="round" />
                  <line x1="48" y1="20" x2="52" y2="30" stroke="#C9A227" strokeWidth="1" strokeLinecap="round" />
                  <path d="M42 30 Q48 40 54 30" stroke="#C9A227" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                  <line x1="22" y1="48" x2="38" y2="48" stroke="#C9A227" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
            </div>

            <h1 style={{
              color: '#C9A227',
              fontSize: 30,
              fontWeight: 700,
              fontFamily: 'Georgia, serif',
              margin: '16px 0 2px 0',
              letterSpacing: 3,
            }}>
              LEX <span style={{ color: '#E8E8E8' }}>PRO</span>
            </h1>
            <p style={{
              color: 'rgba(201,162,39,0.45)',
              fontSize: 10,
              letterSpacing: 5,
              margin: 0,
            }}>
              LEGAL MANAGEMENT
            </p>

            {/* فاصل ذهبي */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              marginTop: 10,
            }}>
              <div style={{ width: 32, height: 1, background: 'linear-gradient(90deg, transparent, rgba(201,162,39,0.4))' }} />
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#C9A227', opacity: 0.5 }} />
              <div style={{ width: 32, height: 1, background: 'linear-gradient(90deg, rgba(201,162,39,0.4), transparent)' }} />
            </div>
          </div>

          {/* بطاقة تسجيل الدخول */}
          <div style={{
            position: 'relative',
            background: 'linear-gradient(165deg, rgba(17,25,40,0.7) 0%, rgba(10,16,28,0.5) 100%)',
            borderRadius: 20,
            padding: '26px 28px',
            border: '1px solid rgba(255,255,255,0.06)',
            boxShadow: `
              0 30px 70px rgba(0,0,0,0.6),
              0 0 0 1px rgba(201,162,39,0.04),
              inset 0 1px 0 rgba(255,255,255,0.05)
            `,
            backdropFilter: 'blur(30px)',
          }}>
            {/* شريط علوي ذهبي */}
            <div style={{
              position: 'absolute',
              top: -1,
              left: '25%',
              right: '25%',
              height: 2,
              background: 'linear-gradient(90deg, transparent, rgba(201,162,39,0.5), transparent)',
              borderRadius: 2,
              animation: 'lp-glow-border 3s ease-in-out infinite',
            }} />

            <h2 style={{
              textAlign: 'center',
              color: '#E8E8E8',
              fontSize: 19,
              fontWeight: 600,
              marginBottom: 3,
            }}>
              تسجيل الدخول
            </h2>
            <p style={{
              textAlign: 'center',
              color: 'rgba(232,232,232,0.35)',
              fontSize: 13,
              marginBottom: 20,
            }}>
              مرحباً بعودتك، يرجى إدخال بياناتك للمتابعة
            </p>

            <Form
              name="login"
              onFinish={handleSubmit}
              layout="vertical"
              size="large"
            >
              <Form.Item
                name="username"
                label={<span style={{ color: 'rgba(232,232,232,0.55)', fontSize: 13, fontWeight: 500 }}>اسم المستخدم</span>}
                rules={[{ required: true, message: 'يرجى إدخال اسم المستخدم' }]}
              >
                <Input
                  className="lp-input"
                  prefix={<UserOutlined style={{ color: '#C9A227', fontSize: 16 }} />}
                  placeholder="أدخل اسم المستخدم"
                  style={{
                    height: 46,
                    borderRadius: 12,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    color: '#E8E8E8',
                  }}
                />
              </Form.Item>

              <Form.Item
                name="password"
                label={<span style={{ color: 'rgba(232,232,232,0.55)', fontSize: 13, fontWeight: 500 }}>كلمة المرور</span>}
                rules={[{ required: true, message: 'يرجى إدخال كلمة المرور' }]}
              >
                <Input.Password
                  className="lp-input"
                  prefix={<LockOutlined style={{ color: '#C9A227', fontSize: 16 }} />}
                  placeholder="أدخل كلمة المرور"
                  style={{
                    height: 46,
                    borderRadius: 12,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    color: '#E8E8E8',
                  }}
                />
              </Form.Item>

              <Form.Item style={{ marginBottom: 0, marginTop: 18 }}>
                <Button
                  className="lp-btn"
                  type="primary"
                  htmlType="submit"
                  block
                  loading={loading}
                  style={{
                    position: 'relative',
                    height: 46,
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, #C9A227 0%, #b8932a 50%, #a68224 100%)',
                    border: 'none',
                    fontWeight: 600,
                    fontSize: 16,
                    boxShadow: '0 6px 24px rgba(201,162,39,0.2)',
                    transition: 'all 0.3s ease',
                  }}
                >
                  دخول
                </Button>
              </Form.Item>
            </Form>
          </div>

          {/* الدعم الفني */}
          <div style={{
            textAlign: 'center',
            marginTop: 14,
          }}>
            <p style={{ margin: 0, fontSize: 12, color: 'rgba(232,232,232,0.3)' }}>
              تطوير: المهندس محمود البنا
            </p>
            <a
              href="https://wa.me/201024949382"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                marginTop: 6,
                fontSize: 12,
                color: 'rgba(201,162,39,0.6)',
                textDecoration: 'none',
                transition: 'color 0.2s ease',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2zm5.8 14.18c-.24.68-1.42 1.31-1.95 1.38-.5.07-1.13.1-1.82-.11-.42-.13-.96-.31-1.66-.61-2.92-1.26-4.83-4.21-4.98-4.41-.15-.2-1.19-1.58-1.19-3.01 0-1.43.75-2.13 1.02-2.42.27-.29.58-.36.78-.36.19 0 .39 0 .56.01.18.01.42-.07.66.5.24.58.82 2.01.89 2.16.07.15.12.32.02.52-.1.2-.15.32-.29.49-.15.17-.31.39-.44.52-.15.15-.3.31-.13.6.17.29.76 1.26 1.63 2.04 1.12 1 2.06 1.31 2.35 1.46.29.15.46.13.63-.08.17-.2.73-.85.92-1.14.2-.29.39-.24.66-.15.27.1 1.72.81 2.01.96.29.15.49.22.56.34.07.12.07.68-.17 1.36z"/>
              </svg>
              الدعم الفني: 01024949382
            </a>
          </div>

          <p style={{
            textAlign: 'center',
            color: 'rgba(255,255,255,0.15)',
            fontSize: 11,
            marginTop: 10,
            letterSpacing: 0.5,
          }}>
            © 2026 LEX PRO - نظام إدارة مكاتب المحاماة
          </p>
        </div>

        {/* أنميشن النجاح */}
        {success && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(6,11,22,0.92)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
            animation: 'lp-success-overlay 0.3s ease forwards',
          }}>
            {/* شعار خلفي شفاف */}
            <div style={{
              position: 'absolute',
              width: 120,
              height: 120,
              borderRadius: 30,
              opacity: 0,
              animation: 'lp-success-logo 0.6s ease 0.2s forwards',
            }}>
              <svg viewBox="0 0 60 60" width="120" height="120" fill="none">
                <circle cx="30" cy="30" r="26" stroke="#C9A227" strokeWidth="1.5" fill="none" opacity="0.5" />
                <line x1="30" y1="12" x2="30" y2="48" stroke="#C9A227" strokeWidth="2" strokeLinecap="round" />
                <circle cx="30" cy="12" r="2.5" fill="#C9A227" />
                <line x1="12" y1="20" x2="48" y2="20" stroke="#C9A227" strokeWidth="2" strokeLinecap="round" />
                <line x1="12" y1="20" x2="8" y2="30" stroke="#C9A227" strokeWidth="1" strokeLinecap="round" />
                <line x1="12" y1="20" x2="16" y2="30" stroke="#C9A227" strokeWidth="1" strokeLinecap="round" />
                <path d="M6 30 Q12 40 18 30" stroke="#C9A227" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                <line x1="48" y1="20" x2="44" y2="30" stroke="#C9A227" strokeWidth="1" strokeLinecap="round" />
                <line x1="48" y1="20" x2="52" y2="30" stroke="#C9A227" strokeWidth="1" strokeLinecap="round" />
                <path d="M42 30 Q48 40 54 30" stroke="#C9A227" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                <line x1="22" y1="48" x2="38" y2="48" stroke="#C9A227" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>

            {/* دائرة النجاح */}
            <div style={{ position: 'relative', width: 100, height: 100 }}>
              {/* حلقات متوسعة */}
              <div style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                border: '2px solid rgba(201,162,39,0.4)',
                animation: 'lp-success-ring 1.2s ease-out 0.3s forwards',
              }} />
              <div style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                border: '2px solid rgba(201,162,39,0.3)',
                animation: 'lp-success-ring2 1.4s ease-out 0.4s forwards',
              }} />

              {/* جزيئات متطايرة */}
              {particles.map((p, i) => (
                <div key={i} style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: 6,
                  height: 6,
                  marginTop: -3,
                  marginLeft: -3,
                  borderRadius: '50%',
                  background: '#C9A227',
                  ['--tx' as any]: p.tx,
                  ['--ty' as any]: p.ty,
                  animation: `lp-success-particle 0.8s ease-out 0.5s forwards`,
                  animationDelay: p.delay,
                }} />
              ))}

              {/* الدائرة الرئيسية */}
              <div style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                background: 'linear-gradient(145deg, rgba(201,162,39,0.15), rgba(201,162,39,0.05))',
                border: '2px solid #C9A227',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 40px rgba(201,162,39,0.3)',
                animation: 'lp-success-scale 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s forwards',
                opacity: 0,
              }}>
                <svg width="44" height="44" viewBox="0 0 50 50" fill="none">
                  <path
                    d="M14 26 L22 34 L37 16"
                    stroke="#C9A227"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                      strokeDasharray: 100,
                      strokeDashoffset: 100,
                      animation: 'lp-success-check 0.4s ease 0.6s forwards',
                    }}
                  />
                </svg>
              </div>
            </div>

            {/* النص */}
            <h2 style={{
              color: '#E8E8E8',
              fontSize: 22,
              fontWeight: 600,
              margin: '32px 0 6px 0',
              opacity: 0,
              animation: 'lp-success-text 0.4s ease 0.8s forwards',
            }}>
              مرحباً {userName}
            </h2>
            <p style={{
              color: 'rgba(232,232,232,0.5)',
              fontSize: 14,
              margin: 0,
              opacity: 0,
              animation: 'lp-success-sub 0.4s ease 1s forwards',
            }}>
              جاري تجهيز النظام...
            </p>
          </div>
        )}
      </div>
    </>
  );
}
