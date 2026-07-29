import { useState, useRef } from 'react';
import { Card, Form, Input, Button, Avatar, Upload, message, Divider, Spin } from 'antd';
import { UserOutlined, CameraOutlined, LockOutlined, SaveOutlined } from '@ant-design/icons';
import { authApi, fileApi } from '../api/client';
import { useAuthStore } from '../store/auth';
import { PageHeader } from '../components/PageHeader';

const roleLabels: Record<string, string> = {
  admin: 'مدير',
  lawyer: 'محامي',
  secretary: 'سكرتير',
};

const roleColors: Record<string, string> = {
  admin: '#C9A227',
  lawyer: '#2980b9',
  secretary: '#27ae60',
};

export default function Profile() {
  const { user, setUser, setToken } = useAuthStore();
  const [form] = Form.useForm();
  const [pwdForm] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveProfile = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const res = await authApi.updateProfile({ name: values.name });
      const { user: updatedUser, token: newToken } = res.data.data;
      setUser(updatedUser);
      if (newToken) setToken(newToken);
      message.success('تم حفظ التعديلات');
    } catch (e: any) { if (!e?.errorFields) message.error('حدث خطأ'); }
    finally { setSaving(false); }
  };

  const handleChangePassword = async () => {
    try {
      const values = await pwdForm.validateFields();
      setSavingPwd(true);
      await authApi.changePassword(values.currentPassword, values.newPassword);
      message.success('تم تغيير كلمة المرور');
      pwdForm.resetFields();
    } catch (e: any) { if (!e?.errorFields) message.error('حدث خطأ'); }
    finally { setSavingPwd(false); }
  };

  const handleAvatarUpload = async (file: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const uploadRes = await fileApi.upload(file);
      const fileId = uploadRes.data.data?.fileId || uploadRes.data.fileId;
      const avatarUrl = fileApi.getUrl(fileId);
      const res = await authApi.updateProfile({ avatar: avatarUrl });
      const { user: updatedUser, token: newToken } = res.data.data;
      setUser(updatedUser);
      if (newToken) setToken(newToken);
      message.success('تم تحديث الصورة');
    } catch { message.error('حدث خطأ أثناء رفع الصورة'); }
    finally { setUploading(false); }
  };

  if (!user) return <Spin size="large" style={{ display: 'flex', justifyContent: 'center', marginTop: 100 }} />;

  form.setFieldsValue({ name: user.name, username: user.username });

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <PageHeader title="الملف الشخصي" subtitle="إدارة بياناتك الشخصية وكلمة المرور" />

      {/* بطاقة الصورة والبيانات */}
      <Card size="small" style={{ marginBottom: 14, textAlign: 'center' }}>
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: 12 }}>
          <Avatar
            size={100}
            src={user.avatar || undefined}
            style={{
              background: roleColors[user.role] || '#2c3e50',
              fontSize: 40,
              border: '3px solid #f0f0f0',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            }}
            icon={!user.avatar && <UserOutlined />}
          />
          <Button
            shape="circle"
            size="small"
            icon={<CameraOutlined />}
            loading={uploading}
            onClick={() => fileInputRef.current?.click()}
            style={{
              position: 'absolute',
              bottom: 4,
              right: 4,
              background: roleColors[user.role] || '#2c3e50',
              borderColor: '#fff',
              color: '#fff',
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleAvatarUpload(file);
            }}
          />
        </div>
        <h2 style={{ margin: '0 0 4px 0', fontSize: 18, color: '#2c3e50' }}>{user.name}</h2>
        <div style={{ marginBottom: 4 }}>
          <span style={{
            display: 'inline-block',
            padding: '2px 12px',
            borderRadius: 12,
            fontSize: 12,
            fontWeight: 600,
            color: '#fff',
            background: roleColors[user.role] || '#2c3e50',
          }}>
            {roleLabels[user.role] || user.role}
          </span>
        </div>
        <p style={{ color: '#999', fontSize: 13, margin: 0 }}>@{user.username}</p>
      </Card>

      {/* تعديل البيانات */}
      <Card title="البيانات الشخصية" size="small" style={{ marginBottom: 14 }}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="الاسم" rules={[{ required: true, message: 'يرجى إدخال الاسم' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="username" label="اسم المستخدم">
            <Input disabled style={{ background: '#f5f5f5', color: '#999' }} />
          </Form.Item>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSaveProfile}
            loading={saving}
            style={{ background: '#27ae60', borderColor: '#27ae60' }}
          >
            حفظ التعديلات
          </Button>
        </Form>
      </Card>

      {/* تغيير كلمة المرور */}
      <Card title="تغيير كلمة المرور" size="small">
        <Form form={pwdForm} layout="vertical">
          <Form.Item name="currentPassword" label="كلمة المرور الحالية" rules={[{ required: true, message: 'يرجى إدخال كلمة المرور الحالية' }]}>
            <Input.Password prefix={<LockOutlined style={{ color: '#C9A227' }} />} />
          </Form.Item>
          <Form.Item name="newPassword" label="كلمة المرور الجديدة" rules={[{ required: true, message: 'يرجى إدخال كلمة المرور الجديدة' }, { min: 6, message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' }]}>
            <Input.Password prefix={<LockOutlined style={{ color: '#C9A227' }} />} />
          </Form.Item>
          <Form.Item name="confirmPassword" label="تأكيد كلمة المرور" dependencies={['newPassword']} rules={[
            { required: true, message: 'يرجى تأكيد كلمة المرور' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPassword') === value) return Promise.resolve();
                return Promise.reject(new Error('كلمتا المرور غير متطابقتين'));
              },
            }),
          ]}>
            <Input.Password prefix={<LockOutlined style={{ color: '#C9A227' }} />} />
          </Form.Item>
          <Button
            type="primary"
            icon={<LockOutlined />}
            onClick={handleChangePassword}
            loading={savingPwd}
            style={{ background: '#2980b9', borderColor: '#2980b9' }}
          >
            تغيير كلمة المرور
          </Button>
        </Form>
      </Card>
    </div>
  );
}
