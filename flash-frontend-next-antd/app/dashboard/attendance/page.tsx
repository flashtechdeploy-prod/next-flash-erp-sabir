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
  Badge,
  Checkbox,
  Switch,
  Tooltip,
} from 'antd';
import {
  CalendarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  SaveOutlined,
  ReloadOutlined,
  HistoryOutlined,
  DeleteOutlined,
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
  long_leave_days?: number;
  is_long_leave?: boolean;
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
    
    console.log('Fetched attendance records:', records);
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

  const getStatusBadge = (status: string, statusType: string) => {
    const isActive = status === statusType;
    const colorMap: Record<string, string> = {
      present: '#90ee90',
      late: '#ffe4b5',
      absent: '#ffcccb',
      leave: '#b0e0e6',
    };
    
    if (!isActive) {
      return <span style={{ color: '#999', fontSize: '12px' }}>{statusType === 'present' ? 'P' : statusType === 'late' ? 'Late' : statusType === 'absent' ? 'A' : 'L'}</span>;
    }

    return (
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '4px 12px',
          borderRadius: '16px',
          backgroundColor: colorMap[statusType],
          fontWeight: 'bold',
          fontSize: '12px',
          cursor: 'pointer',
        }}
        onClick={() => handleStatusChange(status)}
      >
        {statusType === 'present' ? 'P' : statusType === 'late' ? 'Late' : statusType === 'absent' ? 'A' : 'L'}
      </div>
    );
  };

  const columns = [
    {
      title: '-',
      key: 'checkbox',
      width: 30,
      align: 'center' as const,
      render: (_: unknown, record: AttendanceRecord) => (
        <Checkbox />
      ),
    },
    {
      title: 'FSS No',
      dataIndex: 'fss_id',
      key: 'fss_id',
      width: 80,
      render: (_: unknown, record: AttendanceRecord) => {
        const emp = employees.find(e => e.employee_id === record.employee_id);
        const fssId = (emp?.fss_id || emp?.fss_number || record.fss_id) as string;
        return fssId || '-';
      },
    },
    {
      title: 'Employee Name',
      dataIndex: 'employee_name',
      key: 'employee_name',
      width: 150,
      render: (_: unknown, record: AttendanceRecord) => {
        const emp = employees.find(e => e.employee_id === record.employee_id);
        return (emp?.full_name || emp?.name || record.employee_name || '-') as string;
      },
    },
    {
      title: 'P',
      key: 'present',
      width: 60,
      align: 'center' as const,
      render: (_: unknown, record: AttendanceRecord) => (
        <div onClick={() => handleStatusChange(record.employee_id, 'present')} style={{ cursor: 'pointer' }}>
          {getStatusBadge(record.status, 'present')}
        </div>
      ),
    },
    {
      title: 'Late',
      key: 'late_status',
      width: 80,
      align: 'center' as const,
      render: (_: unknown, record: AttendanceRecord) => (
        <div onClick={() => handleStatusChange(record.employee_id, 'late')} style={{ cursor: 'pointer' }}>
          {getStatusBadge(record.status, 'late')}
        </div>
      ),
    },
    {
      title: 'A',
      key: 'absent',
      width: 60,
      align: 'center' as const,
      render: (_: unknown, record: AttendanceRecord) => (
        <div onClick={() => handleStatusChange(record.employee_id, 'absent')} style={{ cursor: 'pointer' }}>
          {getStatusBadge(record.status, 'absent')}
        </div>
      ),
    },
    {
      title: 'L',
      key: 'leave',
      width: 60,
      align: 'center' as const,
      render: (_: unknown, record: AttendanceRecord) => (
        <div onClick={() => handleStatusChange(record.employee_id, 'leave')} style={{ cursor: 'pointer' }}>
          {getStatusBadge(record.status, 'leave')}
        </div>
      ),
    },
    {
      title: 'Leave type',
      key: 'leave_type',
      width: 120,
      align: 'center' as const,
      render: (_: unknown, record: AttendanceRecord) => {
        if (record.status !== 'leave') return '-';
        return (
          <Select
            value={record.leave_type || 'casual'}
            onChange={(val) => {
              setAttendance(prev =>
                prev.map(r =>
                  r.employee_id === record.employee_id
                    ? { ...r, leave_type: val }
                    : r
                )
              );
            }}
            size="small"
            style={{ width: '100%' }}
            options={[
              { label: 'Paid', value: 'paid' },
              { label: 'Sick', value: 'sick' },
              { label: 'Casual', value: 'casual' },
              { label: 'Annual', value: 'annual' },
              { label: 'Unpaid', value: 'unpaid' },
              { label: 'Emergency', value: 'emergency' },
            ]}
          />
        );
      },
    },
    {
      title: 'OT Days',
      key: 'ot_days',
      width: 100,
      align: 'center' as const,
      render: (_: unknown, record: AttendanceRecord) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
          <Switch
            checked={!!record.overtime_minutes}
            onChange={(checked) => {
              setAttendance(prev =>
                prev.map(r =>
                  r.employee_id === record.employee_id
                    ? { ...r, overtime_minutes: checked ? 480 : 0 }
                    : r
                )
              );
            }}
            size="small"
          />
          <InputNumber
            value={record.overtime_minutes ? Math.round(record.overtime_minutes / 60) : 0}
            onChange={(val) => {
              setAttendance(prev =>
                prev.map(r =>
                  r.employee_id === record.employee_id
                    ? { ...r, overtime_minutes: (val || 0) * 60 }
                    : r
                )
              );
            }}
            size="small"
            style={{ width: '50px' }}
            min={0}
          />
          <span style={{ fontSize: '12px', color: '#999' }}>Days</span>
        </div>
      ),
    },
    {
      title: 'Late',
      key: 'late_minutes',
      width: 120,
      align: 'center' as const,
      render: (_: unknown, record: AttendanceRecord) => (
        <Input
          value={record.status === 'late' ? 'deduct' : '-'}
          placeholder="deduct"
          disabled={record.status !== 'late'}
          size="small"
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Fine',
      key: 'fine',
      width: 100,
      align: 'center' as const,
      render: (_: unknown, record: AttendanceRecord) => (
        <InputNumber
          value={record.fine_amount || 0}
          onChange={(val) => {
            setAttendance(prev =>
              prev.map(r =>
                r.employee_id === record.employee_id
                  ? { ...r, fine_amount: val || 0 }
                  : r
              )
            );
          }}
          size="small"
          style={{ width: '100%' }}
          min={0}
        />
      ),
    },
    {
      title: 'Note',
      key: 'note',
      width: 200,
      render: (_: unknown, record: AttendanceRecord) => (
        <Input
          value={record.note || ''}
          onChange={(e) => {
            setAttendance(prev =>
              prev.map(r =>
                r.employee_id === record.employee_id
                  ? { ...r, note: e.target.value }
                  : r
              )
            );
          }}
          placeholder="Optional"
          size="small"
          style={{ width: '100%' }}
        />
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

      <Card style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: 'none' }}>
        <Table
          columns={columns}
          dataSource={attendance}
          rowKey="employee_id"
          loading={loading}
          size="small"
          pagination={{ 
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
            pageSizeOptions: ['10', '20', '50', '100'],
          }}
          className="attendance-table"
          bordered={false}
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
        .attendance-table .ant-table {
          font-size: 13px;
          border: none;
        }
        .attendance-table .ant-table-thead > tr > th {
          font-size: 12px;
          font-weight: 600;
          padding: 12px 8px;
          background: #f5f5f5;
          border-bottom: 1px solid #e8e8e8;
          color: #333;
        }
        .attendance-table .ant-table-tbody > tr > td {
          padding: 12px 8px;
          font-size: 12px;
          border-bottom: 1px solid #f0f0f0;
        }
        .attendance-table .ant-table-tbody > tr:hover > td {
          background: #fafafa;
        }
        .attendance-table .ant-select {
          font-size: 12px;
        }
        .attendance-table .ant-input-number {
          width: 100% !important;
        }
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
