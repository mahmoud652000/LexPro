import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Card,
  Descriptions,
  Popconfirm,
  Space,
  Spin,
  Table,
  Tabs,
  Typography,
  Upload,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  ArrowRightOutlined,
  DeleteOutlined,
  EyeOutlined,
  FileOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import api, { createCrudApi, fileApi } from '../api/client';

const { Title } = Typography;

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

interface CaseItem {
  id: string;
  caseNumber?: string;
  title?: string;
  customerId?: string;
  court?: string;
  caseType?: string;
  status?: string;
  filedDate?: string;
  nextSessionDate?: string;
}

interface FeeItem {
  id: string;
  customerId?: string;
  amount?: number;
  collectedAmount?: number;
  paidAmount?: number;
  agreementType?: string;
  status?: string;
  date?: string;
  notes?: string;
}

interface ExpenseItem {
  id: string;
  customerId?: string;
  amount?: number;
  description?: string;
  date?: string;
  category?: string;
}

interface CustomerDocument {
  id: string;
  customerId?: string;
  name?: string;
  fileName?: string;
  fileId?: string;
  filePath?: string;
  uploadedAt?: string;
  createdAt?: string;
}

const customersApi = createCrudApi<Customer>('customers');
const casesApi = createCrudApi<CaseItem>('cases');
const feesApi = createCrudApi<FeeItem>('fees');
const expensesApi = createCrudApi<ExpenseItem>('expenses');

const formatCurrency = (value?: number | null): string => {
  if (value == null) return '—';
  return Number(value).toLocaleString('ar-EG');
};

