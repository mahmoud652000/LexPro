import { useState, useEffect, useCallback } from 'react';
import { Table, Button, Modal, Form, Input, Select, Space, Popconfirm, message, Row, Col, Upload, Typography } from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import {
  EditOutlined, DeleteOutlined, UploadOutlined, PaperClipOutlined,
  SaveOutlined, FolderOpenOutlined, TeamOutlined, FileTextOutlined,
  CalendarOutlined, NotificationOutlined, UserOutlined, EnvironmentOutlined,
} from '@ant-design/icons';
import { createCrudApi, fileApi } from '../api/client';
import { PageHeader } from '../components/PageHeader';
import { AppModal, FormSection } from '../components/AppModal';

const { Title, Text } = Typography;

const announcementsApi = createCrudApi('/announcements');
const casesApi = createCrudApi('/cases');
const courtsApi = createCrudApi('/courts');
const annTypesApi = createCrudApi('/announcement-types');
const customersApi = createCrudApi('/customers');
const annDocsApi = createCrudApi('/announcement-documents');

export default function Announcements() {
  const [data, setData] = useState<any[]>([]);
  const [cases, setCases] = useState<any[]>([]);
  const [courts, setCourts] = useState<any[]>([]);
  const [annTypes, setAnnTypes] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [customerFilter, setCustomerFilter] = useState<string | undefined>(undefined);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>(undefined);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [annRes, caseRes, courtRes, typeRes, custRes] = await Promise.all([
        announcementsApi.getAll(), casesApi.getAll(), courtsApi.getAll(),
        annTypesApi.getAll(), customersApi.getAll(),
      ]);
      setData(annRes.data.data || annRes.data || []);
      setCases(caseRes.data.data || caseRes.data || []);
      setCourts(courtRes.data.data || courtRes.data || []);
      setAnnTypes(typeRes.data.data || typeRes.data || []);
      setCustomers(custRes.data.data || custRes.data || []);
    } catch { message.error('حدث خطأ'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // دالة مساعدة: استخراج customerId نصي من القضية (قد يكون object بعد populate)
  const getCaseCustomerId = (c: any): string | undefined => {
    if (!c?.customerId) return undefined;
    return typeof c.customerId === 'object' ? c.customerId?._id : c.customerId;
  };

  // خريطة: caseId → customerId (نصي)
  const caseCustomerMap = new Map<string, string>();
  cases.forEach((c: any) => {
    const custId = getCaseCustomerId(c);
    if (custId) caseCustomerMap.set(c._id, custId);
  });

  // خريطة: customerId → customerName
  const customerNameMap = new Map<string, string>(
    customers.map((c: any) => [c._id, c.name])
  );

  // دالة مساعدة: جلب اسم الموكل من إعلان
  const getCustomerName = (a: any): string => {
    const caseId = typeof a.caseId === 'object' ? a.caseId?._id : a.caseId;
    const custId = caseCustomerMap.get(caseId);
    return custId ? (customerNameMap.get(custId) || '') : '';
  };

  const filtered = data.filter((a: any) => {
    if (customerFilter) {
      const caseId = typeof a.caseId === 'object' ? a.caseId?._id : a.caseId;
      const custId = caseCustomerMap.get(caseId);
      if (custId !== customerFilter) return false;
    }
    if (!search) return true;
    const q = search.toLowerCase();
    const custName = getCustomerName(a).toLowerCase();
    return (
      (a.announcementNumber || '').includes(q) ||
      (a.caseNumber || '').includes(q) ||
      (a.recipientName || '').toLowerCase().includes(q) ||
      custName.includes(q)
    );
  });

  const openModal = (record?: any) => {
    setEditing(record || null);
    setFileList([]);
    if (record) {
      const caseId = typeof record.caseId === 'object' ? record.caseId?._id : record.caseId;
      // استخراج customerId من القضية المرتبطة
      const custId = caseId ? caseCustomerMap.get(caseId) : undefined;
      setSelectedCustomerId(custId);
      form.setFieldsValue({ ...record, caseId, customerId: custId });
    } else {
      setSelectedCustomerId(undefined);
      form.resetFields();
    }
    setModalOpen(true);
  };

  // تصفية القضايا حسب الموكل المختار داخل النافذة
  const filteredCases = selectedCustomerId
    ? cases.filter((c: any) => getCaseCustomerId(c) === selectedCustomerId)
    : cases;

  // عند تغيير القضية في النافذة، تحديث الموكل تلقائياً
  const handleCaseChange = (caseId: string) => {
    const custId = caseId ? caseCustomerMap.get(caseId) : undefined;
    setSelectedCustomerId(custId);
    form.setFieldsValue({ customerId: custId });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      let announcementId: string;

      if (editing?._id) {
        await announcementsApi.update(editing._id, values);
        announcementId = editing._id;
        message.success('تم تحديث الإعلان');
      } else {
        const res = await announcementsApi.create(values);
        announcementId = res.data.data?._id || res.data._id;
        message.success('تمت إضافة الإعلان');
      }

      // رفع المرفقات
      if (fileList.length > 0 && announcementId) {
        for (const file of fileList) {
          const rawFile = file.originFileObj;
          if (!rawFile) continue;
          const uploadRes = await fileApi.upload(rawFile);
          const fileId = uploadRes.data.data?.fileId || uploadRes.data.fileId;
          const fileName = uploadRes.data.data?.fileName || rawFile.name;
          await annDocsApi.create({
            caseAnnouncementId: announcementId,
            documentName: rawFile.name,
            documentType: 'مرفق',
            fileId,
            fileName,
          });
        }
        message.success(`تم رفع ${fileList.length} مرفق`);
      }

      setModalOpen(false);
      fetchData();
    } catch (e: any) { if (!e?.errorFields) message.error('حدث خطأ'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    try { await announcementsApi.delete(id); message.success('تم الحذف'); fetchData(); }
    catch { message.error('حدث خطأ'); }
  };

  const columns = [
    { title: 'رقم الإعلان', dataIndex: 'announcementNumber', width: 80 },
    { title: 'رقم القضية', dataIndex: 'caseNumber', width: 80 },
    { title: 'الموكل', width: 100, ellipsis: true, render: (_: any, r: any) => getCustomerName(r) || '-' },
    { title: 'المحكمة', dataIndex: 'courtName', ellipsis: true },
    { title: 'النوع', dataIndex: 'announcementTypeName', ellipsis: true },
    { title: 'المستلم', dataIndex: 'recipientName', ellipsis: true },
    { title: 'الموضوع', dataIndex: 'subject', ellipsis: true },
    { title: 'المحضر', dataIndex: 'bailiffName', ellipsis: true },
    { title: 'تاريخ التسليم', dataIndex: 'deliveryDate', width: 100 },
    { title: 'تاريخ الاستلام', dataIndex: 'receiptDate', width: 100 },
    { title: 'إجراءات', width: 70, render: (_: any, r: any) => (
      <Space>
        <Button type="text" icon={<EditOutlined />} onClick={() => openModal(r)} />
        <Popconfirm title="حذف؟" onConfirm={() => handleDelete(r._id)}><Button type="text" danger icon={<DeleteOutlined />} /></Popconfirm>
      </Space>
    )},
  ];

  return (
    <div>
      <PageHeader
        title="لوحة الإعلانات"
        subtitle="تسجيل إعلانات القضايا وبيانات المعلن إليه وتواريخ التسليم والجلسات"
        onAdd={() => openModal()}
        addLabel="إضافة +"
        searchValue={search}
        onSearch={setSearch}
        searchPlaceholder="بحث..."
      />
      {/* فلتر حسب الموكل */}
      <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        <UserOutlined style={{ color: '#C9A227' }} />
        <span style={{ fontSize: 13, color: '#555', whiteSpace: 'nowrap' }}>فلتر حسب الموكل:</span>
        <Select
          allowClear
          showSearch
          placeholder="كل الموكلين"
          optionFilterProp="children"
          value={customerFilter}
          onChange={(val) => setCustomerFilter(val)}
          options={customers.map((c: any) => ({ value: c._id, label: c.name }))}
          style={{ minWidth: 220 }}
        />
      </div>
      <Table columns={columns} dataSource={filtered} rowKey="_id" loading={loading} size="small" pagination={{ pageSize: 10 }} />

      <AppModal
        title={editing ? 'تعديل إعلان' : 'إضافة إعلان جديد'}
        subtitle="أدخل بيانات الإعلان وبيانات المستلم والمرفقات"
        icon={<NotificationOutlined />}
        iconColor="#2980b9"
        iconColorTo="#3498db"
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        okText="حفظ"
        cancelText="إلغاء"
        width={820}
      >
        <Form form={form} layout="vertical">
          {/* Section 1: بيانات القضية والإعلان */}
          <FormSection icon={<NotificationOutlined />} title="بيانات القضية والإعلان">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="customerId" label="فلتر بالموكل">
                  <Select
                    showSearch
                    placeholder="اختر موكلاً لتصفية القضايا"
                    optionFilterProp="children"
                    value={selectedCustomerId}
                    onChange={(val) => {
                      setSelectedCustomerId(val);
                      form.setFieldsValue({ caseId: undefined });
                    }}
                    options={customers.map((c: any) => ({ value: c._id, label: c.name }))}
                    suffixIcon={<UserOutlined />}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="caseId" label="القضية (اكتب للبحث)">
                  <Select
                    showSearch
                    placeholder="ابحث عن قضية"
                    optionFilterProp="children"
                    onChange={handleCaseChange}
                    options={filteredCases.map((c: any) => ({ value: c._id, label: `${c.caseNumber} - ${getCaseCustomerId(c) ? customerNameMap.get(getCaseCustomerId(c)!) || '' : ''}` }))}
                  />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="courtId" label="المحكمة" rules={[{ required: true, message: 'يرجى اختيار المحكمة' }]}>
                  <Select showSearch optionFilterProp="children" placeholder="اختر المحكمة" options={courts.map((c: any) => ({ value: c._id, label: c.name }))} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="bailiffName" label="اسم المحضر" rules={[{ required: true, message: 'يرجى إدخال اسم المحضر' }]}>
                  <Input placeholder="اسم المحضر" prefix={<UserOutlined />} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="announcementTypeId" label="نوع الإعلان" rules={[{ required: true, message: 'يرجى اختيار نوع الإعلان' }]}>
                  <Select showSearch optionFilterProp="children" placeholder="اختر نوع الإعلان" options={annTypes.map((t: any) => ({ value: t._id, label: t.name }))} />
                </Form.Item>
              </Col>
            </Row>
          </FormSection>

          {/* Section 2: بيانات المُعلَن إليه والتواريخ */}
          <FormSection icon={<TeamOutlined />} title="بيانات المُعلَن إليه والتواريخ">
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="announcementNumber" label="رقم الإعلان" rules={[{ required: true, message: 'يرجى إدخال رقم الإعلان' }]}>
                  <Input placeholder="رقم الإعلان" dir="ltr" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="recipientName" label="المُعلَن إليه (الاسم)" rules={[{ required: true, message: 'يرجى إدخال اسم المستلم' }]}>
                  <Input placeholder="اسم المستلم" prefix={<UserOutlined />} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="recipientAddress" label="عنوان المُعلَن إليه" rules={[{ required: true, message: 'يرجى إدخال عنوان المستلم' }]}>
                  <Input placeholder="عنوان المستلم" prefix={<EnvironmentOutlined />} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="deliveryDate" label="تاريخ تسليم الإعلان">
                  <Input type="date" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="receiptDate" label="تاريخ استلام الإعلان">
                  <Input type="date" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="sessionDate" label="تاريخ الجلسة المُعلَن بها">
                  <Input type="date" />
                </Form.Item>
              </Col>
            </Row>
          </FormSection>

          {/* Section 3: الموضوع والمرفقات */}
          <FormSection icon={<FileTextOutlined />} title="الموضوع والمرفقات">
            <Form.Item name="subject" label="موضوع الإعلان" rules={[{ required: true, message: 'يرجى إدخال الموضوع' }]}>
              <Input.TextArea rows={3} placeholder="موضوع الإعلان" />
            </Form.Item>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <PaperClipOutlined style={{ color: '#C9A227' }} />
              <span style={{ fontWeight: 600, fontSize: 13, color: '#2c3e50' }}>المرفقات</span>
            </div>
            <Upload.Dragger
              fileList={fileList}
              onChange={({ fileList: newList }) => setFileList(newList)}
              beforeUpload={() => false}
              multiple
              maxCount={10}
              onRemove={(file) => setFileList(prev => prev.filter(f => f.uid !== file.uid))}
              style={{ background: 'transparent', borderColor: '#e0e0e0' }}
            >
              <p style={{ margin: 0, fontSize: 13, color: '#999' }}>
                <UploadOutlined style={{ fontSize: 24, color: '#C9A227', marginBottom: 4 }} />
                <br />
                اضغط أو اسحب الملفات هنا
              </p>
            </Upload.Dragger>
          </FormSection>
        </Form>
      </AppModal>
    </div>
  );
}