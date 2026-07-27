import { useEffect, useState } from 'react';
import {
  Form,
  Input,
  Modal,
  Table,
  Row,
  Col,
  Upload,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { UploadFile } from 'antd/es/upload/interface';
import {
  WhatsAppOutlined,
  UploadOutlined,
  PaperClipOutlined,
  DeleteOutlined,
  UserOutlined,
  PhoneOutlined,
  IdcardOutlined,
  MailOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { createCrudApi, fileApi } from '../api/client';
import api from '../api/client';
import { PageHeader } from '../components/PageHeader';
import { AppModal, FormSection } from '../components/AppModal';

interface Customer {
  id: string;
  name: string;
  address?: string;
  phone: string;
  identityNumber?: string;
  whatsappNumber?: string;
  email?: string;
  notes?: string;
}

interface FormValues {
  name: string;
  address?: string;
  phone: string;
  identityNumber?: string;
  whatsappNumber?: string;
  email?: string;
  notes?: string;
}

const customersApi = createCrudApi<Customer>('customers');

export default function Customers() {
  const [form] = Form.useForm<FormValues>();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<any[]>([]);
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const { data } = await customersApi.getAll();
      setCustomers(Array.isArray(data) ? data : (data?.data || []));
    } catch (error) {
      console.error(error);
      message.error('تعذر تحميل قائمة العملاء');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const filtered = customers.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      (c.name || '').toLowerCase().includes(q) ||
      (c.phone || '').toLowerCase().includes(q)
    );
  });

  const openAdd = () => {
    setEditing(null);
    form.resetFields();
    setFileList([]);
    setModalOpen(true);
  };

  const openEdit = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('يرجى اختيار عميل للتعديل');
      return;
    }
    const selected = customers.find((c) => (c as any)._id === selectedRowKeys[0]);
    if (!selected) return;
    setEditing(selected);
    form.setFieldsValue(selected);
    setFileList([]);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    let values: FormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    setSubmitting(true);
    try {
      let customerId: string;

      if (editing) {
        await customersApi.update((editing as any)._id, values);
        customerId = (editing as any)._id;
        message.success('تم تحديث بيانات العميل');
      } else {
        const res = await customersApi.create(values);
        customerId = res.data?.data?._id || res.data?.data?.id || res.data?._id || res.data?.id;
        message.success('تم إضافة العميل بنجاح');
      }

      // رفع المرفقات إن وجدت
      if (fileList.length > 0) {
        for (const file of fileList) {
          const rawFile = file.originFileObj;
          if (!rawFile) continue;
          const uploadRes = await fileApi.upload(rawFile);
          const fileId = uploadRes.data?.data?.fileId || uploadRes.data?.fileId;
          const fileName = uploadRes.data?.data?.fileName || rawFile.name;
          await api.post('/customer-documents', {
            customerId,
            documentName: rawFile.name,
            fileId,
            fileName,
            documentType: '',
          });
        }
        message.success(`تم رفع ${fileList.length} مرفق`);
      }

      setModalOpen(false);
      fetchCustomers();
    } catch (error) {
      console.error(error);
      message.error('حدث خطأ أثناء الحفظ');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('يرجى اختيار عميل للحذف');
      return;
    }
    Modal.confirm({
      title: 'هل أنت متأكد من حذف هذا العميل؟',
      okText: 'نعم',
      cancelText: 'إلغاء',
      onOk: async () => {
        try {
          await Promise.all(selectedRowKeys.map((key) => customersApi.delete(key as string)));
          message.success('تم حذف العميل');
          setSelectedRowKeys([]);
          fetchCustomers();
        } catch (error) {
          console.error(error);
          message.error('تعذر حذف العميل');
        }
      },
    });
  };

  const columns: ColumnsType<Customer> = [
    {
      title: 'م',
      key: 'index',
      width: 50,
      render: (_, __, index) => index + 1,
    },
    { title: 'اسم الموكل', dataIndex: 'name', key: 'name' },
    { title: 'رقم الهاتف', dataIndex: 'phone', key: 'phone' },
    {
      title: 'واتساب',
      dataIndex: 'whatsappNumber',
      key: 'whatsappNumber',
      render: (v: string) => v
        ? (
          <a
            href={`https://wa.me/${v.replace(/[^0-9]/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#25D366', fontWeight: 600 }}
          >
            <WhatsAppOutlined style={{ marginLeft: 4 }} />
            {v}
          </a>
        )
        : '—',
    },
    {
      title: 'البريد الإلكتروني',
      dataIndex: 'email',
      key: 'email',
      render: (v: string) => v
        ? (
          <a
            href={`mailto:${v}`}
            style={{ color: '#1677ff', textDecoration: 'underline' }}
          >
            {v}
          </a>
        )
        : '—',
    },
    {
      title: 'الرقم القومي',
      dataIndex: 'identityNumber',
      key: 'identityNumber',
      render: (v: string) => v || '—',
    },
    {
      title: 'العنوان',
      dataIndex: 'address',
      key: 'address',
      render: (v: string) => v || '—',
    },
    {
      title: 'الملاحظات',
      dataIndex: 'notes',
      key: 'notes',
      render: (v: string) => v || '—',
      ellipsis: true,
    },
  ];

  return (
    <div>
      <PageHeader
        title="العملاء"
        subtitle="إدارة بيانات الموكلين من هذه اللوحة"
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
        locale={{ emptyText: 'لا يوجد عملاء' }}
      />

      <AppModal
        title={editing ? 'تعديل بيانات العميل' : 'إضافة عميل جديد'}
        subtitle="أدخل بيانات الموكل ومعلومات الاتصال"
        icon={<UserOutlined />}
        iconColor="#C9A227"
        iconColorTo="#e0b53e"
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        okText="حفظ"
        cancelText="إلغاء"
        width={680}
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label={
                  <span><UserOutlined style={{ marginLeft: 4 }} />الاسم</span>
                }
                rules={[{ required: true, message: 'الرجاء إدخال الاسم' }]}
              >
                <Input placeholder="اسم الموكل" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="phone"
                label={
                  <span><PhoneOutlined style={{ marginLeft: 4 }} />الهاتف</span>
                }
                rules={[{ required: true, message: 'الرجاء إدخال رقم الهاتف' }]}
              >
                <Input placeholder="رقم الهاتف" dir="ltr" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="identityNumber"
                label={
                  <span><IdcardOutlined style={{ marginLeft: 4 }} />رقم الهوية</span>
                }
              >
                <Input placeholder="الرقم القومي" dir="ltr" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="whatsappNumber"
                label={
                  <span><WhatsAppOutlined style={{ marginLeft: 4, color: '#25D366' }} />رقم الواتساب</span>
                }
              >
                <Input placeholder="رقم الواتساب" dir="ltr" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="email"
                label={
                  <span><MailOutlined style={{ marginLeft: 4 }} />البريد الإلكتروني</span>
                }
              >
                <Input placeholder="example@gmail.com" dir="ltr" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="address"
                label={
                  <span><EnvironmentOutlined style={{ marginLeft: 4 }} />العنوان</span>
                }
              >
                <Input placeholder="العنوان" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="notes"
            label={
              <span><FileTextOutlined style={{ marginLeft: 4 }} />ملاحظات</span>
            }
          >
            <Input.TextArea rows={2} placeholder="ملاحظات إضافية" />
          </Form.Item>

          {/* المرفقات */}
          <div style={{
            background: '#fafafa',
            border: '1px dashed #d9d9d9',
            borderRadius: 8,
            padding: '12px 16px',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 8,
            }}>
              <PaperClipOutlined style={{ color: '#C9A227' }} />
              <span style={{ fontWeight: 600, fontSize: 13, color: '#2c3e50' }}>
                المرفقات
              </span>
              <span style={{ fontSize: 11, color: '#999' }}>
                (مستندات، صور، عقود...)
              </span>
            </div>
            <Upload.Dragger
              fileList={fileList}
              onChange={({ fileList: newList }) => setFileList(newList)}
              beforeUpload={() => false}
              multiple
              maxCount={10}
              onRemove={(file) => {
                setFileList(prev => prev.filter(f => f.uid !== file.uid));
              }}
              style={{ background: 'transparent', borderColor: '#e0e0e0' }}
            >
              <p style={{ margin: 0, fontSize: 13, color: '#999' }}>
                <UploadOutlined style={{ fontSize: 24, color: '#C9A227', marginBottom: 4 }} />
                <br />
                اضغط أو اسحب الملفات هنا
              </p>
            </Upload.Dragger>
          </div>
        </Form>
      </AppModal>
    </div>
  );
}
