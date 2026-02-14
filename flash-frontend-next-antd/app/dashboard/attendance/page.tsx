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
  Badge,
  Button,
  Card,
  Checkbox,
  Col,
  Collapse,
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

const parseGPS = (locStr: string | null | undefined) => {
  if (!locStr || locStr === 'null') return null;
  try {
    const trimmed = locStr.trim();
    if (trimmed.startsWith('{')) {
      const loc = JSON.parse(trimmed);
      const lat = loc.latitude ?? loc.lat;
      const lng = loc.longitude ?? loc.lng;
      if (lat !== undefined && lng !== undefined) return { lat: parseFloat(lat), lng: parseFloat(lng) };
    }
    // Attempt to match numbers (including negative and decimals)
    const nums = trimmed.match(/-?\d+\.\d+|-?\d+/g);
    if (nums && nums.length >= 2) {
      return { lat: parseFloat(nums[0]), lng: parseFloat(nums[1]) };
    }
  } catch (e) {
    console.warn('GPS Parse Error:', e);
  }
  return null;
};

const getOvertimeMinutes = (record: any, selectedDateStr: string) => {
  if (!record.overtime_in || !record.overtime_out) {
    return record.overtime_minutes || 0;
  }

  try {
    const parseToMinutes = (timeStr: string) => {
      const parts = timeStr.split(':');
      const h = parseInt(parts[0], 10) || 0;
      const m = parseInt(parts[1], 10) || 0;
      return h * 60 + m;
    };

    const inMins = parseToMinutes(record.overtime_in);
    const outMins = parseToMinutes(record.overtime_out);

    // If we have explicit dates, use them for high-precision
    if (record.overtime_in_date || record.overtime_out_date) {
      const startD = record.overtime_in_date || selectedDateStr;
      const endD = record.overtime_out_date || startD;
      const start = dayjs(`${startD}T${record.overtime_in.padStart(5, '0')}`);
      const end = dayjs(`${endD}T${record.overtime_out.padStart(5, '0')}`);
      if (start.isValid() && end.isValid()) {
        const diff = end.diff(start, 'minute');
        return diff > 0 ? diff : 0;
      }
    }

    // Fallback/Standard: Simple same-day or cross-day logic
    let diff = outMins - inMins;
    if (diff < 0) {
      // Assume overnight if out time is less than in time
      diff += 1440; // 24 hours
    }
    return diff > 0 ? diff : 0;
  } catch (e) {
    console.error('OT Calc Error:', e);
    return record.overtime_minutes || 0;
  }
};

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
  check_in?: string;
  check_in_date?: string;
  check_out?: string;
  check_out_date?: string;
  check_out_picture?: string;
  check_out_location?: string;
  overtime_in?: string;
  overtime_in_date?: string;
  overtime_in_picture?: string;
  overtime_in_location?: string;
  overtime_out?: string;
  overtime_out_date?: string;
  overtime_out_picture?: string;
  overtime_out_location?: string;
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
    console.log(`[fetchFullSheet] Loaded ${data.length} employees.`);

    // Auto-calculate overtime if times are present but minutes are not
    const processedData = data.map(r => ({
      ...r,
      overtime_minutes: r.overtime_minutes || getOvertimeMinutes(r, dateStr)
    }));

    setAttendance(processedData);

    // Map minimal employee data for local filtering/lookups if needed
    setEmployees(processedData.map(r => ({
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
        check_in: r.check_in,
        check_in_date: r.check_in_date,
        initial_location: r.initial_location,
        check_out: r.check_out,
        check_out_date: r.check_out_date,
        check_out_picture: r.check_out_picture,
        check_out_location: r.check_out_location,
        overtime_in: r.overtime_in,
        overtime_in_date: r.overtime_in_date,
        overtime_in_picture: r.overtime_in_picture,
        overtime_in_location: r.overtime_in_location,
        overtime_out: r.overtime_out,
        overtime_out_date: r.overtime_out_date,
        overtime_out_picture: r.overtime_out_picture,
        overtime_out_location: r.overtime_out_location,
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

  // Calculate total working hours from check_in and check_out times
  const calculateWorkingHours = () => {
    let totalMinutes = 0;
    attendance.forEach(r => {
      if (r.check_in && r.check_out) {
        try {
          const checkInDate = r.check_in_date || selectedDate.format('YYYY-MM-DD');
          const checkOutDate = r.check_out_date || checkInDate;
          const checkIn = dayjs(`${checkInDate}T${r.check_in}`);
          const checkOut = dayjs(`${checkOutDate}T${r.check_out}`);
          if (checkIn.isValid() && checkOut.isValid()) {
            const diff = checkOut.diff(checkIn, 'minute');
            if (diff > 0) totalMinutes += diff;
          }
        } catch (e) { /* ignore parsing errors */ }
      }
    });
    return totalMinutes;
  };

  // Calculate total overtime hours from overtime_in and overtime_out or overtime_minutes
  const calculateOvertimeHours = () => {
    let totalMinutes = 0;
    attendance.forEach(r => {
      // First check if overtime_in and overtime_out are set
      if (r.overtime_in && r.overtime_out) {
        try {
          const otInDate = r.overtime_in_date || selectedDate.format('YYYY-MM-DD');
          const otOutDate = r.overtime_out_date || otInDate;
          const otIn = dayjs(`${otInDate}T${r.overtime_in}`);
          const otOut = dayjs(`${otOutDate}T${r.overtime_out}`);
          if (otIn.isValid() && otOut.isValid()) {
            const diff = otOut.diff(otIn, 'minute');
            if (diff > 0) totalMinutes += diff;
          }
        } catch (e) { /* ignore parsing errors */ }
      } else if (r.overtime_minutes && r.overtime_minutes > 0) {
        // Fall back to overtime_minutes if times not set
        totalMinutes += r.overtime_minutes;
      }
    });
    return totalMinutes;
  };

  const totalWorkingMinutes = calculateWorkingHours();
  const totalOvertimeMinutes = calculateOvertimeHours();

  const formatHoursMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const summary = {
    total: attendance.length,
    present: attendance.filter(r => r.status === 'present').length,
    late: attendance.filter(r => r.status === 'late').length,
    absent: attendance.filter(r => r.status === 'absent').length,
    leave: attendance.filter(r => r.status === 'leave').length,
    unmarked: attendance.filter(r => r.status === 'unmarked').length,
    totalWorkingHours: formatHoursMinutes(totalWorkingMinutes),
    totalOvertimeHours: formatHoursMinutes(totalOvertimeMinutes),
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

  console.log(attendance, "attendance")

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
        if (!fssId) return '-';
        return (
          <span
            className="text-blue-600 font-semibold hover:underline cursor-pointer"
            onClick={() => handleViewHistory(record.employee_id)}
          >
            {fssId}
          </span>
        );
      },
    },
    {
      title: 'Employee Name',
      dataIndex: 'employee_name',
      key: 'employee_name',
      width: 150,
      render: (_: unknown, record: AttendanceRecord) => {
        const emp = employees.find(e => e.employee_id === record.employee_id);
        const name = (emp?.full_name || emp?.name || record.employee_name || '-') as string;
        return name;
      },
    },
    {
      title: 'In Pic',
      key: 'checkin_picture',
      width: 70,
      align: 'center' as const,
      render: (_: unknown, record: AttendanceRecord) => {
        if (!record.picture) return '-';
        return (
          <Tooltip title="View Check-In Selfie">
            <div
              style={{ cursor: 'pointer' }}
              onClick={() => Modal.info({
                title: 'Check-In Selfie',
                content: <img src={record.picture} alt="Check-In Selfie" style={{ width: '100%', marginTop: 10 }} />,
                width: 500,
                maskClosable: true
              })}
            >
              <img
                src={record.picture}
                alt="In"
                style={{ width: 32, height: 32, borderRadius: 4, objectFit: 'cover', border: '2px solid #22c55e' }}
              />
            </div>
          </Tooltip>
        );
      },
    },
    {
      title: 'In / Out',
      key: 'timings',
      width: 140,
      render: (_: unknown, record: AttendanceRecord) => (
        <div style={{ fontSize: '11px', lineHeight: '1.4' }}>
          <div className="flex items-center gap-1 text-green-600 font-bold">
            <Badge status="processing" color="green" /> In: {record.check_in || '-'}
          </div>
          <div className="flex items-center gap-1 text-red-500 font-bold">
            <Badge status="default" /> Out: {record.check_out || '-'}
          </div>
        </div>
      )
    },
    {
      title: 'Work Duration',
      key: 'duration',
      width: 100,
      align: 'center' as const,
      render: (_: unknown, record: AttendanceRecord) => {
        if (!record.check_in || !record.check_out) return '-';
        try {
          const startD = record.check_in_date || selectedDate.format('YYYY-MM-DD');
          const endD = record.check_out_date || startD;
          const start = dayjs(`${startD}T${record.check_in}`);
          const end = dayjs(`${endD}T${record.check_out}`);
          if (start.isValid() && end.isValid()) {
            const diff = end.diff(start, 'minute');
            if (diff <= 0) return '-';
            const h = Math.floor(diff / 60);
            const m = diff % 60;
            return (
              <Tooltip title={`Start: ${record.check_in} | End: ${record.check_out}`}>
                <Tag color="cyan" style={{ border: 'none', borderRadius: '4px', cursor: 'help' }}>
                  {h}h {m}m
                </Tag>
              </Tooltip>
            );
          }
        } catch (e) { }
        return '-';
      },
    },
    {
      title: 'Out Pic',
      key: 'checkout_picture',
      width: 70,
      align: 'center' as const,
      render: (_: unknown, record: AttendanceRecord) => {
        if (!record.check_out_picture) return '-';
        return (
          <Tooltip title="View Check-Out Selfie">
            <div
              style={{ cursor: 'pointer' }}
              onClick={() => Modal.info({
                title: 'Check-Out Selfie',
                content: <img src={record.check_out_picture} alt="Check-Out Selfie" style={{ width: '100%', marginTop: 10 }} />,
                width: 500,
                maskClosable: true
              })}
            >
              <img
                src={record.check_out_picture}
                alt="Out"
                style={{ width: 32, height: 32, borderRadius: 4, objectFit: 'cover', border: '2px solid #ef4444' }}
              />
            </div>
          </Tooltip>
        );
      },
    },
    {
      title: 'In GPS',
      key: 'in_location',
      width: 70,
      align: 'center' as const,
      render: (_: unknown, record: AttendanceRecord) => {
        const coords = parseGPS(record.initial_location || record.location);
        if (!coords) return '-';
        return (
          <Tooltip title={`In GPS: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`}>
            <EnvironmentOutlined
              style={{ color: '#22c55e', fontSize: 18, cursor: 'pointer' }}
              onClick={() => {
                window.open(`https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`, '_blank');
              }}
            />
          </Tooltip>
        );
      },
    },
    {
      title: 'Out GPS',
      key: 'out_location',
      width: 70,
      align: 'center' as const,
      render: (_: unknown, record: AttendanceRecord) => {
        const coords = parseGPS(record.check_out_location);
        if (!coords) return '-';
        return (
          <Tooltip title={`Out GPS: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`}>
            <EnvironmentOutlined
              style={{ color: '#ef4444', fontSize: 18, cursor: 'pointer' }}
              onClick={() => {
                window.open(`https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`, '_blank');
              }}
            />
          </Tooltip>
        );
      },
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
      title: 'OT In / Out',
      key: 'ot_timings',
      width: 140,
      render: (_: unknown, record: AttendanceRecord) => (
        <div style={{ fontSize: '11px', lineHeight: '1.4' }}>
          <div className="flex items-center gap-1 text-orange-600 font-bold">
            <Badge status="processing" color="orange" /> In: {record.overtime_in || '-'}
          </div>
          <div className="flex items-center gap-1 text-purple-500 font-bold">
            <Badge status="default" color="purple" /> Out: {record.overtime_out || '-'}
          </div>
        </div>
      )
    },
    {
      title: 'OT In Pic',
      key: 'ot_in_picture',
      width: 70,
      align: 'center' as const,
      render: (_: unknown, record: AttendanceRecord) => {
        if (!record.overtime_in_picture) return '-';
        return (
          <Tooltip title="View OT In Selfie">
            <div
              style={{ cursor: 'pointer' }}
              onClick={() => Modal.info({
                title: 'Overtime In Selfie',
                content: <img src={record.overtime_in_picture} alt="OT In Selfie" style={{ width: '100%', marginTop: 10 }} />,
                width: 500,
                maskClosable: true
              })}
            >
              <img
                src={record.overtime_in_picture}
                alt="OT In"
                style={{ width: 32, height: 32, borderRadius: 4, objectFit: 'cover', border: '2px solid #f97316' }}
              />
            </div>
          </Tooltip>
        );
      },
    },
    {
      title: 'OT Out Pic',
      key: 'ot_out_picture',
      width: 70,
      align: 'center' as const,
      render: (_: unknown, record: AttendanceRecord) => {
        if (!record.overtime_out_picture) return '-';
        return (
          <Tooltip title="View OT Out Selfie">
            <div
              style={{ cursor: 'pointer' }}
              onClick={() => Modal.info({
                title: 'Overtime Out Selfie',
                content: <img src={record.overtime_out_picture} alt="OT Out Selfie" style={{ width: '100%', marginTop: 10 }} />,
                width: 500,
                maskClosable: true
              })}
            >
              <img
                src={record.overtime_out_picture}
                alt="OT Out"
                style={{ width: 32, height: 32, borderRadius: 4, objectFit: 'cover', border: '2px solid #a855f7' }}
              />
            </div>
          </Tooltip>
        );
      },
    },
    {
      title: 'OT In GPS',
      key: 'ot_in_location',
      width: 70,
      align: 'center' as const,
      render: (_: unknown, record: AttendanceRecord) => {
        const coords = parseGPS(record.overtime_in_location);
        if (!coords) return '-';
        return (
          <Tooltip title={`OT In: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`}>
            <EnvironmentOutlined
              style={{ color: '#f97316', fontSize: 18, cursor: 'pointer' }}
              onClick={() => {
                window.open(`https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`, '_blank');
              }}
            />
          </Tooltip>
        );
      },
    },
    {
      title: 'OT Out GPS',
      key: 'ot_out_location',
      width: 70,
      align: 'center' as const,
      render: (_: unknown, record: AttendanceRecord) => {
        const coords = parseGPS(record.overtime_out_location);
        if (!coords) return '-';
        return (
          <Tooltip title={`OT Out: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`}>
            <EnvironmentOutlined
              style={{ color: '#a855f7', fontSize: 18, cursor: 'pointer' }}
              onClick={() => {
                window.open(`https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`, '_blank');
              }}
            />
          </Tooltip>
        );
      },
    },
    {
      title: 'OT Hours',
      key: 'ot_hours',
      width: 200,
      align: 'center' as const,
      render: (_: unknown, record: AttendanceRecord) => {
        const h = record.overtime_minutes ? Math.floor(record.overtime_minutes / 60) : 0;
        const m = record.overtime_minutes ? record.overtime_minutes % 60 : 0;
        const isAuto = record.overtime_in && record.overtime_out;

        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <div className="flex items-center gap-2">
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
              <Tooltip title={isAuto ? `Calculated from ${record.overtime_in} to ${record.overtime_out}` : 'Manual hours entry'}>
                <InputNumber
                  value={h}
                  onChange={(val) => {
                    setAttendance(prev =>
                      prev.map(r =>
                        r.employee_id === record.employee_id
                          ? { ...r, overtime_minutes: (val || 0) * 60 + m }
                          : r
                      )
                    );
                  }}
                  size="small"
                  style={{ width: '50px' }}
                  min={0}
                />
              </Tooltip>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Hrs</span>
            </div>
            {isAuto && (
              <Badge
                count="AUTO"
                style={{
                  backgroundColor: '#f97316',
                  fontSize: '9px',
                  height: '14px',
                  lineHeight: '14px',
                  borderRadius: '4px'
                }}
              />
            )}
            {!isAuto && (record.overtime_minutes ?? 0) > 0 && m > 0 && (
              <span style={{ fontSize: '10px', color: '#94a3b8' }}>+{m}m</span>
            )}
          </div>
        );
      },
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
            icon={<ClockCircleOutlined />}
            onClick={() => {
              const selectedDateStr = selectedDate.format('YYYY-MM-DD');
              setAttendance(prev =>
                prev.map(r => ({
                  ...r,
                  overtime_minutes: getOvertimeMinutes(r, selectedDateStr)
                }))
              );
              message.success('Recalculated overtime for all records');
            }}
            size="large"
            className="rounded-xl border-orange-200 text-orange-600 hover:bg-orange-50"
          >
            Calc OT
          </Button>
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
        <Col xs={12} sm={6} lg={3}>
          <Card className="summary-stat-card bg-white border-none shadow-sm rounded-2xl">
            <Statistic
              title="Present"
              value={summary.present}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} lg={3}>
          <Card className="summary-stat-card bg-white border-none shadow-sm rounded-2xl">
            <Statistic
              title="Late"
              value={summary.late}
              valueStyle={{ color: '#faad14' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} lg={3}>
          <Card className="summary-stat-card bg-white border-none shadow-sm rounded-2xl">
            <Statistic
              title="Absent"
              value={summary.absent}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} lg={3}>
          <Card className="summary-stat-card bg-white border-none shadow-sm rounded-2xl">
            <Statistic
              title="Leave"
              value={summary.leave}
              valueStyle={{ color: '#1890ff' }}
              prefix={<CalendarOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} lg={3}>
          <Card className="summary-stat-card bg-gradient-to-r from-green-500 to-emerald-600 border-none shadow-lg rounded-2xl">
            <div className="text-white">
              <div className="text-green-100 mb-1 text-sm">Total Working Hours</div>
              <div className="text-2xl font-bold flex items-center gap-2">
                <ClockCircleOutlined />
                {summary.totalWorkingHours}
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={6} lg={3}>
          <Card className="summary-stat-card bg-gradient-to-r from-orange-500 to-amber-600 border-none shadow-lg rounded-2xl">
            <div className="text-white">
              <div className="text-orange-100 mb-1 text-sm">Total Overtime Hours</div>
              <div className="text-2xl font-bold flex items-center gap-2">
                <HistoryOutlined />
                {summary.totalOvertimeHours}
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
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

          <Collapse ghost className="attendance-details-collapse">
            <Collapse.Panel
              header={<span className="font-bold text-slate-700">Check-In Details</span>}
              key="checkin"
            >
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item label="Time" name="check_in">
                    <Input placeholder="10:32" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Date" name="check_in_date">
                    <Input placeholder="YYYY-MM-DD" />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item label="Location" name="initial_location">
                <Input placeholder="GPS Coordinates (JSON)" />
              </Form.Item>
              <Form.Item label="Picture" name="picture">
                <div className="flex flex-col gap-2">
                  {editingRecord?.picture && (
                    <img src={editingRecord.picture} alt="In" className="w-20 h-20 object-cover rounded border" />
                  )}
                  <Upload
                    maxCount={1}
                    beforeUpload={async (file) => {
                      const formData = new FormData();
                      formData.append('file', file);
                      const res = await commonApi.upload(formData);
                      if (!res.error && res.data) {
                        form.setFieldValue('picture', (res.data as any).url);
                      }
                      return false;
                    }}
                    showUploadList={false}
                  >
                    <Button icon={<UploadOutlined />}>Upload Check-In Picture</Button>
                  </Upload>
                </div>
              </Form.Item>
            </Collapse.Panel>

            <Collapse.Panel header={<span className="font-bold text-slate-700">Check-Out Details</span>} key="checkout">
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item label="Time" name="check_out">
                    <Input placeholder="18:30" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Date" name="check_out_date">
                    <Input placeholder="YYYY-MM-DD" />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item label="Location" name="check_out_location">
                <Input placeholder="GPS Coordinates" />
              </Form.Item>
              <Form.Item label="Picture" name="check_out_picture">
                <div className="flex flex-col gap-2">
                  {editingRecord?.check_out_picture && (
                    <img src={editingRecord.check_out_picture} alt="Out" className="w-20 h-20 object-cover rounded border" />
                  )}
                  <Upload
                    maxCount={1}
                    beforeUpload={async (file) => {
                      const formData = new FormData();
                      formData.append('file', file);
                      const res = await commonApi.upload(formData);
                      if (res.data) {
                        form.setFieldValue('check_out_picture', (res.data as any).url || (res.data as any).path);
                        message.success('Uploaded');
                      }
                      return false;
                    }}
                  >
                    <Button size="small" icon={<UploadOutlined />}>Upload</Button>
                  </Upload>
                </div>
              </Form.Item>
            </Collapse.Panel>

            <Collapse.Panel header={<span className="font-bold text-slate-700">Overtime Details</span>} key="overtime">
              <Form.Item
                noStyle
                shouldUpdate={(prev, curr) =>
                  prev.overtime_in !== curr.overtime_in ||
                  prev.overtime_out !== curr.overtime_out ||
                  prev.overtime_in_date !== curr.overtime_in_date ||
                  prev.overtime_out_date !== curr.overtime_out_date
                }
              >
                {({ getFieldsValue, setFieldsValue }) => {
                  const vals = getFieldsValue(['overtime_in', 'overtime_in_date', 'overtime_out', 'overtime_out_date']);
                  if (vals.overtime_in && vals.overtime_out) {
                    try {
                      const startD = vals.overtime_in_date || selectedDate.format('YYYY-MM-DD');
                      const endD = vals.overtime_out_date || startD;
                      const start = dayjs(`${startD}T${vals.overtime_in}`);
                      const end = dayjs(`${endD}T${vals.overtime_out}`);
                      if (start.isValid() && end.isValid()) {
                        const diff = end.diff(start, 'minute');
                        if (diff > 0) {
                          // Update overtime_minutes field if it's different
                          const currentMins = form.getFieldValue('overtime_minutes');
                          if (currentMins !== diff) {
                            setTimeout(() => setFieldsValue({ overtime_minutes: diff }), 0);
                          }
                        }
                      }
                    } catch (e) { }
                  }
                  return null;
                }}
              </Form.Item>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item label="In Time" name="overtime_in">
                    <Input placeholder="19:00" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="In Date" name="overtime_in_date">
                    <Input placeholder="YYYY-MM-DD" />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item label="OT In Location" name="overtime_in_location">
                <Input placeholder="GPS Coordinates" />
              </Form.Item>
              <Form.Item label="OT In Picture" name="overtime_in_picture">
                <div className="flex flex-col gap-2">
                  {editingRecord?.overtime_in_picture && (
                    <img src={editingRecord.overtime_in_picture} alt="OT In" className="w-20 h-20 object-cover rounded border" />
                  )}
                  <Upload
                    maxCount={1}
                    beforeUpload={async (file) => {
                      const formData = new FormData();
                      formData.append('file', file);
                      const res = await commonApi.upload(formData);
                      if (res.data) {
                        form.setFieldValue('overtime_in_picture', (res.data as any).url || (res.data as any).path);
                        message.success('OT In picture uploaded');
                      }
                      return false;
                    }}
                    showUploadList={false}
                  >
                    <Button size="small" icon={<UploadOutlined />}>Upload OT In Pic</Button>
                  </Upload>
                </div>
              </Form.Item>

              <Row gutter={12} className="mt-4">
                <Col span={12}>
                  <Form.Item label="Out Time" name="overtime_out">
                    <Input placeholder="22:00" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Out Date" name="overtime_out_date">
                    <Input placeholder="YYYY-MM-DD" />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item label="OT Out Location" name="overtime_out_location">
                <Input placeholder="GPS Coordinates" />
              </Form.Item>
              <Form.Item label="OT Out Picture" name="overtime_out_picture">
                <div className="flex flex-col gap-2">
                  {editingRecord?.overtime_out_picture && (
                    <img src={editingRecord.overtime_out_picture} alt="OT Out" className="w-20 h-20 object-cover rounded border" />
                  )}
                  <Upload
                    maxCount={1}
                    beforeUpload={async (file) => {
                      const formData = new FormData();
                      formData.append('file', file);
                      const res = await commonApi.upload(formData);
                      if (res.data) {
                        form.setFieldValue('overtime_out_picture', (res.data as any).url || (res.data as any).path);
                        message.success('OT Out picture uploaded');
                      }
                      return false;
                    }}
                    showUploadList={false}
                  >
                    <Button size="small" icon={<UploadOutlined />}>Upload OT Out Pic</Button>
                  </Upload>
                </div>
              </Form.Item>
            </Collapse.Panel>
          </Collapse>
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
              width: 110,
              render: (date: string) => (
                <div style={{ fontWeight: 600 }}>
                  <div>{dayjs(date).format('MMM DD')}</div>
                  <div style={{ fontSize: '10px', color: '#94a3b8' }}>{dayjs(date).format('dddd')}</div>
                </div>
              ),
              sorter: (a: AttendanceRecord, b: AttendanceRecord) =>
                dayjs(a.date).unix() - dayjs(b.date).unix(),
              defaultSortOrder: 'descend',
            },
            {
              title: 'Status',
              dataIndex: 'status',
              key: 'status',
              width: 90,
              render: (status: string) => (
                <Tag color={getStatusColor(status)} icon={getStatusIcon(status)} style={{ margin: 0 }}>
                  {status.toUpperCase()}
                </Tag>
              ),
            },
            {
              title: 'In / Out',
              key: 'timings',
              width: 130,
              render: (_: unknown, record: AttendanceRecord) => (
                <div style={{ fontSize: '11px' }}>
                  <div style={{ color: '#22c55e', fontWeight: 600 }}>In: {record.check_in || '-'}</div>
                  <div style={{ color: '#ef4444', fontWeight: 600 }}>Out: {record.check_out || '-'}</div>
                </div>
              ),
            },
            {
              title: 'Duration',
              key: 'duration',
              width: 90,
              render: (_: unknown, record: AttendanceRecord) => {
                if (!record.check_in || !record.check_out) return '-';
                try {
                  const startD = record.check_in_date || record.date;
                  const endD = record.check_out_date || startD;
                  const start = dayjs(`${startD}T${record.check_in}`);
                  const end = dayjs(`${endD}T${record.check_out}`);
                  if (start.isValid() && end.isValid()) {
                    const diff = end.diff(start, 'minute');
                    if (diff <= 0) return '-';
                    return (
                      <Tag color="cyan" style={{ border: 'none', borderRadius: '4px' }}>
                        {Math.floor(diff / 60)}h {diff % 60}m
                      </Tag>
                    );
                  }
                } catch (e) { }
                return '-';
              },
            },
            {
              title: 'OT Timings',
              key: 'ot_timings',
              width: 130,
              render: (_: unknown, record: AttendanceRecord) => record.overtime_in || record.overtime_out ? (
                <div style={{ fontSize: '11px' }}>
                  <div style={{ color: '#f97316', fontWeight: 600 }}>In: {record.overtime_in || '-'}</div>
                  <div style={{ color: '#a855f7', fontWeight: 600 }}>Out: {record.overtime_out || '-'}</div>
                </div>
              ) : '-',
            },
            {
              title: 'OT Hours',
              key: 'overtime',
              width: 90,
              render: (_: unknown, record: AttendanceRecord) => {
                if (!record.overtime_minutes) return '-';
                const h = Math.floor(record.overtime_minutes / 60);
                const m = record.overtime_minutes % 60;
                return (
                  <Tag color="orange" style={{ border: 'none', borderRadius: '4px' }}>
                    {h}h {m}m
                  </Tag>
                );
              },
            },
            {
              title: 'Pics',
              key: 'pictures',
              width: 100,
              render: (_: unknown, record: AttendanceRecord) => (
                <Space size={4}>
                  {record.picture && (
                    <Tooltip title="Check-In Pic">
                      <img
                        src={record.picture}
                        style={{ width: 24, height: 24, borderRadius: 4, cursor: 'pointer', border: '1px solid #22c55e' }}
                        onClick={() => Modal.info({ title: 'Check-In Pic', content: <img src={record.picture} style={{ width: '100%' }} />, width: 500, maskClosable: true })}
                      />
                    </Tooltip>
                  )}
                  {record.check_out_picture && (
                    <Tooltip title="Check-Out Pic">
                      <img
                        src={record.check_out_picture}
                        style={{ width: 24, height: 24, borderRadius: 4, cursor: 'pointer', border: '1px solid #ef4444' }}
                        onClick={() => Modal.info({ title: 'Check-Out Pic', content: <img src={record.check_out_picture} style={{ width: '100%' }} />, width: 500, maskClosable: true })}
                      />
                    </Tooltip>
                  )}
                </Space>
              ),
            },
            {
              title: 'GPS',
              key: 'locations',
              width: 70,
              align: 'center' as const,
              render: (_: unknown, record: AttendanceRecord) => {
                const initialCoords = parseGPS(record.initial_location || record.location);
                return initialCoords ? (
                  <Tooltip title="View Location">
                    <EnvironmentOutlined
                      style={{ color: '#1890ff', fontSize: 16, cursor: 'pointer' }}
                      onClick={() => {
                        window.open(`https://www.google.com/maps/search/?api=1&query=${initialCoords.lat},${initialCoords.lng}`, '_blank');
                      }}
                    />
                  </Tooltip>
                ) : '-';
              },
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
    </div >
  );
}
