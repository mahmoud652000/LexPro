import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Table, Button, Modal, Form, Input, message, Spin, Typography, Row, Col, Space, Tag } from 'antd';
import { ArrowRightOutlined, PlusOutlined, EditOutlined, DollarOutlined } from '@ant-design/icons';
import { createCrudApi } from '../api/client';
import { AppModal } from '../components/AppModal';

const { Title } = Typography;

const feesApi = createCrudApi('/fees');
const paymentsApi = createCrudApi('/fee-payments');

export default function FeeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [feeData, setFeeData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [payForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await feesApi.getById(id);
      setFeeData(res.data.data || res.data);
    } catch { message.error('حدث خطأ'); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAddPayment = async () => {
    try {
      const values = await payForm.validateFields();
      setSubmitting(true);
      await paymentsApi.create({ ...values, feeAgreementId: id });
      message.success('تم إضافة الدفعة');
      setPayModalOpen(false);
      payForm.resetFields();
      fetchData();
    } catch (e: any) { if (!e?.errorFields) message.error('حدث خطأ'); }
    finally { setSubmitting(false); }
  };

  const handleEditAmount = async () => {
    try {
      const values = await editForm.validateFields();
      setSubmitting(true);
      await feesApi.update(id!, { totalAmount: values.newTotalFee, reason: values.reason, changedBy: values.changedBy });
      message.success('تم تعديل المبلغ');
      setEditModalOpen(false);
      editForm.resetFields();
      fetchData();
    } catch (e: any) { if (!e?.errorFields) message.error('حدث خطأ'); }
    finally { setSubmitting(false); }
  };

  if (loading) return <Spin size="large" style={{ display: 'flex', justifyContent: 'center', marginTop: 100 }} />;
  if (!feeData) return <div>الاتفاقية غير موجودة</div>;

  const payments = feeData.payments || [];
  const history = feeData.history || [];

const formatEGP = (v: any) => `${Number(v || 0).toLocaleString('en-US')} ج.م`;

  const payColumns = [
    { title: 'المبلغ', dataIndex: 'amount', render: (v: string) => <span style={{ color: '#16a34a', fontWeight: 600 }}>{formatEGP(v)}</span> },
    { title: 'تاريخ الدفع', dataIndex: 'paymentDate' },
    { title: 'ملاحظات', dataIndex: 'notes' },
  ];

  const histColumns = [
    { title: 'المبلغ القديم', dataIndex: 'oldTotalFee', render: (v: string) => formatEGP(v) },
    { title: 'المبلغ الجديد', dataIndex: 'newTotalFee', render: (v: string) => formatEGP(v) },
    { title: 'السبب', dataIndex: 'reason' },
    { title: 'بواسطة', dataIndex: 'changedBy' },
    { title: 'التاريخ', dataIndex: 'changedAt' },
  ];

  return (
    <div>
      <Button icon={<ArrowRightOutlined />} onClick={() => navigate('/fees')} style={{ marginBottom: 10 }}>العودة للرسوم</Button>
      <Card style={{ marginBottom: 10 }} size="small">
        <Descriptions title="تفاصيل اتفاقية الرسوم" bordered column={2} size="small">
          <Descriptions.Item label="العميل">{feeData.customerName}</Descriptions.Item>
          <Descriptions.Item label="رقم القضية">{feeData.caseNumber || '-'}</Descriptions.Item>
          <Descriptions.Item label="المبلغ الإجمالي">{formatEGP(feeData.totalAmount)}</Descriptions.Item>
          <Descriptions.Item label="المدفوع"><span style={{ color: '#16a34a', fontWeight: 600 }}>{formatEGP(feeData.paidAmount)}</span></Descriptions.Item>
          <Descriptions.Item label="المتبقي"><span style={{ color: '#dc2626', fontWeight: 600 }}>{formatEGP(feeData.remainingAmount)}</span></Descriptions.Item>
          <Descriptions.Item label="تاريخ الاتفاقية">{feeData.agreementDate}</Descriptions.Item>
          <Descriptions.Item label="ملاحظات" span={2}>{feeData.notes}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Row gutter={12}>
        <Col span={14}>
          <Card title="الدفعات" size="small" extra={<Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => setPayModalOpen(true)}>إضافة دفعة</Button>}>
            <Table columns={payColumns} dataSource={payments} rowKey="_id" size="small" pagination={false} />
          </Card>
        </Col>
        <Col span={10}>
          <Card title="سجل التعديلات" size="small" extra={<Button size="small" icon={<EditOutlined />} onClick={() => { editForm.setFieldsValue({ newTotalFee: feeData.totalAmount }); setEditModalOpen(true); }}>تعديل المبلغ</Button>}>
            <Table columns={histColumns} dataSource={history} rowKey="_id" size="small" pagination={false} />
          </Card>
        </Col>
      </Row>

      <AppModal
        title="إضافة دفعة"
        subtitle="تسجيل دفعة جديدة للاتفاقية"
        icon={<DollarOutlined />}
        iconColor="#16a34a"
        iconColorTo="#22c55e"
        open={payModalOpen}
        onOk={handleAddPayment}
        onCancel={() => setPayModalOpen(false)}
        confirmLoading={submitting}
        okText="حفظ"
        cancelText="إلغاء"
        width={520}
      >
        <Form form={payForm} layout="vertical">
          <Form.Item name="amount" label="المبلغ" rules={[{ required: true }]}><Input type="number" /></Form.Item>
          <Form.Item name="paymentDate" label="تاريخ الدفع" rules={[{ required: true }]}><Input type="date" /></Form.Item>
          <Form.Item name="notes" label="ملاحظات" rules={[{ required: true }]}><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </AppModal>

      <AppModal
        title="تعديل المبلغ الإجمالي"
        subtitle="تعديل المبلغ مع تسجيل السبب"
        icon={<EditOutlined />}
        iconColor="#d97706"
        iconColorTo="#f59e0b"
        open={editModalOpen}
        onOk={handleEditAmount}
        onCancel={() => setEditModalOpen(false)}
        confirmLoading={submitting}
        okText="حفظ"
        cancelText="إلغاء"
        okColor="#d97706"
        width={520}
      >
        <Form form={editForm} layout="vertical">
          <Form.Item name="newTotalFee" label="المبلغ الجديد" rules={[{ required: true }]}><Input type="number" /></Form.Item>
          <Form.Item name="reason" label="سبب التعديل" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="changedBy" label="بواسطة" rules={[{ required: true }]}><Input defaultValue="المحامي" /></Form.Item>
        </Form>
      </AppModal>
    </div>
  );
}