import { useState, useEffect, useCallback, useMemo } from 'react';
import { Table, Button, Modal, Form, Input, Upload, Select, Space, Popconfirm, message, Typography, Tag } from 'antd';
import {
  DeleteOutlined, DownloadOutlined, UploadOutlined, SaveOutlined,
  FileTextOutlined, FolderOpenOutlined, PaperClipOutlined,
  EditOutlined, EyeOutlined, PrinterOutlined, SearchOutlined, FilterOutlined,
} from '@ant-design/icons';
import { createCrudApi, fileApi } from '../api/client';
import { PageHeader } from '../components/PageHeader';
import { AppModal } from '../components/AppModal';

const { Title, Text } = Typography;

const templatesApi = createCrudApi('/templates');

// استخراج صيغة الملف من اسم الملف
const getFileFormat = (fileName: string): string => {
  if (!fileName) return '-';
  const parts = fileName.split('.');
  if (parts.length < 2) return '-';
  const ext = parts[parts.length - 1].toUpperCase();
  return ext;
};

// لون التاج حسب الصيغة
const formatColor = (ext: string): string => {
  const map: Record<string, string> = {
    'PDF': '#c0392b',
    'DOC': '#2980b9', 'DOCX': '#2980b9',
    'XLS': '#27ae60', 'XLSX': '#27ae60',
    'PPT': '#e67e22', 'PPTX': '#e67e22',
    'JPG': '#8e44ad', 'JPEG': '#8e44ad', 'PNG': '#8e44ad', 'GIF': '#8e44ad',
    'TXT': '#7f8c8d',
    'ZIP': '#d35400', 'RAR': '#d35400',
  };
  return map[ext] || '#2c3e50';
};

