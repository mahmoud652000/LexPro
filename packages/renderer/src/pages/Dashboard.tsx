import { useEffect, useState } from 'react';
import { Card, Col, Row, Statistic, Table, Spin, message, Tag, Tooltip, Empty } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  TeamOutlined,
  FolderOpenOutlined,
  CalendarOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ShoppingCartOutlined,
  BellOutlined,
  FireOutlined,
  WarningOutlined,
  CheckSquareOutlined,
  BankOutlined,
  NotificationOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../api/client';
import { PageHeader } from '../components/PageHeader';

interface DashboardStats {
  totalCustomers: number;
  totalCases: number;
  upcomingSessions: number;
  totalFees: number;
  collectedFees: number;
  remainingFees: number;
  totalExpenses: number;
}

interface SessionItem {
  _id?: string;
  id?: string;
  title?: string;
  caseTitle?: string;
  caseNumber?: string;
  sessionDate?: string;
  date?: string;
  court?: string;
  courtName?: string;
  customerName?: string;
  notes?: string;
}

interface UpcomingEvent {
  id: string;
  type: 'session' | 'announcement' | 'task';
  title: string;
  description?: string;
  date: string;
  caseNumber?: string;
  courtName?: string;
  customerName?: string;
  recipientName?: string;
  daysLeft: number;
  urgency: 'high' | 'medium' | 'low';
}

const urgencyConfig = {
  high: { color: '#dc2626', bg: 'rgba(220,38,38,0.1)', label: 'عاجل', icon: <FireOutlined /> },
  medium: { color: '#d97706', bg: 'rgba(217,119,6,0.1)', label: 'متوسط', icon: <WarningOutlined /> },
  low: { color: '#16a34a', bg: 'rgba(22,163,74,0.1)', label: 'منخفض', icon: <CheckCircleOutlined /> },
};

const typeConfig = {
  session: { color: '#0891b2', icon: <BankOutlined />, label: 'جلسة' },
  announcement: { color: '#7c3aed', icon: <NotificationOutlined />, label: 'إعلان' },
  task: { color: '#2563eb', icon: <CheckSquareOutlined />, label: 'مهمة' },
};

