'use client';

import { useState, useEffect } from 'react';
import { Layout, Menu, Button, Avatar, Dropdown, Space, Badge } from 'antd';
import {
  UserOutlined,
  TeamOutlined,
  CarOutlined,
  DollarOutlined,
  ShopOutlined,
  ToolOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LogoutOutlined,
  DashboardOutlined,
  CalendarOutlined,
  SafetyOutlined,
  WalletOutlined,
  SettingOutlined,
  BellOutlined,
  ClockCircleOutlined,
  FileDoneOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import type { MenuProps } from 'antd';

const { Header, Sider, Content } = Layout;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return null;
  }

  const menuItems: MenuProps['items'] = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      key: 'hr',
      icon: <TeamOutlined />,
      label: 'Human Resources',
      children: [
        {
          key: '/dashboard/employees',
          icon: <UserOutlined />,
          label: 'Employees',
        },
        {
          key: '/dashboard/attendance',
          icon: <ClockCircleOutlined />,
          label: 'Attendance',
        },
        {
          key: '/dashboard/leave',
          icon: <CalendarOutlined />,
          label: 'Long Leave',
        },
        {
          key: '/dashboard/payroll',
          icon: <DollarOutlined />,
          label: 'Payroll',
        },
      ],
    },
    {
      key: 'fleet',
      icon: <CarOutlined />,
      label: 'Fleet Management',
      children: [
        {
          key: '/dashboard/vehicles',
          icon: <CarOutlined />,
          label: 'Vehicles',
        },
        {
          key: '/dashboard/fleet/assignments',
          icon: <FileDoneOutlined />,
          label: 'Assignments',
        },
        {
          key: '/dashboard/fleet/fuel-entries',
          icon: <DollarOutlined />,
          label: 'Fuel Entries',
        },
        {
          key: '/dashboard/fleet/maintenance',
          icon: <ToolOutlined />,
          label: 'Maintenance',
        },
      ],
    },
    {
      key: 'operations',
      icon: <AppstoreOutlined />,
      label: 'Operations',
      children: [
        {
          key: '/dashboard/clients',
          icon: <ShopOutlined />,
          label: 'Clients',
        },
        {
          key: '/dashboard/finance',
          icon: <WalletOutlined />,
          label: 'Finance',
        },
        {
          key: '/dashboard/finance/advances',
          icon: <DollarOutlined />,
          label: 'Advances',
        },
      ],
    },
    {
      key: 'inventory',
      icon: <SafetyOutlined />,
      label: 'Inventory',
      children: [
        {
          key: '/dashboard/inventory/general',
          icon: <ToolOutlined />,
          label: 'General Items',
        },
        {
          key: '/dashboard/inventory/restricted',
          icon: <SafetyOutlined />,
          label: 'Restricted Items',
        },
      ],
    },
    {
      key: 'administration',
      icon: <SettingOutlined />,
      label: 'Administration',
      children: [
        {
          key: '/dashboard/administration/roles',
          label: 'Roles & Permissions',
        },
        {
          key: '/dashboard/administration/passwords',
          label: 'Employee Passwords',
        },
        {
          key: '/dashboard/settings',
          label: 'Company Settings',
        },
      ],
    },
  ];

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Profile',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Settings',
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      onClick: logout,
    },
  ];

  return (
    <Layout className="min-h-screen">
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        theme="dark"
        width={250}
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
        }}
      >
        <div className="h-24 flex items-center justify-center border-b border-gray-700 py-4">
          <div className="bg-white p-2 rounded-xl shadow-lg flex items-center justify-center" style={{ width: collapsed ? 48 : 120, height: collapsed ? 48 : 64, transition: 'all 0.2s' }}>
            <img
              src="/images/flash-logo.jpg"
              alt="Flash Logo"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[pathname]}
          defaultOpenKeys={['hr', 'fleet', 'operations', 'inventory']}
          items={menuItems}
          onClick={({ key }) => {
            if (key.startsWith('/')) {
              router.push(key);
            }
          }}
          style={{ borderRight: 0 }}
        />
      </Sider>
      <Layout style={{ marginLeft: collapsed ? 80 : 250, transition: 'all 0.2s' }}>
        <Header
          className="bg-white px-6 flex items-center justify-between shadow-sm"
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 1,
            width: '100%',
            padding: '0 24px',
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            className="text-lg"
          />
          <Space size="large">
            <Badge count={0} showZero={false}>
              <Button type="text" icon={<BellOutlined style={{ fontSize: '18px' }} />} />
            </Badge>
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-3 py-2 rounded">
                <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{user.name || 'Admin'}</span>
                  <span className="text-xs text-gray-500">{user.email}</span>
                </div>
              </div>
            </Dropdown>
          </Space>
        </Header>
        <Content
          style={{
            margin: '24px',
            padding: '24px',
            background: '#f0f2f5',
            minHeight: 'calc(100vh - 64px)',
          }}
        >
          <div className="bg-white rounded-lg p-6 shadow-sm">
            {children}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
