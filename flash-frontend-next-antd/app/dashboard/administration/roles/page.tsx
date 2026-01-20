'use client';

import { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, Drawer, Form, Input, Select, Switch, message, Popconfirm, Card, Row, Col, Statistic, Divider } from 'antd';
import { UserOutlined, SafetyOutlined, LockOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { usersApi } from '@/lib/api';

export default function RolesPermissionsPage() {
  const [users, setUsers] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<Record<string, unknown> | null>(null);
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState('');

  // Define available permissions
  const allPermissions = [
    { module: 'employees', label: 'Employees', permissions: ['view', 'create', 'edit', 'delete'] },
    { module: 'attendance', label: 'Attendance', permissions: ['view', 'create', 'edit', 'delete'] },
    { module: 'leave', label: 'Long Leave', permissions: ['view', 'create', 'edit', 'delete', 'approve'] },
    { module: 'payroll', label: 'Payroll', permissions: ['view', 'create', 'edit', 'process'] },
    { module: 'vehicles', label: 'Vehicles', permissions: ['view', 'create', 'edit', 'delete'] },
    { module: 'clients', label: 'Clients', permissions: ['view', 'create', 'edit', 'delete'] },
    { module: 'finance', label: 'Finance', permissions: ['view', 'create', 'edit', 'delete', 'approve'] },
    { module: 'inventory', label: 'Inventory', permissions: ['view', 'create', 'edit', 'delete', 'issue'] },
  ];

  // Define roles
  const roles = [
    { value: 'superuser', label: 'Super User', color: 'red', description: 'Full system access' },
    { value: 'admin', label: 'Administrator', color: 'purple', description: 'Manage all modules' },
    { value: 'hr_manager', label: 'HR Manager', color: 'blue', description: 'Manage employees, attendance, payroll' },
    { value: 'fleet_manager', label: 'Fleet Manager', color: 'green', description: 'Manage vehicles and assignments' },
    { value: 'accountant', label: 'Accountant', color: 'orange', description: 'Manage finance and expenses' },
    { value: 'supervisor', label: 'Supervisor', color: 'cyan', description: 'View reports and approve requests' },
    { value: 'user', label: 'User', color: 'default', description: 'Basic access' },
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await usersApi.getAll();
      setUsers(Array.isArray(res) ? res : []);
    } catch {
      message.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (record: Record<string, unknown>) => {
    setEditingUser(record);
    form.setFieldsValue({
      username: record.username,
      email: record.email,
      role: record.role || 'user',
      is_active: record.is_active !== false,
      is_superuser: record.is_superuser === true,
    });
    setDrawerVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await usersApi.delete(id);
      message.success('User deleted');
      loadData();
    } catch {
      message.error('Failed to delete user');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingUser) {
        await usersApi.update(Number(editingUser.id), values);
        message.success('User updated');
      }

      setDrawerVisible(false);
      loadData();
    } catch {
      message.error('Failed to save user');
    }
  };

  const columns = [
    { 
      title: 'Username', 
      dataIndex: 'username', 
      key: 'username', 
      width: 150,
      render: (text: string) => <span style={{ fontSize: '11px', fontWeight: 600 }}>{text}</span>
    },
    { 
      title: 'Email', 
      dataIndex: 'email', 
      key: 'email',
      width: 200,
      render: (text: string) => <span style={{ fontSize: '11px' }}>{text}</span>
    },
    { 
      title: 'Role', 
      dataIndex: 'role', 
      key: 'role',
      width: 150,
      render: (role: string) => {
        const roleInfo = roles.find(r => r.value === role);
        return <Tag color={roleInfo?.color || 'default'} style={{ fontSize: '11px' }}>{roleInfo?.label || role?.toUpperCase()}</Tag>;
      }
    },
    { 
      title: 'Super User', 
      dataIndex: 'is_superuser', 
      key: 'is_superuser',
      width: 100,
      render: (isSuperuser: boolean) => (
        isSuperuser ? <Tag color="red" style={{ fontSize: '11px' }}>YES</Tag> : <Tag color="default" style={{ fontSize: '11px' }}>NO</Tag>
      )
    },
    { 
      title: 'Status', 
      dataIndex: 'is_active', 
      key: 'is_active',
      width: 100,
      render: (isActive: boolean) => (
        <Tag color={isActive !== false ? 'green' : 'red'} style={{ fontSize: '11px' }}>
          {isActive !== false ? 'ACTIVE' : 'INACTIVE'}
        </Tag>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_: unknown, record: Record<string, unknown>) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => handleEdit(record)} style={{ fontSize: '11px', padding: '0 4px' }}>Edit</Button>
          <Popconfirm title="Delete this user?" onConfirm={() => handleDelete(Number(record.id))} okText="Yes" cancelText="No">
            <Button type="link" danger size="small" style={{ fontSize: '11px', padding: '0 4px' }}>Delete</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const filteredUsers = users.filter(user => 
    String(user.username || '').toLowerCase().includes(searchText.toLowerCase()) ||
    String(user.email || '').toLowerCase().includes(searchText.toLowerCase()) ||
    String(user.role || '').toLowerCase().includes(searchText.toLowerCase())
  );

  const totalUsers = filteredUsers.length;
  const activeUsers = filteredUsers.filter(u => u.is_active !== false).length;
  const superUsers = filteredUsers.filter(u => u.is_superuser === true).length;
  const adminUsers = filteredUsers.filter(u => u.role === 'admin' || u.role === 'superuser').length;

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>Roles & Permissions</h2>
        <Space>
          <Input.Search 
            placeholder="Search users..." 
            value={searchText} 
            onChange={(e) => setSearchText(e.target.value)} 
            style={{ width: 250 }} 
          />
        </Space>
      </div>

      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card>
            <Statistic
              title={<span style={{ fontSize: '12px' }}>Total Users</span>}
              value={totalUsers}
              valueStyle={{ fontSize: '20px' }}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={<span style={{ fontSize: '12px' }}>Active Users</span>}
              value={activeUsers}
              valueStyle={{ fontSize: '20px', color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={<span style={{ fontSize: '12px' }}>Super Users</span>}
              value={superUsers}
              valueStyle={{ fontSize: '20px', color: '#ff4d4f' }}
              prefix={<SafetyOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={<span style={{ fontSize: '12px' }}>Administrators</span>}
              value={adminUsers}
              valueStyle={{ fontSize: '20px', color: '#722ed1' }}
              prefix={<LockOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Roles Reference */}
      <Card title="Available Roles" style={{ marginBottom: '24px' }}>
        <Row gutter={[16, 16]}>
          {roles.map(role => (
            <Col key={role.value} xs={24} sm={12} md={8} lg={6}>
              <Card size="small" style={{ borderLeft: `3px solid ${role.color === 'default' ? '#d9d9d9' : role.color}` }}>
                <div style={{ marginBottom: '8px' }}>
                  <Tag color={role.color} style={{ fontSize: '11px' }}>{role.label}</Tag>
                </div>
                <div style={{ fontSize: '11px', color: '#666' }}>{role.description}</div>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      {/* Users Table */}
      <Card title="System Users">
        <Table 
          columns={columns} 
          dataSource={filteredUsers} 
          rowKey="id" 
          loading={loading} 
          size="small" 
          pagination={{ pageSize: 20 }} 
          style={{ fontSize: '11px' }} 
        />
      </Card>

      {/* Edit User Drawer */}
      <Drawer
        title="Edit User"
        placement="right"
        width={720}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        footer={
          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setDrawerVisible(false)}>Cancel</Button>
              <Button type="primary" onClick={handleSubmit}>Update</Button>
            </Space>
          </div>
        }
      >
        <Form form={form} layout="vertical">
          <div style={{ 
            background: 'linear-gradient(135deg, #722ed1 0%, #531dab 100%)', 
            color: 'white', 
            padding: '12px 16px', 
            marginBottom: '24px', 
            borderRadius: '4px', 
            fontSize: '14px', 
            fontWeight: 600 
          }}>
            User Details
          </div>

          <Form.Item name="username" label="Username">
            <Input disabled />
          </Form.Item>

          <Form.Item name="email" label="Email">
            <Input type="email" />
          </Form.Item>

          <Form.Item name="role" label="Role" rules={[{ required: true }]}>
            <Select placeholder="Select role">
              {roles.map(role => (
                <Select.Option key={role.value} value={role.value}>
                  <Tag color={role.color} style={{ fontSize: '11px', marginRight: '8px' }}>{role.label}</Tag>
                  {role.description}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Divider />

          <Form.Item name="is_active" label="Active Status" valuePropName="checked">
            <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
          </Form.Item>

          <Form.Item name="is_superuser" label="Super User" valuePropName="checked">
            <Switch checkedChildren="Yes" unCheckedChildren="No" />
          </Form.Item>

          <Divider />

          <div style={{ padding: '16px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
            <h4 style={{ fontSize: '14px', marginBottom: '12px' }}>Role Permissions</h4>
            <div style={{ fontSize: '12px', color: '#666' }}>
              Permissions are automatically assigned based on the selected role. Super Users have full access to all modules.
            </div>
            
            <div style={{ marginTop: '16px' }}>
              {allPermissions.map(module => (
                <div key={module.module} style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>{module.label}</div>
                  <Space size="small" wrap>
                    {module.permissions.map(perm => (
                      <Tag key={perm} style={{ fontSize: '10px' }}>{perm}</Tag>
                    ))}
                  </Space>
                </div>
              ))}
            </div>
          </div>
        </Form>
      </Drawer>
    </div>
  );
}
