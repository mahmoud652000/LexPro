import { useState, useEffect } from 'react';
import { Card, Col, Row, Statistic, Table, Tabs, Spin, Select, Space, message } from 'antd';
import api from '../api/client';
import { PageHeader } from '../components/PageHeader';

export default function CourtDossier() {
  const [search, setSearch] = useState('');
  const [courts, setCourts] = useState<any[]>([]);
  const [dossier, setDossier] = useState<any>(null);
  const [dossierLoading, setDossierLoading] = useState(false);

  useEffect(() => {
    api.get('/courts').then(res => {
      setCourts(res.data.data || res.data || []);
    }).catch(() => message.error('حدث خطأ'));
  }, []);

  const loadDossier = async (courtId: string) => {
    if (!courtId) return;
    setDossierLoading(true);
    setDossier(null);
    try {
      const res = await api.get(`/courts/${courtId}/dossier`);
      setDossier(res.data.data || res.data);
    } catch {
      message.error('تعذر تحميل بيانات المحكمة');
    } finally {
      setDossierLoading(false);
    }
  };

  const filteredCourts = courts.filter(c => {
    if (!search) return true;
    return (c.name || '').toLowerCase().includes(search.toLowerCase());
  });

  const caseColumns = [
    { title: 'رقم القضية', dataIndex: 'caseNumber' },
    { title: 'السنة', dataIndex: 'caseYear' },
    { title: 'الموكل', dataIndex: 'customerName' },
    { title: 'الخصم', dataIndex: 'opponentName' },
    { title: 'نوع القضية', dataIndex: 'caseTypeName' },
    { title: 'الموضوع', dataIndex: 'caseSubject', ellipsis: true },
  ];

  const sessionColumns = [
    { title: 'رقم الجلسة', dataIndex: 'sessionNumber' },
    { title: 'التاريخ', dataIndex: 'sessionDate' },
    { title: 'القضية', dataIndex: 'caseNumber' },
    { title: 'الموضوع', dataIndex: 'subject', ellipsis: true },
    { title: 'القرار', dataIndex: 'sessionDecision', ellipsis: true },
  ];

  const annColumns = [
    { title: 'رقم الإعلان', dataIndex: 'announcementNumber' },
    { title: 'القضية', dataIndex: 'caseNumber' },
    { title: 'المستلم', dataIndex: 'recipientName' },
    { title: 'الموضوع', dataIndex: 'subject', ellipsis: true },
  ];

  return (
    <div>
      <PageHeader
        title="ملف المحكمة"
        subtitle="ابحث عن محكمة لعرض جميع القضايا والجلسات والإعلانات المرتبطة بها"
        searchValue={search}
        onSearch={setSearch}
        searchPlaceholder="ابحث عن محكمة"
      />

      {!dossier && !dossierLoading && (
        <Card>
          <Select
            showSearch
            placeholder="اختر محكمة لعرض ملفها الشامل"
            style={{ width: '100%' }}
            optionFilterProp="children"
            onChange={loadDossier}
            options={filteredCourts.map(c => ({ value: c._id, label: c.name }))}
          />
        </Card>
      )}

      {dossierLoading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
          <Spin size="large" />
        </div>
      )}

      {dossier && (
        <div>
          <Row gutter={[12, 12]} style={{ marginBottom: 10 }}>
            <Col xs={12} sm={6}><Card size="small"><Statistic title="القضايا" value={dossier.stats?.totalCases || 0} /></Card></Col>
            <Col xs={12} sm={6}><Card size="small"><Statistic title="الجلسات" value={dossier.stats?.totalSessions || 0} /></Card></Col>
            <Col xs={12} sm={6}><Card size="small"><Statistic title="الإعلانات" value={dossier.stats?.totalAnnouncements || 0} /></Card></Col>
            <Col xs={12} sm={6}><Card size="small"><Statistic title="جلسات قادمة" value={dossier.stats?.upcomingSessions || 0} valueStyle={{ color: '#e67e22' }} /></Card></Col>
          </Row>

          <Tabs
            items={[
              { key: 'cases', label: `القضايا (${dossier.cases?.length || 0})`, children: <Table columns={caseColumns} dataSource={dossier.cases} rowKey="_id" pagination={{ pageSize: 5 }} size="small" /> },
              { key: 'sessions', label: `الجلسات (${dossier.sessions?.length || 0})`, children: <Table columns={sessionColumns} dataSource={dossier.sessions} rowKey="_id" pagination={{ pageSize: 5 }} size="small" /> },
              { key: 'announcements', label: `الإعلانات (${dossier.announcements?.length || 0})`, children: <Table columns={annColumns} dataSource={dossier.announcements} rowKey="_id" pagination={{ pageSize: 5 }} size="small" /> },
            ]}
          />
        </div>
      )}
    </div>
  );
}