function getDaysLeftText(daysLeft: number): string {
  if (daysLeft < 0) return `متأخرة ${Math.abs(daysLeft)} يوم`;
  if (daysLeft === 0) return 'اليوم';
  if (daysLeft === 1) return 'غداً';
  return `${daysLeft} يوم`;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, sessionsRes, notifRes] = await Promise.all([
          api.get('/dashboard'),
          api.get('/sessions', { params: { upcoming: true } }),
          api.get('/notifications'),
        ]);
        setStats(statsRes.data?.data || statsRes.data);
        setSessions(Array.isArray(sessionsRes.data?.data) ? sessionsRes.data.data : (Array.isArray(sessionsRes.data) ? sessionsRes.data : []));
        const notifData = notifRes.data?.data || notifRes.data || [];
        setUpcoming(Array.isArray(notifData) ? notifData.slice(0, 6) : []);
      } catch (error) {
        console.error(error);
        message.error('تعذر تحميل بيانات لوحة التحكم');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const sessionColumns: ColumnsType<SessionItem> = [
    {
      title: 'الموضوع',
      key: 'title',
      render: (_, record) => record.title || record.caseTitle || '—',
    },
    {
      title: 'رقم القضية',
      key: 'caseNumber',
      render: (_, record) => record.caseNumber || '—',
    },
    {
      title: 'التاريخ والوقت',
      key: 'sessionDate',
      render: (_, record) => {
        const d = record.sessionDate || record.date;
        return d ? dayjs(d).format('YYYY-MM-DD HH:mm') : '—';
      },
    },
    {
      title: 'المحكمة',
      key: 'court',
      render: (_, record) => record.court || record.courtName || '—',
    },
    {
      title: 'العميل',
      key: 'customerName',
      render: (_, record) => record.customerName || '—',
    },
    {
      title: 'ملاحظات',
      key: 'notes',
      render: (_, record) => record.notes || '—',
      ellipsis: true,
    },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  const statsList = [
    { title: 'إجمالي العملاء', value: stats?.totalCustomers ?? 0, icon: <TeamOutlined />, color: '#2563eb' },
    { title: 'إجمالي القضايا', value: stats?.totalCases ?? 0, icon: <FolderOpenOutlined />, color: '#7c3aed' },
    { title: 'الجلسات القادمة', value: stats?.upcomingSessions ?? 0, icon: <CalendarOutlined />, color: '#0891b2' },
    { title: 'إجمالي الرسوم', value: stats?.totalFees ?? 0, icon: <DollarOutlined />, color: '#16a34a' },
    { title: 'الرسوم المحصّلة', value: stats?.collectedFees ?? 0, icon: <CheckCircleOutlined />, color: '#15803d' },
    { title: 'الرسوم المتبقية', value: stats?.remainingFees ?? 0, icon: <ClockCircleOutlined />, color: '#dc2626' },
    { title: 'إجمالي المصاريف', value: stats?.totalExpenses ?? 0, icon: <ShoppingCartOutlined />, color: '#ea580c' },
  ];

  return (
    <div>
      <PageHeader title="لوحة التحكم" subtitle="نظرة عامة على القضايا والجلسات والرسوم" />

      <Row gutter={[12, 12]}>
        {statsList.map((s) => (
          <Col xs={24} sm={12} md={8} lg={6} key={s.title}>
            <Card size="small" hoverable>
              <Statistic
                title={s.title}
                value={s.value}
                prefix={s.icon}
                valueStyle={{ color: s.color }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* التنبيهات القادمة */}
      {upcoming.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 12,
          }}>
            <BellOutlined style={{ color: '#C9A227', fontSize: 16 }} />
            <span style={{ fontSize: 16, fontWeight: 700, color: '#1a2332' }}>
              التنبيهات القادمة
            </span>
            <div style={{
              flex: 1,
              height: 1,
              background: 'linear-gradient(90deg, rgba(201,162,39,0.3), transparent)',
              marginRight: 8,
            }} />
          </div>
          <Row gutter={[12, 12]}>
          {upcoming.map((event) => {
            const uc = urgencyConfig[event.urgency];
            const tc = typeConfig[event.type];
            return (
              <Col xs={24} sm={12} lg={8} key={`${event.type}-${event.id}`}>
                <Card
                  size="small"
                  hoverable
                  style={{
                    border: '1px solid #f0f0f0',
                    borderRadius: 12,
                    overflow: 'hidden',
                    transition: 'all 0.3s ease',
                  }}
                  styles={{ body: { padding: 0 } }}
                >
                  {/* شريط علوي ملون */}
                  <div style={{
                    height: 4,
                    background: `linear-gradient(90deg, ${tc.color}, ${tc.color}88)`,
                  }} />

                  <div style={{ padding: '14px 16px' }}>
                    {/* الرأس: النوع + الأولوية */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 10,
                    }}>
                      <Tag
                        icon={tc.icon}
                        color={tc.color}
                        style={{ margin: 0, borderRadius: 6, fontSize: 11, fontWeight: 600 }}
                      >
                        {tc.label}
                      </Tag>
                      <Tag
                        icon={uc.icon}
                        style={{
                          margin: 0,
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 600,
                          background: uc.bg,
                          color: uc.color,
                          border: `1px solid ${uc.color}33`,
                        }}
                      >
                        {uc.label}
                      </Tag>
                    </div>

                    {/* العنوان */}
                    <Tooltip title={event.title}>
                      <div style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: '#1a2332',
                        marginBottom: 6,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {event.title}
                      </div>
                    </Tooltip>

                    {/* التفاصيل */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', marginBottom: 10 }}>
                      {event.customerName && (
                        <span style={{ fontSize: 12, color: '#6b7280' }}>
                          العميل: {event.customerName}
                        </span>
                      )}
                      {event.courtName && (
                        <span style={{ fontSize: 12, color: '#6b7280' }}>
                          المحكمة: {event.courtName}
                        </span>
                      )}
                      {event.caseNumber && (
                        <span style={{ fontSize: 12, color: '#6b7280' }}>
                          قضية: {event.caseNumber}
                        </span>
                      )}
                    </div>

                    {/* التاريخ والأيام المتبقية */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingTop: 10,
                      borderTop: '1px solid #f0f0f0',
                    }}>
                      <span style={{ fontSize: 12, color: '#9ca3af' }}>
                        {event.date ? dayjs(event.date.split(' - ')[0]).format('YYYY-MM-DD') : '—'}
                      </span>
                      <span style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: uc.color,
                        background: uc.bg,
                        padding: '2px 10px',
                        borderRadius: 6,
                      }}>
                        {getDaysLeftText(event.daysLeft)}
                      </span>
                    </div>
                  </div>
                </Card>
              </Col>
            );
          })}
          </Row>
        </div>
      )}
    </div>
  );
}
