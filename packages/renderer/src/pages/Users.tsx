import { useState, useEffect, useCallback } from 'react';
import { Table, Button, Modal, Form, Input, Select, Switch, message, Tag, Checkbox, Row, Col, Card, Space, Popconfirm } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined, SafetyOutlined, TeamOutlined, LockOutlined } from '@ant-design/icons';
import { usersApi } from '../api/client';
import { PageHeader } from '../components/PageHeader';
import { AppModal } from '../components/AppModal';

const MODULE_LABELS: Record<string, string> = {
  dashboard: 'لوحة التحكم',
  customers: 'العملاء',
  cases: 'القضايا',
  sessions: 'الجلسات',
  announcements: 'الإعلانات',
  tasks: 'المهام',
  fees: 'الأتعاب',
  expenses: 'المصروفات',
  templates: 'النماذج',
  notifications: 'التنبيهات',
  settings: 'الإعدادات',
  backup: 'النسخ الاحتياطي',
  users: 'المستخدمون',
};

const roleLabels: Record<string, string> = {
  admin: 'مدير',
  lawyer: 'محامي',
  secretary: 'سكرتير',
};

const roleColors: Record<string, string> = {
  admin: 'gold',
  lawyer: 'blue',
  secretary: 'green',
};

export default function Users() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [permModalOpen, setPermModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [permUser, setPermUser] = useState<any>(null);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [permissions, setPermissions] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await usersApi.getAll();
      setData(res.data.data || res.data || []);
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

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      if (editing?._id) await usersApi.update(editing._id, values);
      else await usersApi.create(values);
      message.success(editing ? 'تم التحديث' : 'تمت الإضافة');
      setModalOpen(false);
      fetchData();
    } catch (e: any) { if (!e?.errorFields) message.error('حدث خطأ'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    try { await usersApi.delete(id); message.success('تم الحذف'); fetchData(); }
    catch { message.error('حدث خطأ'); }
  };

  const openPermModal = (record: any) => {
    setPermUser(record);
    const perms = record.permissions?.length ? record.permissions : Object.keys(MODULE_LABELS).map(m => ({
      module: m, canView: true, canAdd: false, canEdit: false, canDelete: false,
    }));
    setPermissions([...perms]);
    setPermModalOpen(true);
  };

  const togglePerm = (module: string, field: string, value: boolean) => {
    setPermissions(prev => prev.map(p =>
      p.module === module ? { ...p, [field]: value } : p
    ));
  };

  const handleSavePerms = async () => {
    try {
      setSubmitting(true);
      await usersApi.updatePermissions(permUser._id, permissions);
      message.success('تم حفظ الصلاحيات');
      setPermModalOpen(false);
      fetchData();
    } catch { message.error('حدث خطأ'); }
    finally { setSubmitting(false); }
  };

  const columns = [
    { title: 'الاسم', dataIndex: 'name', key: 'name' },
    { title: 'اسم المستخدم', dataIndex: 'username', key: 'username' },
    {
      title: 'الدور',
      dataIndex: 'role',
      key: 'role',
      render: (v: string) => <Tag color={roleColors[v]}>{roleLabels[v] || v}</Tag>,
    },
    {
      title: 'الحالة',
      dataIndex: 'active',
      key: 'active',
      render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'نشط' : 'معطّل'}</Tag>,
    },
    {
      title: 'إجراءات',
      key: 'actions',
      render: (_: any, r: any) => (
        <Space>
          <Button type="text" icon={<SafetyOutlined />} onClick={() => openPermModal(r)} title="الصلاحيات" style={{ color: '#C9A227' }} />
          <Button type="text" icon={<EditOutlined />} onClick={() => openModal(r)} />
          <Popconfirm title="حذف؟" onConfirm={() => handleDelete(r._id)}>
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="إدارة المستخدمين"
        subtitle="إدارة حسابات النظام والصلاحيات"
        onAdd={() => openModal()}
        addLabel="إضافة +"
      />
      <Table columns={columns} dataSource={data} rowKey="_id" loading={loading} size="small" pagination={{ pageSize: 10 }} />

      {/* نموذج إضافة/تعديل مستخدم */}
      <AppModal
        title={editing ? 'تعديل مستخدم' : 'إضافة مستخدم'}
        subtitle="إدارة حسابات المستخدمين والأدوار"
        icon={<TeamOutlined />}
        iconColor="#2563eb"
        iconColorTo="#3b82f6"
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        okText="حفظ"
        cancelText="إلغاء"
        width={560}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="الاسم" rules={[{ required: true, message: 'يرجى إدخال الاسم' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="username" label="اسم المستخدم" rules={[{ required: true, message: 'يرجى إدخال اسم المستخدم' }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="password"
            label={editing ? 'كلمة المرور (اتركها فارغة لعدم التغيير)' : 'كلمة المرور'}
            rules={editing ? [] : [{ required: true, message: 'يرجى إدخال كلمة المرور' }]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item name="role" label="الدور" rules={[{ required: true }]} initialValue="secretary">
            <Select
              options={[
                { value: 'admin', label: 'مدير' },
                { value: 'lawyer', label: 'محامي' },
                { value: 'secretary', label: 'سكرتير' },
              ]}
            />
          </Form.Item>
          {editing && (
            <Form.Item name="active" label="نشط" valuePropName="checked" initialValue={true}>
              <Switch />
            </Form.Item>
          )}
        </Form>
      </AppModal>

      {/* نموذج الصلاحيات */}
      <AppModal
        title={`صلاحيات: ${permUser?.name || ''}`}
        subtitle="تحديد صلاحيات الوحدات لكل مستخدم"
        icon={<LockOutlined />}
        iconColor="#C9A227"
        iconColorTo="#e0b53e"
        open={permModalOpen}
        onOk={handleSavePerms}
        onCancel={() => setPermModalOpen(false)}
        confirmLoading={submitting}
        okText="حفظ الصلاحيات"
        cancelText="إلغاء"
        width={700}
      >
        <div>
          {permUser?.role === 'admin' && (
            <p style={{ color: '#C9A227', marginBottom: 16, fontWeight: 600 }}>
              المدير لديه جميع الصلاحيات تلقائياً
            </p>
          )}
          <Table
            dataSource={permissions}
            rowKey="module"
            size="small"
            pagination={false}
            columns={[
              { title: 'الوحدة', dataIndex: 'module', render: (v: string) => MODULE_LABELS[v] || v },
              {
                title: 'عرض',
                dataIndex: 'canView',
                render: (v: boolean, r: any) => (
                  <Checkbox checked={v} onChange={(e) => togglePerm(r.module, 'canView', e.target.checked)} />
                ),
              },
              {
                title: 'إضافة',
                dataIndex: 'canAdd',
                render: (v: boolean, r: any) => (
                  <Checkbox checked={v} onChange={(e) => togglePerm(r.module, 'canAdd', e.target.checked)} />
                ),
              },
              {
                title: 'تعديل',
                dataIndex: 'canEdit',
                render: (v: boolean, r: any) => (
                  <Checkbox checked={v} onChange={(e) => togglePerm(r.module, 'canEdit', e.target.checked)} />
                ),
              },
              {
                title: 'حذف',
                dataIndex: 'canDelete',
                render: (v: boolean, r: any) => (
                  <Checkbox checked={v} onChange={(e) => togglePerm(r.module, 'canDelete', e.target.checked)} />
                ),
              },
            ]}
          />
        </div>
      </AppModal>
    </div>
  );
}
