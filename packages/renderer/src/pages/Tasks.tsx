import { useState, useEffect, useCallback } from 'react';
import { Table, Modal, Form, Input, Select, Tag, message, Row, Col } from 'antd';
import { CheckSquareOutlined } from '@ant-design/icons';
import { createCrudApi } from '../api/client';
import { PageHeader } from '../components/PageHeader';
import { AppModal } from '../components/AppModal';

const tasksApi = createCrudApi('/tasks');
const customersApi = createCrudApi('/customers');
const casesApi = createCrudApi('/cases');

const priorityColors: Record<string, string> = {
  high: 'red',
  medium: 'orange',
  low: 'blue',
};

const statusColors: Record<string, string> = {
  pending: 'default',
  in_progress: 'processing',
  completed: 'success',
};

const priorityLabels: Record<string, string> = {
  high: 'عاجل',
  medium: 'متوسط',
  low: 'منخفض',
};

const statusLabels: Record<string, string> = {
  pending: 'معلّق',
  in_progress: 'قيد التنفيذ',
  completed: 'مكتمل',
};

export default function Tasks() {
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
      const [tasksRes, custRes, caseRes] = await Promise.all([
        tasksApi.getAll(), customersApi.getAll(), casesApi.getAll(),
      ]);
      setData(tasksRes.data.data || tasksRes.data || []);
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

  const openAdd = () => { openModal(); };

  const openEdit = () => {
    if (selectedRowKeys.length === 0) { message.warning('يرجى اختيار مهمة للتعديل'); return; }
    const selected = data.find((d) => d._id === selectedRowKeys[0]);
    if (!selected) return;
    openModal(selected);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      if (editing?._id) await tasksApi.update(editing._id, values);
      else await tasksApi.create(values);
      message.success(editing ? 'تم التحديث' : 'تمت الإضافة');
      setModalOpen(false);
      fetchData();
    } catch (e: any) { if (!e?.errorFields) message.error('حدث خطأ'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = () => {
    if (selectedRowKeys.length === 0) { message.warning('يرجى اختيار مهمة للحذف'); return; }
    Modal.confirm({
      title: 'هل أنت متأكد من الحذف؟',
      okText: 'نعم',
      cancelText: 'إلغاء',
      onOk: async () => {
        try {
          await Promise.all(selectedRowKeys.map((key) => tasksApi.delete(key)));
          message.success('تم الحذف');
          setSelectedRowKeys([]);
          fetchData();
        } catch { message.error('حدث خطأ'); }
      },
    });
  };

  const columns = [
    { title: 'العنوان', dataIndex: 'title' },
    { title: 'الوصف', dataIndex: 'description', ellipsis: true },
    {
      title: 'الأولوية',
      dataIndex: 'priority',
      render: (val: string) => <Tag color={priorityColors[val]}>{priorityLabels[val] || val}</Tag>,
    },
    {
      title: 'الحالة',
      dataIndex: 'status',
      render: (val: string) => <Tag color={statusColors[val]}>{statusLabels[val] || val}</Tag>,
    },
    { title: 'تاريخ الاستحقاق', dataIndex: 'dueDate' },
    { title: 'الموكل', dataIndex: ['customerId', 'name'] },
    { title: 'القضية', dataIndex: ['caseId', 'caseNumber'] },
  ];

  return (
    <div>
      <PageHeader
        title="المهام"
        subtitle="إدارة ومتابعة المهام القانونية"
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
        title={editing ? 'تعديل مهمة' : 'إضافة مهمة'}
        subtitle="أدخل تفاصيل المهمة والمعلومات المطلوبة"
        icon={<CheckSquareOutlined />}
        iconColor="#2563eb"
        iconColorTo="#3b82f6"
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        okText="حفظ"
        cancelText="إلغاء"
        width={640}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="العنوان" rules={[{ required: true }]}>
            <Input placeholder="عنوان المهمة" />
          </Form.Item>
          <Form.Item name="description" label="الوصف">
            <Input.TextArea rows={2} placeholder="وصف المهمة" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="dueDate" label="تاريخ الاستحقاق">
                <Input type="date" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="priority" label="الأولوية" rules={[{ required: true }]} initialValue="medium">
                <Select
                  options={[
                    { value: 'high', label: 'عاجل' },
                    { value: 'medium', label: 'متوسط' },
                    { value: 'low', label: 'منخفض' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="status" label="الحالة" rules={[{ required: true }]} initialValue="pending">
            <Select
              options={[
                { value: 'pending', label: 'معلّق' },
                { value: 'in_progress', label: 'قيد التنفيذ' },
                { value: 'completed', label: 'مكتمل' },
              ]}
            />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="customerId" label="الموكل">
                <Select
                  showSearch
                  allowClear
                  optionFilterProp="children"
                  options={customers.map((c: any) => ({ value: c._id, label: c.name }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="caseId" label="القضية">
                <Select
                  showSearch
                  allowClear
                  optionFilterProp="children"
                  options={cases.map((c: any) => ({ value: c._id, label: `${c.caseNumber}/${c.caseYear}` }))}
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </AppModal>
    </div>
  );
}
