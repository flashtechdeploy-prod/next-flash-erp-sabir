'use client';

import { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, Drawer, Form, Input, DatePicker, Select, message, Popconfirm, Card, Row, Col, Statistic } from 'antd';
import { PlusOutlined, CalendarOutlined, CheckCircleOutlined, ClockCircleOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { leaveApi, employeeApi } from '@/lib/api';
import dayjs from 'dayjs';

interface LeaveRecord {
  id: number;
  employee_id: string;
  employee_name?: string;
  fss_id?: string;
  from_date: string;
  to_date: string;
  leave_type: string;
  reason: string;
  status?: string;
  days?: number;
}

export default function LeaveManagementPage() {
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  const [employees, setEmployees] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editingLeave, setEditingLeave] = useState<LeaveRecord | null>(null);
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    loadEmployees();
  }, []);

  useEffect(() => {
    if (employees.length > 0) {
      loadData();
    }
  }, [employees.length]);

  const getFss = (obj: unknown): string | undefined => {
    if (!obj || typeof obj !== 'object') return undefined;
    const rec = obj as Record<string, unknown>;
    return (rec.fss_id as string) || (rec.fss_no as string);
  };

  const loadEmployees = async () => {
    try {
      const res = await employeeApi.getAll();
      if (res.error) {
        message.error(res.error);
        return;
      }
      // Backend returns { employees, total }, so access data.employees
      const empData = Array.isArray(res.data)
        ? res.data
        : (res.data as { employees?: Array<Record<string, unknown>> })?.employees || [];
      console.log('Employees loaded:', empData);
      setEmployees(empData);
    } catch (error) {
      console.error('Failed to load employees', error);
      message.error('Failed to load employees');
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await leaveApi.getAll();
      if (res.error) {
        message.error(res.error);
        setLoading(false);
        return;
      }


      // Backend returns { leaves, pagination }, so access data.leaves
      const data = Array.isArray(res.data)
        ? res.data
        : (res.data as { leaves?: Array<Record<string, unknown>> })?.leaves || [];

      console.log('Raw leave data:', data);
      // Calculate days and enrich with employee info
      const enriched = data.map((leave: Record<string, unknown>) => {
        const fromDate = dayjs(String(leave.from_date));
        const toDate = dayjs(String(leave.to_date));
        const days = toDate.diff(fromDate, 'day') + 1;
        const emp = employees.find(e => e.employee_id === leave.employee_id);
        const fssId = getFss(emp) || getFss(leave);
        const employeeName = (emp?.full_name || emp?.name) as string | undefined;

        return {
          ...leave,
          days,
          status: (leave.status as string) || 'approved', // Use status from DB if available
          fss_id: fssId,
          employee_name: employeeName,
        } as LeaveRecord;
      });

      setLeaves(enriched);
    } catch (error) {
      message.error('Failed to load leave records');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingLeave(null);
    form.resetFields();
    form.setFieldsValue({
      Status: 'approved',
    });
    setDrawerVisible(true);
  };

  const handleEdit = (record: LeaveRecord) => {
    setEditingLeave(record);
    form.setFieldsValue({
      employee_id: record.employee_id,
      dates: [dayjs(record.from_date), dayjs(record.to_date)],
      leave_type: record.leave_type,
      reason: record.reason,
      Status: record.status,
    });
    setDrawerVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await leaveApi.delete(id);
      if (res.error) {
        message.error(res.error);
        return;
      }
      message.success('Leave record deleted');
      loadData();
    } catch (err) {
      message.error('Failed to delete leave record');
      console.error(err);
    }
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      const datesArray = (values.dates as unknown[]) || [];
      if (!datesArray || datesArray.length !== 2) {
        message.error('Please select valid leave period');
        return;
      }

      const data = {
        employee_id: String(values.employee_id),
        from_date: (datesArray[0] as dayjs.Dayjs).format('YYYY-MM-DD'),
        to_date: (datesArray[1] as dayjs.Dayjs).format('YYYY-MM-DD'),
        leave_type: String(values.leave_type),
        reason: String(values.reason),
        status: String(values.Status),
      };

      console.log('Submitting leave data:', data);

      let res;
      if (editingLeave) {
        res = await leaveApi.update(editingLeave.id, data);
        if (res.error) {
          message.error(res.error);
          return;
        }
        message.success('Leave record updated');
      } else {
        res = await leaveApi.create(data);
        if (res.error) {
          message.error(res.error);
          return;
        }
        message.success('Leave record created');
      }

      setDrawerVisible(false);
      form.resetFields();
      loadData();
    } catch (err) {
      message.error('Failed to save leave record');
      console.error(err);
    }
  };

  const columns = [
    {
      title: 'FSS ID',
      dataIndex: 'fss_id',
      key: 'fss_id',
      width: 110,
      render: (_: string, record: LeaveRecord) => {
        const emp = employees.find(e => e.employee_id === record.employee_id);
        const fssId = record.fss_id || getFss(emp);
        return <span style={{ fontSize: '11px' }}>{fssId || ''}</span>;
      }
    },
    {
      title: 'Employee Name',
      dataIndex: 'employee_name',
      key: 'employee_name',
      width: 180,
      render: (_: string, record: LeaveRecord) => {
        const emp = employees.find(e => e.employee_id === record.employee_id);
        const name = record.employee_name || (emp?.full_name || emp?.name);
        return <span style={{ fontSize: '11px' }}>{name || '-'}</span>;
      }
    },
    {
      title: 'From Date',
      dataIndex: 'from_date',
      key: 'from_date',
      width: 110,
      render: (date: string) => <span style={{ fontSize: '11px' }}>{dayjs(date).format('DD MMM YYYY')}</span>
    },
    {
      title: 'To Date',
      dataIndex: 'to_date',
      key: 'to_date',
      width: 110,
      render: (date: string) => <span style={{ fontSize: '11px' }}>{dayjs(date).format('DD MMM YYYY')}</span>
    },
    {
      title: 'Days',
      dataIndex: 'days',
      key: 'days',
      width: 60,
      render: (days: number) => <span style={{ fontSize: '11px', fontWeight: 600 }}>{days}</span>
    },
    {
      title: 'Leave Type',
      dataIndex: 'leave_type',
      key: 'leave_type',
      width: 120,
      render: (type: string) => {
        const colors: Record<string, string> = {
          sick: 'red',
          casual: 'blue',
          annual: 'green',
          unpaid: 'orange',
          emergency: 'purple',
        };
        return <Tag color={colors[type] || 'default'} style={{ fontSize: '11px' }}>{type.toUpperCase()}</Tag>;
      }
    },
    {
      title: 'Reason',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true,
      render: (text: string) => <span style={{ fontSize: '11px' }}>{text}</span>
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={status === 'approved' ? 'green' : status === 'pending' ? 'orange' : 'red'} style={{ fontSize: '11px' }}>
          {status?.toUpperCase() || 'APPROVED'}
        </Tag>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_: unknown, record: LeaveRecord) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            style={{ padding: '0 4px' }}
          >
            Edit
          </Button>
          <Popconfirm
            title="Delete this leave record?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button
              type="link"
              danger
              size="small"
              icon={<DeleteOutlined />}
              style={{ padding: '0 4px' }}
            >
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const filteredLeaves = leaves.filter(leave =>
    leave.employee_id.toLowerCase().includes(searchText.toLowerCase()) ||
    (leave.fss_id || '').toLowerCase().includes(searchText.toLowerCase()) ||
    (leave.employee_name || '').toLowerCase().includes(searchText.toLowerCase()) ||
    leave.leave_type.toLowerCase().includes(searchText.toLowerCase()) ||
    leave.reason?.toLowerCase().includes(searchText.toLowerCase())
  );

  // Calculate statistics
  const totalLeaves = filteredLeaves.length;
  const totalDays = filteredLeaves.reduce((sum, leave) => sum + (leave.days || 0), 0);
  const approvedCount = filteredLeaves.filter(l => l.status === 'approved').length;
  const pendingCount = filteredLeaves.filter(l => l.status === 'pending').length;

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>Long Leave</h2>
        <Space>
          <Input.Search
            placeholder="Search leaves..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 250 }}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            Add Leave
          </Button>
        </Space>
      </div>

      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card>
            <Statistic
              title={<span style={{ fontSize: '12px' }}>Total Leaves</span>}
              value={totalLeaves}
              valueStyle={{ fontSize: '20px' }}
              prefix={<CalendarOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={<span style={{ fontSize: '12px' }}>Total Days</span>}
              value={totalDays}
              valueStyle={{ fontSize: '20px', color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={<span style={{ fontSize: '12px' }}>Approved</span>}
              value={approvedCount}
              valueStyle={{ fontSize: '20px', color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={<span style={{ fontSize: '12px' }}>Pending</span>}
              value={pendingCount}
              valueStyle={{ fontSize: '20px', color: '#faad14' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Table
        columns={columns}
        dataSource={filteredLeaves}
        rowKey="id"
        loading={loading}
        size="small"
        pagination={{ pageSize: 20 }}
        style={{ fontSize: '11px' }}
      />

      <Drawer
        title={editingLeave ? 'Edit Leave Request' : 'Add Leave Request'}
        placement="right"
        width={520}
        onClose={() => {
          setDrawerVisible(false);
          form.resetFields();
        }}
        open={drawerVisible}
        footer={
          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setDrawerVisible(false);
                form.resetFields();
              }}>Cancel</Button>
              <Button type="primary" onClick={() => form.submit()}>
                {editingLeave ? 'Update' : 'Create'}
              </Button>
            </Space>
          </div>
        }
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            padding: '12px 16px',
            marginBottom: '24px',
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: 600
          }}>
            Leave Request Information
          </div>

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
              options={employees.length > 0 ? employees.map((emp) => ({
                value: emp.employee_id,
                label: `${getFss(emp) || ''} - ${emp.full_name || emp.name || emp.employee_id}`,
              })) : []}
              notFoundContent={employees.length === 0 ? 'No employees found' : undefined}
            />
          </Form.Item>

          <Form.Item
            name="dates"
            label="Leave Period"
            rules={[{ required: true, message: 'Please select leave period' }]}
          >
            <DatePicker.RangePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="leave_type"
            label="Leave Type"
            rules={[{ required: true, message: 'Please select leave type' }]}
          >
            <Select placeholder="Select leave type">
              <Select.Option value="sick">Sick Leave</Select.Option>
              <Select.Option value="casual">Casual Leave</Select.Option>
              <Select.Option value="annual">Annual Leave</Select.Option>
              <Select.Option value="unpaid">Unpaid Leave</Select.Option>
              <Select.Option value="emergency">Emergency Leave</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="Status"
            label="Status"
            rules={[{ required: true, message: 'Please select status' }]}
          >
            <Select placeholder="Select Status">
              <Select.Option value="approved">Approved</Select.Option>
              <Select.Option value="pending">Pending</Select.Option>
              <Select.Option value="rejected">Rejected</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="reason"
            label="Reason"
            rules={[{ required: true, message: 'Please enter reason' }]}
          >
            <Input.TextArea rows={4} placeholder="Enter reason for leave" />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}
