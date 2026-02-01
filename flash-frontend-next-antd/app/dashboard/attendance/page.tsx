'use client';

import { attendanceApi, commonApi } from '@/lib/api';
import {
  CalendarOutlined,
  CameraOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  EnvironmentOutlined,
  EyeOutlined,
  FileTextOutlined,
  HistoryOutlined,
  ReloadOutlined,
  SaveOutlined,
  UploadOutlined,
  UserOutlined
} from '@ant-design/icons';
import {
  Button,
  Card,
  Checkbox,
  Col,
  DatePicker,
  Drawer,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Switch,
  Table,
  Tag,
  Tooltip,
  Upload
} from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { useEffect, useState } from 'react';

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
  picture?: string;
  location?: string;
  initial_location?: string;
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
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const fetchFullSheet = async (date: Dayjs) => {
    setLoading(true);
    const dateStr = date.format('YYYY-MM-DD');
    console.log(`Optimized load: Fetching full attendance for ${dateStr}...`);

    const response = await attendanceApi.getFullDaySheet(dateStr);
    setLoading(false);

    if (response.error) {
      console.error('Fetch error:', response.error);
      message.error(response.error);
      return;
    }

    const data = response.data as AttendanceRecord[];
    console.log(`Loaded ${data.length} employees instantly.`);
    setAttendance(data);

    // Map minimal employee data for local filtering/lookups if needed
    setEmployees(data.map(r => ({
      employee_id: r.employee_id,
      full_name: r.employee_name,
      fss_no: r.fss_id
    })));
  };

  useEffect(() => {
    fetchFullSheet(selectedDate);
  }, [selectedDate]);

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

    // Only send records that have been marked with a valid status
    const recordsToSave = attendance
      .filter(r => r.status && r.status !== 'unmarked')
      .map(r => ({
        employee_id: r.employee_id,
        status: r.status,
        note: r.note,
        overtime_minutes: r.overtime_minutes,
        late_minutes: r.late_minutes,
        fine_amount: r.fine_amount,
        leave_type: r.leave_type,
        location: r.location,
        picture: r.picture,
      }));

    const response = await attendanceApi.bulkUpsert(dateStr, recordsToSave);
    setSaving(false);

    if (response.error) {
      message.error(response.error);
      return;
    }

    message.success('Attendance saved successfully. Leave periods auto-created for leave days.');
    fetchFullSheet(selectedDate);
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
      >
        {statusType === 'present' ? 'P' : statusType === 'late' ? 'Late' : statusType === 'absent' ? 'A' : 'L'}
      </div>
    );
  };

  console.log(employees)
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
      sorter: (a: AttendanceRecord, b: AttendanceRecord) => {
        const idA = parseInt(a.fss_id || '0', 10);
        const idB = parseInt(b.fss_id || '0', 10);
        return idA - idB;
      },
      render: (_: unknown, record: AttendanceRecord) => {
        const emp = employees.find(e => e.employee_id === record.employee_id);
        const fssId = (record.fss_id || (emp as any)?.fss_no) as string;
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
      title: 'Selfie',
      key: 'selfie',
      width: 70,
      align: 'center' as const,
      render: (_: unknown, record: AttendanceRecord) => {
        if (!record.picture) return '-';
        return (
          <Tooltip title="View Full Selfie">
            <div
              style={{ cursor: 'pointer' }}
              onClick={() => Modal.info({
                title: 'Attendance Selfie',
                content: <img src={record.picture} alt="Selfie" style={{ width: '100%', marginTop: 10 }} />,
                width: 500,
                maskClosable: true
              })}
            >
              <img
                src={record.picture}
                alt="Selfie"
                style={{ width: 32, height: 32, borderRadius: 4, objectFit: 'cover', border: '1px solid #ddd' }}
              />
            </div>
          </Tooltip>
        );
      },
    },
    {
      title: 'GPS',
      key: 'locations',
      width: 100,
      align: 'center' as const,
      render: (_: unknown, record: AttendanceRecord) => (
        <Space size="middle">
          {record.initial_location ? (
            <Tooltip title="Selfie Capture Location">
              <CameraOutlined
                style={{ color: '#64748b', fontSize: 16, cursor: 'pointer' }}
                onClick={() => {
                  const loc = JSON.parse(record.initial_location!);
                  window.open(`https://www.google.com/maps/search/?api=1&query=${loc.latitude},${loc.longitude}`, '_blank');
                }}
              />
            </Tooltip>
          ) : '-'}
          {record.location ? (
            <Tooltip title="Final Submission Location">
              <EnvironmentOutlined
                style={{ color: '#1890ff', fontSize: 16, cursor: 'pointer' }}
                onClick={() => {
                  const loc = JSON.parse(record.location!);
                  window.open(`https://www.google.com/maps/search/?api=1&query=${loc.latitude},${loc.longitude}`, '_blank');
                }}
              />
            </Tooltip>
          ) : '-'}
        </Space>
      ),
    },
    {
      title: 'Status: P',
      key: 'present',
      width: 80,
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
      width: 80,
      align: 'center' as const,
      render: (_: unknown, record: AttendanceRecord) => (
        <div onClick={() => handleStatusChange(record.employee_id, 'absent')} style={{ cursor: 'pointer' }}>
          {getStatusBadge(record.status, 'absent')}
        </div>
      ),
    },
    {
      title: 'Leave',
      key: 'leave',
      width: 80,
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
      width: 180,
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
      width: 150,
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
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      fixed: 'right' as const,
      align: 'center' as const,
      render: (_: unknown, record: AttendanceRecord) => (
        <Button
          type="primary"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => handleEdit(record)}
          className="rounded-lg shadow-sm"
        >
          Details
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px', background: '#f8fafc', minHeight: '100vh' }}>
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500 rounded-xl shadow-lg shadow-blue-200">
              <CalendarOutlined style={{ color: 'white' }} />
            </div>
            Attendance Center
          </h1>
          <div className="flex items-center gap-4 text-slate-500">
            <span className="flex items-center gap-1"><UserOutlined /> Total Staff: <b>{summary.total}</b></span>
            <span className="h-4 w-px bg-slate-200" />
            <span className="flex items-center gap-1"><CheckCircleOutlined className="text-green-500" /> Auto-Synced with App</span>
          </div>
        </div>
        <div className="glass-card p-2 rounded-2xl flex items-center gap-2 shadow-sm border border-white">
          <DatePicker
            value={selectedDate}
            onChange={(date) => date && setSelectedDate(date)}
            format="YYYY-MM-DD"
            size="large"
            bordered={false}
            className="hover:bg-slate-50 transition-colors rounded-xl"
            style={{ width: 160 }}
          />
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSaveAll}
            loading={saving}
            size="large"
            className="shadow-md shadow-blue-100 rounded-xl px-8"
          >
            Save Changes
          </Button>
        </div>
      </div>

      <Row gutter={[24, 24]} className="mb-8">
        <Col xs={12} sm={6} lg={4}>
          <Card className="summary-stat-card bg-white border-none shadow-sm rounded-2xl">
            <Statistic
              title="Present"
              value={summary.present}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} lg={4}>
          <Card className="summary-stat-card bg-white border-none shadow-sm rounded-2xl">
            <Statistic
              title="Late"
              value={summary.late}
              valueStyle={{ color: '#faad14' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} lg={4}>
          <Card className="summary-stat-card bg-white border-none shadow-sm rounded-2xl">
            <Statistic
              title="Absent"
              value={summary.absent}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} lg={4}>
          <Card className="summary-stat-card bg-white border-none shadow-sm rounded-2xl">
            <Statistic
              title="Leave"
              value={summary.leave}
              valueStyle={{ color: '#1890ff' }}
              prefix={<CalendarOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} lg={8}>
          <Card className="summary-stat-card bg-blue-600 border-none shadow-lg rounded-2xl text-white">
            <div className="flex justify-between items-center text-white">
              <div>
                <div className="text-blue-100 mb-1">Marking Progress</div>
                <div className="text-2xl font-bold">
                  {summary.total - summary.unmarked} / {summary.total}
                </div>
              </div>
              <div style={{ opacity: 0.2 }}><FileTextOutlined style={{ fontSize: 40 }} /></div>
            </div>
          </Card>
        </Col>
      </Row>

      <div className="flex justify-between items-center mb-6 gap-4">
        <div className="flex items-center gap-4 flex-1">
          <Input.Search
            placeholder="Quick search: Name, FSS No, or Remarks..."
            allowClear
            size="large"
            className="search-input-modern"
            onChange={(e) => setSearchText(e.target.value)}
            style={{ maxWidth: 500 }}
          />
          <Select
            placeholder="Filter by Status"
            allowClear
            size="large"
            style={{ width: 180 }}
            className="status-filter-modern"
            onChange={(val) => setStatusFilter(val)}
            options={[
              { label: 'Present', value: 'present' },
              { label: 'Late', value: 'late' },
              { label: 'Absent', value: 'absent' },
              { label: 'Leave', value: 'leave' },
              { label: 'Unmarked', value: 'unmarked' },
            ]}
          />
        </div>
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => fetchFullSheet(selectedDate)}
            size="large"
            className="rounded-xl"
          >
            Refresh
          </Button>
        </Space>
      </div>

      <Card className="glass-card shadow-xl border-none rounded-3xl overflow-hidden p-0">
        <Table
          columns={columns}
          dataSource={attendance.filter(record => {
            // Text search
            const searchLower = searchText.toLowerCase();
            const matchesSearch = !searchText || (
              (record.fss_id || '').toString().toLowerCase().includes(searchLower) ||
              (record.employee_name || '').toLowerCase().includes(searchLower) ||
              (record.note || '').toLowerCase().includes(searchLower)
            );

            // Status filter
            const matchesStatus = !statusFilter || record.status === statusFilter;

            return matchesSearch && matchesStatus;
          })}
          rowKey="employee_id"
          loading={loading}
          size="middle"
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
            pageSizeOptions: ['10', '20', '50', '100'],
            position: ['bottomCenter'],
          }}
          className="premium-table"
          bordered={false}
          scroll={{ y: 600, x: 'max-content' }}
          rowClassName={(record) => record.picture ? 'self-marked-row pointer-row' : 'pointer-row'}
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
            <TextArea rows={2} placeholder="Any additional notes..." />
          </Form.Item>

          <Form.Item label="Location (Optional)" name="location">
            <Input placeholder="e.g. 33.6844, 73.0479 or Site Name" />
          </Form.Item>

          <Form.Item label="Picture / Selfie (Optional)" name="picture">
            <div className="flex flex-col gap-2">
              {editingRecord?.picture && (
                <img
                  src={editingRecord.picture}
                  alt="Current"
                  className="w-24 h-24 object-cover rounded-lg border mb-2"
                />
              )}
              <Upload
                maxCount={1}
                beforeUpload={async (file) => {
                  const formData = new FormData();
                  formData.append('file', file);
                  message.loading('Uploading picture...');
                  const res = await commonApi.upload(formData);
                  if (res.data) {
                    const url = (res.data as any).url || (res.data as any).path;
                    form.setFieldValue('picture', url);
                    message.success('Picture uploaded');
                  } else {
                    message.error('Upload failed');
                  }
                  return false;
                }}
              >
                <Button icon={<UploadOutlined />}>Upload New Picture</Button>
              </Upload>
            </div>
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
            {
              title: 'GPS',
              key: 'locations',
              width: 80,
              align: 'center' as const,
              render: (_: unknown, record: AttendanceRecord) => (
                <Space size="small">
                  {record.initial_location ? (
                    <Tooltip title="Selfie Capture">
                      <CameraOutlined
                        style={{ color: '#64748b', fontSize: 14, cursor: 'pointer' }}
                        onClick={() => {
                          const loc = JSON.parse(record.initial_location!);
                          window.open(`https://www.google.com/maps/search/?api=1&query=${loc.latitude},${loc.longitude}`, '_blank');
                        }}
                      />
                    </Tooltip>
                  ) : '-'}
                  {record.location ? (
                    <Tooltip title="Submission">
                      <EnvironmentOutlined
                        style={{ color: '#1890ff', fontSize: 14, cursor: 'pointer' }}
                        onClick={() => {
                          const loc = JSON.parse(record.location!);
                          window.open(`https://www.google.com/maps/search/?api=1&query=${loc.latitude},${loc.longitude}`, '_blank');
                        }}
                      />
                    </Tooltip>
                  ) : '-'}
                </Space>
              ),
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
        .glass-card {
           background: rgba(255, 255, 255, 0.9);
           backdrop-filter: blur(10px);
           -webkit-backdrop-filter: blur(10px);
        }
        
        .summary-stat-card .ant-card-body {
           padding: 16px 20px;
        }

        .premium-table .ant-table-thead > tr > th {
          background: #fdfdfd;
          font-weight: 700;
          color: #64748b;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.025em;
          border-bottom: 2px solid #f1f5f9;
        }

        .premium-table .ant-table-tbody > tr > td {
          padding: 16px 8px;
          border-bottom: 1px solid #f1f5f9;
        }

        .premium-table .ant-table-row:hover > td {
          background-color: #f8fafc !important;
        }
        
        .pointer-row {
          cursor: pointer;
        }

        .self-marked-row {
          background-color: #f0fdf4 !important;
        }
        
        .self-marked-row:hover > td {
          background-color: #f0fdf4 !important;
        }

        .status-dot-inactive {
           transition: all 0.2s ease;
        }
        
        .search-input-modern .ant-input-affix-wrapper {
           border-radius: 12px;
           padding: 8px 16px;
           box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);
           border: 1px solid #e2e8f0;
        }
        
        .search-input-modern .ant-input-search-button {
           border-radius: 0 12px 12px 0 !important;
        }

        .ant-table-pagination.ant-pagination {
           margin: 16px 0 !important;
           background: white;
           padding: 12px;
           border-radius: 12px;
           box-shadow: 0 -4px 6px -1px rgb(0 0 0 / 0.02);
        }
      `}</style>
    </div>
  );
}
