import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tabs, Table, Modal, Form, Input, Button, Card, Descriptions, Space, Upload, message, Spin, Typography, Row, Col, Select, Popconfirm } from 'antd';
import { UploadOutlined, PlusOutlined, DownloadOutlined, DeleteOutlined, ArrowRightOutlined, CalendarOutlined, FileTextOutlined } from '@ant-design/icons';
import { createCrudApi, fileApi } from '../api/client';
import { AppModal } from '../components/AppModal';

const { Title } = Typography;

const casesApi = createCrudApi('/cases');
const sessionsApi = createCrudApi('/sessions');
const caseDocsApi = createCrudApi('/case-documents');
const announcementsApi = createCrudApi('/announcements');
const feesApi = createCrudApi('/fees');
const expensesApi = createCrudApi('/expenses');
const courtsApi = createCrudApi('/courts');

export default function CaseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [fees, setFees] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [courts, setCourts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [sessionForm] = Form.useForm();
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [docForm] = Form.useForm();
  const [uploading, setUploading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [caseRes, sessRes, docsRes, annRes, feeRes, expRes, courtsRes] = await Promise.all([
        casesApi.getById(id),
        sessionsApi.getAll(),
        caseDocsApi.getAll(),
        announcementsApi.getAll(),
        feesApi.getAll(),
        expensesApi.getAll(),
        courtsApi.getAll(),
      ]);
      setCaseData(caseRes.data.data || caseRes.data);
      const allSessions = sessRes.data.data || sessRes.data || [];
      setSessions(allSessions.filter((s: any) => s.caseId === id || s.caseId?._id === id));
      const allDocs = docsRes.data.data || docsRes.data || [];
      setDocuments(allDocs.filter((d: any) => d.caseId === id || d.caseId?._id === id));
      const allAnn = annRes.data.data || annRes.data || [];
      setAnnouncements(allAnn.filter((a: any) => a.caseId === id || a.caseId?._id === id));
      const allFees = feeRes.data.data || feeRes.data || [];
      setFees(allFees.filter((f: any) => f.caseId === id || f.caseId?._id === id));
      const allExp = expRes.data.data || expRes.data || [];
      setExpenses(allExp.filter((e: any) => e.caseId === id || e.caseId?._id === id));
      setCourts(courtsRes.data.data || courtsRes.data || []);
    } catch { message.error('حدث خطأ أثناء تحميل بيانات القضية'); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAddSession = async () => {
    try {
      const values = await sessionForm.validateFields();
      await sessionsApi.create({ ...values, caseId: id });
      message.success('تم إضافة الجلسة');
      setSessionModalOpen(false);
      sessionForm.resetFields();
      fetchData();
    } catch (e: any) { if (!e?.errorFields) message.error('حدث خطأ'); }
  };

  const handleUploadDoc = async () => {
    try {
      const values = await docForm.validateFields();
      const file = values.file?.[0]?.originFileObj || values.file;
      if (!file) { message.error('يرجى اختيار ملف'); return; }
      setUploading(true);
      const uploadRes = await fileApi.upload(file);
      const fileId = uploadRes.data.data?.fileId || uploadRes.data.fileId;
      const fileName = uploadRes.data.data?.fileName || file.name;
      await caseDocsApi.create({ caseId: id, documentName: values.documentName, documentType: values.documentType || '', fileId, fileName, notes: values.notes || '' });
      message.success('تم رفع المستند');
      setDocModalOpen(false);
      docForm.resetFields();
      fetchData();
    } catch (e: any) { if (!e?.errorFields) message.error('حدث خطأ أثناء الرفع'); }
    finally { setUploading(false); }
  };

  const handleDeleteDoc = async (docId: string) => {
    try { await caseDocsApi.delete(docId); message.success('تم حذف المستند'); fetchData(); }
    catch { message.error('حدث خطأ'); }
  };

  const handleDeleteSession = async (sid: string) => {
    try { await sessionsApi.delete(sid); message.success('تم حذف الجلسة'); fetchData(); }
    catch { message.error('حدث خطأ'); }
  };

  if (loading) return <Spin size="large" style={{ display: 'flex', justifyContent: 'center', marginTop: 100 }} />;
  if (!caseData) return <div>القضية غير موجودة</div>;

  const sessionColumns = [
    { title: 'الجلسة #', dataIndex: 'sessionNumber' },
    { title: 'التاريخ', dataIndex: 'sessionDate' },
    { title: 'الموضوع', dataIndex: 'subject' },
    { title: 'النوع', dataIndex: 'sessionType' },
    { title: 'القرار', dataIndex: 'sessionDecision', ellipsis: true },
    { title: 'الجلسة القادمة', dataIndex: 'nextSessionDate' },
    { title: 'إجراءات', render: (_: any, r: any) => <Popconfirm title="حذف الجلسة؟" onConfirm={() => handleDeleteSession(r._id)}><Button type="text" danger icon={<DeleteOutlined />} /></Popconfirm> },
  ];

  const docColumns = [
    { title: 'اسم المستند', dataIndex: 'documentName' },
    { title: 'النوع', dataIndex: 'documentType' },
    { title: 'التاريخ', dataIndex: 'createdDate' },
    {
      title: 'إجراءات', render: (_: any, r: any) => (
        <Space>
          <Button type="link" icon={<DownloadOutlined />} href={fileApi.getUrl(r.fileId)} target="_blank">تحميل</Button>
          <Popconfirm title="حذف المستند؟" onConfirm={() => handleDeleteDoc(r._id)}><Button type="text" danger icon={<DeleteOutlined />} /></Popconfirm>
        </Space>
      ),
    },
  ];

  const annColumns = [
    { title: 'رقم الإعلان', dataIndex: 'announcementNumber' },
    { title: 'المستلم', dataIndex: 'recipientName' },
    { title: 'الموضوع', dataIndex: 'subject', ellipsis: true },
    { title: 'المحضر', dataIndex: 'bailiffName' },
    { title: 'تاريخ التسليم', dataIndex: 'deliveryDate' },
  ];

  const feeColumns = [
    { title: 'العميل', dataIndex: 'customerName' },
    { title: 'المبلغ الإجمالي', dataIndex: 'totalAmount' },
    { title: 'المدفوع', dataIndex: 'paidAmount' },
    { title: 'المتبقي', dataIndex: 'remainingAmount' },
    { title: 'التاريخ', dataIndex: 'agreementDate' },
  ];

  const expColumns = [
    { title: 'التاريخ', dataIndex: 'expenseDate' },
    { title: 'الوصف', dataIndex: 'description' },
    { title: 'الفئة', dataIndex: 'category' },
    { title: 'المبلغ', dataIndex: 'amount' },
  ];

  return (
    <div>
      <Button icon={<ArrowRightOutlined />} onClick={() => navigate('/cases')} style={{ marginBottom: 10 }}>العودة للقضايا</Button>
      <Card style={{ marginBottom: 10 }} size="small">
        <Descriptions title={`القضية رقم ${caseData.caseNumber} - ${caseData.caseYear}`} bordered column={2} size="small">
          <Descriptions.Item label="العميل">{caseData.customerName || caseData.customerId?.name}</Descriptions.Item>
          <Descriptions.Item label="الخصم">{caseData.opponentName}</Descriptions.Item>
          <Descriptions.Item label="المحكمة">{caseData.courtName || caseData.courtId?.name}</Descriptions.Item>
          <Descriptions.Item label="نوع القضية">{caseData.caseTypeName || caseData.caseTypeId?.name}</Descriptions.Item>
          <Descriptions.Item label="رقم الدائرة">{caseData.circuitNumber}</Descriptions.Item>
          <Descriptions.Item label="الموضوع">{caseData.caseSubject}</Descriptions.Item>
          <Descriptions.Item label="صفة الموكل">{caseData.clientCapacity}</Descriptions.Item>
          <Descriptions.Item label="صفة الخصم">{caseData.opponentCapacity}</Descriptions.Item>
        </Descriptions>
      </Card>
      <Tabs items={[
        { key: 'sessions', label: 'الجلسات', children: (
          <div>
            <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => setSessionModalOpen(true)} style={{ marginBottom: 10 }}>إضافة جلسة</Button>
            <Table columns={sessionColumns} dataSource={sessions} rowKey="_id" size="small" pagination={{ pageSize: 5 }} />
          </div>
        )},
        { key: 'docs', label: 'المستندات', children: (
          <div>
            <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => setDocModalOpen(true)} style={{ marginBottom: 10 }}>رفع مستند</Button>
            <Table columns={docColumns} dataSource={documents} rowKey="_id" size="small" pagination={{ pageSize: 5 }} />
          </div>
        )},
        { key: 'announcements', label: 'الإعلانات', children: <Table columns={annColumns} dataSource={announcements} rowKey="_id" size="small" pagination={{ pageSize: 5 }} /> },
        { key: 'fees', label: 'الرسوم', children: <Table columns={feeColumns} dataSource={fees} rowKey="_id" size="small" pagination={{ pageSize: 5 }} onRow={(r) => ({ onClick: () => navigate(`/fees/${r._id}`), style: { cursor: 'pointer' } })} /> },
        { key: 'expenses', label: 'المصاريف', children: <Table columns={expColumns} dataSource={expenses} rowKey="_id" size="small" pagination={{ pageSize: 5 }} /> },
      ]} />

      <AppModal
        title="إضافة جلسة"
        subtitle="إضافة جلسة جديدة للقضية"
        icon={<CalendarOutlined />}
        iconColor="#2980b9"
        iconColorTo="#3498db"
        open={sessionModalOpen}
        onOk={handleAddSession}
        onCancel={() => setSessionModalOpen(false)}
        okText="حفظ"
        cancelText="إلغاء"
        width={640}
      >
        <Form form={sessionForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}><Form.Item name="sessionNumber" label="رقم الجلسة" rules={[{ required: true }]}><Input type="number" /></Form.Item></Col>
            <Col span={12}><Form.Item name="sessionDate" label="تاريخ الجلسة" rules={[{ required: true }]}><Input type="date" /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="courtId" label="المحكمة" rules={[{ required: true }]}><Select options={courts.map((c: any) => ({ value: c._id, label: c.name }))} /></Form.Item></Col>
            <Col span={12}><Form.Item name="rollNumber" label="رقم الدور"><Input /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="hallNumber" label="رقم القاعة"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="sessionType" label="نوع الجلسة"><Input /></Form.Item></Col>
          </Row>
          <Form.Item name="subject" label="الموضوع" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="sessionDecision" label="القرار" rules={[{ required: true }]}><Input.TextArea rows={2} /></Form.Item>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="nextSessionDate" label="الجلسة القادمة"><Input type="date" /></Form.Item></Col>
          </Row>
          <Form.Item name="notes" label="ملاحظات" rules={[{ required: true }]}><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </AppModal>

      <AppModal
        title="رفع مستند"
        subtitle="رفع مستند مرتبط بالقضية"
        icon={<FileTextOutlined />}
        iconColor="#C9A227"
        iconColorTo="#e0b53e"
        open={docModalOpen}
        onOk={handleUploadDoc}
        onCancel={() => setDocModalOpen(false)}
        confirmLoading={uploading}
        okText="رفع"
        cancelText="إلغاء"
        width={560}
      >
        <Form form={docForm} layout="vertical">
          <Form.Item name="documentName" label="اسم المستند" rules={[{ required: true }]}><Input placeholder="اسم المستند" /></Form.Item>
          <Form.Item name="documentType" label="نوع المستند"><Input placeholder="نوع المستند" /></Form.Item>
          <Form.Item name="file" label="الملف" rules={[{ required: true }]} valuePropName="fileList" getValueFromEvent={e => Array.isArray(e) ? e : e?.fileList}>
            <Upload beforeUpload={() => false} maxCount={1}><Button icon={<UploadOutlined />}>اختيار ملف</Button></Upload>
          </Form.Item>
          <Form.Item name="notes" label="ملاحظات"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </AppModal>
    </div>
  );
}