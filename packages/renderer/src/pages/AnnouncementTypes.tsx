import { useState, useEffect, useCallback } from 'react';
import { Table, Button, Modal, Form, Input, Space, Popconfirm, message } from 'antd';
import { EditOutlined, DeleteOutlined, NotificationOutlined } from '@ant-design/icons';
import { createCrudApi } from '../api/client';
import { PageHeader } from '../components/PageHeader';
import { AppModal } from '../components/AppModal';

const annTypesApi = createCrudApi('/announcement-types');

export default function AnnouncementTypes() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try { const res = await annTypesApi.getAll(); setData(res.data.data || res.data || []); }
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
      if (editing?._id) await annTypesApi.update(editing._id, values);
      else await annTypesApi.create(values);
      message.success(editing ? 'تم التحديث' : 'تمت الإضافة');
      setModalOpen(false);
      fetchData();
    } catch (e: any) { if (!e?.errorFields) message.error('حدث خطأ'); }
  };

  const handleDelete = async (id: string) => {
    try { await annTypesApi.delete(id); message.success('تم الحذف'); fetchData(); }
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
        title="أنواع الإعلانات"
        subtitle="تصنيفات الإعلانات القانونية"
        onAdd={() => openModal()}
        addLabel="إضافة +"
      />
      <Table columns={columns} dataSource={data} rowKey="_id" loading={loading} size="small" pagination={{ pageSize: 10 }} />
      <AppModal
        title={editing ? 'تعديل نوع إعلان' : 'إضافة نوع إعلان'}
        subtitle="تصنيفات الإعلانات القانونية"
        icon={<NotificationOutlined />}
        iconColor="#7c3aed"
        iconColorTo="#9b59b6"
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
