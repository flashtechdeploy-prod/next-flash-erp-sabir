'use client';

import { useState, useEffect } from 'react';
import { Table, Card, Button, Input, Modal, Form, Space, Tag, App, Popconfirm } from 'antd';
import { SearchOutlined, LockOutlined, TeamOutlined, WarningOutlined } from '@ant-design/icons';
import { employeeApi, authApi } from '@/lib/api';

export default function PasswordManagementPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetLoading, setResetLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [form] = Form.useForm();
  const { message } = App.useApp();

  const fetchEmployees = async () => {
    setLoading(true);
    const response = await employeeApi.getAll({
      skip: 0,
      limit: 1000, // Fetch all employees for management
      search: searchQuery
    });
    setLoading(false);
    if (response.error) {
      message.error(response.error);
      return;
    }
    // Handle the expected data structure from employeeApi.getAll
    const data = Array.isArray(response.data) ? response.data : (response.data as any)?.items || (response.data as any)?.employees || [];
    setEmployees(data);
  };

  useEffect(() => {
    fetchEmployees();
  }, [searchQuery]);

  const handleSetPassword = async (values: any) => {
    if (!selectedEmployee?.fss_no) {
      message.error('Employee FSS number not found');
      return;
    }

    const response = await authApi.setPassword({
      fss_no: selectedEmployee.fss_no,
      password: values.password
    });

    if (response.error) {
      message.error(response.error);
      return;
    }

    message.success(`Password set successfully for ${selectedEmployee.full_name}`);
    setPasswordModalVisible(false);
    form.resetFields();
  };

  const handleEmergencyReset = async () => {
    setResetLoading(true);
    const response = await authApi.emergencyResetAll();
    setResetLoading(false);
    
    if (response.error) {
      message.error(response.error);
      return;
    }
    
    message.success('All employee passwords have been reset to admin123');
  };

  const columns = [
    {
      title: 'FSS No',
      dataIndex: 'fss_no',
      key: 'fss_no',
      width: 150,
      sorter: (a: any, b: any) => a.fss_no.localeCompare(b.fss_no),
    },
    {
      title: 'Name',
      dataIndex: 'full_name',
      key: 'full_name',
      sorter: (a: any, b: any) => a.full_name.localeCompare(b.full_name),
    },
    {
      title: 'Designation',
      dataIndex: 'enrolled_as',
      key: 'enrolled_as',
      render: (text: string, record: any) => text || record.designation || '-',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => (
        <Tag color={status === 'Active' ? 'success' : 'error'}>
          {status || 'Active'}
        </Tag>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      width: 150,
      render: (_: any, record: any) => (
        <Button
          type="primary"
          icon={<LockOutlined />}
          onClick={() => {
            setSelectedEmployee(record);
            setPasswordModalVisible(true);
          }}
        >
          Set Password
        </Button>
      ),
    },
  ];

  return (
    <div className="p-6">
      <Card
        title={
          <Space size="middle">
            <LockOutlined />
            <span>Employee Password Management</span>
          </Space>
        }
        extra={
          <Space size="large">
            <Popconfirm
              title="Reset ALL Passwords?"
              description="This will set EVERY employee's password to 'admin123'. This cannot be undone."
              onConfirm={handleEmergencyReset}
              okText="Yes, Reset All"
              cancelText="No"
              okButtonProps={{ danger: true, loading: resetLoading }}
              icon={<WarningOutlined style={{ color: 'red' }} />}
            >
              <Button danger icon={<WarningOutlined />}>
                Emergency Reset All
              </Button>
            </Popconfirm>
            <Input
              placeholder="Search by name or FSS No"
              prefix={<SearchOutlined />}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: 300 }}
              allowClear
            />
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={employees}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 15 }}
        />
      </Card>

      <Modal
        title={
          <Space>
            <LockOutlined />
            <span>Set Password for {selectedEmployee?.full_name}</span>
          </Space>
        }
        open={passwordModalVisible}
        onCancel={() => {
          setPasswordModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        okText="Update Password"
        destroyOnClose
      >
        <div className="mb-4 text-gray-500">
          Set a new login password for <strong>{selectedEmployee?.full_name}</strong> (FSS: {selectedEmployee?.fss_no})
        </div>
        <Form form={form} layout="vertical" onFinish={handleSetPassword}>
          <Form.Item
            name="password"
            label="New Password"
            rules={[
              { required: true, message: 'Please enter a password' },
              { min: 6, message: 'Password must be at least 6 characters' }
            ]}
          >
            <Input.Password placeholder="Enter new password" />
          </Form.Item>
          <Form.Item
            name="confirm"
            label="Confirm Password"
            dependencies={['password']}
            rules={[
              { required: true, message: 'Please confirm password' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Passwords do not match'));
                },
              }),
            ]}
          >
            <Input.Password placeholder="Confirm new password" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
