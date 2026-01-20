'use client';

import { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  DatePicker,
  Select,
  Card,
  message,
  Statistic,
  Row,
  Col,
  Drawer,
  Form,
  InputNumber,
  Input,
  Modal,
  Tag,
} from 'antd';
import {
  CalendarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  SaveOutlined,
  ReloadOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import { attendanceApi, employeeApi } from '@/lib/api';
import dayjs, { Dayjs } from 'dayjs';

const { TextArea } = Input;

interface AttendanceRecord {
  id?: number;
  employee_id: string;
  employee_name?: string;
  fss_id?: string;
  date: string;
  status: string;
  note?: string;
  overtime_minutes?: number;
  late_minutes?: number;
  fine_amount?: number;
  leave_type?: string;
}

export default function AttendancePage() {
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editDrawerVisible, setEditDrawerVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [form] = Form.useForm();
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [employeeHistory, setEmployeeHistory] = useState<AttendanceRecord[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<{ id: string; name: string } | null>(null);

  const fetchEmployees = async () => {
    const response = await employeeApi.getAll({ status: 'Active' });
    if (response.error) {
      message.error(response.error);
      return;
    }
    setEmployees((response.data as { employees?: Array<Record<string, unknown>> })?.employees || (response.data as Array<Record<string, unknown>>) || []);
  };

  const fetchAttendance = async (date: Dayjs) => {
    setLoading(true);
    const dateStr = date.format('YYYY-MM-DD');
    const response = await attendanceApi.getByDate(dateStr);
    setLoading(false);

    if (response.error) {
      message.error(response.error);
      return;
    }

    // Backend returns { date, records }, so we need to access records
    const responseData = response.data as { date?: string; records?: AttendanceRecord[] } | AttendanceRecord[];
    const records = Array.isArray(responseData) ? responseData : (responseData?.records || []);
    
    // Merge with employees to show all active employees
    const attendanceMap = new Map(records.map(r => [r.employee_id, r]));
    const getFss = (obj: unknown): string | undefined => {
      if (!obj || typeof obj !== 'object') return undefined;
      const rec = obj as Record<string, unknown>;
      return (rec.fss_id as string) || (rec.fss_number as string);
    };
    const allRecords = employees.map(emp => {
      const existing = attendanceMap.get(emp.employee_id as string);
      const fssFromEmp = getFss(emp);
      if (existing) {
        const fssFromExisting = getFss(existing);
        return {
          ...existing,
          fss_id: fssFromExisting || fssFromEmp,
        };
      }

      return {
        employee_id: emp.employee_id as string,
        employee_name: (emp.full_name || emp.name) as string,
        fss_id: fssFromEmp,
        date: dateStr,
        status: 'unmarked',
      } as AttendanceRecord;
    });

    setAttendance(allRecords);
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (employees.length > 0) {
      fetchAttendance(selectedDate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, employees.length]);

  const handleStatusChange = (employeeId: string, status: string) => {
    setAttendance(prev =>
      prev.map(record =>
        record.employee_id === employeeId
          ? { ...record, status }
          : record
      )
    );
  };

  const handleEdit = (record: AttendanceRecord) => {
    setEditingRecord(record);
    form.setFieldsValue(record);
    setEditDrawerVisible(true);
  };

  const handleEditSubmit = (values: Record<string, unknown>) => {
    if (!editingRecord) return;
    
    setAttendance(prev =>
      prev.map(record =>
        record.employee_id === editingRecord.employee_id
          ? { ...record, ...values }
          : record
      )
    );
    setEditDrawerVisible(false);
    message.success('Record updated. Click Save All to persist changes.');
  };

  const handleSaveAll = async () => {
    setSaving(true);
    const dateStr = selectedDate.format('YYYY-MM-DD');
    
    // Only send records that have been marked
    const recordsToSave = attendance
      .filter(r => r.status !== 'unmarked')
      .map(r => ({
        employee_id: r.employee_id,
        status: r.status,
        note: r.note,
        overtime_minutes: r.overtime_minutes,
        late_minutes: r.late_minutes,
        fine_amount: r.fine_amount,
        leave_type: r.leave_type, // Include leave_type for automatic leave period creation
      }));

    const response = await attendanceApi.bulkUpsert(dateStr, recordsToSave);
    setSaving(false);

    if (response.error) {
      message.error(response.error);
      return;
    }

    message.success('Attendance saved successfully. Leave periods auto-created for leave days.');
    fetchAttendance(selectedDate);
  };

  const handleViewHistory = async (employeeId: string) => {
    const emp = employees.find(e => e.employee_id === employeeId);
    setSelectedEmployee({
      id: employeeId,
      name: (emp?.full_name || emp?.name || employeeId) as string,
    });
    setHistoryModalVisible(true);
    setHistoryLoading(true);

    // Fetch last 30 days of attendance
    const toDate = dayjs().format('YYYY-MM-DD');
    const fromDate = dayjs().subtract(30, 'days').format('YYYY-MM-DD');
    
    const response = await attendanceApi.getByEmployee(employeeId, fromDate, toDate);
    setHistoryLoading(false);

    if (response.error) {
      message.error(response.error);
      return;
    }

    setEmployeeHistory((response.data as AttendanceRecord[]) || []);
  };

  const summary = {
    total: attendance.length,
    present: attendance.filter(r => r.status === 'present').length,
    late: attendance.filter(r => r.status === 'late').length,
    absent: attendance.filter(r => r.status === 'absent').length,
    leave: attendance.filter(r => r.status === 'leave').length,
    unmarked: attendance.filter(r => r.status === 'unmarked').length,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'green';
      case 'late': return 'orange';
      case 'absent': return 'red';
      case 'leave': return 'blue';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return <CheckCircleOutlined />;
      case 'late': return <ClockCircleOutlined />;
      case 'absent': return <CloseCircleOutlined />;
      case 'leave': return <CalendarOutlined />;
      default: return null;
    }
  };

  console.log('Attendance Records:', attendance);

  const columns = [
    {
      title: 'FSS ID',
      dataIndex: 'fss_id',
      key: 'fss_id',
      width: 120,
      render: (_id: string, record: AttendanceRecord) => (
        <Button 
          type="link" 
          size="small" 
          onClick={() => handleViewHistory(record.employee_id)}
          icon={<HistoryOutlined />}
          style={{ padding: 0, height: 'auto' }}
        >
          {record.fss_id ?? ''}
        </Button>
      ),
    },
    {
      title: 'Employee Name',
      dataIndex: 'employee_name',
      key: 'employee_name',
      width: 200,
      render: (_: unknown, record: AttendanceRecord) => {
        const emp = employees.find(e => e.employee_id === record.employee_id);
        return (emp?.full_name || emp?.name || record.employee_name || '-') as string;
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      render: (status: string, record: AttendanceRecord) => (
        <Select
          value={status}
          onChange={(value) => handleStatusChange(record.employee_id, value)}
          style={{ width: '100%' }}
          size="small"
          options={[
            { label: 'Present', value: 'present' },
            { label: 'Late', value: 'late' },
            { label: 'Absent', value: 'absent' },
            { label: 'Leave', value: 'leave' },
            { label: 'Unmarked', value: 'unmarked' },
          ]}
        />
      ),
    },
    {
      title: 'Late (min)',
      dataIndex: 'late_minutes',
      key: 'late_minutes',
      width: 100,
      render: (val: number) => val || '-',
    },
    {
      title: 'OT (min)',
      dataIndex: 'overtime_minutes',
      key: 'overtime_minutes',
      width: 100,
      render: (val: number) => val || '-',
    },
    {
      title: 'Fine',
      dataIndex: 'fine_amount',
      key: 'fine_amount',
      width: 100,
      render: (val: number) => val ? `Rs ${val}` : '-',
    },
    {
      title: 'Note',
      dataIndex: 'note',
      key: 'note',
      ellipsis: true,
      width: 150,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: unknown, record: AttendanceRecord) => (
        <Button type="link" size="small" onClick={() => handleEdit(record)}>
          Edit Details
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <CalendarOutlined /> Attendance
          </h1>
          <p className="text-gray-500 mt-1">Mark daily attendance</p>
        </div>
        <Space>
          <DatePicker
            value={selectedDate}
            onChange={(date) => date && setSelectedDate(date)}
            format="YYYY-MM-DD"
            size="large"
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={() => fetchAttendance(selectedDate)}
            size="large"
          >
            Refresh
          </Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSaveAll}
            loading={saving}
            size="large"
          >
            Save All
          </Button>
        </Space>
      </div>

      <Row gutter={16} className="mb-6">
        <Col span={4}>
          <Card>
            <Statistic
              title="Total"
              value={summary.total}
              prefix={<CalendarOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="Present"
              value={summary.present}
              valueStyle={{ color: '#3f8600' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="Late"
              value={summary.late}
              valueStyle={{ color: '#fa8c16' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="Absent"
              value={summary.absent}
              valueStyle={{ color: '#cf1322' }}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="Leave"
              value={summary.leave}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="Unmarked"
              value={summary.unmarked}
              valueStyle={{ color: '#8c8c8c' }}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <Table
          columns={columns}
          dataSource={attendance}
          rowKey="employee_id"
          loading={loading}
          size="small"
          pagination={{ pageSize: 50 }}
          className="compact-table"
        />
      </Card>

      <Drawer
        title="Edit Attendance Details"
        open={editDrawerVisible}
        onClose={() => setEditDrawerVisible(false)}
        width={480}
        footer={
          <div style={{ textAlign: 'right' }}>
            <Button onClick={() => setEditDrawerVisible(false)} style={{ marginRight: 8 }}>
              Cancel
            </Button>
            <Button type="primary" onClick={() => form.submit()}>
              Update
            </Button>
          </div>
        }
      >
        <Form form={form} layout="vertical" onFinish={handleEditSubmit}>
          <Form.Item label="Status" name="status">
            <Select 
              onChange={(value) => {
                // Show/hide leave_type based on status
                if (value !== 'leave') {
                  form.setFieldValue('leave_type', undefined);
                }
              }}
              options={[
                { label: 'Present', value: 'present' },
                { label: 'Late', value: 'late' },
                { label: 'Absent', value: 'absent' },
                { label: 'Leave', value: 'leave' },
              ]} 
            />
          </Form.Item>
          <Form.Item 
            noStyle 
            shouldUpdate={(prevValues, currentValues) => prevValues.status !== currentValues.status}
          >
            {({ getFieldValue }) =>
              getFieldValue('status') === 'leave' ? (
                <Form.Item 
                  label="Leave Type" 
                  name="leave_type"
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
              ) : null
            }
          </Form.Item>
          <Form.Item label="Late Minutes" name="late_minutes">
            <InputNumber style={{ width: '100%' }} min={0} placeholder="0" />
          </Form.Item>
          <Form.Item label="Overtime Minutes" name="overtime_minutes">
            <InputNumber style={{ width: '100%' }} min={0} placeholder="0" />
          </Form.Item>
          <Form.Item label="Fine Amount (Rs)" name="fine_amount">
            <InputNumber style={{ width: '100%' }} min={0} placeholder="0" />
          </Form.Item>
          <Form.Item label="Note" name="note">
            <TextArea rows={3} placeholder="Any additional notes..." />
          </Form.Item>
        </Form>
      </Drawer>

      <Modal
        title={
          <div>
            <HistoryOutlined /> Attendance History - {selectedEmployee?.name}
            <div style={{ fontSize: '12px', color: '#666', fontWeight: 'normal', marginTop: '4px' }}>
              Last 30 Days
            </div>
          </div>
        }
        open={historyModalVisible}
        onCancel={() => setHistoryModalVisible(false)}
        width={900}
        footer={[
          <Button key="close" onClick={() => setHistoryModalVisible(false)}>
            Close
          </Button>,
        ]}
      >
        <Table
          columns={[
            {
              title: 'Date',
              dataIndex: 'date',
              key: 'date',
              width: 120,
              render: (date: string) => dayjs(date).format('MMM DD, YYYY'),
              sorter: (a: AttendanceRecord, b: AttendanceRecord) => 
                dayjs(a.date).unix() - dayjs(b.date).unix(),
              defaultSortOrder: 'descend',
            },
            {
              title: 'Day',
              dataIndex: 'date',
              key: 'day',
              width: 100,
              render: (date: string) => dayjs(date).format('dddd'),
            },
            {
              title: 'Status',
              dataIndex: 'status',
              key: 'status',
              width: 100,
              render: (status: string) => (
                <Tag color={getStatusColor(status)} icon={getStatusIcon(status)}>
                  {status.toUpperCase()}
                </Tag>
              ),
            },
            {
              title: 'Late (min)',
              dataIndex: 'late_minutes',
              key: 'late_minutes',
              width: 100,
              render: (val: number) => val || '-',
            },
            {
              title: 'OT (min)',
              dataIndex: 'overtime_minutes',
              key: 'overtime_minutes',
              width: 100,
              render: (val: number) => val || '-',
            },
            {
              title: 'Fine',
              dataIndex: 'fine_amount',
              key: 'fine_amount',
              width: 100,
              render: (val: number) => val ? `Rs ${val}` : '-',
            },
            {
              title: 'Note',
              dataIndex: 'note',
              key: 'note',
              ellipsis: true,
            },
          ]}
          dataSource={employeeHistory}
          rowKey="id"
          loading={historyLoading}
          size="small"
          pagination={{ pageSize: 10 }}
          className="compact-table"
          summary={(data) => {
            const present = data.filter(r => r.status === 'present').length;
            const late = data.filter(r => r.status === 'late').length;
            const absent = data.filter(r => r.status === 'absent').length;
            const leave = data.filter(r => r.status === 'leave').length;
            const totalLate = data.reduce((sum, r) => sum + (r.late_minutes || 0), 0);
            const totalOT = data.reduce((sum, r) => sum + (r.overtime_minutes || 0), 0);
            const totalFine = data.reduce((sum, r) => sum + (r.fine_amount || 0), 0);

            return (
              <Table.Summary fixed>
                <Table.Summary.Row style={{ background: '#fafafa', fontWeight: 600 }}>
                  <Table.Summary.Cell index={0}>Summary</Table.Summary.Cell>
                  <Table.Summary.Cell index={1}>
                    <Tag color="green">{present} Present</Tag>
                    <Tag color="orange">{late} Late</Tag>
                    <Tag color="red">{absent} Absent</Tag>
                    <Tag color="blue">{leave} Leave</Tag>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={2}></Table.Summary.Cell>
                  <Table.Summary.Cell index={3}>{totalLate}</Table.Summary.Cell>
                  <Table.Summary.Cell index={4}>{totalOT}</Table.Summary.Cell>
                  <Table.Summary.Cell index={5}>Rs {totalFine}</Table.Summary.Cell>
                  <Table.Summary.Cell index={6}></Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            );
          }}
        />
      </Modal>

      <style jsx global>{`
        .compact-table .ant-table {
          font-size: 12px;
        }
        .compact-table .ant-table-thead > tr > th {
          font-size: 11px;
          font-weight: 600;
          padding: 8px 8px;
          background: #fafafa;
        }
        .compact-table .ant-table-tbody > tr > td {
          padding: 6px 8px;
          font-size: 12px;
        }
        .compact-table .ant-select {
          font-size: 12px;
        }
      `}</style>
    </div>
  );
}
