import { useState, useEffect } from 'react';
import { Card, Table, Tag, Row, Col, Statistic, message, Segmented } from 'antd';
import { BellOutlined, CalendarOutlined, NotificationOutlined, CheckSquareOutlined } from '@ant-design/icons';
import api from '../api/client';
import { PageHeader } from '../components/PageHeader';

export default function Notifications() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    setLoading(true);
    api.get('/notifications').then(res => {
      setNotifications(res.data.data || res.data || []);
    }).catch(() => message.error('تعذر تحميل التنبيهات'))
    .finally(() => setLoading(false));
  }, []);

  const urgencyColors: Record<string, string> = {
    high: 'red',
    medium: 'orange',
    low: 'gold',
  };

  const urgencyLabels: Record<string, string> = {
    high: 'عاجل',
    medium: 'متوسط',
    low: 'منخفض',
  };

  const typeIcons: Record<string, React.ReactNode> = {
    session: <CalendarOutlined style={{ color: '#C9A227' }} />,
    announcement: <NotificationOutlined style={{ color: '#2980b9' }} />,
    task: <CheckSquareOutlined style={{ color: '#27ae60' }} />,
  };

  const typeLabels: Record<string, string> = {
    session: 'جلسة',
    announcement: 'إعلان',
    task: 'مهمة',
  };

  const highCount = notifications.filter(n => n.urgency === 'high').length;
  const mediumCount = notifications.filter(n => n.urgency === 'medium').length;
  const lowCount = notifications.filter(n => n.urgency === 'low').length;

  const sessionCount = notifications.filter(n => n.type === 'session').length;
  const announcementCount = notifications.filter(n => n.type === 'announcement').length;
  const taskCount = notifications.filter(n => n.type === 'task').length;

  const filteredNotifications = (filter === 'all'
    ? notifications
    : notifications.filter(n => n.type === filter)
  ).slice().sort((a, b) => {
    const courtA = a.courtName || '';
    const courtB = b.courtName || '';
    if (courtA !== courtB) return courtA.localeCompare(courtB, 'ar');
    const dateA = a.date ? a.date.split(' - ')[0] : '';
    const dateB = b.date ? b.date.split(' - ')[0] : '';
    return dateA.localeCompare(dateB);
  });

  const columns = [
    {
      title: 'النوع',
      dataIndex: 'type',
      render: (v: string) => (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {typeIcons[v] || <BellOutlined />}
          <span>{typeLabels[v] || v}</span>
        </span>
      ),
      width: 100,
    },
    { title: 'العنوان', dataIndex: 'title', ellipsis: true },
    { title: 'الموكل', dataIndex: 'customerName', render: (v: string) => v || '—', width: 100 },
    { title: 'المستلم', dataIndex: 'recipientName', render: (v: string) => v || '—', width: 100 },
    { title: 'الوصف', dataIndex: 'description', ellipsis: true },
    {
      title: 'تاريخ الجلسة القادمة',
      dataIndex: 'date',
      width: 140,
      render: (v: string) => {
        if (!v) return '—';
        const timeMatch = v.match(/(\d{1,2}):(\d{2})/);
        if (!timeMatch) return v;
        let hours = parseInt(timeMatch[1]);
        const minutes = timeMatch[2];
        const ampm = hours >= 12 ? 'مساءً' : 'صباحاً';
        hours = hours % 12 || 12;
        return v.replace(/(\d{1,2}):(\d{2})\s*(صباحاً|مساءً)?/, `${hours}:${minutes} ${ampm}`);
      },
    },
    { title: 'رقم القضية', dataIndex: 'caseNumber', render: (v: string) => v || '—', width: 90 },
    { title: 'المحكمة', dataIndex: 'courtName', render: (v: string) => v || '—', width: 100 },
    {
      title: 'تاريخ التسليم',
      dataIndex: 'deliveryDate',
      render: (v: string) => v || '—',
      width: 110,
    },
    {
      title: 'تاريخ الاستلام',
      dataIndex: 'receiptDate',
      render: (v: string) => v || '—',
      width: 110,
    },
    {
      title: 'متبقي',
      dataIndex: 'daysLeft',
      render: (v: number) => {
        if (v == null) return '';
        if (v === 0) return 'اليوم';
        if (v === 1) return 'غداً';
        return `باقي ${v} يوم`;
      },
      width: 80,
    },
    {
      title: 'الأولوية',
      dataIndex: 'urgency',
      render: (v: string) => <Tag color={urgencyColors[v]}>{urgencyLabels[v] || v}</Tag>,
      width: 80,
    },
  ];

  return (
    <div>
      <PageHeader
        title="التنبيهات"
        subtitle="الجلسات القادمة والإعلانات والمهام التي تحتاج متابعة"
      />

      <Row gutter={[12, 12]} style={{ marginBottom: 10 }}>
        <Col xs={24} sm={8}>
          <Card size="small">
            <Statistic
              title="تنبيهات عاجلة"
              value={highCount}
              prefix={<BellOutlined />}
              valueStyle={{ color: '#c0392b' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small">
            <Statistic
              title="تنبيهات متوسطة"
              value={mediumCount}
              valueStyle={{ color: '#e67e22' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small">
            <Statistic
              title="تنبيهات منخفضة"
              value={lowCount}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      <Card size="small">
        <div style={{ marginBottom: 12 }}>
          <Segmented
            value={filter}
            onChange={(v) => setFilter(v as string)}
            options={[
              { label: `الكل (${notifications.length})`, value: 'all' },
              { label: `جلسات (${sessionCount})`, value: 'session' },
              { label: `إعلانات (${announcementCount})`, value: 'announcement' },
              { label: `مهام (${taskCount})`, value: 'task' },
            ]}
          />
        </div>
        <Table
          columns={columns}
          dataSource={filteredNotifications}
          rowKey={(r) => r.id || r._id}
          loading={loading}
          size="small"
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: 'لا توجد تنبيهات حالياً' }}
        />
      </Card>
    </div>
  );
}
