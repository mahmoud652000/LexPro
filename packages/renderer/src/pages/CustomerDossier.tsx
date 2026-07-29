import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Col, Row, Statistic, Table, Tabs, Descriptions, Spin, Select, Button, Input, message, Typography, Space, Checkbox, Divider, Upload, List, Tag, Popconfirm } from 'antd';
import { SearchOutlined, UserOutlined, FilePdfOutlined, PrinterOutlined, WhatsAppOutlined, ExportOutlined, PaperClipOutlined, DeleteOutlined, DownloadOutlined, InboxOutlined, EyeOutlined } from '@ant-design/icons';
import api, { getApiBaseUrl } from '../api/client';
import { PageHeader } from '../components/PageHeader';

const { Title } = Typography;

export default function CustomerDossier() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState<any[]>([]);
  const [dossier, setDossier] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [dossierLoading, setDossierLoading] = useState(false);
  const [exportSections, setExportSections] = useState<string[]>(['customer', 'cases', 'sessions', 'announcements', 'fees', 'expenses', 'documents']);
  const [customerDocs, setCustomerDocs] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState('');

  useEffect(() => {
    api.get('/customers').then(res => {
      setCustomers(res.data.data || res.data || []);
    }).catch(() => message.error('حدث خطأ'));
  }, []);

  const fetchCustomerDocs = async (customerId: string) => {
    try {
      const res = await api.get(`/customer-documents/${customerId}`);
      setCustomerDocs(res.data.data || res.data || []);
    } catch { setCustomerDocs([]); }
  };

  const loadDossier = async (customerId: string) => {
    if (!customerId) return;
    setDossierLoading(true);
    setDossier(null);
    setSelectedCustomerId(customerId);
    fetchCustomerDocs(customerId);
    try {
      const res = await api.get(`/customers/${customerId}/dossier`);
      setDossier(res.data.data || res.data);
    } catch {
      message.error('تعذر تحميل بيانات الموكل');
    } finally {
      setDossierLoading(false);
    }
  };

  const filteredCustomers = customers.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (c.name || '').toLowerCase().includes(q) || (c.phone || '').includes(q);
  });

  const caseColumns = [
    { title: 'رقم القضية', dataIndex: 'caseNumber' },
    { title: 'السنة', dataIndex: 'caseYear' },
    { title: 'الخصم', dataIndex: 'opponentName' },
    { title: 'المحكمة', dataIndex: 'courtName' },
    { title: 'نوع القضية', dataIndex: 'caseTypeName' },
    { title: 'الموضوع', dataIndex: 'caseSubject', ellipsis: true },
  ];

  const sessionColumns = [
    { title: 'رقم الجلسة', dataIndex: 'sessionNumber' },
    { title: 'التاريخ', dataIndex: 'sessionDate' },
    { title: 'المحكمة', dataIndex: 'courtName' },
    { title: 'الموضوع', dataIndex: 'subject', ellipsis: true },
    { title: 'القرار', dataIndex: 'sessionDecision', ellipsis: true },
  ];

  const feeColumns = [
    { title: 'الإجمالي', dataIndex: 'totalAmount' },
    { title: 'المدفوع', dataIndex: 'paidAmount', render: (v: string) => v || '0' },
    { title: 'المتبقي', dataIndex: 'remainingAmount', render: (v: string) => v || '0' },
    { title: 'التاريخ', dataIndex: 'agreementDate' },
  ];

  const expenseColumns = [
    { title: 'المبلغ', dataIndex: 'amount' },
    { title: 'التاريخ', dataIndex: 'expenseDate' },
    { title: 'الفئة', dataIndex: 'category' },
    { title: 'البيان', dataIndex: 'description', ellipsis: true },
  ];

  const annColumns = [
    { title: 'رقم الإعلان', dataIndex: 'announcementNumber' },
    { title: 'المحكمة', dataIndex: 'courtName' },
    { title: 'المستلم', dataIndex: 'recipientName' },
    { title: 'الموضوع', dataIndex: 'subject', ellipsis: true },
  ];

  const sectionOptions = [
    { label: 'بيانات الموكل', value: 'customer' },
    { label: 'القضايا', value: 'cases' },
    { label: 'الجلسات', value: 'sessions' },
    { label: 'الإعلانات', value: 'announcements' },
    { label: 'الرسوم', value: 'fees' },
    { label: 'المصاريف', value: 'expenses' },
    { label: 'المرفقات', value: 'documents' },
  ];

  const buildExportHTML = () => {
    const parts: string[] = [];
    const s = dossier.stats;
    const exportDate = new Date().toLocaleDateString('en-GB').replace(/\//g, '/');

    // بيانات الموكل
    if (exportSections.includes('customer')) {
      const c = dossier.customer;
      parts.push(`
        <div class="info-box">
          <div class="sec-title">بيانات الموكل</div>
          <div class="info-grid">
            <div class="field"><span class="lbl">الاسم: </span><span class="val">${c?.name || '—'}</span></div>
            <div class="field"><span class="lbl">الهاتف: </span><span class="val" dir="ltr">${c?.phone || '—'}</span></div>
            <div class="field"><span class="lbl">واتساب: </span><span class="val" dir="ltr">${c?.whatsappNumber || '—'}</span></div>
            <div class="field"><span class="lbl">الايميل: </span><span class="val" dir="ltr">${c?.email || '—'}</span></div>
            <div class="field"><span class="lbl">الرقم القومي: </span><span class="val">${c?.identityNumber || '—'}</span></div>
            <div class="field"><span class="lbl">العنوان: </span><span class="val">${c?.address || '—'}</span></div>
            <div class="field full"><span class="lbl">ملاحظات: </span><span class="val">${c?.notes || 'لا'}</span></div>
          </div>
        </div>
      `);
    }

    // بطاقات الإحصائيات
    const showStats = (exportSections.includes('fees') || exportSections.includes('expenses')) && s;
    if (showStats) {
      parts.push(`
        <div class="stats-row">
          <div class="stat-card navy">
            <div class="stat-num">${s?.totalCases || 0}</div>
            <div class="stat-lbl">القضايا</div>
          </div>
          <div class="stat-card navy">
            <div class="stat-num">${s?.totalSessions || 0}</div>
            <div class="stat-lbl">الجلسات</div>
          </div>
          <div class="stat-card navy">
            <div class="stat-num">${s?.totalAnnouncements || 0}</div>
            <div class="stat-lbl">الإعلانات</div>
          </div>
          <div class="stat-card gold">
            <div class="stat-num">${s?.totalFees || '0'}</div>
            <div class="stat-lbl">إجمالي الأتعاب (ج.م)</div>
          </div>
          <div class="stat-card green">
            <div class="stat-num">${s?.paidFees || '0'}</div>
            <div class="stat-lbl">المحصّل (ج.م)</div>
          </div>
          <div class="stat-card red">
            <div class="stat-num">${s?.remainingFees || '0'}</div>
            <div class="stat-lbl">المتبقي (ج.م)</div>
          </div>
        </div>
      `);
    }

    // القضايا
    if (exportSections.includes('cases') && dossier.cases?.length) {
      const rows = dossier.cases.map((c: any, i: number) => `
        <tr class="${i % 2 ? 'alt' : ''}"><td>${c.caseNumber || '—'}</td><td>${c.caseYear || '—'}</td><td>${c.courtName || '—'}</td><td>${c.caseTypeName || '—'}</td><td>${c.opponentName || '—'}</td><td>${c.clientRole || '—'}</td><td>${c.caseSubject || 'لا'}</td></tr>
      `).join('');
      parts.push(`
        <div class="sec-title">القضايا (${dossier.cases.length})</div>
        <table class="tbl"><thead><tr><th>رقم القضية</th><th>السنة</th><th>المحكمة</th><th>النوع</th><th>الخصم</th><th>صفة الموكل</th><th>الموضوع</th></tr></thead><tbody>${rows}</tbody></table>
      `);
    }

    // الجلسات
    if (exportSections.includes('sessions') && dossier.sessions?.length) {
      const rows = dossier.sessions.map((s: any, i: number) => `
        <tr class="${i % 2 ? 'alt' : ''}"><td>${s.sessionNumber || '—'}</td><td>${s.sessionDate || '—'}</td><td>${s.courtName || '—'}</td><td>${s.subject || '—'}</td><td>${s.sessionDecision || '—'}</td></tr>
      `).join('');
      parts.push(`
        <div class="sec-title">الجلسات (${dossier.sessions.length})</div>
        <table class="tbl"><thead><tr><th>رقم الجلسة</th><th>التاريخ</th><th>المحكمة</th><th>الموضوع</th><th>القرار</th></tr></thead><tbody>${rows}</tbody></table>
      `);
    }

    // الإعلانات
    if (exportSections.includes('announcements') && dossier.announcements?.length) {
      const rows = dossier.announcements.map((a: any, i: number) => `
        <tr class="${i % 2 ? 'alt' : ''}"><td>${a.announcementNumber || '—'}</td><td>${a.courtName || '—'}</td><td>${a.recipientName || '—'}</td><td>${a.subject || '—'}</td></tr>
      `).join('');
      parts.push(`
        <div class="sec-title">الإعلانات (${dossier.announcements.length})</div>
        <table class="tbl"><thead><tr><th>رقم الإعلان</th><th>المحكمة</th><th>المستلم</th><th>الموضوع</th></tr></thead><tbody>${rows}</tbody></table>
      `);
    }

    // اتفاقيات الاتعاب
    if (exportSections.includes('fees') && dossier.feeAgreements?.length) {
      const rows = dossier.feeAgreements.map((f: any, i: number) => `
        <tr class="${i % 2 ? 'alt' : ''}"><td>${f.caseNumber || '-'}</td><td>${f.totalAmount || '0'} ج.م</td><td>${f.paidAmount || '0'} ج.م</td><td>${f.remainingAmount || '0'} ج.م</td><td>${f.agreementDate || '—'}</td><td>${f.notes || 'لا'}</td></tr>
      `).join('');
      parts.push(`
        <div class="sec-title">اتفاقيات الأتعاب (${dossier.feeAgreements.length})</div>
        <table class="tbl"><thead><tr><th>رقم القضية</th><th>إجمالي الأتعاب</th><th>المدفوع</th><th>المتبقي</th><th>التاريخ</th><th>ملاحظات</th></tr></thead><tbody>${rows}</tbody></table>
      `);
    }

    // المصروفات
    if (exportSections.includes('expenses') && dossier.expenses?.length) {
      const rows = dossier.expenses.map((e: any, i: number) => `
        <tr class="${i % 2 ? 'alt' : ''}"><td>${e.caseNumber || '-'}</td><td>${e.category || '—'}</td><td>${e.amount || '—'} ج.م</td><td>${e.expenseDate || '—'}</td><td>${e.description || '—'}</td></tr>
      `).join('');
      parts.push(`
        <div class="sec-title">المصروفات (${dossier.expenses.length})</div>
        <table class="tbl"><thead><tr><th>رقم القضية</th><th>الفئة</th><th>المبلغ</th><th>التاريخ</th><th>الوصف</th></tr></thead><tbody>${rows}</tbody></table>
      `);
    }

    // المرفقات
    if (exportSections.includes('documents') && customerDocs.length) {
      const rows = customerDocs.map((d: any, i: number) => `
        <tr class="${i % 2 ? 'alt' : ''}"><td>${d.name || d.fileName || '—'}</td><td>${d.createdDate ? new Date(d.createdDate).toLocaleDateString('en-GB') : '—'}</td></tr>
      `).join('');
      parts.push(`
        <div class="sec-title">المرفقات (${customerDocs.length})</div>
        <table class="tbl"><thead><tr><th>اسم الملف</th><th>التاريخ</th></tr></thead><tbody>${rows}</tbody></table>
      `);
    }

    return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>ملف الموكل الشامل - ${dossier.customer?.name || ''}</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body {
          font-family: 'Cairo', 'Tajawal', 'Segoe UI', Tahoma, Arial, sans-serif;
          padding: 40px;
          color: #000;
          font-size: 13px;
          line-height: 1.8;
        }
        .doc-title {
          font-size: 22px;
          font-weight: 700;
          color: #000;
          text-align: right;
        }
        .doc-date {
          font-size: 11px;
          color: #888;
          text-align: right;
          margin-bottom: 8px;
        }
        .divider {
          border: none;
          border-top: 2px solid #2c3e50;
          margin-bottom: 24px;
        }
        .sec-title {
          font-size: 15px;
          font-weight: 700;
          color: #000;
          margin: 28px 0 12px;
          text-align: right;
        }
        .info-box {
          background: #f5f5f5;
          border-radius: 6px;
          padding: 20px 24px;
        }
        .info-box .sec-title {
          margin-top: 0;
        }
        .info-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 6px 40px;
        }
        .info-grid .field {
          font-size: 13px;
          color: #000;
          white-space: nowrap;
        }
        .info-grid .field .lbl {
          font-weight: 700;
        }
        .info-grid .field .val {
          font-weight: 400;
        }
        .info-grid .field.full {
          flex: 1 1 100%;
        }
        .stats-row {
          display: flex;
          gap: 10px;
          margin: 20px 0 24px;
          flex-wrap: wrap;
        }
        .stat-card {
          flex: 1;
          min-width: 90px;
          padding: 14px 10px;
          border-radius: 6px;
          text-align: center;
        }
        .stat-card.navy { background: #f0f3f7; border: 1px solid #d8dee8; }
        .stat-card.gold { background: #fdf8ed; border: 1px solid #e8d9b0; }
        .stat-card.green { background: #eef9f0; border: 1px solid #c8e8cc; }
        .stat-card.red { background: #fdf0f0; border: 1px solid #f0c8c8; }
        .stat-num {
          font-size: 18px;
          font-weight: 700;
          color: #000;
          margin-bottom: 4px;
        }
        .stat-card.gold .stat-num { color: #9a7d1e; }
        .stat-card.green .stat-num { color: #1a8a3e; }
        .stat-card.red .stat-num { color: #c0392b; }
        .stat-lbl {
          font-size: 11px;
          color: #666;
        }
        .tbl {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 16px;
        }
        .tbl th {
          background: #f5f5f5;
          font-weight: 700;
          font-size: 12px;
          padding: 8px 10px;
          text-align: right;
          border: 1px solid #ddd;
          color: #000;
        }
        .tbl td {
          padding: 6px 10px;
          font-size: 12px;
          text-align: right;
          border: 1px solid #ddd;
          color: #000;
        }
        .tbl tbody tr:nth-child(even) {
          background: #fafafa;
        }
        .doc-footer {
          margin-top: 40px;
          padding-top: 12px;
          border-top: 1px solid #ddd;
          text-align: center;
          font-size: 10px;
          color: #888;
        }
        @media print {
          body { padding: 24px; }
          .sec-title { page-break-after: avoid; }
          .tbl { page-break-inside: auto; }
          tr { page-break-inside: avoid; }
        }
      </style>
    </head><body>
      <div class="doc-title">ملف الموكل الشامل</div>
      <div class="doc-date">تاريخ التصدير: ${exportDate}</div>
      <hr class="divider">
      ${parts.join('')}
      <div class="doc-footer">LexPro — نظام إدارة مكاتب المحاماة</div>
    </body></html>`;
  };

  const printViaIframe = (html: string) => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;
    doc.open();
    doc.write(html);
    doc.close();

    iframe.onload = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch {
        message.error('تعذر الطباعة');
      }
      setTimeout(() => document.body.removeChild(iframe), 1000);
    };
  };

  const handleExportPDF = async () => {
    if (!exportSections.length) { message.warning('اختر الأقسام المراد تصديرها'); return; }
    if (!dossier) return;

    const html = buildExportHTML();
    const fileName = `ملف-الموكل-${dossier.customer?.name || ''}.pdf`;

    if (window.electronAPI?.savePDF) {
      try {
        const result = await window.electronAPI.savePDF(html, fileName);
        if (result.success) {
          message.success('تم حفظ ملف PDF بنجاح');
        } else if (result.message !== 'تم إلغاء الحفظ') {
          message.error('تعذر حفظ الملف: ' + result.message);
        }
      } catch {
        message.error('حدث خطأ أثناء التصدير');
      }
    } else {
      printViaIframe(html);
    }
  };

  const handlePrint = async () => {
    if (!exportSections.length) { message.warning('اختر الأقسام المراد طباعتها'); return; }
    if (!dossier) return;

    const html = buildExportHTML();

    if (window.electronAPI?.printDocument) {
      try {
        const result = await window.electronAPI.printDocument(html);
        if (result.success) {
          message.success('تم إرسال المستند للطباعة');
        } else {
          message.error('تعذر الطباعة: ' + result.message);
        }
      } catch {
        message.error('حدث خطأ أثناء الطباعة');
      }
    } else {
      printViaIframe(html);
    }
  };

  const handleWhatsApp = () => {
    if (!exportSections.length) { message.warning('اختر الأقسام المراد إرسالها'); return; }
    const lines: string[] = ['*ملف الموكل الشامل*', ''];

    if (exportSections.includes('customer')) {
      const c = dossier.customer;
      lines.push('*بيانات الموكل*');
      lines.push(`الاسم: ${c?.name || '—'}`);
      lines.push(`الهاتف: ${c?.phone || '—'}`);
      if (c?.identityNumber) lines.push(`الرقم القومي: ${c.identityNumber}`);
      lines.push('');
    }

    if (exportSections.includes('cases') && dossier.cases?.length) {
      lines.push(`*القضايا (${dossier.cases.length})*`);
      dossier.cases.forEach((c: any, i: number) => {
        lines.push(`${i + 1}. ${c.caseNumber || ''} - ${c.opponentName || ''} - ${c.courtName || ''}`);
      });
      lines.push('');
    }

    if (exportSections.includes('sessions') && dossier.sessions?.length) {
      lines.push(`*الجلسات (${dossier.sessions.length})*`);
      dossier.sessions.forEach((s: any, i: number) => {
        lines.push(`${i + 1}. ${s.sessionDate || ''} - ${s.courtName || ''} - ${s.subject || ''}`);
      });
      lines.push('');
    }

    if (exportSections.includes('announcements') && dossier.announcements?.length) {
      lines.push(`*الإعلانات (${dossier.announcements.length})*`);
      dossier.announcements.forEach((a: any, i: number) => {
        lines.push(`${i + 1}. ${a.announcementNumber || ''} - ${a.courtName || ''} - ${a.recipientName || ''}`);
      });
      lines.push('');
    }

    if (exportSections.includes('fees') && dossier.feeAgreements?.length) {
      lines.push(`*الرسوم (${dossier.feeAgreements.length})*`);
      dossier.feeAgreements.forEach((f: any, i: number) => {
        lines.push(`${i + 1}. إجمالي: ${f.totalAmount || '0'} - مدفوع: ${f.paidAmount || '0'} - متبقي: ${f.remainingAmount || '0'}`);
      });
      lines.push('');
    }

    if (exportSections.includes('expenses') && dossier.expenses?.length) {
      lines.push(`*المصاريف (${dossier.expenses.length})*`);
      dossier.expenses.forEach((e: any, i: number) => {
        lines.push(`${i + 1}. ${e.amount || ''} - ${e.category || ''} - ${e.expenseDate || ''}`);
      });
      lines.push('');
    }

    if (exportSections.includes('documents') && customerDocs.length) {
      lines.push(`*المرفقات (${customerDocs.length})*`);
      customerDocs.forEach((d: any, i: number) => {
        lines.push(`${i + 1}. ${d.name || d.fileName || ''}`);
      });
      lines.push('');
    }

    const text = encodeURIComponent(lines.join('\n'));
    const phone = dossier.customer?.whatsappNumber?.replace(/[^0-9]/g, '') || '';
    const url = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.location.href = url;
  };

  const getFileType = (fileName: string): 'pdf' | 'image' | 'other' => {
    const ext = (fileName || '').split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return 'pdf';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext || '')) return 'image';
    return 'other';
  };

  const getFileIcon = (fileName: string) => {
    const type = getFileType(fileName);
    if (type === 'pdf') return <FilePdfOutlined style={{ fontSize: 20, color: '#c0392b' }} />;
    if (type === 'image') return <EyeOutlined style={{ fontSize: 20, color: '#2980b9' }} />;
    return <PaperClipOutlined style={{ fontSize: 20, color: '#C9A227' }} />;
  };

  const handleUploadDoc = async (file: File): Promise<boolean> => {
    if (!selectedCustomerId) return false;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await api.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const fileId = uploadRes.data?.data?.fileId;
      await api.post('/customer-documents', {
        customerId: selectedCustomerId,
        name: file.name,
        fileName: file.name,
        fileId,
      });
      message.success('تم رفع المرفق');
      fetchCustomerDocs(selectedCustomerId);
    } catch {
      message.error('تعذر رفع المرفق');
    } finally {
      setUploading(false);
    }
    return false;
  };

  const handleOpenDoc = (doc: any) => {
    const url = `${getApiBaseUrl()}/files/${doc.fileId}`;
    window.open(url, '_blank');
  };

  const handleDownloadDoc = (doc: any) => {
    const url = `${getApiBaseUrl()}/files/${doc.fileId}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.name || doc.fileName || 'file';
    a.target = '_blank';
    a.click();
  };

  const handleDeleteDoc = async (doc: any) => {
    try {
      await api.delete(`/customer-documents/${doc._id}`);
      message.success('تم حذف المرفق');
      fetchCustomerDocs(selectedCustomerId);
    } catch {
      message.error('تعذر حذف المرفق');
    }
  };

  const handleDocWhatsApp = (doc: any) => {
    const url = `${getApiBaseUrl()}/files/${doc.fileId}`;
    const text = encodeURIComponent(`*مرفق من ملف الموكل*\n${doc.name || doc.fileName || ''}\n${url}`);
    const phone = dossier?.customer?.whatsappNumber?.replace(/[^0-9]/g, '') || '';
    const waUrl = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(waUrl, '_blank');
  };

  const handleDocPrint = (doc: any) => {
    const type = getFileType(doc.name || doc.fileName || '');
    const url = `${getApiBaseUrl()}/files/${doc.fileId}`;
    if (type === 'pdf' || type === 'image') {
      const printWin = window.open(url, '_blank');
      if (printWin) {
        printWin.onload = () => { printWin.print(); };
      }
    } else {
      message.info('يمكن طباعة ملفات PDF والصور فقط');
    }
  };

  return (
    <div>
      <PageHeader
        title="ملف الموكل الشامل"
        subtitle="ابحث عن موكل لعرض كافة قضاياه وجلساته وإعلاناته وملفاته المالية في مكان واحد"
        searchValue={search}
        onSearch={setSearch}
        searchPlaceholder="ابحث باسم الموكل أو رقم الهاتف"
      />

      {!dossier && !dossierLoading && (
        <Card>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Select
              showSearch
              placeholder="اختر موكل لعرض ملفه الشامل"
              style={{ width: '100%' }}
              optionFilterProp="children"
              onChange={loadDossier}
              options={filteredCustomers.map(c => ({ value: c._id, label: `${c.name} — ${c.phone}` }))}
            />
          </Space>
        </Card>
      )}

      {dossierLoading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
          <Spin size="large" />
        </div>
      )}

      {dossier && (
        <div>
          <Card style={{ marginBottom: 10}} size="small">
            <Descriptions title={`بيانات الموكل: ${dossier.customer?.name}`} column={3} bordered size="small">
              <Descriptions.Item label="الاسم">{dossier.customer?.name}</Descriptions.Item>
              <Descriptions.Item label="الهاتف">{dossier.customer?.phone || '—'}</Descriptions.Item>
              <Descriptions.Item label="واتساب">{dossier.customer?.whatsappNumber || '—'}</Descriptions.Item>
              <Descriptions.Item label="البريد">{dossier.customer?.email || '—'}</Descriptions.Item>
              <Descriptions.Item label="الرقم القومي">{dossier.customer?.identityNumber || '—'}</Descriptions.Item>
              <Descriptions.Item label="العنوان">{dossier.customer?.address || '—'}</Descriptions.Item>
              <Descriptions.Item label="ملاحظات" span={3}>{dossier.customer?.notes || '—'}</Descriptions.Item>
            </Descriptions>
          </Card>

          <Row gutter={[12, 12]} style={{ marginBottom: 10 }}>
            <Col xs={12} sm={6}><Card size="small"><Statistic title="القضايا" value={dossier.stats?.totalCases || 0} /></Card></Col>
            <Col xs={12} sm={6}><Card size="small"><Statistic title="الجلسات" value={dossier.stats?.totalSessions || 0} /></Card></Col>
            <Col xs={12} sm={6}><Card size="small"><Statistic title="الإعلانات" value={dossier.stats?.totalAnnouncements || 0} /></Card></Col>
            <Col xs={12} sm={6}><Card size="small"><Statistic title="المصاريف" value={dossier.stats?.totalExpenses || 0} suffix="ج.م" /></Card></Col>
            <Col xs={12} sm={6}><Card size="small"><Statistic title="إجمالي الرسوم" value={dossier.stats?.totalFees || 0} suffix="ج.م" /></Card></Col>
            <Col xs={12} sm={6}><Card size="small"><Statistic title="المحصّل" value={dossier.stats?.paidFees || 0} suffix="ج.م" valueStyle={{ color: '#27ae60' }} /></Card></Col>
            <Col xs={12} sm={6}><Card size="small"><Statistic title="المتبقي" value={dossier.stats?.remainingFees || 0} suffix="ج.م" valueStyle={{ color: '#c0392b' }} /></Card></Col>
          </Row>

          <Tabs
            items={[
              {
                key: 'overview',
                label: 'نظرة عامة',
                children: (
                  <div>
                    <Card title={<span><ExportOutlined style={{ marginLeft: 8 }} />تصدير شامل</span>} size="small" style={{ marginBottom: 12 }}>
                      <Space direction="vertical" style={{ width: '100%' }} size="middle">
                        <Typography.Text strong>حدد الأقسام المراد تصديرها:</Typography.Text>
                        <Checkbox.Group
                          value={exportSections}
                          onChange={(vals) => setExportSections(vals as string[])}
                          options={sectionOptions}
                        />
                        <Divider style={{ margin: '4px 0' }} />
                        <Space wrap>
                          <Button type="primary" icon={<FilePdfOutlined />} onClick={handleExportPDF}>تصدير PDF</Button>
                          <Button icon={<PrinterOutlined />} onClick={handlePrint}>طباعة</Button>
                          <Button icon={<WhatsAppOutlined />} style={{ color: '#25D366', borderColor: '#25D366' }} onClick={handleWhatsApp}>واتساب</Button>
                        </Space>
                      </Space>
                    </Card>

                    <Row gutter={[12, 12]}>
                      <Col xs={12} sm={8}><Card size="small"><Statistic title="إجمالي القضايا" value={dossier.stats?.totalCases || 0} /></Card></Col>
                      <Col xs={12} sm={8}><Card size="small"><Statistic title="إجمالي الجلسات" value={dossier.stats?.totalSessions || 0} /></Card></Col>
                      <Col xs={12} sm={8}><Card size="small"><Statistic title="إجمالي الإعلانات" value={dossier.stats?.totalAnnouncements || 0} /></Card></Col>
                      <Col xs={12} sm={8}><Card size="small"><Statistic title="إجمالي الرسوم" value={dossier.stats?.totalFees || 0} suffix="ج.م" /></Card></Col>
                      <Col xs={12} sm={8}><Card size="small"><Statistic title="المحصّل" value={dossier.stats?.paidFees || 0} suffix="ج.م" valueStyle={{ color: '#27ae60' }} /></Card></Col>
                      <Col xs={12} sm={8}><Card size="small"><Statistic title="المتبقي" value={dossier.stats?.remainingFees || 0} suffix="ج.م" valueStyle={{ color: '#c0392b' }} /></Card></Col>
                    </Row>
                  </div>
                ),
              },
              { key: 'cases', label: `القضايا (${dossier.cases?.length || 0})`, children: <Table columns={caseColumns} dataSource={dossier.cases} rowKey="_id" pagination={{ pageSize: 5 }} size="small" /> },
              { key: 'sessions', label: `الجلسات (${dossier.sessions?.length || 0})`, children: <Table columns={sessionColumns} dataSource={dossier.sessions} rowKey="_id" pagination={{ pageSize: 5 }} size="small" /> },
              { key: 'announcements', label: `الإعلانات (${dossier.announcements?.length || 0})`, children: <Table columns={annColumns} dataSource={dossier.announcements} rowKey="_id" pagination={{ pageSize: 5 }} size="small" /> },
              { key: 'fees', label: `الرسوم (${dossier.feeAgreements?.length || 0})`, children: <Table columns={feeColumns} dataSource={dossier.feeAgreements} rowKey="_id" pagination={{ pageSize: 5 }} size="small" /> },
              { key: 'expenses', label: `المصاريف (${dossier.expenses?.length || 0})`, children: <Table columns={expenseColumns} dataSource={dossier.expenses} rowKey="_id" pagination={{ pageSize: 5 }} size="small" /> },
              {
                key: 'documents',
                label: `المرفقات (${customerDocs.length})`,
                children: (
                  <List
                    bordered
                    dataSource={customerDocs}
                    locale={{ emptyText: 'لا توجد مرفقات' }}
                    renderItem={(doc: any) => (
                      <List.Item
                        actions={[
                          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleOpenDoc(doc)} key="open">فتح</Button>,
                          <Button type="link" size="small" icon={<DownloadOutlined />} onClick={() => handleDownloadDoc(doc)} key="dl">تحميل</Button>,
                          <Button type="link" size="small" icon={<PrinterOutlined />} onClick={() => handleDocPrint(doc)} key="print">طباعة</Button>,
                          <Button type="link" size="small" style={{ color: '#25D366' }} icon={<WhatsAppOutlined />} onClick={() => handleDocWhatsApp(doc)} key="wa">واتساب</Button>,
                          <Popconfirm key="del" title="حذف هذا المرفق؟" onConfirm={() => handleDeleteDoc(doc)} okText="نعم" cancelText="لا">
                            <Button type="link" size="small" danger icon={<DeleteOutlined />}>حذف</Button>
                          </Popconfirm>,
                        ]}
                      >
                        <List.Item.Meta
                          avatar={getFileIcon(doc.name || doc.fileName || '')}
                          title={doc.name || doc.fileName || 'ملف بدون اسم'}
                          description={doc.createdDate ? new Date(doc.createdDate).toLocaleDateString('ar-EG') : ''}
                        />
                      </List.Item>
                    )}
                  />
                ),
              },
            ]}
          />
        </div>
      )}
    </div>
  );
}
