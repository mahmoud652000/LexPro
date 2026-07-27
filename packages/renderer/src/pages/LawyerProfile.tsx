import { useState, useEffect } from 'react';
import { Card, Form, Input, Button, message, Spin } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import api from '../api/client';
import { PageHeader } from '../components/PageHeader';

export default function LawyerProfile() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/lawyer-profile').then(res => {
      const data = res.data.data || res.data;
      form.setFieldsValue(data);
    }).catch(() => { message.error('حدث خطأ'); })
    .finally(() => setLoading(false));
  }, [form]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      await api.put('/lawyer-profile', values);
      message.success('تم حفظ البيانات بنجاح');
    } catch (e: any) { if (!e?.errorFields) message.error('حدث خطأ'); }
    finally { setSaving(false); }
  };

  if (loading) return <Spin size="large" style={{ display: 'flex', justifyContent: 'center', marginTop: 100 }} />;

  return (
    <div style={{ maxWidth: 600 }}>
      <PageHeader title="بيانات المحامي" subtitle="بيانات المكتب والمحامي" />
      <Card size="small">
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="الاسم" rules={[{ required: true, message: 'يرجى إدخال الاسم' }]}>
            <Input placeholder="اسم المحامي" />
          </Form.Item>
          <Form.Item name="phone" label="الهاتف" rules={[{ required: true, message: 'يرجى إدخال الهاتف' }]}>
            <Input placeholder="رقم الهاتف" />
          </Form.Item>
          <Form.Item name="address" label="العنوان" rules={[{ required: true, message: 'يرجى إدخال العنوان' }]}>
            <Input.TextArea rows={2} placeholder="العنوان" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving}>حفظ</Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
