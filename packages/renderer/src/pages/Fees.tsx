import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Modal, Form, Input, Select, Space, Popconfirm, message, Row, Col, Tag } from 'antd';
import { EditOutlined, DeleteOutlined, UserOutlined, DollarOutlined } from '@ant-design/icons';
import { createCrudApi } from '../api/client';
import { PageHeader } from '../components/PageHeader';
import { AppModal } from '../components/AppModal';
import api from '../api/client';

const feesApi = createCrudApi('/fees');
const customersApi = createCrudApi('/customers');
const casesApi = createCrudApi('/cases');
const paymentsApi = createCrudApi('/fee-payments');

export default function Fees() {
  const navigate = useNavigate();
  const [data, setData] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  // حالة نافذة دفعات العميل
  const [custModalOpen, setCustModalOpen] = useState(false);
  const [custLoading, setCustLoading] = useState(false);
  const [custData, setCustData] = useState<any>(null);
  const [custFees, setCustFees] = useState<any[]>([]);
  const [custPayments, setCustPayments] = useState<any[]>([]);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payForm] = Form.useForm();
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [feeModalOpen, setFeeModalOpen] = useState(false);
  const [feeForm] = Form.useForm();
  const [feeEditing, setFeeEditing] = useState<any>(null);
  const [feeSubmitting, setFeeSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [feeRes, custRes, caseRes] = await Promise.all([feesApi.getAll(), customersApi.getAll(), casesApi.getAll()]);
      setData(feeRes.data.data || feeRes.data || []);
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

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      if (editing?._id) await feesApi.update(editing._id, values);
      else await feesApi.create(values);
      message.success(editing ? 'تم التحديث' : 'تمت الإضافة');
      setModalOpen(false);
      fetchData();
    } catch (e: any) { if (!e?.errorFields) message.error('حدث خطأ'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    try { await feesApi.delete(id); message.success('تم الحذف'); fetchData(); }
    catch { message.error('حدث خطأ'); }
  };

  const formatEGP = (v: any) => `${Number(v || 0).toLocaleString('en-US')} ج.م`;

  const getStatusInfo = (paid: number, remaining: number) => {
    if (remaining <= 0 || (paid <= 0 && remaining <= 0 && paid === 0)) return { label: 'مسدد', color: 'green' };
    if (paid > 0 && remaining > 0) return { label: 'جزئي', color: 'orange' };
    return { label: 'غير مسدد', color: 'red' };
  };

  // فتح نافذة دفعات العميل
  const openCustomerModal = async (customerId: string, customerName: string) => {
    setCustModalOpen(true);
    setCustLoading(true);
    setCustData({ _id: customerId, name: customerName });
    try {
      const [feesRes, paysRes] = await Promise.all([
        api.get('/fees'),
        api.get('/fee-payments'),
      ]);
      const allFees = feesRes.data?.data || feesRes.data || [];
      const allPays = paysRes.data?.data || paysRes.data || [];
      const custFees = allFees.filter((f: any) => f.customerId === customerId || f.customerId?._id === customerId);
      const custPays = allPays.filter((p: any) => {
        const fee = allFees.find((f: any) => f._id === (p.feeAgreementId?._id || p.feeAgreementId));
        return fee && (fee.customerId === customerId || fee.customerId?._id === customerId);
      });
      setCustFees(custFees);
      setCustPayments(custPays);
    } catch {
      message.error('تعذر تحميل بيانات العميل');
    } finally {
      setCustLoading(false);
    }
  };

  const handleAddPayment = async () => {
    try {
      const values = await payForm.validateFields();
      setPaySubmitting(true);
      const feeId = values.feeAgreementId;
      await paymentsApi.create({ ...values, feeAgreementId: feeId });
      message.success('تم إضافة الدفعة');
      setPayModalOpen(false);
      payForm.resetFields();
      // إعادة تحميل
      if (custData?._id) openCustomerModal(custData._id, custData.name);
      fetchData();
    } catch (e: any) { if (!e?.errorFields) message.error('حدث خطأ'); }
    finally { setPaySubmitting(false); }
  };

  const handleDeletePayment = async (id: string) => {
    try {
      await paymentsApi.delete(id);
      message.success('تم حذف الدفعة');
      if (custData?._id) openCustomerModal(custData._id, custData.name);
      fetchData();
    } catch { message.error('حدث خطأ'); }
  };

  // إضافة/تعديل اتفاقية من نافذة العميل
  const openFeeModal = (record?: any) => {
    setFeeEditing(record || null);
    if (record) feeForm.setFieldsValue(record);
    else feeForm.resetFields();
    setFeeModalOpen(true);
  };

  const handleFeeSubmit = async () => {
    try {
      const values = await feeForm.validateFields();
      setFeeSubmitting(true);
      if (feeEditing?._id) await feesApi.update(feeEditing._id, values);
      else await feesApi.create({ ...values, customerId: custData?._id });
      message.success(feeEditing ? 'تم التحديث' : 'تمت الإضافة');
      setFeeModalOpen(false);
      if (custData?._id) openCustomerModal(custData._id, custData.name);
      fetchData();
    } catch (e: any) { if (!e?.errorFields) message.error('حدث خطأ'); }
    finally { setFeeSubmitting(false); }
  };

  const handleDeleteFee = async (id: string) => {
    try {
      await feesApi.delete(id);
      message.success('تم حذف الاتفاقية');
      if (custData?._id) openCustomerModal(custData._id, custData.name);
      fetchData();
    } catch { message.error('حدث خطأ'); }
  };

  const custTotalFees = custFees.reduce((s, f) => s + Number(f.totalAmount || 0), 0);
  const custTotalPaid = custPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const custTotalRemaining = custTotalFees - custTotalPaid;

  const columns = [
    {
      title: 'العميل',
      dataIndex: 'customerName',
      render: (v: string, r: any) => (
        <a
          onClick={(e) => { e.stopPropagation(); const cid = r.customerId?._id || r.customerId; if (cid) openCustomerModal(cid, v); }}
          style={{ color: '#C9A227', fontWeight: 600, cursor: 'pointer' }}
        >
          {v || '—'}
        </a>
      ),
    },
    { title: 'رقم القضية', dataIndex: 'caseNumber' },
    { title: 'المبلغ الإجمالي', dataIndex: 'totalAmount', render: (v: string) => formatEGP(v) },
    { title: 'المدفوع', dataIndex: 'paidAmount', render: (v: string) => <span style={{ color: '#16a34a', fontWeight: 600 }}>{formatEGP(v)}</span> },
    { title: 'المتبقي', dataIndex: 'remainingAmount', render: (v: string) => <span style={{ color: '#dc2626', fontWeight: 600 }}>{formatEGP(v)}</span> },
    {
      title: 'الحالة',
      key: 'status',
      render: (_: any, r: any) => {
        const paid = Number(r.paidAmount || 0);
        const remaining = Number(r.remainingAmount || 0);
        const status = getStatusInfo(paid, remaining);
        return <Tag color={status.color} style={{ borderRadius: 6, fontWeight: 600, minWidth: 70, textAlign: 'center' }}>{status.label}</Tag>;
      },
    },
    { title: 'التاريخ', dataIndex: 'agreementDate' },
    { title: 'إجراءات', render: (_: any, r: any) => (
      <Space>
        <Button type="text" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); openModal(r); }} />
        <Popconfirm title="حذف؟" onConfirm={() => handleDelete(r._id)}><Button type="text" danger icon={<DeleteOutlined />} onClick={(e) => e.stopPropagation()} /></Popconfirm>
      </Space>
    )},
  ];

  const payColumns = [
    { title: 'المبلغ', dataIndex: 'amount', render: (v: string) => <span style={{ color: '#16a34a', fontWeight: 600 }}>{formatEGP(v)}</span> },
    { title: 'تاريخ الدفع', dataIndex: 'paymentDate' },
    { title: 'ملاحظات', dataIndex: 'notes' },
    { title: 'إجراءات', render: (_: any, r: any) => (
      <Popconfirm title="حذف الدفعة؟" onConfirm={() => handleDeletePayment(r._id)}>
        <Button type="text" danger icon={<DeleteOutlined />} />
      </Popconfirm>
    )},
  ];

  return (
    <div>
      <PageHeader
        title="الرسوم والمصروفات"
        subtitle="إدارة الاتفاقيات والرسوم والمدفوعات"
        onAdd={() => openModal()}
        addLabel="إضافة +"
      />
      <Table columns={columns} dataSource={data} rowKey="_id" loading={loading} size="small" pagination={{ pageSize: 10 }} onRow={(r) => ({ onClick: () => navigate(`/fees/${r._id}`), style: { cursor: 'pointer' } })} />
      <AppModal
        title={editing ? 'تعديل اتفاقية' : 'إضافة اتفاقية رسوم'}
        subtitle="إدارة الاتفاقيات والرسوم"
        icon={<DollarOutlined />}
        iconColor="#16a34a"
        iconColorTo="#22c55e"
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        okText="حفظ"
        cancelText="إلغاء"
        width={640}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="customerId" label="العميل" rules={[{ required: true }]}><Select showSearch optionFilterProp="children" options={customers.map((c: any) => ({ value: c._id, label: c.name }))} /></Form.Item>
          <Form.Item name="caseId" label="القضية"><Select showSearch allowClear optionFilterProp="children" options={cases.map((c: any) => ({ value: c._id, label: `${c.caseNumber}/${c.caseYear}` }))} /></Form.Item>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="totalAmount" label="المبلغ الإجمالي" rules={[{ required: true }]}><Input type="number" /></Form.Item></Col>
            <Col span={12}><Form.Item name="agreementDate" label="تاريخ الاتفاقية" rules={[{ required: true }]}><Input type="date" /></Form.Item></Col>
          </Row>
          <Form.Item name="notes" label="ملاحظات" rules={[{ required: true }]}><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </AppModal>

      {/* نافذة دفعات العميل */}
      <AppModal
        title={`دفعات العميل — ${custData?.name || ''}`}
        subtitle="عرض الدفعات واتفاقيات الرسوم"
        icon={<UserOutlined />}
        iconColor="#C9A227"
        iconColorTo="#e0b53e"
        open={custModalOpen}
        onCancel={() => setCustModalOpen(false)}
        hideFooter
        width={720}
      >
        {custLoading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>جاري التحميل...</div>
        ) : (
          <>
            {/* الملخص المالي */}
            <Row gutter={12} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <div style={{
                  background: '#f8fafc',
                  borderRadius: 10,
                  padding: '12px 16px',
                  border: '1px solid #e2e8f0',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>إجمالي الدفعات</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#1a2332' }}>{formatEGP(custTotalFees)}</div>
                </div>
              </Col>
              <Col span={8}>
                <div style={{
                  background: '#fef2f2',
                  borderRadius: 10,
                  padding: '12px 16px',
                  border: '1px solid #fecaca',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 12, color: '#dc2626', marginBottom: 4 }}>المتبقي</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#dc2626' }}>{formatEGP(custTotalRemaining)}</div>
                </div>
              </Col>
              <Col span={8}>
                <div style={{
                  background: '#f0fdf4',
                  borderRadius: 10,
                  padding: '12px 16px',
                  border: '1px solid #bbf7d0',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 12, color: '#16a34a', marginBottom: 4 }}>المدفوع</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#16a34a' }}>{formatEGP(custTotalPaid)}</div>
                </div>
              </Col>
            </Row>

            {/* جدول الدفعات */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#1a2332' }}>سجل الدفعات</span>
              <Button type="primary" size="small" onClick={() => { payForm.resetFields(); setPayModalOpen(true); }}>
                + إضافة دفعة
              </Button>
            </div>
            <Table
              columns={payColumns}
              dataSource={custPayments}
              rowKey="_id"
              size="small"
              pagination={false}
              locale={{ emptyText: 'لا توجد دفعات' }}
              style={{ marginBottom: 16 }}
            />

            {/* اتفاقيات الرسوم */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#1a2332' }}>اتفاقيات الرسوم</span>
              <Button type="primary" size="small" onClick={() => openFeeModal()}>+ إضافة اتفاقية</Button>
            </div>
            <Table
              columns={[
                { title: 'المبلغ الإجمالي', dataIndex: 'totalAmount', render: (v: string) => formatEGP(v) },
                { title: 'المدفوع', dataIndex: 'paidAmount', render: (v: string) => <span style={{ color: '#16a34a', fontWeight: 600 }}>{formatEGP(v)}</span> },
                { title: 'المتبقي', dataIndex: 'remainingAmount', render: (v: string) => <span style={{ color: '#dc2626', fontWeight: 600 }}>{formatEGP(v)}</span> },
                { title: 'التاريخ', dataIndex: 'agreementDate' },
                { title: 'إجراءات', render: (_: any, r: any) => (
                  <Space>
                    <Button type="text" icon={<EditOutlined />} onClick={() => openFeeModal(r)} />
                    <Popconfirm title="حذف الاتفاقية؟" onConfirm={() => handleDeleteFee(r._id)}>
                      <Button type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  </Space>
                )},
              ]}
              dataSource={custFees}
              rowKey="_id"
              size="small"
              pagination={false}
              locale={{ emptyText: 'لا توجد اتفاقيات' }}
            />
          </>
        )}
      </AppModal>

      {/* نافذة إضافة/تعديل اتفاقية */}
      <AppModal
        title={feeEditing ? 'تعديل اتفاقية' : 'إضافة اتفاقية رسوم'}
        subtitle="إدارة اتفاقيات الرسوم"
        icon={<DollarOutlined />}
        iconColor="#16a34a"
        iconColorTo="#22c55e"
        open={feeModalOpen}
        onOk={handleFeeSubmit}
        onCancel={() => setFeeModalOpen(false)}
        confirmLoading={feeSubmitting}
        okText="حفظ"
        cancelText="إلغاء"
        width={640}
      >
        <Form form={feeForm} layout="vertical">
          <Form.Item name="caseId" label="القضية">
            <Select showSearch allowClear optionFilterProp="children" options={cases.map((c: any) => ({ value: c._id, label: `${c.caseNumber}/${c.caseYear}` }))} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="totalAmount" label="المبلغ الإجمالي" rules={[{ required: true }]}><Input type="number" /></Form.Item></Col>
            <Col span={12}><Form.Item name="agreementDate" label="تاريخ الاتفاقية" rules={[{ required: true }]}><Input type="date" /></Form.Item></Col>
          </Row>
          <Form.Item name="notes" label="ملاحظات"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </AppModal>

      {/* نافذة إضافة دفعة */}
      <AppModal
        title="إضافة دفعة"
        subtitle="تسجيل دفعة جديدة"
        icon={<DollarOutlined />}
        iconColor="#16a34a"
        iconColorTo="#22c55e"
        open={payModalOpen}
        onOk={handleAddPayment}
        onCancel={() => setPayModalOpen(false)}
        confirmLoading={paySubmitting}
        okText="حفظ"
        cancelText="إلغاء"
        width={520}
      >
        <Form form={payForm} layout="vertical">
          <Form.Item name="feeAgreementId" label="الاتفاقية" rules={[{ required: true }]}>
            <Select
              placeholder="اختر الاتفاقية"
              options={custFees.map((f: any) => ({
                value: f._id,
                label: `${formatEGP(f.totalAmount)} — ${f.caseNumber || 'بدون قضية'}`,
              }))}
            />
          </Form.Item>
          <Form.Item name="amount" label="المبلغ" rules={[{ required: true }]}><Input type="number" /></Form.Item>
          <Form.Item name="paymentDate" label="تاريخ الدفع" rules={[{ required: true }]}><Input type="date" /></Form.Item>
          <Form.Item name="notes" label="ملاحظات"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </AppModal>
    </div>
  );
}
