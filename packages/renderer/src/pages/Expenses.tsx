import { useState, useEffect, useCallback } from 'react';
import { Table, Modal, Form, Input, Select, message, Row, Col } from 'antd';
import { ShoppingCartOutlined } from '@ant-design/icons';
import { createCrudApi } from '../api/client';
import { PageHeader } from '../components/PageHeader';
import { AppModal } from '../components/AppModal';

const expensesApi = createCrudApi('/expenses');
const customersApi = createCrudApi('/customers');
const casesApi = createCrudApi('/cases');

export default function Expenses() {
  const [data, setData] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [expRes, custRes, caseRes] = await Promise.all([expensesApi.getAll(), customersApi.getAll(), casesApi.getAll()]);
      setData(expRes.data.data || expRes.data || []);
      setCustomers(custRes.data.data || custRes.data || []);
      setCases(caseRes.data.data || caseRes.data || []);
    } catch { message.error('حدث خطأ'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openModal = (record?: any) => {
    setEditing(record || null);
    if (record) form.setFieldsValue(record);
    else form.resetFields();
    setModalOpen(true);
  };

  const openAdd = () => {
    openModal();
  };

  const openEdit = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('يرجى اختيار مصروف للتعديل');
      return;
    }
    const selected = data.find((d) => d._id === selectedRowKeys[0]);
    if (!selected) return;
    openModal(selected);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      if (editing?._id) await expensesApi.update(editing._id, values);
      else await expensesApi.create(values);
      message.success(editing ? 'تم التحديث' : 'تمت الإضافة');
      setModalOpen(false);
      fetchData();
    } catch (e: any) { if (!e?.errorFields) message.error('حدث خطأ'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('يرجى اختيار مصروف للحذف');
      return;
    }
    Modal.confirm({
      title: 'هل أنت متأكد من الحذف؟',
      okText: 'نعم',
      cancelText: 'إلغاء',
      onOk: async () => {
        try {
          await Promise.all(selectedRowKeys.map((key) => expensesApi.delete(key)));
          message.success('تم الحذف');
          setSelectedRowKeys([]);
          fetchData();
        } catch { message.error('حدث خطأ'); }
      },
    });
  };

  const columns = [
    { title: 'الموكل', dataIndex: 'customerName' },
    { title: 'القضية', dataIndex: 'caseNumber' },
    { title: 'المبلغ', dataIndex: 'amount' },
    { title: 'التاريخ', dataIndex: 'expenseDate' },
    { title: 'الفئة', dataIndex: 'category' },
    { title: 'البيان', dataIndex: 'description', ellipsis: true },
  ];

  return (
    <div>
      <PageHeader
        title="المصاريف"
        subtitle="تسجيل مصاريف القضايا والموكلين"
        onAdd={openAdd}
        onEdit={openEdit}
        onDelete={handleDelete}
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
      <AppModal
        title={editing ? 'تعديل مصروف' : 'إضافة مصروف'}
        subtitle="تسجيل مصروفات القضايا والموكلين"
        icon={<ShoppingCartOutlined />}
        iconColor="#ea580c"
        iconColorTo="#f97316"
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        okText="حفظ"
        cancelText="إلغاء"
        width={640}
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}><Form.Item name="customerId" label="العميل"><Select showSearch allowClear optionFilterProp="children" options={customers.map((c: any) => ({ value: c._id, label: c.name }))} /></Form.Item></Col>
            <Col span={12}><Form.Item name="caseId" label="القضية"><Select showSearch allowClear optionFilterProp="children" options={cases.map((c: any) => ({ value: c._id, label: `${c.caseNumber}/${c.caseYear}` }))} /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="amount" label="المبلغ" rules={[{ required: true }]}><Input type="number" /></Form.Item></Col>
            <Col span={12}><Form.Item name="expenseDate" label="التاريخ" rules={[{ required: true }]}><Input type="date" /></Form.Item></Col>
          </Row>
          <Form.Item name="category" label="الفئة" rules={[{ required: true }]}><Input placeholder="الفئة" /></Form.Item>
          <Form.Item name="description" label="الوصف" rules={[{ required: true }]}><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </AppModal>
    </div>
  );
}
