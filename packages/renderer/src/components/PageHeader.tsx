import { Button, Space, Input } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { Typography } from 'antd';

const { Title, Text } = Typography;

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  onAdd?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  searchValue?: string;
  onSearch?: (value: string) => void;
  searchPlaceholder?: string;
  addLabel?: string;
  editLabel?: string;
  deleteLabel?: string;
}

export function PageHeader({
  title,
  subtitle,
  onAdd,
  onEdit,
  onDelete,
  searchValue,
  onSearch,
  searchPlaceholder = 'بحث...',
  addLabel = 'إضافة +',
  editLabel = 'تعديل',
  deleteLabel = 'حذف',
}: PageHeaderProps) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div>
          <Title level={4} style={{ margin: 0, color: '#2c3e50' }}>{title}</Title>
          {subtitle && <Text type="secondary" style={{ fontSize: 13 }}>{subtitle}</Text>}
        </div>
        <Space size="middle">
          {onAdd && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={onAdd}
              style={{ background: '#27ae60', borderColor: '#27ae60', height: 38, paddingInline: 18, fontSize: 14 }}
            >
              {addLabel}
            </Button>
          )}
          {onEdit && (
            <Button
              icon={<EditOutlined />}
              onClick={onEdit}
              style={{ background: '#2980b9', borderColor: '#2980b9', color: '#fff', height: 38, paddingInline: 18, fontSize: 14 }}
            >
              {editLabel}
            </Button>
          )}
          {onDelete && (
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={onDelete}
              style={{ background: '#c0392b', borderColor: '#c0392b', height: 38, paddingInline: 18, fontSize: 14 }}
            >
              {deleteLabel}
            </Button>
          )}
        </Space>
      </div>
      {onSearch && (
        <Input
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(e) => onSearch(e.target.value)}
          prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
          style={{ maxWidth: 380 }}
        />
      )}
    </div>
  );
}
