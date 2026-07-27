import { useState, useEffect, useCallback } from 'react';
import { Table, Button, Modal, Form, Input, Space, Popconfirm, message } from 'antd';
import { EditOutlined, DeleteOutlined, BankOutlined } from '@ant-design/icons';
import { createCrudApi } from '../api/client';
import { PageHeader } from '../components/PageHeader';
import { AppModal } from '../components/AppModal';

const courtsApi = createCrudApi('/courts');

export default function Courts() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try { const res = await courtsApi.getAll(); setData(res.data.data || res.data || []); }
    catch { message.error('حدث خطأ'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openModal = (record?: any) => {
    setEditing(record || null);
    if (record) form.setFieldsValue(record);
    else form.resetFields();
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editing?._id) await courtsApi.update(editing._id, values);
      else await courtsApi.create(values);
      message.success(editing ? 'تم التحديث' : 'تمت الإضافة');
      setModalOpen(false);
      fetchData();
    } catch (e: any) { if (!e?.errorFields) message.error('حدث خطأ'); }
  };

  const handleDelete = async (id: string) => {
    try { await courtsApi.delete(id); message.success('تم الحذف'); fetchData(); }
    catch { message.error('حدث خطأ'); }
  };

  const columns = [
    { title: 'الاسم', dataIndex: 'name' },
    { title: 'إجراءات', render: (_: any, r: any) => (
      <Space>
        <Button type="text" icon={<EditOutlined />} onClick={() => openModal(r)} />
        <Popconfirm title="حذف؟" onConfirm={() => handleDelete(r._id)}><Button type="text" danger icon={<DeleteOutlined />} /></Popconfirm>
      </Space>
    )},
  ];

  return (
    <div>
      <PageHeader
        title="المحاكم"
        subtitle="إدارة بيانات المحاكم والدوائر"
        onAdd={() => openModal()}
        addLabel="إضافة +"
      />
      <Table columns={columns} dataSource={data} rowKey="_id" loading={loading} size="small" pagination={{ pageSize: 10 }} />
      <AppModal
        title={editing ? 'تعديل محكمة' : 'إضافة محكمة'}
        subtitle="إدارة بيانات المحاكم والدوائر"
        icon={<BankOutlined />}
        iconColor="#2980b9"
        iconColorTo="#3498db"
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        okText="حفظ"
        cancelText="إلغاء"
        width={520}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="الاسم" rules={[{ required: true, message: 'يرجى إدخال الاسم' }]}><Input /></Form.Item>
        </Form>
      </AppModal>
    </div>
  );
}
