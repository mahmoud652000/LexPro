import { useState, useEffect } from 'react';
import { Card, Button, Form, Input, Switch, Row, Col, message, Typography, Alert, Divider } from 'antd';
import { DownloadOutlined, UploadOutlined, DatabaseOutlined, FolderOpenOutlined } from '@ant-design/icons';
import api from '../api/client';
import { PageHeader } from '../components/PageHeader';

const { Text } = Typography;

export default function Backup() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    api.get('/backup/settings').then(res => {
      const data = res.data.data || res.data;
      form.setFieldsValue(data);
    }).catch(() => message.error('حدث خطأ'))
    .finally(() => setLoading(false));
  }, [form]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      await api.put('/backup/settings', values);
      message.success('تم حفظ الإعدادات');
    } catch {
      message.error('حدث خطأ');
    } finally {
      setSaving(false);
    }
  };

  const handleBackup = async () => {
    setCreating(true);
    try {
      const res = await api.post('/backup/create', {}, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `lexpro-backup-${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      message.success('تم إنشاء النسخة الاحتياطية');
    } catch {
      message.error('تعذر إنشاء النسخة الاحتياطية');
    } finally {
      setCreating(false);
    }
  };

  const handleRestore = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        setRestoring(true);
      await api.post('/backup/restore', data);
      message.success('تم استعادة البيانات بنجاح');
      } catch {
        message.error('تعذر استعادة النسخة الاحتياطية');
      } finally {
        setRestoring(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div>
      <PageHeader
        title="النسخ الاحتياطي"
        subtitle="احفظ نسخة من كل بياناتك (القضايا والجلسات والإعلانات والموكلين والمرفقات) لاستعادتها وقت الحاجة."
      />

      <Row gutter={[12, 12]}>
        <Col xs={24} lg={12}>
          <Card title="نسخة احتياطية يدوية" size="small">
            <Text type="secondary">
              أنشئ ملف نسخة احتياطية واحفظه في المكان الذي تختاره (فلاشة / مجلد سحابي / أي مكان).
            </Text>
            <Divider />
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={handleBackup}
              loading={creating}
              style={{ background: '#27ae60', borderColor: '#27ae60' }}
            >
              نسخة احتياطية الآن
            </Button>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="النسخة التلقائية" size="small">
            <Form form={form} layout="vertical">
              <Form.Item name="autoBackupEnabled" label="تفعيل النسخ التلقائي" valuePropName="checked">
                <Switch />
              </Form.Item>
              <Form.Item name="backupFolder" label="مجلد النسخ التلقائية">
                <Input placeholder="C:\backups\lexpro" />
              </Form.Item>
              <Button type="primary" onClick={handleSave} loading={saving}>
                حفظ الإعدادات
              </Button>
            </Form>
          </Card>
        </Col>

        <Col xs={24}>
          <Card title="استعادة من نسخة احتياطية" size="small">
            <Alert
              type="warning"
              message="تحذير: سيتم استبدال كل البيانات الحالية بمحتوى النسخة."
              style={{ marginBottom: 16 }}
            />
            <input
              type="file"
              accept=".json"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleRestore(file);
              }}
              style={{ display: 'none' }}
              id="restore-file"
            />
            <Button
              icon={<UploadOutlined />}
              onClick={() => document.getElementById('restore-file')?.click()}
              loading={restoring}
              style={{ background: '#2980b9', borderColor: '#2980b9', color: '#fff' }}
            >
              استعادة من نسخة احتياطية
            </Button>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
