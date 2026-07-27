import { useState, useEffect, useCallback, useMemo } from 'react';
import { Table, Switch, Typography, Modal, Form, Input, Select, message, Row, Col, Upload, Button } from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import {
  PlusOutlined, FileTextOutlined, SaveOutlined, UploadOutlined,
  PaperClipOutlined, CalendarOutlined, AuditOutlined, UserOutlined,
  BankOutlined, NumberOutlined, ClockCircleOutlined, DeleteOutlined,
  CloseOutlined, SearchOutlined, EnvironmentOutlined,
} from '@ant-design/icons';
import { createCrudApi, fileApi } from '../api/client';
import api from '../api/client';
import { PageHeader } from '../components/PageHeader';
import { AppModal, FormSection } from '../components/AppModal';

const { Text, Title } = Typography;

const sessionsApi = createCrudApi('/sessions');
const casesApi = createCrudApi('/cases');
const courtsApi = createCrudApi('/courts');
const customersApi = createCrudApi('/customers');
const sessionDocsApi = createCrudApi('/session-documents');

const ampmOptions = [
  { value: 'صباحاً', label: 'صباحاً' },
  { value: 'مساءً', label: 'مساءً' },
];

const sessionTypeOptions = [
  { value: 'جلسة أولى', label: 'جلسة أولى' },
  { value: 'جلسة نظر', label: 'جلسة نظر' },
  { value: 'جلسة مرافعة', label: 'جلسة مرافعة' },
  { value: 'جلسة حكم', label: 'جلسة حكم' },
  { value: 'جلسة إعلان', label: 'جلسة إعلان' },
  { value: 'جلسة تأجيل', label: 'جلسة تأجيل' },
];