export default function Templates() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>(undefined);
  const [formatFilter, setFormatFilter] = useState<string | undefined>(undefined);

  const [printing, setPrinting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try { const res = await templatesApi.getAll(); setData(res.data.data || res.data || []); }
    catch { message.error('حدث خطأ'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // استخراج التصنيفات الفريدة من البيانات
  const categoryOptions = useMemo(() => {
    const cats = new Set<string>();
    data.forEach((d: any) => { if (d.category) cats.add(d.category); });
    return Array.from(cats).map((c) => ({ value: c, label: c }));
  }, [data]);

  // استخراج الصيغ الفريدة من البيانات
  const formatOptions = useMemo(() => {
    const fmts = new Set<string>();
    data.forEach((d: any) => { const f = getFileFormat(d.fileName); if (f !== '-') fmts.add(f); });
    return Array.from(fmts).map((f) => ({ value: f, label: f }));
  }, [data]);

  // تصفية البيانات
  const filtered = useMemo(() => {
    return data.filter((item: any) => {
      // فلتر البحث
      if (search) {
        const q = search.toLowerCase();
        if (!(item.title || '').toLowerCase().includes(q) && !(item.category || '').toLowerCase().includes(q)) return false;
      }
      // فلتر التصنيف
      if (categoryFilter && item.category !== categoryFilter) return false;
      // فلتر الصيغة
      if (formatFilter) {
        const fmt = getFileFormat(item.fileName);
        if (fmt !== formatFilter) return false;
      }
      return true;
    });
  }, [data, search, categoryFilter, formatFilter]);

  const openAdd = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (record: any) => {
    setEditing(record);
    form.setFieldsValue(record);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setUploading(true);

      if (editing?._id) {
        let fileId = editing.fileId;
        let fileName = editing.fileName;
        if (values.file?.[0]?.originFileObj) {
          const file = values.file[0].originFileObj;
          const uploadRes = await fileApi.upload(file);
          fileId = uploadRes.data.data?.fileId || uploadRes.data.fileId;
          fileName = uploadRes.data.data?.fileName || file.name;
        }
        await templatesApi.update(editing._id, {
          title: values.title,
          category: values.category || '',
          documentType: values.documentType || '',
          fileId, fileName,
          notes: values.notes || '',
        });
        message.success('تم تحديث القالب');
      } else {
        const file = values.file?.[0]?.originFileObj || values.file;
        if (!file) { message.error('يرجى اختيار ملف'); return; }
        const uploadRes = await fileApi.upload(file);
        const fileId = uploadRes.data.data?.fileId || uploadRes.data.fileId;
        const fileName = uploadRes.data.data?.fileName || file.name;
        await templatesApi.create({
          title: values.title,
          category: values.category || '',
          documentType: values.documentType || '',
          fileId, fileName,
          notes: values.notes || '',
        });
        message.success('تم رفع القالب');
      }

      setModalOpen(false);
      form.resetFields();
      fetchData();
    } catch (e: any) { if (!e?.errorFields) message.error('حدث خطأ'); }
    finally { setUploading(false); }
  };

  const handleDelete = async (id: string) => {
    try { await templatesApi.delete(id); message.success('تم الحذف'); fetchData(); }
    catch { message.error('حدث خطأ'); }
  };

  const handleOpen = async (record: any) => {
    const url = fileApi.getUrl(record.fileId);
    try {
      if (window.electronAPI?.openFile) {
        const result = await window.electronAPI.openFile(url, record.title || 'معاينة المستند');
        if (!result?.success) {
          message.error(result?.message || 'تعذر فتح الملف');
        }
      } else {
        window.open(url, '_blank');
      }
    } catch {
      message.error('تعذر فتح الملف');
    }
  };

  const handlePrint = async (record: any) => {
    const url = fileApi.getUrl(record.fileId);
    setPrinting(true);
    try {
      if (window.electronAPI?.printFile) {
        const result = await window.electronAPI.printFile(url);
        if (!result.success) message.warning(result.message);
      } else {
        const printWin = window.open(url, '_blank');
        if (printWin) {
          setTimeout(() => { printWin.focus(); printWin.print(); }, 1000);
        }
      }
    } catch {
      message.error('تعذر الطباعة');
    } finally {
      setPrinting(false);
    }
  };

  const columns = [
    {
      title: 'اسم المستند', dataIndex: 'title', ellipsis: true,
      render: (text: string, r: any) => (
        <a onClick={() => handleOpen(r)} style={{ color: '#2c3e50', fontWeight: 500 }}>
          <FileTextOutlined style={{ marginLeft: 4, color: '#C9A227' }} />
          {text}
        </a>
      ),
    },
    { title: 'التصنيف', dataIndex: 'category', width: 120, ellipsis: true, render: (v: string) => v || '-' },
    {
      title: 'الصيغة', width: 80, align: 'center' as const,
      render: (_: any, r: any) => {
        const fmt = getFileFormat(r.fileName);
        return <Tag color={formatColor(fmt)} style={{ margin: 0 }}>{fmt}</Tag>;
      },
    },
    {
      title: 'الإجراءات', width: 240,
      render: (_: any, r: any) => (
        <Space size={4}>
          <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => handleOpen(r)} title="فتح" style={{ color: '#2c3e50' }} />
          <Button type="text" size="small" icon={<DownloadOutlined />} href={fileApi.getUrl(r.fileId)} target="_blank" title="تحميل" style={{ color: '#2980b9' }} />
          <Button type="text" size="small" icon={<PrinterOutlined />} onClick={() => handlePrint(r)} title="طباعة" style={{ color: '#27ae60' }} />
          <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} title="تعديل" style={{ color: '#f39c12' }} />
          <Popconfirm title="حذف؟" onConfirm={() => handleDelete(r._id)}>
            <Button type="text" size="small" danger icon={<DeleteOutlined />} title="حذف" />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="قوالب المستندات"
        subtitle="إدارة القوالب والمستندات الجاهزة"
        onAdd={openAdd}
        addLabel="رفع قالب"
      />

      {/* شريط البحث والفلترة */}
      <div style={{
        marginBottom: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
      }}>
        <Input
          placeholder="بحث بالاسم..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
          allowClear
          style={{ maxWidth: 220 }}
        />
        <Select
          allowClear
          showSearch
          placeholder="التصنيف"
          optionFilterProp="children"
          value={categoryFilter}
          onChange={(val) => setCategoryFilter(val)}
          options={categoryOptions}
          suffixIcon={<FilterOutlined />}
          style={{ minWidth: 140 }}
        />
        <Select
          allowClear
          showSearch
          placeholder="الصيغة"
          optionFilterProp="children"
          value={formatFilter}
          onChange={(val) => setFormatFilter(val)}
          options={formatOptions}
          suffixIcon={<FilterOutlined />}
          style={{ minWidth: 120 }}
        />
      </div>

      <Table columns={columns} dataSource={filtered} rowKey="_id" loading={loading} size="small" pagination={{ pageSize: 10 }} />

      <AppModal
        title={editing ? 'تعديل قالب مستند' : 'رفع قالب مستند'}
        subtitle="أدخل بيانات المستند وارفع الملف"
        icon={<FolderOpenOutlined />}
        iconColor="#8e44ad"
        iconColorTo="#9b59b6"
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={uploading}
        okText={editing ? 'حفظ التعديلات' : 'رفع'}
        cancelText="إلغاء"
        okColor="#8e44ad"
        width={640}
      >

        <Form form={form} layout="vertical">
          {/* اختيار ملف */}
          <div style={{
            background: '#fafbfc',
            border: '1px dashed #d9d9d9',
            borderRadius: 10,
            padding: '12px 16px',
            marginBottom: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <PaperClipOutlined style={{ color: '#C9A227' }} />
              <span style={{ fontWeight: 600, fontSize: 13, color: '#2c3e50' }}>اختيار ملف</span>
              {editing && <span style={{ fontSize: 11, color: '#999' }}>(اتركه فارغاً للاحتفاظ بالملف الحالي)</span>}
              {!editing && <span style={{ fontSize: 11, color: '#999' }}>(PDF, Word, صور...)</span>}
            </div>
            <Form.Item
              name="file"
              rules={editing ? [] : [{ required: true, message: 'يرجى اختيار ملف' }]}
              valuePropName="fileList"
              getValueFromEvent={e => Array.isArray(e) ? e : e?.fileList}
              style={{ marginBottom: 0 }}
            >
              <Upload.Dragger beforeUpload={() => false} maxCount={1} style={{ background: 'transparent', borderColor: '#e0e0e0' }}>
                <p style={{ margin: 0, fontSize: 13, color: '#999' }}>
                  <UploadOutlined style={{ fontSize: 24, color: '#C9A227', marginBottom: 4 }} />
                  <br />
                  اضغط أو اسحب الملف هنا
                </p>
              </Upload.Dragger>
            </Form.Item>
          </div>

          {/* اسم المستند */}
          <Form.Item name="title" label="اسم المستند" rules={[{ required: true, message: 'يرجى إدخال اسم المستند' }]}>
            <Input placeholder="اسم المستند" prefix={<FileTextOutlined />} />
          </Form.Item>

          {/* التصنيف */}
          <Form.Item name="category" label="التصنيف">
            <Input placeholder="مثل: العقود / المذكرات / الدعاوى" />
          </Form.Item>

          {/* ملاحظات اختياري */}
          <Form.Item name="notes" label={<span>ملاحظات <span style={{ color: '#999', fontSize: 12 }}>(اختياري)</span></span>}>
            <Input.TextArea rows={2} placeholder="ملاحظات إضافية..." />
          </Form.Item>

        </Form>
      </AppModal>
    </div>
  );
}