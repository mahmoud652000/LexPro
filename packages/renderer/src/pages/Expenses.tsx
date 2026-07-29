import { useState, useEffect, useCallback } from 'react';
import { Table, Modal, Form, Input, Select, DatePicker, Button, message, Row, Col, Card, Statistic, Popconfirm, Upload } from 'antd';
import { ShoppingCartOutlined, PlusOutlined, DeleteOutlined, PaperClipOutlined, BookOutlined } from '@ant-design/icons';
import { createCrudApi, fileApi } from '../api/client';
import { PageHeader } from '../components/PageHeader';
import { AppModal } from '../components/AppModal';
import dayjs from 'dayjs';

const expensesApi = createCrudApi('/expenses');
const customersApi = createCrudApi('/customers');
const expenseDocsApi = createCrudApi('/expense-documents');

const EXPENSE_CATEGORIES = [
  'رسوم قضائية',
  'خبراء ومحكمين',
  'مستندات ونسخ',
  'انتقالات ومواصلات',
  'أتعاب استشارية',
  'مصاريف إدارية',
  'أخرى',
];

export default function Expenses() {
  const [data, setData] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<any[]>([]);

  // نافذة اختيار الموكل
  const [selectCustomerOpen, setSelectCustomerOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  // نافذة سجل المصروفات
  const [logOpen, setLogOpen] = useState(false);
  const [customerExpenses, setCustomerExpenses] = useState<any[]>([]);
  const [logLoading, setLogLoading] = useState(false);

  // إضافة سريعة
  const [quickForm, setQuickForm] = useState({
    amount: '',
    description: '',
    category: 'رسوم قضائية',
    expenseDate: dayjs().format('YYYY-MM-DD'),
  });
  const [adding, setAdding] = useState(false);

  // مستندات المصروف
  const [docsModalOpen, setDocsModalOpen] = useState(false);
  const [docsForExpense, setDocsForExpense] = useState<any>(null);
  const [expenseDocs, setExpenseDocs] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [expRes, custRes] = await Promise.all([expensesApi.getAll(), customersApi.getAll()]);
      setData(expRes.data.data || expRes.data || []);
      setCustomers(custRes.data.data || custRes.data || []);
    } catch { message.error('حدث خطأ'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openAdd = () => {
    setSelectedCustomer(null);
    setSelectCustomerOpen(true);
  };

  const openLog = async () => {
    if (!selectedCustomer) {
      message.warning('يرجى اختيار موكل');
      return;
    }
    setSelectCustomerOpen(false);
    setLogOpen(true);
    fetchCustomerExpenses(selectedCustomer._id);
  };

  const fetchCustomerExpenses = async (customerId: string) => {
    setLogLoading(true);
    try {
      const res = await expensesApi.getAll();
      const all = res.data.data || res.data || [];
      const filtered = all.filter((e: any) => e.customerId === customerId || e.customerId?._id === customerId);
      setCustomerExpenses(filtered);
    } catch { message.error('تعذر تحميل المصروفات'); }
    finally { setLogLoading(false); }
  };

  const handleQuickAdd = async () => {
    if (!selectedCustomer) return;
    if (!quickForm.amount || Number(quickForm.amount) <= 0) {
      message.warning('أدخل مبلغاً صحيحاً');
      return;
    }
    setAdding(true);
    try {
      await expensesApi.create({
        customerId: selectedCustomer._id,
        amount: quickForm.amount,
        description: quickForm.description || '—',
        category: quickForm.category,
        expenseDate: quickForm.expenseDate,
      });
      message.success('تمت الإضافة');
      setQuickForm({ ...quickForm, amount: '', description: '' });
      fetchCustomerExpenses(selectedCustomer._id);
      fetchData();
    } catch { message.error('تعذر الإضافة'); }
    finally { setAdding(false); }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      await expensesApi.delete(id);
      message.success('تم الحذف');
      if (selectedCustomer) fetchCustomerExpenses(selectedCustomer._id);
      fetchData();
    } catch { message.error('تعذر الحذف'); }
  };

  const handleOpenDocs = async (expense: any) => {
    setDocsForExpense(expense);
    setDocsModalOpen(true);
    try {
      const res = await expenseDocsApi.getById(expense._id);
      setExpenseDocs(res.data.data || []);
    } catch { setExpenseDocs([]); }
  };

  const handleUploadDoc = async (file: File) => {
    if (!docsForExpense) return;
    try {
      const uploadRes = await fileApi.upload(file);
      const fileId = uploadRes.data.data?.fileId || uploadRes.data.fileId;
      await expenseDocsApi.create({
        expenseId: docsForExpense._id,
        fileId,
        fileName: file.name,
      });
      message.success('تم رفع المستند');
      const res = await expenseDocsApi.getById(docsForExpense._id);
      setExpenseDocs(res.data.data || []);
    } catch { message.error('تعذر رفع المستند'); }
  };

  const handleDeleteDoc = async (docId: string) => {
    try {
      await expenseDocsApi.delete(docId);
      message.success('تم الحذف');
      if (docsForExpense) {
        const res = await expenseDocsApi.getById(docsForExpense._id);
        setExpenseDocs(res.data.data || []);
      }
    } catch { message.error('تعذر الحذف'); }
  };

  const totalExpenses = customerExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

  const columns = [
    { title: 'الموكل', dataIndex: 'customerName' },
    { title: 'القضية', dataIndex: 'caseNumber' },
    { title: 'المبلغ', dataIndex: 'amount' },
    { title: 'التاريخ', dataIndex: 'expenseDate' },
    { title: 'الفئة', dataIndex: 'category' },
    { title: 'البيان', dataIndex: 'description', ellipsis: true },
  ];

  const logColumns = [
    {
      title: 'تاريخ المصروف',
      dataIndex: 'expenseDate',
      key: 'expenseDate',
      width: 120,
    },
    {
      title: 'الفئة',
      dataIndex: 'category',
      key: 'category',
      width: 140,
      render: (cat: string) => <span style={{ fontSize: 13 }}>{cat}</span>,
    },
    {
      title: 'البيان',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'المبلغ (ج.م)',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      render: (amount: number) => (
        <span style={{ color: '#c0392b', fontWeight: 600 }}>
          {Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      title: '',
      key: 'docs',
      width: 40,
      render: (_: any, record: any) => (
        <Button
          type="text"
          icon={<PaperClipOutlined />}
          size="small"
          onClick={() => handleOpenDocs(record)}
        />
      ),
    },
    {
      title: '',
      key: 'delete',
      width: 40,
      render: (_: any, record: any) => (
        <Popconfirm
          title="حذف هذا المصروف؟"
          onConfirm={() => handleDeleteExpense(record._id)}
          okText="حذف"
          cancelText="إلغاء"
          okButtonProps={{ danger: true }}
        >
          <Button type="text" danger icon={<DeleteOutlined />} size="small" />
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="المصاريف"
        subtitle="تسجيل مصاريف القضايا والموكلين"
        onAdd={openAdd}
        addLabel="إضافة +"
      />
      <Table
        columns={columns}
        dataSource={data}
        rowKey="_id"
        loading={loading}
        size="small"
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys),
        }}
        pagination={{ pageSize: 10 }}
      />

      {/* نافذة اختيار الموكل */}
      <Modal
        open={selectCustomerOpen}
        onCancel={() => setSelectCustomerOpen(false)}
        title="اختيار موكل"
        footer={[
          <Button key="cancel" onClick={() => setSelectCustomerOpen(false)}>إلغاء</Button>,
          <Button key="open" type="primary" onClick={openLog} disabled={!selectedCustomer}>
            فتح السجل
          </Button>,
        ]}
        width={480}
      >
        <div style={{ padding: '12px 0' }}>
          <p style={{ color: '#999', fontSize: 13, marginBottom: 16 }}>
            سيتم فتح سجل المصروفات الخاص بالموكل لإضافة ومعاملة المصاريف
          </p>
          <Select
            showSearch
            placeholder="اختر موكل..."
            style={{ width: '100%' }}
            optionFilterProp="children"
            value={selectedCustomer?._id}
            onChange={(val) => setSelectedCustomer(customers.find((c) => c._id === val))}
            options={customers.map((c: any) => ({ value: c._id, label: c.name }))}
          />
        </div>
      </Modal>

      {/* نافذة سجل المصروفات */}
      <Modal
        open={logOpen}
        onCancel={() => setLogOpen(false)}
        footer={null}
        width={800}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BookOutlined style={{ fontSize: 20, color: '#ea580c' }} />
            <span>مصروفات — {selectedCustomer?.name}</span>
          </div>
        }
      >
        <p style={{ color: '#999', fontSize: 13, marginTop: -4 }}>
          سجل جميع المصروفات والمدفوعات الخاصة بهذا الموكل
        </p>

        {/* ملخص المصروفات */}
        <Card size="small" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Statistic
                title="إجمالي المصروفات"
                value={totalExpenses}
                precision={2}
                suffix="ج.م"
                valueStyle={{ color: '#c0392b', fontSize: 20 }}
              />
            </Col>
            <Col span={12}>
              <Statistic
                title="عدد المعاملات"
                value={customerExpenses.length}
                valueStyle={{ fontSize: 20 }}
              />
            </Col>
          </Row>
        </Card>

        <Table
          columns={logColumns}
          dataSource={customerExpenses}
          rowKey="_id"
          loading={logLoading}
          size="small"
          pagination={false}
          locale={{ emptyText: 'لا توجد مصروفات مسجلة' }}
          style={{ marginBottom: 16 }}
        />

        {/* شريط الإضافة السريعة */}
        <div style={{
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          padding: '12px',
          background: '#fafbfc',
          borderRadius: 10,
          border: '1px solid #f0f0f0',
        }}>
          <Button
            type="primary"
            shape="circle"
            icon={<PlusOutlined />}
            onClick={handleQuickAdd}
            loading={adding}
            style={{ background: '#27ae60', borderColor: '#27ae60', minWidth: 36, height: 36 }}
          />
          <Input
            placeholder="0"
            value={quickForm.amount}
            onChange={(e) => setQuickForm({ ...quickForm, amount: e.target.value })}
            type="number"
            style={{ width: 90 }}
          />
          <Input
            placeholder="بيان المصروف"
            value={quickForm.description}
            onChange={(e) => setQuickForm({ ...quickForm, description: e.target.value })}
            style={{ flex: 1 }}
          />
          <Select
            value={quickForm.category}
            onChange={(val) => setQuickForm({ ...quickForm, category: val })}
            style={{ width: 150 }}
            options={EXPENSE_CATEGORIES.map((c) => ({ value: c, label: c }))}
          />
          <Input
            type="date"
            value={quickForm.expenseDate}
            onChange={(e) => setQuickForm({ ...quickForm, expenseDate: e.target.value })}
            style={{ width: 150 }}
          />
        </div>
      </Modal>

      {/* نافذة مستندات المصروف */}
      <Modal
        open={docsModalOpen}
        onCancel={() => setDocsModalOpen(false)}
        footer={null}
        title={`مستندات المصروف`}
        width={500}
      >
        <Upload
          beforeUpload={(file) => {
            handleUploadDoc(file);
            return false;
          }}
          showUploadList={false}
        >
          <Button icon={<PaperClipOutlined />} style={{ marginBottom: 12 }}>إرفاق مستند</Button>
        </Upload>
        <Table
          dataSource={expenseDocs}
          columns={[
            { title: 'اسم الملف', dataIndex: 'fileName', key: 'fileName' },
            {
              title: '',
              key: 'actions',
              width: 80,
              render: (_: any, record: any) => (
                <Popconfirm
                  title="حذف المستند؟"
                  onConfirm={() => handleDeleteDoc(record._id)}
                  okText="حذف"
                  cancelText="إلغاء"
                  okButtonProps={{ danger: true }}
                >
                  <Button type="text" danger icon={<DeleteOutlined />} size="small" />
                </Popconfirm>
              ),
            },
          ]}
          rowKey="_id"
          size="small"
          pagination={false}
          locale={{ emptyText: 'لا توجد مستندات' }}
        />
      </Modal>
    </div>
  );
}