const formatDate = (value?: string): string => {
  if (!value) return '—';
  return dayjs(value).format('YYYY-MM-DD');
};

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loadingCustomer, setLoadingCustomer] = useState(true);

  const [cases, setCases] = useState<CaseItem[]>([]);
  const [loadingCases, setLoadingCases] = useState(false);

  const [documents, setDocuments] = useState<CustomerDocument[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [fees, setFees] = useState<FeeItem[]>([]);
  const [loadingFees, setLoadingFees] = useState(false);

  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [loadingExpenses, setLoadingExpenses] = useState(false);

  const fetchCustomer = useCallback(async () => {
    if (!id) return;
    setLoadingCustomer(true);
    try {
      const { data } = await customersApi.getById(id);
      setCustomer(data);
    } catch (error) {
      console.error(error);
      message.error('تعذر تحميل بيانات العميل');
    } finally {
      setLoadingCustomer(false);
    }
  }, [id]);

  const fetchCases = useCallback(async () => {
    if (!id) return;
    setLoadingCases(true);
    try {
      const { data } = await casesApi.getAll();
      const list = Array.isArray(data) ? data : [];
      setCases(list.filter((c) => String(c.customerId) === String(id)));
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingCases(false);
    }
  }, [id]);

  const fetchDocuments = useCallback(async () => {
    if (!id) return;
    setLoadingDocuments(true);
    try {
      const { data } = await api.get<CustomerDocument[]>(
        `/customer-documents/${id}`,
      );
      setDocuments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingDocuments(false);
    }
  }, [id]);

  const fetchFees = useCallback(async () => {
    if (!id) return;
    setLoadingFees(true);
    try {
      const { data } = await feesApi.getAll();
      const list = Array.isArray(data) ? data : [];
      setFees(list.filter((f) => String(f.customerId) === String(id)));
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingFees(false);
    }
  }, [id]);

  const fetchExpenses = useCallback(async () => {
    if (!id) return;
    setLoadingExpenses(true);
    try {
      const { data } = await expensesApi.getAll();
      const list = Array.isArray(data) ? data : [];
      setExpenses(list.filter((e) => String(e.customerId) === String(id)));
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingExpenses(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCustomer();
    fetchCases();
    fetchDocuments();
    fetchFees();
    fetchExpenses();
  }, [fetchCustomer, fetchCases, fetchDocuments, fetchFees, fetchExpenses]);

  const handleUpload = async (file: File): Promise<boolean> => {
    if (!id) return false;
    setUploading(true);
    try {
      const uploadRes = await fileApi.upload(file);
      const fileId = uploadRes.data?.data?.fileId;
      await api.post('/customer-documents', {
        customerId: id,
        name: file.name,
        fileName: file.name,
        fileId,
      });
      message.success('تم رفع المستند بنجاح');
      fetchDocuments();
    } catch (error) {
      console.error(error);
      message.error('تعذر رفع المستند');
    } finally {
      setUploading(false);
    }
    return false; // منع الرفع التلقائي من antd
  };

  const handleDeleteDocument = async (doc: CustomerDocument) => {
    try {
      await api.delete(`/customer-documents/${doc.id}`);
      message.success('تم حذف المستند');
      fetchDocuments();
    } catch (error) {
      console.error(error);
      message.error('تعذر حذف المستند');
    }
  };

  const caseColumns: ColumnsType<CaseItem> = [
    {
      title: 'رقم القضية',
      dataIndex: 'caseNumber',
      key: 'caseNumber',
      render: (v: string) => v || '—',
    },
    {
      title: 'عنوان القضية',
      dataIndex: 'title',
      key: 'title',
      render: (v: string) => v || '—',
    },
    {
      title: 'المحكمة',
      dataIndex: 'court',
      key: 'court',
      render: (v: string) => v || '—',
    },
    {
      title: 'النوع',
      dataIndex: 'caseType',
      key: 'caseType',
      render: (v: string) => v || '—',
    },
    {
      title: 'الحالة',
      dataIndex: 'status',
      key: 'status',
      render: (v: string) => v || '—',
    },
    {
      title: 'تاريخ القيد',
      dataIndex: 'filedDate',
      key: 'filedDate',
      render: (v: string) => formatDate(v),
    },
  ];

  const documentColumns: ColumnsType<CustomerDocument> = [
    {
      title: 'اسم المستند',
      key: 'name',
      render: (_, record) => (
        <Space>
          <FileOutlined />
          <span>{record.name || record.fileName || 'مستند'}</span>
        </Space>
      ),
    },
    {
      title: 'تاريخ الرفع',
      key: 'uploadedAt',
      render: (_, record) => {
        const d = record.uploadedAt || record.createdAt;
        return d ? dayjs(d).format('YYYY-MM-DD HH:mm') : '—';
      },
    },
    {
      title: 'إجراءات',
      key: 'actions',
      render: (_, record) => (
        <Space>
          {record.fileId && (
            <Button
              type="link"
              icon={<EyeOutlined />}
              onClick={() => window.open(fileApi.getUrl(record.fileId!), '_blank')}
            >
              عرض
            </Button>
          )}
          <Popconfirm
            title="هل أنت متأكد من حذف هذا المستند؟"
            okText="نعم"
            cancelText="إلغاء"
            onConfirm={() => handleDeleteDocument(record)}
          >
            <Button type="link" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const feeColumns: ColumnsType<FeeItem> = [
    {
      title: 'نوع الاتفاق',
      dataIndex: 'agreementType',
      key: 'agreementType',
      render: (v: string) => v || '—',
    },
    {
      title: 'المبلغ',
      dataIndex: 'amount',
      key: 'amount',
      render: (v?: number) => formatCurrency(v),
    },
    {
      title: 'المحصّل',
      key: 'collected',
      render: (_, record) => formatCurrency(record.collectedAmount ?? record.paidAmount),
    },
    {
      title: 'الحالة',
      dataIndex: 'status',
      key: 'status',
      render: (v: string) => v || '—',
    },
    {
      title: 'التاريخ',
      dataIndex: 'date',
      key: 'date',
      render: (v: string) => formatDate(v),
    },
  ];

  const expenseColumns: ColumnsType<ExpenseItem> = [
    {
      title: 'الوصف',
      dataIndex: 'description',
      key: 'description',
      render: (v: string) => v || '—',
    },
    {
      title: 'الفئة',
      dataIndex: 'category',
      key: 'category',
      render: (v: string) => v || '—',
    },
    {
      title: 'المبلغ',
      dataIndex: 'amount',
      key: 'amount',
      render: (v?: number) => formatCurrency(v),
    },
    {
      title: 'التاريخ',
      dataIndex: 'date',
      key: 'date',
      render: (v: string) => formatDate(v),
    },
  ];

  if (loadingCustomer) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div>
        <Button
          icon={<ArrowRightOutlined />}
          onClick={() => navigate('/customers')}
          style={{ marginBottom: 16 }}
        >
          رجوع للعملاء
        </Button>
        <Title level={4}>لم يتم العثور على العميل</Title>
      </div>
    );
  }

  return (
    <div>
      <Button
        icon={<ArrowRightOutlined />}
        onClick={() => navigate('/customers')}
        style={{ marginBottom: 10 }}
      >
        رجوع للعملاء
      </Button>

      <Card style={{ marginBottom: 10 }} size="small">
        <Descriptions title={customer.name} column={{ xs: 1, sm: 2, md: 3 }} size="small">
          <Descriptions.Item label="الهاتف">{customer.phone || '—'}</Descriptions.Item>
          <Descriptions.Item label="رقم الهوية">{customer.identityNumber || '—'}</Descriptions.Item>
          <Descriptions.Item label="واتساب">{customer.whatsappNumber || '—'}</Descriptions.Item>
          <Descriptions.Item label="البريد الإلكتروني">{customer.email || '—'}</Descriptions.Item>
          <Descriptions.Item label="العنوان">{customer.address || '—'}</Descriptions.Item>
          <Descriptions.Item label="ملاحظات">{customer.notes || '—'}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card>
        <Tabs
          defaultActiveKey="cases"
          items={[
            {
              key: 'cases',
              label: 'القضايا',
              children: (
                <Table
                  columns={caseColumns}
                  dataSource={cases}
                  rowKey="_id"
                  loading={loadingCases}
                  size="small"
                  pagination={{ pageSize: 5 }}
                  locale={{ emptyText: 'لا توجد قضايا لهذا العميل' }}
                />
              ),
            },
            {
              key: 'documents',
              label: 'المستندات',
              children: (
                <>
                  <Upload
                    beforeUpload={handleUpload}
                    showUploadList={false}
                    multiple={false}
                  >
                    <Button
                      type="primary"
                      size="small"
                      icon={<UploadOutlined />}
                      loading={uploading}
                      style={{ marginBottom: 10 }}
                    >
                      رفع مستند
                    </Button>
                  </Upload>
                  <Table
                    columns={documentColumns}
                    dataSource={documents}
                    rowKey="_id"
                    loading={loadingDocuments}
                    size="small"
                    pagination={{ pageSize: 5 }}
                    locale={{ emptyText: 'لا توجد مستندات' }}
                  />
                </>
              ),
            },
            {
              key: 'fees',
              label: 'اتفاقيات الرسوم',
              children: (
                <Table
                  columns={feeColumns}
                  dataSource={fees}
                  rowKey="_id"
                  loading={loadingFees}
                  size="small"
                  pagination={{ pageSize: 5 }}
                  locale={{ emptyText: 'لا توجد اتفاقيات رسوم' }}
                />
              ),
            },
            {
              key: 'expenses',
              label: 'المصاريف',
              children: (
                <Table
                  columns={expenseColumns}
                  dataSource={expenses}
                  rowKey="_id"
                  loading={loadingExpenses}
                  size="small"
                  pagination={{ pageSize: 5 }}
                  locale={{ emptyText: 'لا توجد مصاريف' }}
                />
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