export default function Sessions() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [cases, setCases] = useState<any[]>([]);
  const [courts, setCourts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [upcomingOnly, setUpcomingOnly] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<any[]>([]);
  const [clientFilter, setClientFilter] = useState<string | undefined>(undefined);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [sessionNumber, setSessionNumber] = useState(1);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [sessRes, caseRes, courtRes, custRes] = await Promise.all([
        sessionsApi.getAll(), casesApi.getAll(), courtsApi.getAll(), customersApi.getAll(),
      ]);
      setSessions(sessRes.data.data || sessRes.data || []);
      setCases(caseRes.data.data || caseRes.data || []);
      setCourts(courtRes.data.data || courtRes.data || []);
      setCustomers(custRes.data.data || custRes.data || []);
    } catch { message.error('حدث خطأ أثناء تحميل البيانات'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const today = new Date().toISOString().split('T')[0];
  const filtered = upcomingOnly ? sessions.filter(s => (s.sessionDate || '') >= today) : sessions;

  // فلترة القضايا حسب الموكل المختار
  const filteredCases = useMemo(() => {
    if (!clientFilter) return cases;
    return cases.filter(c => c.customerId === clientFilter || c.customerId?._id === clientFilter);
  }, [cases, clientFilter]);

  const openAdd = () => {
    setEditing(null);
    form.resetFields();
    setClientFilter(undefined);
    setFileList([]);
    setSessionNumber(1);
    setModalOpen(true);
  };

  const openEdit = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('يرجى اختيار جلسة للتعديل');
      return;
    }
    const selected = sessions.find((s) => s._id === selectedRowKeys[0]);
    if (!selected) return;
    setEditing(selected);
    // فك التاريخ والوقت وص/م من الحقل المدمج
    const parseDateField = (combined: string) => {
      if (!combined) return { date: '', time: '', ampm: '' };
      const parts = combined.split(' - ');
      const date = parts[0]?.trim() || '';
      const timeAndAmPm = parts[1]?.trim() || '';
      const ampmMatch = timeAndAmPm.match(/(صباحاً|مساءً)/);
      const ampm = ampmMatch ? ampmMatch[0] : '';
      const time = timeAndAmPm.replace(/(صباحاً|مساءً)/, '').trim();
      return { date, time, ampm };
    };
    const sd = parseDateField(selected.sessionDate);
    const nsd = parseDateField(selected.nextSessionDate);
    form.setFieldsValue({
      ...selected,
      caseId: selected.caseId?._id || selected.caseId,
      courtId: selected.courtId?._id || selected.courtId,
      sessionDate: sd.date,
      sessionTime: sd.time,
      sessionAmPm: sd.ampm,
      nextSessionDate: nsd.date,
      nextSessionTime: nsd.time,
      nextSessionAmPm: nsd.ampm,
    });
    setFileList([]);
    setModalOpen(true);
  };

  // حساب رقم الجلسة التلقائي عند اختيار القضية
  const handleCaseChange = (caseId: string) => {
    const caseSessions = sessions.filter(s => s.caseId === caseId || s.caseId?._id === caseId);
    const nextNum = caseSessions.length + 1;
    setSessionNumber(nextNum);
    form.setFieldValue('sessionNumber', nextNum);

    // ملء المحكمة تلقائياً من القضية
    const selectedCase = cases.find(c => c._id === caseId);
    if (selectedCase?.courtId) {
      form.setFieldValue('courtId', selectedCase.courtId?._id || selectedCase.courtId);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      // دمج التاريخ والوقت وص/م في حقل واحد
      const formatDateField = (date: string, time: string, ampm: string) => {
        if (!date) return '';
        let result = date;
        if (time) result += ` - ${time}`;
        if (ampm) result += ` ${ampm}`;
        return result;
      };

      const payload = {
        ...values,
        sessionDate: formatDateField(values.sessionDate, values.sessionTime, values.sessionAmPm),
        nextSessionDate: formatDateField(values.nextSessionDate, values.nextSessionTime, values.nextSessionAmPm),
      };
      delete payload.sessionTime;
      delete payload.sessionAmPm;
      delete payload.nextSessionTime;
      delete payload.nextSessionAmPm;

      setSubmitting(true);
      let sessionId: string;

      if (editing?._id) {
        await sessionsApi.update(editing._id, payload);
        sessionId = editing._id;
        message.success('تم تحديث الجلسة');
      } else {
        const res = await sessionsApi.create(payload);
        sessionId = res.data.data?._id || res.data._id;
        message.success('تم إضافة الجلسة');
      }

      // رفع المرفقات
      if (fileList.length > 0 && sessionId) {
        for (const file of fileList) {
          const rawFile = file.originFileObj;
          if (!rawFile) continue;
          const uploadRes = await fileApi.upload(rawFile);
          const fileId = uploadRes.data.data?.fileId || uploadRes.data.fileId;
          const fileName = uploadRes.data.data?.fileName || rawFile.name;
          await api.post('/session-documents', {
            caseSessionId: sessionId,
            documentName: rawFile.name,
            fileId,
            fileName,
            documentType: 'مرفق جلسة',
          });
        }
        message.success(`تم رفع ${fileList.length} مرفق`);
      }

      setModalOpen(false);
      fetchData();
    } catch (e: any) { if (!e?.errorFields) message.error('حدث خطأ'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('يرجى اختيار جلسة للحذف');
      return;
    }
    Modal.confirm({
      title: 'هل أنت متأكد من حذف هذه الجلسة؟',
      okText: 'نعم',
      cancelText: 'إلغاء',
      okButtonProps: { style: { background: '#c0392b', borderColor: '#c0392b' } },
      onOk: async () => {
        try {
          await Promise.all(selectedRowKeys.map((key) => sessionsApi.delete(key)));
          message.success('تم حذف الجلسة');
          setSelectedRowKeys([]);
          fetchData();
        } catch { message.error('حدث خطأ أثناء الحذف'); }
      },
    });
  };

  const columns = [
    { title: 'رقم الجلسة', dataIndex: 'sessionNumber', width: 80 },
    { title: 'القضية', dataIndex: 'caseNumber', width: 80 },
    { title: 'الموكل', dataIndex: 'customerName', width: 100, ellipsis: true },
    { title: 'التاريخ', dataIndex: 'sessionDate', width: 140 },
    { title: 'المحكمة', dataIndex: 'courtName', ellipsis: true },
    { title: 'القاعة', dataIndex: 'hallNumber', width: 60 },
    { title: 'الموضوع', dataIndex: 'subject', ellipsis: true },
    { title: 'النوع', dataIndex: 'sessionType', ellipsis: true },
    { title: 'القرار', dataIndex: 'sessionDecision', ellipsis: true },
    { title: 'الجلسة القادمة', dataIndex: 'nextSessionDate', width: 140 },
  ];

  return (
    <div>
      <PageHeader
        title="إدارة جلسات المحاكم"
        subtitle="تسجيل جلسات القضايا ومواعيدها وقراراتها والجلسة القادمة"
        onAdd={openAdd}
        onEdit={openEdit}
        onDelete={handleDelete}
        addLabel="إضافة +"
      />
      <div style={{ marginBottom: 10 }}>
        <Text>الجلسات القادمة فقط: </Text>
        <Switch checked={upcomingOnly} onChange={setUpcomingOnly} />
      </div>
      <Table
        columns={columns}
        dataSource={filtered}
        rowKey="_id"
        loading={loading}
        size="small"
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys),
        }}
        pagination={{ pageSize: 10 }}
      />

      <AppModal
        title={editing ? 'تعديل جلسة' : 'إضافة جلسة جديدة'}
        subtitle="أدخل بيانات الجلسة والمعلومات المطلوبة"
        icon={<CalendarOutlined />}
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
          {/* القسم 1: بيانات القضية */}
          <FormSection icon={<FileTextOutlined />} title="بيانات القضية">
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item label="فلتر بالموكل">
                  <Select
                    allowClear
                    placeholder="اختر موكلاً للتصفية"
                    optionFilterProp="children"
                    options={customers.map((c: any) => ({ value: c._id, label: c.name }))}
                    suffixIcon={<UserOutlined />}
                    value={clientFilter}
                    onChange={(val) => setClientFilter(val)}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="القضية" name="caseId" rules={[{ required: true, message: 'يرجى اختيار القضية' }]}>
                  <Select
                    showSearch
                    placeholder="اكتب للبحث"
                    optionFilterProp="children"
                    options={filteredCases.map((c: any) => ({
                      value: c._id,
                      label: `${c.caseNumber}`,
                    }))}
                    suffixIcon={<SearchOutlined />}
                    onChange={handleCaseChange}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="المحكمة" name="courtId" rules={[{ required: true, message: 'يرجى اختيار المحكمة' }]}>
                  <Select
                    showSearch
                    placeholder="اختر المحكمة"
                    optionFilterProp="children"
                    options={courts.map((c: any) => ({ value: c._id, label: c.name }))}
                    suffixIcon={<BankOutlined />}
                  />
                </Form.Item>
              </Col>
            </Row>
          </FormSection>

          {/* القسم 2: بيانات الجلسة الحالية */}
          <FormSection icon={<CalendarOutlined />} title="بيانات الجلسة الحالية">
            <Row gutter={16}>
              <Col span={6}>
                <Form.Item name="sessionNumber" label="رقم الجلسة" rules={[{ required: true, message: 'مطلوب' }]}>
                  <Input type="number" dir="ltr" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="rollNumber" label="رقم الرول">
                  <Input placeholder="رقم الرول" dir="ltr" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="hallNumber" label="رقم القاعة">
                  <Input placeholder="رقم القاعة" dir="ltr" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="sessionType" label="نوع الجلسة" rules={[{ required: true, message: 'مطلوب' }]}>
                  <Select placeholder="اختر النوع" options={sessionTypeOptions} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="sessionDate" label="تاريخ الجلسة" rules={[{ required: true, message: 'مطلوب' }]}>
                  <Input type="date" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="sessionTime" label="وقت الجلسة">
                  <Input type="time" dir="ltr" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="sessionAmPm" label="ص/م">
                  <Select placeholder="اختر" options={ampmOptions} />
                </Form.Item>
              </Col>
            </Row>
          </FormSection>

          {/* القسم 3: نتيجة الجلسة */}
          <FormSection icon={<AuditOutlined />} title="نتيجة الجلسة">
            <Form.Item name="subject" label="موضوع الجلسة" rules={[{ required: true, message: 'مطلوب' }]}>
              <Input.TextArea rows={2} placeholder="موضوع الجلسة" />
            </Form.Item>
            <Form.Item name="sessionDecision" label="قرار الجلسة" rules={[{ required: true, message: 'مطلوب' }]}>
              <Input.TextArea rows={2} placeholder="قرار الجلسة" />
            </Form.Item>
          </FormSection>

          {/* القسم 4: الجلسة القادمة (اختياري) */}
          <FormSection icon={<CalendarOutlined />} title="الجلسة القادمة (اختياري)">
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="nextSessionDate" label="تاريخ الجلسة القادمة">
                  <Input type="date" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="nextSessionTime" label="وقت الجلسة القادمة">
                  <Input type="time" dir="ltr" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="nextSessionAmPm" label="ص/م">
                  <Select placeholder="اختر" options={ampmOptions} />
                </Form.Item>
              </Col>
            </Row>
          </FormSection>

          {/* القسم 5: ملاحظات ومرفقات */}
          <FormSection icon={<PaperClipOutlined />} title="ملاحظات ومرفقات">
            <Form.Item name="notes" label="ملاحظات" rules={[{ required: true, message: 'مطلوب' }]}>
              <Input.TextArea rows={2} placeholder="ملاحظات إضافية" />
            </Form.Item>
            <div style={{
              background: '#fff', border: '1px dashed #d9d9d9',
              borderRadius: 8, padding: '12px 16px', marginBottom: 8,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <UploadOutlined style={{ color: '#C9A227' }} />
                <span style={{ fontWeight: 600, fontSize: 13, color: '#2c3e50' }}>المرفقات</span>
                <span style={{ fontSize: 11, color: '#999' }}>(مستندات، صور، محاضر...)</span>
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
            </div>
          </FormSection>
        </Form>
      </AppModal>
    </div>
  );
}
