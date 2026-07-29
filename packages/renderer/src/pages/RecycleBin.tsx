import { useState, useEffect, useCallback } from 'react';
import { Table, Button, Popconfirm, message, Tag, Tooltip, Empty } from 'antd';
import { DeleteOutlined, UndoOutlined, RestOutlined } from '@ant-design/icons';
import { recycleBinApi } from '../api/client';
import { PageHeader } from '../components/PageHeader';

interface DeletedItem {
  _id: string;
  collectionName: string;
  displayName: string;
  deletedBy: string;
  createdAt: string;
}

const collectionLabels: Record<string, string> = {
  Customer: 'عميل',
  Case: 'قضية',
  CaseSession: 'جلسة',
  CaseAnnouncement: 'إعلان',
  CaseDocument: 'مستند قضية',
  SessionDocument: 'مستند جلسة',
  AnnouncementDocument: 'مستند إعلان',
  CustomerDocument: 'مستند عميل',
  DocumentTemplate: 'قالب',
  FeeAgreement: 'اتفاقية رسوم',
  Expense: 'مصروف',
  ExpenseDocument: 'مستند مصروف',
  Court: 'محكمة',
  CaseType: 'نوع قضية',
  AnnouncementType: 'نوع إعلان',
  Task: 'مهمة',
};

const collectionColors: Record<string, string> = {
  Customer: 'blue',
  Case: 'purple',
  CaseSession: 'cyan',
  CaseAnnouncement: 'orange',
  CaseDocument: 'geekblue',
  SessionDocument: 'geekblue',
  AnnouncementDocument: 'geekblue',
  CustomerDocument: 'geekblue',
  DocumentTemplate: 'gold',
  FeeAgreement: 'green',
  Expense: 'red',
  ExpenseDocument: 'volcano',
  Court: 'magenta',
  CaseType: 'magenta',
  AnnouncementType: 'magenta',
  Task: 'lime',
};

export default function RecycleBin() {
  const [items, setItems] = useState<DeletedItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await recycleBinApi.getAll();
      setItems(res.data.data || []);
    } catch {
      message.error('تعذر تحميل سلة المحذوفات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleRestore = async (id: string) => {
    try {
      await recycleBinApi.restore(id);
      message.success('تمت الاستعادة بنجاح');
      fetchItems();
    } catch {
      message.error('تعذرت الاستعادة');
    }
  };

  const handleDeletePermanent = async (id: string) => {
    try {
      await recycleBinApi.deletePermanent(id);
      message.success('تم الحذف النهائي');
      fetchItems();
    } catch {
      message.error('تعذر الحذف');
    }
  };

  const handleEmpty = async () => {
    try {
      await recycleBinApi.empty();
      message.success('تم تفريغ السلة');
      fetchItems();
    } catch {
      message.error('تعذر تفريغ السلة');
    }
  };

  const getRemainingHours = (createdAt: string): number => {
    const elapsed = Date.now() - new Date(createdAt).getTime();
    const remaining = 48 * 60 * 60 * 1000 - elapsed;
    return Math.max(0, Math.ceil(remaining / (60 * 60 * 1000)));
  };

  const columns = [
    {
      title: 'الاسم',
      dataIndex: 'displayName',
      key: 'displayName',
      width: '30%',
    },
    {
      title: 'النوع',
      dataIndex: 'collectionName',
      key: 'collectionName',
      width: '15%',
      render: (name: string) => (
        <Tag color={collectionColors[name] || 'default'}>
          {collectionLabels[name] || name}
        </Tag>
      ),
    },
    {
      title: 'تاريخ الحذف',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: '20%',
      render: (date: string) => new Date(date).toLocaleString('ar-EG'),
    },
    {
      title: 'متبقي قبل الحذف النهائي',
      key: 'remaining',
      width: '15%',
      render: (_: any, record: DeletedItem) => {
        const hours = getRemainingHours(record.createdAt);
        return (
          <Tag color={hours <= 6 ? 'red' : hours <= 12 ? 'orange' : 'green'}>
            {hours > 0 ? `${hours} ساعة` : 'منتهي'}
          </Tag>
        );
      },
    },
    {
      title: 'إجراءات',
      key: 'actions',
      width: '20%',
      render: (_: any, record: DeletedItem) => (
        <div style={{ display: 'flex', gap: 8 }}>
          <Tooltip title="استعادة">
            <Button
              type="primary"
              icon={<UndoOutlined />}
              size="small"
              style={{ background: '#27ae60', borderColor: '#27ae60' }}
              onClick={() => handleRestore(record._id)}
            >
              استعادة
            </Button>
          </Tooltip>
          <Popconfirm
            title="حذف نهائي؟"
            description="لا يمكن التراجع عن هذا الإجراء"
            onConfirm={() => handleDeletePermanent(record._id)}
            okText="حذف"
            cancelText="إلغاء"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="حذف نهائي">
              <Button danger icon={<DeleteOutlined />} size="small">
                حذف نهائي
              </Button>
            </Tooltip>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div className="page-container">
      <PageHeader
        title="سلة المحذوفات"
        subtitle="يتم حذف العناصر نهائياً تلقائياً بعد 48 ساعة"
        onDelete={items.length > 0 ? handleEmpty : undefined}
        deleteLabel="تفريغ السلة"
      />
      <Table
        dataSource={items}
        columns={columns}
        rowKey="_id"
        loading={loading}
        locale={{
          emptyText: <Empty description="سلة المحذوفات فارغة" image={Empty.PRESENTED_IMAGE_SIMPLE} />,
        }}
        pagination={{ pageSize: 20, showSizeChanger: false }}
        size="small"
      />
    </div>
  );
}
