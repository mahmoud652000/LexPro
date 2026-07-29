import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Table, Modal, Input, Select, Button, message, Row, Col, Card, Statistic, Popconfirm, Upload } from 'antd';
import { PlusOutlined, DeleteOutlined, PaperClipOutlined, BookOutlined, EditOutlined } from '@ant-design/icons';
import { createCrudApi, fileApi } from '../api/client';
import { PageHeader } from '../components/PageHeader';
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

interface CustomerRow {
  customerId: string;
  customerName: string;
  categories: string[];
  totalAmount: number;
  count: number;
  expenses: any[];
}

export default function Expenses() {
  const [allExpenses, setAllExpenses] = useState<any[]>([]);
  const allExpensesRef = useRef<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  // نافذة اختيار الموكل
  const [selectCustomerOpen, setSelectCustomerOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  // نافذة سجل المصروفات
  const [logOpen, setLogOpen] = useState(false);
  const [logCustomer, setLogCustomer] = useState<any>(null);
  const [logExpenses, setLogExpenses] = useState<any[]>([]);
  const [logLoading, setLogLoading] = useState(false);

  // إضافة سريعة
  const [quickForm, setQuickForm] = useState({
    amount: '',
    description: '',
    category: 'رسوم قضائية',
    expenseDate: dayjs().format('YYYY-MM-DD'),
  });
  const [adding, setAdding] = useState(false);

  // تعديل مصروف
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [editForm, setEditForm] = useState({ amount: '', description: '', category: 'رسوم قضائية', expenseDate: '' });

  // مستندات المصروف
  const [docsModalOpen, setDocsModalOpen] = useState(false);
  const [docsForExpense, setDocsForExpense] = useState<any>(null);
  const [expenseDocs, setExpenseDocs] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [expRes, custRes] = await Promise.all([expensesApi.getAll(), customersApi.getAll()]);
      setAllExpenses(expRes.data.data || expRes.data || []);
      allExpensesRef.current = expRes.data.data || expRes.data || [];
      setCustomers(custRes.data.data || custRes.data || []);
    } catch { message.error('حدث خطأ'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // تجميع المصروفات حسب الموكل
  const groupedData: CustomerRow[] = useMemo(() => {
    const map = new Map<string, CustomerRow>();
    for (const exp of allExpenses) {
      const custId = exp.customerId?._id || exp.customerId;
      const custName = exp.customerName || exp.customerId?.name || 'غير محدد';
      if (!map.has(custId)) {
        map.set(custId, {
          customerId: custId,
          customerName: custName,
          categories: [],
          totalAmount: 0,
          count: 0,
          expenses: [],
        });
      }
      const row = map.get(custId)!;
      row.totalAmount += Number(exp.amount || 0);
      row.count += 1;
      row.expenses.push(exp);
      if (exp.category && !row.categories.includes(exp.category)) {
        row.categories.push(exp.category);
      }
    }
    let result = Array.from(map.values());
    if (search) {
      result = result.filter((r) => r.customerName.includes(search));
    }
    return result;
  }, [allExpenses, search]);

  const openAdd = () => {
    setSelectedCustomer(null);
    setSelectCustomerOpen(true);
  };

  const openLog = async (customer?: any) => {
    const cust = customer || selectedCustomer;
    if (!cust) {
      message.warning('يرجى اختيار موكل');
      return;
    }
    setSelectCustomerOpen(false);
    setLogCustomer(cust);
    setLogOpen(true);
    fetchCustomerExpenses(cust._id || cust.customerId);
  };

  const fetchCustomerExpenses = async (customerId: string) => {
    setLogLoading(true);
    try {
      const filtered = allExpenses.filter(
        (e: any) => e.customerId === customerId || e.customerId?._id === customerId
      );
      setLogExpenses(filtered);
    } catch { message.error('تعذر تحميل المصروفات'); }
    finally { setLogLoading(false); }
  };

  const handleQuickAdd = async () => {
    if (!logCustomer) return;
    if (!quickForm.amount || Number(quickForm.amount) <= 0) {
      message.warning('أدخل مبلغاً صحيحاً');
      return;
    }
    setAdding(true);
    try {
      await expensesApi.create({
        customerId: logCustomer._id || logCustomer.customerId,
        amount: quickForm.amount,
        description: quickForm.description || '—',
        category: quickForm.category,
        expenseDate: quickForm.expenseDate,
      });
      message.success('تمت الإضافة');
      setQuickForm({ ...quickForm, amount: '', description: '' });
      await fetchData();
      if (logCustomer) {
        const customerId = logCustomer._id || logCustomer.customerId;
        const filtered = allExpensesRef.current.filter(
          (e: any) => e.customerId === customerId || e.customerId?._id === customerId
        );
        setLogExpenses([...filtered]);
      }
    } catch { message.error('تعذر الإضافة'); }
    finally { setAdding(false); }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      await expensesApi.delete(id);
      message.success('تم الحذف');
      fetchData();
    } catch { message.error('تعذر الحذف'); }
  };

  const handleEditExpense = (expense: any) => {
    setEditingExpense(expense);
    setEditForm({
      amount: String(expense.amount || ''),
      description: expense.description || '',
      category: expense.category || 'رسوم قضائية',
      expenseDate: expense.expenseDate || dayjs().format('YYYY-MM-DD'),
    });
  };

  const handleSaveEdit = async () => {
    if (!editingExpense) return;
    try {
      await expensesApi.update(editingExpense._id, {
        amount: editForm.amount,
        description: editForm.description || '—',
        category: editForm.category,
        expenseDate: editForm.expenseDate,
      });
      message.success('تم التحديث');
      setEditingExpense(null);
      fetchData();
    } catch { message.error('تعذر التحديث'); }
  };

  const handleDeleteCustomerExpenses = async (customerId: string) => {
    const customerExps = allExpenses.filter(
      (e: any) => e.customerId === customerId || e.customerId?._id === customerId
    );
    try {
      await Promise.all(customerExps.map((e: any) => expensesApi.delete(e._id)));
      message.success('تم حذف جميع مصروفات الموكل');
      fetchData();
    } catch { message.error('تعذر الحذف'); }
  };

  const handleOpenDocs = async (expense: any) => {
    setDocsForExpense(expense);
    setDocsModalOpen(true);
    try {
      const res = await expenseDocsApi.getAll();
      const allDocs = res.data.data || [];
      const filtered = allDocs.filter((d: any) => d.expenseId === expense._id || d.expenseId?.toString() === expense._id);
      setExpenseDocs(filtered);
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

  const totalExpenses = logExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

  // أعمدة جدول العرض الرئيسي (مجمّع حسب الموكل)
  const columns = [
    {
      title: 'الموكل',
      dataIndex: 'customerName',
      key: 'customerName',
      render: (name: string, record: CustomerRow) => (
        <a
          onClick={() => openLog(record)}
          style={{ color: '#1890ff', cursor: 'pointer', fontWeight: 600 }}
        >
          {name}
        </a>
      ),
    },
    {
      title: 'ملاحظات',
      key: 'categories',
      render: (_: any, record: CustomerRow) => (
        <span style={{ fontSize: 13, color: '#999' }}>
          {record.categories.join('، ')}
        </span>
      ),
    },
    {
      title: 'إجمالي المصروفات',
      key: 'totalAmount',
      width: 160,
      render: (_: any, record: CustomerRow) => (
        <span style={{ color: '#27ae60', fontWeight: 700, fontSize: 15 }}>
          {record.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م
        </span>
      ),
    },
    {
      title: 'عدد المعاملات',
      dataIndex: 'count',
      key: 'count',
      width: 120,
      render: (count: number) => <span style={{ fontWeight: 600 }}>{count}</span>,
    },
    {
      title: '',
      key: 'actions',
      width: 50,
      render: (_: any, record: CustomerRow) => (
        <Popconfirm
          title="حذف جميع مصروفات هذا الموكل؟"
          onConfirm={() => handleDeleteCustomerExpenses(record.customerId)}
          okText="حذف"
          cancelText="إلغاء"
          okButtonProps={{ danger: true }}
        >
          <Button type="text" danger icon={<DeleteOutlined />} size="small" />
        </Popconfirm>
      ),
    },
  ];

  // أعمدة جدول سجل المصروفات
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
      key: 'edit',
      width: 40,
      render: (_: any, record: any) => (
        <Button
          type="text"
          icon={<EditOutlined />}
          size="small"
          onClick={() => handleEditExpense(record)}
        />
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
        searchValue={search}
        onSearch={setSearch}
      />
      <Table
        columns={columns}
        dataSource={groupedData}
        rowKey="customerId"
        loading={loading}
        size="small"
        pagination={{ pageSize: 10 }}
        locale={{ emptyText: 'لا توجد مصروفات' }}
      />

      {/* نافذة اختيار الموكل */}
      <Modal
        open={selectCustomerOpen}
        onCancel={() => setSelectCustomerOpen(false)}
        title="اختيار موكل"
        footer={[
          <Button key="cancel" onClick={() => setSelectCustomerOpen(false)}>إلغاء</Button>,
          <Button key="open" type="primary" onClick={() => openLog()} disabled={!selectedCustomer}>
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
        onCancel={() => {
          setLogOpen(false);
          setLogExpenses([]);
        }}
        footer={null}
        width={800}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BookOutlined style={{ fontSize: 20, color: '#ea580c' }} />
            <span>مصروفات — {logCustomer?.name || logCustomer?.customerName}</span>
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
                valueStyle={{ color: '#27ae60', fontSize: 20 }}
              />
            </Col>
            <Col span={12}>
              <Statistic
                title="عدد المعاملات"
                value={logExpenses.length}
                valueStyle={{ fontSize: 20 }}
              />
            </Col>
          </Row>
        </Card>

        <Table
          columns={logColumns}
          dataSource={logExpenses}
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

      {/* نافذة تعديل المصروف */}
      <Modal
        open={!!editingExpense}
        onCancel={() => setEditingExpense(null)}
        title="تعديل مصروف"
        onOk={handleSaveEdit}
        okText="حفظ"
        cancelText="إلغاء"
        width={480}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 12 }}>
          <Row gutter={12}>
            <Col span={12}>
              <label style={{ fontSize: 13, marginBottom: 4, display: 'block' }}>المبلغ</label>
              <Input
                type="number"
                value={editForm.amount}
                onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
              />
            </Col>
            <Col span={12}>
              <label style={{ fontSize: 13, marginBottom: 4, display: 'block' }}>التاريخ</label>
              <Input
                type="date"
                value={editForm.expenseDate}
                onChange={(e) => setEditForm({ ...editForm, expenseDate: e.target.value })}
              />
            </Col>
          </Row>
          <div>
            <label style={{ fontSize: 13, marginBottom: 4, display: 'block' }}>الفئة</label>
            <Select
              value={editForm.category}
              onChange={(val) => setEditForm({ ...editForm, category: val })}
              style={{ width: '100%' }}
              options={EXPENSE_CATEGORIES.map((c) => ({ value: c, label: c }))}
            />
          </div>
          <div>
            <label style={{ fontSize: 13, marginBottom: 4, display: 'block' }}>البيان</label>
            <Input
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
            />
          </div>
        </div>
      </Modal>

      {/* نافذة مستندات المصروف */}
      <Modal
        open={docsModalOpen}
        onCancel={() => setDocsModalOpen(false)}
        footer={null}
        title="مستندات المصروف"
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
