import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout as AntLayout, Menu, theme, Avatar, Dropdown, Space, Tag } from 'antd';
import type { MenuProps } from 'antd';
import {
  DashboardOutlined,
  BellOutlined,
  UserAddOutlined,
  FolderAddOutlined,
  CalendarOutlined,
  NotificationOutlined,
  CheckSquareOutlined,
  SolutionOutlined,
  BankOutlined,
  FileTextOutlined,
  DatabaseOutlined,
  DollarOutlined,
  ShoppingCartOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  TeamOutlined,
  LogoutOutlined,
  UserOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../store/auth';
import { ActivityBell } from './ActivityBell';
import { Chat } from './Chat';
import logoFull from '../../public/logo.svg';
import logoIcon from '../../public/logo-icon.svg';

const { Sider, Header, Content } = AntLayout;

const allMenuItems = [
  { key: '/', icon: <DashboardOutlined />, label: 'لوحة التحكم', module: 'dashboard' },
  { key: '/notifications', icon: <BellOutlined />, label: 'التنبيهات', module: 'notifications' },
  { key: '/customers', icon: <UserAddOutlined />, label: 'العملاء', module: 'customers' },
  { key: '/cases', icon: <FolderAddOutlined />, label: 'القضايا', module: 'cases' },
  { key: '/sessions', icon: <CalendarOutlined />, label: 'الجلسات', module: 'sessions' },
  { key: '/announcements', icon: <NotificationOutlined />, label: 'الإعلانات', module: 'announcements' },
  { key: '/tasks', icon: <CheckSquareOutlined />, label: 'المهام', module: 'tasks' },
  { key: '/customer-dossier', icon: <SolutionOutlined />, label: 'ملف الموكل الشامل', module: 'customers' },
  { key: '/court-dossier', icon: <BankOutlined />, label: 'ملف المحكمة', module: 'cases' },
  { key: '/templates', icon: <FileTextOutlined />, label: 'النماذج', module: 'templates' },
  { key: '/recycle-bin', icon: <DeleteOutlined />, label: 'سلة المحذوفات', module: 'settings' },
  { key: '/settings/backup', icon: <DatabaseOutlined />, label: 'النسخ الاحتياطي', module: 'backup' },
  {
    key: 'accounts',
    icon: <DollarOutlined />,
    label: 'الحسابات',
    children: [
      { key: '/fees', icon: <DollarOutlined />, label: 'الأتعاب', module: 'fees' },
      { key: '/expenses', icon: <ShoppingCartOutlined />, label: 'المصروفات', module: 'expenses' },
    ],
  },
  {
    key: 'elements',
    icon: <SettingOutlined />,
    label: 'الإعدادات',
    children: [
      { key: '/settings/case-types', icon: <FolderAddOutlined />, label: 'أنواع القضايا', module: 'settings' },
      { key: '/settings/announcement-types', icon: <NotificationOutlined />, label: 'أنواع الإعلانات', module: 'settings' },
      { key: '/settings/courts', icon: <BankOutlined />, label: 'المحاكم', module: 'settings' },
      { key: '/settings/lawyer-profile', icon: <SolutionOutlined />, label: 'بيانات المحامي', module: 'settings' },
    ],
  },
  { key: '/users', icon: <TeamOutlined />, label: 'إدارة المستخدمين', module: 'users' },
];

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

export function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = theme.useToken();
  const { user, logout, hasPermission, canAccess } = useAuthStore();

  const selectedKey = location.pathname;
  const openKeys: string[] = [];
  if (selectedKey.startsWith('/fees') || selectedKey.startsWith('/expenses')) openKeys.push('accounts');
  if (selectedKey.startsWith('/settings/')) openKeys.push('elements');

  // تصفية عناصر القائمة بناءً على الصلاحيات
  const filterMenuItems = (items: any[]): any[] => {
    return items
      .filter(item => {
        if (item.children) return true;
        return canAccess(item.key);
      })
      .map(item => {
        if (item.children) {
          const children = item.children.filter((c: any) => canAccess(c.key));
          if (children.length === 0) return null;
          return { ...item, children };
        }
        return item;
      })
      .filter(Boolean);
  };

  const visibleMenuItems = filterMenuItems(allMenuItems);

  // Find the current page label
  const findLabel = (key: string): string => {
    for (const item of allMenuItems) {
      if (item.key === key) return item.label as string;
      const children = (item as any).children;
      if (children) {
        for (const child of children) {
          if (child.key === key) return child.label as string;
        }
      }
    }
    return 'LEX PRO';
  };

  const dropdownItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'الملف الشخصي',
      onClick: () => navigate('/profile'),
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'تسجيل الخروج',
      onClick: () => {
        logout();
        navigate('/login');
      },
    },
  ];

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        theme="dark"
        width={220}
        collapsedWidth={60}
        style={{
          background: '#060b16',
          boxShadow: '2px 0 8px rgba(0,0,0,0.15)',
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflow: 'auto',
        }}
      >
        <div style={{
          height: 90,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          padding: collapsed ? '8px' : '4px',
          background: 'rgba(0,0,0,0.15)',
        }}>
          <img
            src={collapsed ? logoIcon : logoFull}
            alt="LEX PRO"
            style={{
              maxWidth: '100%',
              maxHeight: 82,
              objectFit: 'contain',
              transition: 'all 0.2s ease',
            }}
          />
        </div>

        <style>{`
          .lp-sider-menu .ant-menu-item {
            margin: 3px 8px !important;
            border-radius: 8px !important;
            transition: all 0.2s ease !important;
            font-size: 15px !important;
          }
          .lp-sider-menu .ant-menu-item .anticon {
            font-size: 17px !important;
          }
          .lp-sider-menu .ant-menu-item:hover {
            background: rgba(255,255,255,0.05) !important;
            color: #C9A227 !important;
          }
          .lp-sider-menu .ant-menu-item:hover .anticon {
            color: #C9A227 !important;
          }
          .lp-sider-menu .ant-menu-item-selected {
            background: rgba(201,162,39,0.12) !important;
            color: #C9A227 !important;
          }
          .lp-sider-menu .ant-menu-item-selected .anticon {
            color: #C9A227 !important;
          }
          .lp-sider-menu .ant-menu-item-selected::after {
            border-inline-end-color: #C9A227 !important;
          }
          .lp-sider-menu .ant-menu-submenu-title {
            margin: 3px 8px !important;
            border-radius: 8px !important;
            transition: all 0.2s ease !important;
            font-size: 15px !important;
          }
          .lp-sider-menu .ant-menu-submenu-title .anticon {
            font-size: 17px !important;
          }
          .lp-sider-menu .ant-menu-submenu-title:hover {
            background: rgba(255,255,255,0.05) !important;
            color: #C9A227 !important;
          }
          .lp-sider-menu .ant-menu-submenu-title:hover .anticon {
            color: #C9A227 !important;
          }
          .lp-sider-menu .ant-menu-sub {
            background: rgba(0,0,0,0.2) !important;
            border-radius: 8px !important;
            margin: 0 8px 4px 8px !important;
          }
          .lp-sider-menu .ant-menu-sub .ant-menu-item {
            margin: 2px 4px !important;
            border-radius: 6px !important;
            font-size: 14px !important;
          }
          .lp-sider-menu .ant-menu-sub .ant-menu-item .anticon {
            font-size: 15px !important;
          }
        `}</style>
        <Menu
          className="lp-sider-menu"
          mode="inline"
          selectedKeys={[selectedKey]}
          defaultOpenKeys={openKeys}
          items={visibleMenuItems}
          onClick={({ key }) => navigate(key)}
          theme="dark"
          style={{
            background: 'transparent',
            borderInlineEnd: 'none',
            padding: '8px 0',
          }}
        />
      </Sider>

      <AntLayout>
        <Header style={{
          background: token.colorBgContainer,
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          height: 52,
          position: 'sticky',
          top: 0,
          zIndex: 10,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span
              onClick={() => setCollapsed(!collapsed)}
              style={{
                fontSize: 17,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '4px',
                borderRadius: 6,
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = token.colorFillSecondary}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </span>
            <span style={{
              fontSize: 15,
              fontWeight: 600,
              color: '#2c3e50',
            }}>
              {findLabel(selectedKey)}
            </span>
          </div>

          {/* الإشعارات + معلومات المستخدم */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ActivityBell />
            <Chat />
            {user && (
            <Dropdown menu={{ items: dropdownItems }} placement="bottomLeft">
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: 8,
                transition: 'background 0.2s',
              }}
                onMouseEnter={(e) => e.currentTarget.style.background = token.colorFillSecondary}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <Avatar
                  src={user.avatar || undefined}
                  style={{
                    background: roleColors[user.role] || '#2c3e50',
                    fontSize: 14,
                  }}
                  size={32}
                  icon={!user.avatar && <UserOutlined />}
                >
                  {!user.avatar && (user.name?.charAt(0) || '؟')}
                </Avatar>
                <div style={{ lineHeight: 1.2 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#2c3e50' }}>{user.name}</div>
                  <Tag color={roleColors[user.role]} style={{ fontSize: 10, margin: 0, lineHeight: '16px', padding: '0 4px' }}>
                    {roleLabels[user.role] || user.role}
                  </Tag>
                </div>
              </div>
            </Dropdown>
          )}
          </div>
        </Header>
        <Content style={{
          margin: 0,
          padding: 14,
          overflow: 'auto',
          background: '#f0f2f5',
        }}>
          <Outlet />
        </Content>
      </AntLayout>
    </AntLayout>
  );
}
