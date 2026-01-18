'use client';

import { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, Drawer, Form, Input, DatePicker, Select, message, Popconfirm, Card, Row, Col, Statistic } from 'antd';
import { PlusOutlined, CarOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { vehicleAssignmentApi, vehicleApi, employeeApi } from '@/lib/api';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

export default function VehicleAssignmentsPage() {
  const [assignments, setAssignments] = useState<Record<string, unknown>[]>([]);
  const [vehicles, setVehicles] = useState<Record<string, unknown>[]>([]);
  const [employees, setEmployees] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Record<string, unknown> | null>(null);
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    loadData();
    loadVehicles();
    loadEmployees();
  }, []);

  const loadVehicles = async () => {
    try {
      const response = await vehicleApi.getAll();
      console.log('=== VEHICLES API RESPONSE ===');
      console.log('Full response:', response);
      console.log('Response data:', response.data);
      console.log('Response error:', response.error);
      console.log('Data type:', typeof response.data);
      console.log('Is array:', Array.isArray(response.data));

      if (response.error) {
        console.error('❌ Vehicle API error:', response.error);
        message.error(`Failed to load vehicles: ${response.error}`);
        setVehicles([]);
        return;
      }

      if (!response.data) {
        console.warn('⚠️ No data in response');
        message.warning('No vehicles found');
        setVehicles([]);
        return;
      }

      const vehicleList = (response.data as any)?.vehicles || (response.data as any) || [];
      console.log(`✅ Loaded ${vehicleList.length} vehicles:`, vehicleList);
      setVehicles(vehicleList);
    } catch (error) {
      console.error('❌ Failed to load vehicles:', error);
      message.error('Failed to load vehicles');
      setVehicles([]);
    }
  };

  const loadEmployees = async () => {
    try {
      const response = await employeeApi.getAll();
      console.log('=== EMPLOYEES API RESPONSE ===');
      console.log('Full response:', response);
      console.log('Response data:', response.data);
      console.log('Response error:', response.error);
      console.log('Data type:', typeof response.data);
      console.log('Is array:', Array.isArray(response.data));

      if (response.error) {
        console.error('❌ Employee API error:', response.error);
        message.error(`Failed to load employees: ${response.error}`);
        setEmployees([]);
        return;
      }

      if (!response.data) {
        console.warn('⚠️ No data in response');
        message.warning('No employees found');
        setEmployees([]);
        return;
      }

      const employeeList = (response.data as any)?.employees || (response.data as any) || [];
      console.log(`✅ Loaded ${employeeList.length} employees:`, employeeList);
      setEmployees(employeeList);
    } catch (error) {
      console.error('❌ Failed to load employees:', error);
      message.error('Failed to load employees');
      setEmployees([]);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await vehicleAssignmentApi.getAll();
      console.log('Assignments Response:', response);

      if (response.error) {
        console.error('Assignments error:', response.error);
        message.error(response.error);
        setAssignments([]);
        return;
      }

      const assignmentList = (response.data as any)?.assignments || (response.data as any) || [];
      console.log('Assignments loaded:', assignmentList);
      setAssignments(Array.isArray(assignmentList) ? assignmentList : [assignmentList]);
    } catch (error) {
      console.error('Failed to load assignments:', error);
      message.error('Failed to load assignments');
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingAssignment(null);
    form.resetFields();
    setDrawerVisible(true);
  };

  const handleEdit = (record: Record<string, unknown>) => {
    setEditingAssignment(record);
    form.setFieldsValue({
      vehicle_id: record.vehicle_id,
      employee_id: record.employee_id,
      dates: record.from_date && record.to_date ? [dayjs(String(record.from_date)), dayjs(String(record.to_date))] : null,
      purpose: record.purpose,
      location: record.location,
      status: record.status || 'active',
    });
    setDrawerVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await vehicleAssignmentApi.delete(id);
      message.success('Assignment deleted');
      loadData();
    } catch {
      message.error('Failed to delete assignment');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const data = {
        vehicle_id: values.vehicle_id,
        employee_id: values.employee_id,
        from_date: values.dates ? values.dates[0].format('YYYY-MM-DD') : null,
        to_date: values.dates ? values.dates[1].format('YYYY-MM-DD') : null,
        purpose: values.purpose,
        location: values.location,
        status: values.status,
      };

      if (editingAssignment) {
        await vehicleAssignmentApi.update(Number(editingAssignment.id), data);
        message.success('Assignment updated');
      } else {
        await vehicleAssignmentApi.create(data);
        message.success('Assignment created');
      }

      setDrawerVisible(false);
      loadData();
    } catch {
      message.error('Failed to save assignment');
    }
  };

  const columns = [
    {
      title: 'Vehicle',
      dataIndex: 'vehicle_id',
      key: 'vehicle_id',
      width: 120,
      render: (text: string) => <span style={{ fontSize: '11px', fontWeight: 600 }}>{text}</span>
    },
    {
      title: 'Employee',
      dataIndex: 'employee_id',
      key: 'employee_id',
      width: 100,
      render: (text: string) => <span style={{ fontSize: '11px' }}>{text}</span>
    },
    {
      title: 'From Date',
      dataIndex: 'from_date',
      key: 'from_date',
      width: 110,
      render: (date: string) => <span style={{ fontSize: '11px' }}>{date ? dayjs(date).format('DD MMM YYYY') : '-'}</span>
    },
    {
      title: 'To Date',
      dataIndex: 'to_date',
      key: 'to_date',
      width: 110,
      render: (date: string) => <span style={{ fontSize: '11px' }}>{date ? dayjs(date).format('DD MMM YYYY') : '-'}</span>
    },
    {
      title: 'Purpose',
      dataIndex: 'purpose',
      key: 'purpose',
      ellipsis: true,
      render: (text: string) => <span style={{ fontSize: '11px' }}>{text}</span>
    },
    {
      title: 'Location',
      dataIndex: 'location',
      key: 'location',
      width: 150,
      render: (text: string) => <span style={{ fontSize: '11px' }}>{text}</span>
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : status === 'completed' ? 'blue' : 'red'} style={{ fontSize: '11px' }}>
          {status?.toUpperCase() || 'ACTIVE'}
        </Tag>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_: unknown, record: Record<string, unknown>) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            onClick={() => handleEdit(record)}
            style={{ fontSize: '11px', padding: '0 4px' }}
          >
            Edit
          </Button>
          <Popconfirm
            title="Delete this assignment?"
            onConfirm={() => handleDelete(Number(record.id))}
            okText="Yes"
            cancelText="No"
          >
            <Button
              type="link"
              danger
              size="small"
              style={{ fontSize: '11px', padding: '0 4px' }}
            >
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const filteredAssignments = assignments.filter(assignment =>
    String(assignment.vehicle_id || '').toLowerCase().includes(searchText.toLowerCase()) ||
    String(assignment.employee_id || '').toLowerCase().includes(searchText.toLowerCase()) ||
    String(assignment.location || '').toLowerCase().includes(searchText.toLowerCase())
  );

  const totalAssignments = filteredAssignments.length;
  const activeCount = filteredAssignments.filter(a => a.status === 'active').length;
  const completedCount = filteredAssignments.filter(a => a.status === 'completed').length;

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>Vehicle Assignments</h2>
        <Space>
          <Input.Search
            placeholder="Search assignments..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 250 }}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            Add Assignment
          </Button>
        </Space>
      </div>

      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={8}>
          <Card>
            <Statistic
              title={<span style={{ fontSize: '12px' }}>Total Assignments</span>}
              value={totalAssignments}
              valueStyle={{ fontSize: '20px' }}
              prefix={<CarOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title={<span style={{ fontSize: '12px' }}>Active</span>}
              value={activeCount}
              valueStyle={{ fontSize: '20px', color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title={<span style={{ fontSize: '12px' }}>Completed</span>}
              value={completedCount}
              valueStyle={{ fontSize: '20px', color: '#1890ff' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Table
        columns={columns}
        dataSource={filteredAssignments}
        rowKey="id"
        loading={loading}
        size="small"
        pagination={{ pageSize: 20 }}
        style={{ fontSize: '11px' }}
      />

      <Drawer
        title={editingAssignment ? 'Edit Assignment' : 'Add Assignment'}
        placement="right"
        width={720}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        footer={
          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setDrawerVisible(false)}>Cancel</Button>
              <Button type="primary" onClick={handleSubmit}>
                {editingAssignment ? 'Update' : 'Create'}
              </Button>
            </Space>
          </div>
        }
      >
        <Form form={form} layout="vertical">
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            padding: '12px 16px',
            marginBottom: '24px',
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: 600
          }}>
            Assignment Details
          </div>

          <Form.Item
            name="vehicle_id"
            label="Vehicle"
            rules={[{ required: true, message: 'Please select vehicle' }]}
          >
            <Select
              showSearch
              placeholder="Select vehicle"
              optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={vehicles && vehicles.length > 0 ? vehicles.map((v) => ({
                value: v.vehicle_id,
                label: `${v.vehicle_id || 'N/A'} - ${v.make_model || ''}`,
              })) : []}
              notFoundContent={!vehicles || vehicles.length === 0 ? <span style={{ color: '#999' }}>No vehicles available</span> : null}
            />
          </Form.Item>

          <Form.Item
            name="employee_id"
            label="Employee"
            rules={[{ required: true, message: 'Please select employee' }]}
          >
            <Select
              showSearch
              placeholder="Select employee"
              optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={employees && employees.length > 0 ? employees.map((emp) => ({
                value: emp.employee_id,
                label: `${emp.employee_id || 'N/A'} - ${emp.full_name || ''}`,
              })) : []}
              notFoundContent={!employees || employees.length === 0 ? <span style={{ color: '#999' }}>No employees available</span> : null}
            />
          </Form.Item>

          <Form.Item
            name="dates"
            label="Assignment Period"
          >
            <RangePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="purpose"
            label="Purpose"
            rules={[{ required: true, message: 'Please enter purpose' }]}
          >
            <Input.TextArea rows={3} placeholder="Enter assignment purpose" />
          </Form.Item>

          <Form.Item
            name="location"
            label="Location"
          >
            <Input placeholder="Enter location" />
          </Form.Item>

          <Form.Item
            name="status"
            label="Status"
            rules={[{ required: true, message: 'Please select status' }]}
          >
            <Select placeholder="Select status">
              <Select.Option value="active">Active</Select.Option>
              <Select.Option value="completed">Completed</Select.Option>
              <Select.Option value="cancelled">Cancelled</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}
