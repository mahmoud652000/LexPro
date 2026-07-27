import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Modal, Form, Input, Select, message, Row, Col, Upload, Button, Typography } from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import {
  PlusOutlined, TeamOutlined, FileTextOutlined, SaveOutlined,
  UploadOutlined, PaperClipOutlined, FolderOpenOutlined,
  UserOutlined, SearchOutlined, BankOutlined, CalendarOutlined,
  NumberOutlined, FlagOutlined, EnvironmentOutlined, DeleteOutlined,
} from '@ant-design/icons';
import { createCrudApi, fileApi } from '../api/client';
import api from '../api/client';
import { PageHeader } from '../components/PageHeader';
import { AppModal, FormSection } from '../components/AppModal';

const { Title, Text } = Typography;

const casesApi = createCrudApi('/cases');
const customersApi = createCrudApi('/customers');
const courtsApi = createCrudApi('/courts');
const caseTypesApi = createCrudApi('/case-types');
const caseDocsApi = createCrudApi('/case-documents');

export default function Cases() {
  const navigate = useNavigate();
  const [cases, setCases] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [courts, setCourts] = useState<any[]>([]);
  const [caseTypes, setCaseTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<any[]>([]);
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [casesRes, custRes, courtsRes, typesRes] = await Promise.all([
        casesApi.getAll(), customersApi.getAll(), courtsApi.getAll(), caseTypesApi.getAll(),
      ]);
      setCases(casesRes.data.data || casesRes.data || []);
      setCustomers(custRes.data.data || custRes.data || []);
      setCourts(courtsRes.data.data || courtsRes.data || []);
      setCaseTypes(typesRes.data.data || typesRes.data || []);
    } catch { message.error('حدث خطأ أثناء تحميل البيانات'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const filtered = cases.filter((c: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (c.caseNumber || '').includes(q) || (c.customerName || '').toLowerCase().includes(q);
  });

  const openAdd = () => {
    setEditing(null);
    form.resetFields();
    setFileList([]);
    setModalOpen(true);
  };

  const openEdit = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('يرجى اختيار قضية للتعديل');
      return;
    }
    const selected = cases.find((c) => c._id === selectedRowKeys[0]);
    if (!selected) return;
    setEditing(selected);
    form.setFieldsValue({
      ...selected,
      customerId: selected.customerId?._id || selected.customerId,
      courtId: selected.courtId?._id || selected.courtId,
      caseTypeId: selected.caseTypeId?._id || selected.caseTypeId,
    });
    setFileList([]);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      let caseId: string;

      if (editing?._id) {
        await casesApi.update(editing._id, values);
        caseId = editing._id;
        message.success('تم تحديث القضية');
      } else {
        const res = await casesApi.create(values);
        caseId = res.data.data?._id || res.data._id;
        message.success('تم إضافة القضية');
      }

      // رفع المرفقات
      if (fileList.length > 0 && caseId) {
        for (const file of fileList) {
          const rawFile = file.originFileObj;
          if (!rawFile) continue;
          const uploadRes = await fileApi.upload(rawFile);
          const fileId = uploadRes.data.data?.fileId || uploadRes.data.fileId;
          const fileName = uploadRes.data.data?.fileName || rawFile.name;
          await caseDocsApi.create({
            caseId,
            documentName: rawFile.name,
            documentType: 'مرفق',
            fileId,
            fileName,
            notes: '',
          });
        }
        message.success(`تم رفع ${fileList.length} مرفق`);
      }

      setModalOpen(false);
      fetchAll();
    } catch (e: any) { if (!e?.errorFields) message.error('حدث خطأ'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('يرجى اختيار قضية للحذف');
      return;
    }
    Modal.confirm({
      title: 'هل أنت متأكد من حذف هذه القضية؟',
      okText: 'نعم',
      cancelText: 'إلغاء',
      okButtonProps: { style: { background: '#c0392b', borderColor: '#c0392b' } },
      onOk: async () => {
        try {
          await Promise.all(selectedRowKeys.map((key) => casesApi.delete(key)));
          message.success('تم حذف القضية');
          setSelectedRowKeys([]);
          fetchAll();
        } catch { message.error('حدث خطأ أثناء الحذف'); }
      },
    });
  };

  const columns = [
    { title: 'رقم القضية', dataIndex: 'caseNumber', width: 80, render: (t: string, r: any) => <a onClick={() => navigate(`/cases/${r._id}`)}>{t}</a> },
    { title: 'السنة', dataIndex: 'caseYear', width: 60 },
    { title: 'الموكل', dataIndex: 'customerName', ellipsis: true },
    { title: 'صفة الموكل', dataIndex: 'clientCapacity', ellipsis: true },
    { title: 'الخصم', dataIndex: 'opponentName', ellipsis: true },
    { title: 'صفة الخصم', dataIndex: 'opponentCapacity', ellipsis: true },
    { title: 'المحكمة', dataIndex: 'courtName', ellipsis: true },
    { title: 'الدائرة', dataIndex: 'circuitNumber', width: 60 },
    { title: 'نوع القضية', dataIndex: 'caseTypeName', ellipsis: true },
    { title: 'الموضوع', dataIndex: 'caseSubject', ellipsis: true },
    { title: 'تاريخ الإضافة', dataIndex: 'createdDate', width: 100, render: (v: string) => v ? new Date(v).toLocaleDateString('en-GB') : '' },
  ];

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 10 }, (_, i) => ({ value: currentYear - i, label: String(currentYear - i) }));

  return (
    <div>
      <PageHeader
        title="إدارة ملفات القضايا"
        subtitle="تسجيل قضايا الموكلين وربطها بالمحاكم والدوائر"
        onAdd={openAdd}
        onEdit={openEdit}
        onDelete={handleDelete}
        searchValue={search}
        onSearch={setSearch}
        addLabel="إضافة +"
      />
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
        title={editing ? 'تعديل قضية' : 'إضافة قضية جديدة'}
        subtitle="أدخل بيانات القضية وأطرافها"
        icon={<FolderOpenOutlined />}
        iconColor="#27ae60"
        iconColorTo="#2ecc71"
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        okText="حفظ"
        cancelText="إلغاء"
        width={820}
      >
        <Form form={form} layout="vertical">
          {/* Section 1: Case Parties */}
          <FormSection icon={<TeamOutlined />} title="أطراف القضية">
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item label="الموكل" name="customerId" rules={[{ required: true, message: 'يرجى اختيار الموكل' }]}>
                  <Select
                    showSearch
                    placeholder="اختر الموكل"
                    optionFilterProp="children"
                    options={customers.map((c: any) => ({ value: c._id, label: c.name }))}
                    suffixIcon={<UserOutlined />}
                    dropdownRender={(menu) => (
                      <>
                        {menu}
                        <div style={{ padding: 4, borderTop: '1px solid #e8e8e8', marginTop: 4 }}>
                          <Button type="text" icon={<PlusOutlined />} style={{ color: '#27ae60' }} onClick={() => navigate('/customers')} block>
                            إضافة موكل جديد
                          </Button>
                        </div>
                      </>
                    )}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="صفة الموكل" name="clientCapacity">
                  <Input placeholder="صفة الموكل" prefix={<FlagOutlined />} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="نوع القضية" name="caseTypeId" rules={[{ required: true, message: 'يرجى اختيار نوع القضية' }]}>
                  <Select
                    showSearch
                    placeholder="اختر نوع القضية"
                    optionFilterProp="children"
                    options={caseTypes.map((c: any) => ({ value: c._id, label: c.name }))}
                    dropdownRender={(menu) => (
                      <>
                        {menu}
                        <div style={{ padding: 4, borderTop: '1px solid #e8e8e8', marginTop: 4 }}>
                          <Button type="text" icon={<PlusOutlined />} style={{ color: '#8e44ad' }} onClick={() => navigate('/settings/case-types')} block>
                            إضافة نوع قضية
                          </Button>
                        </div>
                      </>
                    )}
                  />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item label="اسم الخصم" name="opponentName" rules={[{ required: true, message: 'يرجى إدخال اسم الخصم' }]}>
                  <Input placeholder="اسم الخصم" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="صفة الخصم" name="opponentCapacity">
                  <Input placeholder="صفة الخصم" prefix={<FlagOutlined />} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="المحكمة المختصة" name="courtId" rules={[{ required: true, message: 'يرجى اختيار المحكمة' }]}>
                  <Select
                    showSearch
                    placeholder="اختر المحكمة"
                    optionFilterProp="children"
                    options={courts.map((c: any) => ({ value: c._id, label: c.name }))}
                    suffixIcon={<BankOutlined />}
                    dropdownRender={(menu) => (
                      <>
                        {menu}
                        <div style={{ padding: 4, borderTop: '1px solid #e8e8e8', marginTop: 4 }}>
                          <Button type="text" icon={<PlusOutlined />} style={{ color: '#e67e22' }} onClick={() => navigate('/settings/courts')} block>
                            إضافة محكمة
                          </Button>
                        </div>
                      </>
                    )}
                  />
                </Form.Item>
              </Col>
            </Row>
          </FormSection>

          {/* Section 2: Case Data */}
          <FormSection icon={<FileTextOutlined />} title="بيانات القضية">
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item label="رقم الدائرة" name="circuitNumber">
                  <Input placeholder="رقم الدائرة" prefix={<NumberOutlined />} dir="ltr" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="رقم القضية" name="caseNumber" rules={[{ required: true, message: 'يرجى إدخال رقم القضية' }]}>
                  <Input placeholder="رقم القضية" prefix={<NumberOutlined />} dir="ltr" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="السنة" name="caseYear" rules={[{ required: true, message: 'يرجى اختيار السنة' }]}>
                  <Select options={yearOptions} suffixIcon={<CalendarOutlined />} />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item label="موضوع القضية / تفاصيل" name="caseSubject">
              <Input.TextArea rows={3} placeholder="موضوع القضية / تفاصيل" />
            </Form.Item>

            {/* المرفقات */}
            <div style={{
              background: '#fff',
              border: '1px dashed #d9d9d9',
              borderRadius: 8,
              padding: '12px 16px',
              marginBottom: 8,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <PaperClipOutlined style={{ color: '#C9A227' }} />
                <span style={{ fontWeight: 600, fontSize: 13, color: '#2c3e50' }}>المرفقات</span>
                <span style={{ fontSize: 11, color: '#999' }}>(مستندات، صور، عقود...)</span>
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
