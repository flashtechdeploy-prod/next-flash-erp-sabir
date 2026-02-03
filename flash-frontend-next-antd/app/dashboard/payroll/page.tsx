'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Table, Button, DatePicker, Space, Tag, Drawer, Popconfirm, Card, Statistic, App, Collapse, Spin, Empty, Col, Row, Input, InputNumber, Badge } from 'antd';
import { PrinterOutlined, DollarOutlined, CheckCircleOutlined, ClockCircleOutlined, UserOutlined, SearchOutlined, RiseOutlined, FallOutlined, SafetyCertificateOutlined, EyeOutlined } from '@ant-design/icons';
import { employeeApi, attendanceApi, payrollApi, clientApi } from '@/lib/api';
import dayjs, { Dayjs } from 'dayjs';
import { useReactToPrint } from 'react-to-print';

interface PayrollEmployee extends Record<string, unknown> {
  id: number;
  employee_id: string;
  fss_no: string;
  full_name: string;
  department: string;
  designation: string;
  main_number?: string;
  mobile_no: string;
  account_no: string;
  presentDays: number;
  lateDays: number;
  absentDays: number;
  leaveDays: number;
  preDays: number;
  curDays: number;
  totalDays: number;
  totalOvertimeMinutes: number;
  otDaysCount: number;
  totalFines: number;
  basicSalary: number;
  allowances: number;
  allow_other: number;
  eobi: number;
  taxFineAdv: number;
  totalSalary: number;
  grossSalary: number;
  overtimePay: number;
  otRate: number;
  ot_amount_override?: number;
  deductions: number;
  netSalary: number;
  paymentStatus: string;
  bank_cash: string;
  remarks: string;
  client_id?: number | null;
  client_name?: string;
  site_name?: string;
}

export default function PayrollPage() {
  return (
    <App>
      <PayrollContent />
    </App>
  );
}

function PayrollContent() {
  const { message } = App.useApp();
  const [month, setMonth] = useState<Dayjs>(dayjs());
  const [payrollData, setPayrollData] = useState<PayrollEmployee[]>([]);
  const [rawEmployees, setRawEmployees] = useState<any[]>([]);
  const [rawAttendance, setRawAttendance] = useState<any[]>([]);
  const [rawAssignments, setRawAssignments] = useState<any[]>([]);
  const [rawSheetEntries, setRawSheetEntries] = useState<any[]>([]);
  const [rawPrevAttendance, setRawPrevAttendance] = useState<any[]>([]);
  const [rawPrevSheetEntries, setRawPrevSheetEntries] = useState<any[]>([]);
  const [companySettings, setCompanySettings] = useState<any>(null);
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [selectedSite, setSelectedSite] = useState<any | null>(null);
  const [sitesDrawerVisible, setSitesDrawerVisible] = useState(false);
  const [guardsDrawerVisible, setGuardsDrawerVisible] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [payslipDrawerVisible, setPayslipDrawerVisible] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<PayrollEmployee | null>(null);
  const [summaryModalVisible, setSummaryModalVisible] = useState(false);
  const [prevMonthData, setPrevMonthData] = useState<PayrollEmployee[]>([]);
  const printRef = useRef<HTMLDivElement>(null);
  const summaryPrintRef = useRef<HTMLDivElement>(null);
  const payslipPrintRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
  });

  const handlePrintSummary = useReactToPrint({
    contentRef: summaryPrintRef,
  });

  const handlePrintPayslip = useReactToPrint({
    contentRef: payslipPrintRef,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const fromDate = month.subtract(1, 'month').date(26).format('YYYY-MM-DD');
      const toDate = month.date(25).format('YYYY-MM-DD');
      const prevFromDate = month.subtract(2, 'month').date(26).format('YYYY-MM-DD');
      const prevToDate = month.subtract(1, 'month').date(25).format('YYYY-MM-DD');

      const [empRes, attRes, assignRes, clientRes, sheetRes, prevAttRes, prevSheetRes] = await Promise.all([
        employeeApi.getAll({ limit: '1000' }),
        attendanceApi.getByRange(fromDate, toDate),
        clientApi.getActiveAssignments(),
        clientApi.getAll(),
        payrollApi.getSheetEntries(fromDate, toDate),
        attendanceApi.getByRange(prevFromDate, prevToDate),
        payrollApi.getSheetEntries(prevFromDate, prevToDate),
      ]);

      setRawEmployees(Array.isArray(empRes.data) ? empRes.data : (empRes.data as any)?.employees || []);
      setRawAttendance(Array.isArray(attRes.data) ? attRes.data : []);
      setRawAssignments(Array.isArray(assignRes.data) ? assignRes.data : []);
      setClients(Array.isArray(clientRes.data) ? clientRes.data : []);
      setRawSheetEntries(Array.isArray(sheetRes.data) ? sheetRes.data : []);
      setRawPrevAttendance(Array.isArray(prevAttRes.data) ? prevAttRes.data : []);
      setRawPrevSheetEntries(Array.isArray(prevSheetRes.data) ? prevSheetRes.data : []);
    } catch (error: any) {
      message.error('Failed to load payroll data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [month, message]);

  // Reactive Calculation logic
  useEffect(() => {
    const empAssignmentMap = new Map<string, { client_id: number; client_name: string; site_name: string }>();
    rawAssignments.forEach((a: any) => {
      empAssignmentMap.set(String(a.employee_id), {
        client_id: Number(a.client_id),
        client_name: String(a.client_name),
        site_name: String(a.site_name),
      });
    });

    const relevantEmployees = rawEmployees.filter((e: any) =>
      ['Active', 'active', 'Suspended', 'Inactive'].includes(String(e.status))
    );

    const sheetEntryMap = new Map();
    rawSheetEntries.forEach((s: any) => {
      sheetEntryMap.set(Number(s.employee_db_id), s);
    });

    const attGroupMap = new Map<string, any[]>();
    rawAttendance.forEach((a: any) => {
      const eid = String(a.employee_id);
      if (!attGroupMap.has(eid)) attGroupMap.set(eid, []);
      attGroupMap.get(eid)?.push(a);
    });

    const fromDateObj = month.subtract(1, 'month').date(26);
    const toDateObj = month.date(25);
    const workingDays = toDateObj.diff(fromDateObj, 'day') + 1;

    const calculated: PayrollEmployee[] = relevantEmployees.map((emp: any) => {
      const employeeId = String(emp.employee_id);
      const empId = Number(emp.id);
      const empAttendance = attGroupMap.get(employeeId) || [];
      const sheetEntry = sheetEntryMap.get(empId);

      let presentDays = 0, absentDays = 0, leaveDays = 0, lateDays = 0, totalFines = 0, totalOvertimeMinutes = 0, otDaysCount = 0;

      empAttendance.forEach((a: any) => {
        const status = String(a.status).toLowerCase();
        if (status === 'present' || status === 'late') presentDays++;
        if (status === 'absent') absentDays++;
        if (status === 'leave') leaveDays++;
        if (status === 'late') lateDays++;
        totalFines += (Number(a.fine_amount) || 0) + (Number(a.late_deduction) || 0);
        totalOvertimeMinutes += (Number(a.overtime_minutes) || 0);

        // New logic: count days where both OT In and Out are marked
        const hasOtIn = a.overtime_in && String(a.overtime_in).trim() !== '';
        const hasOtOut = a.overtime_out && String(a.overtime_out).trim() !== '';

        if (hasOtIn && hasOtOut) {
          otDaysCount++;
        }
      });

      console.log(emp, "emp")
      const basicSalary = parseFloat(String(emp.basic_salary || '0')) || parseFloat(String(emp.salary || '0')) || parseFloat(String(emp.pay_rs || '0'));
      let totalSalary = parseFloat(String(emp.total_salary || '0'));
      if (totalSalary === 0) totalSalary = basicSalary;

      const preDays = sheetEntry?.pre_days_override ?? 0;
      const curDays = sheetEntry?.cur_days_override ?? presentDays;
      const totalPaidDays = preDays + curDays + leaveDays;
      const perDaySalary = totalSalary / workingDays;
      const otRate = sheetEntry?.ot_rate_override ?? 700;
      const grossSalaryBase = totalPaidDays * perDaySalary;

      let overtimePay = 0;
      if (otDaysCount > 0) {
        overtimePay = otDaysCount * otRate;
      }

      const deductions = totalFines;
      const allowOther = parseFloat(String(sheetEntry?.allow_other || '0'));
      const eobi = parseFloat(String(sheetEntry?.eobi || '0'));
      const taxFineAdv = parseFloat(String(sheetEntry?.fine_adv_extra || '0'));
      const netSalary = grossSalaryBase + overtimePay + allowOther - deductions - eobi - taxFineAdv;
      const assignment = empAssignmentMap.get(employeeId);

      return {
        ...emp,
        id: empId,
        employee_id: employeeId,
        full_name: String(emp.full_name),
        department: String(emp.department || "-"),
        account_no: String(emp.account_no || '-'),
        designation: String(emp.designation || "-"),
        main_number: String(emp.main_number || "-"),
        mobile_no: String(emp.mobile_no || emp.mobile_number || "-"),
        client_id: assignment?.client_id || null,
        client_name: assignment?.client_name || "Unassigned",
        site_name: assignment?.site_name || "N/A",
        presentDays, lateDays, absentDays, leaveDays, preDays, curDays,
        totalDays: totalPaidDays, totalOvertimeMinutes, otDaysCount, totalFines, basicSalary,
        allowances: parseFloat(String(emp.allowances || '0')),
        totalSalary,
        allow_other: allowOther, eobi, taxFineAdv,
        perDaySalary: Math.round(perDaySalary),
        grossSalary: Math.round(grossSalaryBase + overtimePay + allowOther),

        overtimePay: Math.round(overtimePay),
        otRate: otRate,
        ot_amount_override: sheetEntry?.ot_amount_override,
        deductions: Math.round(deductions),
        netSalary: Math.round(netSalary),
        paymentStatus: 'unpaid',
        bank_cash: sheetEntry?.bank_cash || 'MMBL',
        remarks: sheetEntry?.remarks || '',
      };
    });
    setPayrollData(calculated);

    // Prev month calc
    const prevAttGroupMap = new Map<string, any[]>();
    rawPrevAttendance.forEach((a: any) => {
      const eid = String(a.employee_id);
      if (!prevAttGroupMap.has(eid)) prevAttGroupMap.set(eid, []);
      prevAttGroupMap.get(eid)?.push(a);
    });
    const prevSheetEntryMap = new Map();
    rawPrevSheetEntries.forEach((s: any) => prevSheetEntryMap.set(Number(s.employee_db_id), s));

    const prevPayroll = relevantEmployees.map((emp: any) => {
      const employeeId = String(emp.employee_id);
      const empAttendance = prevAttGroupMap.get(employeeId) || [];
      const sheetEntry = prevSheetEntryMap.get(Number(emp.id));
      let pDays = 0, lDays = 0;
      empAttendance.forEach((a: any) => {
        const s = String(a.status).toLowerCase();
        if (s === 'present' || s === 'late') pDays++;
        if (s === 'leave') lDays++;
      });
      const bSal = parseFloat(String(emp.basic_salary || '0')) || parseFloat(String(emp.salary || '0'));
      const tSal = parseFloat(String(emp.total_salary || 0)) || bSal;
      const prevFromDateObj = month.subtract(2, 'month').date(26);
      const prevToDateObj = month.subtract(1, 'month').date(25);
      const prevWorkingDays = prevToDateObj.diff(prevFromDateObj, 'day') + 1;
      const totalPaid = (sheetEntry?.pre_days_override ?? 0) + (sheetEntry?.cur_days_override ?? pDays) + lDays;

      const gSal = totalPaid * (tSal / prevWorkingDays);
      const asgn = empAssignmentMap.get(employeeId);
      return { ...emp, client_id: asgn?.client_id, site_name: asgn?.site_name, netSalary: Math.round(gSal) };
    });
    setPrevMonthData(prevPayroll);
  }, [rawEmployees, rawAttendance, rawAssignments, rawSheetEntries, rawPrevAttendance, rawPrevSheetEntries, month]);

  const filteredData = payrollData.filter((emp: PayrollEmployee) =>
    emp.full_name.toLowerCase().includes(searchText.toLowerCase()) ||
    emp.employee_id.toLowerCase().includes(searchText.toLowerCase()) ||
    String(emp.fss_no || '').includes(searchText)
  );

  const totalGross = payrollData.reduce((sum, emp) => sum + (emp.grossSalary || 0), 0);
  const totalDeductions = payrollData.reduce((sum, emp) => sum + (emp.deductions || 0) + (emp.eobi || 0) + (emp.taxFineAdv || 0), 0);
  const totalOvertime = payrollData.reduce((sum, emp) => sum + (emp.overtimePay || 0), 0);
  const totalNet = payrollData.reduce((sum, emp) => sum + (emp.netSalary || 0), 0);

  // Build comprehensive client summary with sites and month comparison
  const buildClientSummary = () => {
    const summaryArray: any[] = [];

    clients.forEach((client: any) => {
      const currentClientData = payrollData.filter((emp: PayrollEmployee) => String(emp.client_id) === String(client.id));
      const prevClientData = prevMonthData.filter((emp: any) => String(emp.client_id) === String(client.id));

      // Group by site for current month
      const currentSiteMap = new Map();
      currentClientData.forEach((emp: PayrollEmployee) => {
        const site = emp.site_name || 'N/A';
        if (!currentSiteMap.has(site)) {
          currentSiteMap.set(site, { count: 0, amount: 0 });
        }
        const siteData = currentSiteMap.get(site);
        siteData.count++;
        siteData.amount += emp.netSalary || 0;
      });

      // Group by site for previous month
      const prevSiteMap = new Map();
      prevClientData.forEach((emp: any) => {
        const site = emp.site_name || 'N/A';
        if (!prevSiteMap.has(site)) {
          prevSiteMap.set(site, { count: 0, amount: 0 });
        }
        const siteData = prevSiteMap.get(site);
        siteData.count++;
        siteData.amount += emp.netSalary || 0;
      });

      // Get all unique sites from both months
      const allSites = new Set([...currentSiteMap.keys(), ...prevSiteMap.keys()]);

      // Create a row for each site
      allSites.forEach((site) => {
        const currentData = currentSiteMap.get(site) || { count: 0, amount: 0 };
        const prevData = prevSiteMap.get(site) || { count: 0, amount: 0 };

        summaryArray.push({
          id: `${client.id}-${site}`,
          clientName: client.name,
          siteName: site,
          currentEmployees: currentData.count,
          prevEmployees: prevData.count,
          currentAmount: currentData.amount,
          prevAmount: prevData.amount,
          difference: currentData.amount - prevData.amount
        });
      });
    });

    return summaryArray.filter((row: any) => row.currentEmployees > 0 || row.prevEmployees > 0);
  };

  const clientSummaryData = buildClientSummary();

  const summaryColumns = [
    { title: 'Sr No.', key: 'sr', width: 70, render: (_: any, __: any, index: number) => index + 1 },
    {
      title: 'No. of Employees',
      dataIndex: 'currentEmployees',
      key: 'currentEmployees',
      width: 140,
      align: 'center' as const,
      render: (val: number) => <strong>{val}</strong>
    },
    {
      title: 'Particulars',
      dataIndex: 'clientName',
      key: 'clientName',
      render: (_: string, record: any) => (
        <div style={{
          fontSize: '13px',
          color: '#1e293b',
          fontWeight: 500
        }}>
          {record.clientName}, {record.siteName}
        </div>
      )
    },
    {
      title: month.format('MMMM YYYY'),
      dataIndex: 'currentAmount',
      key: 'currentAmount',
      width: 150,
      align: 'right' as const,
      render: (val: number) => (
        <span style={{
          fontWeight: 700,
          fontSize: '14px',
          color: '#0f172a'
        }}>
          Rs. {val.toLocaleString()}
        </span>
      )
    },
    {
      title: month.subtract(1, 'month').format('MMMM YYYY'),
      dataIndex: 'prevAmount',
      key: 'prevAmount',
      width: 150,
      align: 'right' as const,
      render: (val: number) => (
        <span style={{
          color: '#64748b',
          fontSize: '13px'
        }}>
          Rs. {val.toLocaleString()}
        </span>
      )
    },
    {
      title: 'Difference',
      dataIndex: 'difference',
      key: 'difference',
      width: 150,
      align: 'right' as const,
      render: (val: number) => {
        const isPositive = val > 0;
        const isNegative = val < 0;
        const color = isPositive ? '#16a34a' : isNegative ? '#dc2626' : '#64748b';
        const bgColor = isPositive ? '#f0fdf4' : isNegative ? '#fef2f2' : '#f8fafc';
        const sign = isPositive ? '+' : '';

        return (
          <span style={{
            color,
            fontWeight: 700,
            fontSize: '14px',
            backgroundColor: bgColor,
            padding: '4px 8px',
            borderRadius: '6px',
            display: 'inline-block'
          }}>
            {sign}Rs. {val.toLocaleString()}
          </span>
        );
      }
    },
  ];

  const handleUpdateEntry = async (employeeDbId: number, field: string, value: any) => {
    setIsUpdating(true);
    try {
      const fromDate = month.startOf('month').format('YYYY-MM-DD');
      const toDate = month.endOf('month').format('YYYY-MM-DD');

      const entry = {
        employee_db_id: employeeDbId,
        [field]: value
      };

      await payrollApi.bulkUpsertSheetEntries(fromDate, toDate, [entry]);
      await loadData();
    } catch (error) {
      message.error('Failed to update entry');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateEmployee = async (employeeId: string, field: string, value: any) => {
    setIsUpdating(true);
    try {
      await employeeApi.update(employeeId, { [field]: value });
      await loadData();
      message.success('Employee updated successfully');
    } catch (error) {
      message.error('Failed to update employee');
    } finally {
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleMarkPaid = async (record: PayrollEmployee) => {
    try {
      await payrollApi.upsertPaymentStatus({
        month: month.format('YYYY-MM'),
        employee_id: record.employee_id,
        status: 'paid',
      });
      message.success('Marked as paid');
      loadData();
    } catch {
      message.error('Failed to update payment status');
    }
  };

  const handleViewPayslip = (record: PayrollEmployee) => {
    setSelectedEmployee(record);
    setPayslipDrawerVisible(true);
  };

  const columns = [
    { title: 'FSS No', dataIndex: 'fss_no', key: 'fss_no', width: 90, fixed: 'left' as const, className: 'font-mono' },
    {
      title: 'Name',
      dataIndex: 'full_name',
      key: 'full_name',
      width: 180,
      fixed: 'left' as const,
      render: (text: string) => <span style={{ fontWeight: 600, color: '#1e293b' }}>{text}</span>
    },

    { title: 'cnic', dataIndex: 'cnic', key: 'cnic', width: 120 },
    { title: 'mobile number', dataIndex: 'mobile_number', key: 'mobile_number', width: 120 },
    {
      title: 'Main Number',
      dataIndex: 'main_number',
      key: 'main_number',
      width: 130,
      render: (val: string, record: PayrollEmployee) => (
        <Input
          defaultValue={val}
          placeholder="Enter main number"
          style={{ width: '100%', borderRadius: '6px' }}
          onBlur={(e) => handleUpdateEmployee(record.employee_id, 'main_number', e.target.value)}
        />
      )
    },

    { title: 'acccount number', dataIndex: 'account_number', key: 'account_number', width: 120 },


    { title: 'Basic Salary', dataIndex: 'totalSalary', key: 'totalSalary', width: 110, render: (v: number) => v.toLocaleString() },
    { title: 'Per Day', dataIndex: 'perDaySalary', key: 'perDaySalary', width: 100, render: (v: number) => v.toLocaleString() },
    {
      title: 'Pre. Days',
      dataIndex: 'preDays',
      key: 'preDays',
      width: 90,
      render: (val: number, record: PayrollEmployee) => (
        <InputNumber
          min={0}
          max={31}
          defaultValue={val}
          controls={false}
          style={{ width: '100%', borderRadius: '6px' }}
          onBlur={(e) => handleUpdateEntry(record.id, 'pre_days_override', Number(e.target.value))}
        />
      )
    },
    {
      title: 'Cur. Days',
      dataIndex: 'curDays',
      key: 'curDays',
      width: 90,
      render: (val: number, record: PayrollEmployee) => (
        <InputNumber
          min={0}
          max={31}
          defaultValue={val}
          controls={false}
          style={{ width: '100%', borderRadius: '6px' }}
          onBlur={(e) => handleUpdateEntry(record.id, 'cur_days_override', Number(e.target.value))}
        />
      )
    },

    { title: 'Leave', dataIndex: 'leaveDays', key: 'leaveDays', width: 70 },
    { title: 'Total', dataIndex: 'totalDays', key: 'totalDays', width: 70, render: (v: number) => <Tag color={v > 25 ? 'green' : 'orange'}>{v}</Tag> },
    {
      title: 'O.T',
      dataIndex: 'otDaysCount',
      key: 'otDaysCount',
      width: 70,
      render: (val: number) => <span style={{ fontWeight: 600 }}>{val}</span>
    },
    {
      title: 'O.T Rate',
      dataIndex: 'otRate',
      key: 'otRate',
      width: 100,
      render: (val: number, record: PayrollEmployee) => (
        <InputNumber
          defaultValue={val}
          controls={false}
          style={{ width: '100%', borderRadius: '6px' }}
          onBlur={(e) => handleUpdateEntry(record.id, 'ot_rate_override', Number(e.target.value))}
        />
      )
    },
    {
      title: 'O.T Amount',
      dataIndex: 'overtimePay',
      key: 'overtimePay',
      width: 140,
      render: (val: number) => (
        <span style={{ color: '#10b981', fontWeight: 700, fontSize: '14px' }}>
          Rs. {val.toLocaleString()}
        </span>
      )
    },
    {
      title: 'Allow/Other',
      dataIndex: 'allow_other',
      key: 'allow_other',
      width: 110,
      render: (val: number, record: PayrollEmployee) => (
        <InputNumber
          defaultValue={val}
          controls={false}
          style={{ width: '100%', borderRadius: '6px' }}
          onBlur={(e) => handleUpdateEntry(record.id, 'allow_other', Number(e.target.value))}
        />
      )
    },
    { title: 'Gross', dataIndex: 'grossSalary', key: 'grossSalary', width: 110, render: (v: number) => v.toLocaleString() },
    {
      title: 'EOBI',
      dataIndex: 'eobi',
      key: 'eobi',
      width: 90,
      render: (val: number, record: PayrollEmployee) => (
        <InputNumber
          defaultValue={val}
          controls={false}
          style={{ width: '100%', borderRadius: '6px' }}
          onBlur={(e) => handleUpdateEntry(record.id, 'eobi', Number(e.target.value))}
        />
      )
    },
    {
      title: 'Fine',
      dataIndex: 'totalFines',
      key: 'totalFines',
      width: 100,
      render: (val: number) => (
        <span style={{ color: val > 0 ? '#ef4444' : 'inherit', fontWeight: val > 0 ? 600 : 'normal' }}>
          {val.toLocaleString()}
        </span>
      )
    },
    {
      title: 'Tax/Fine',
      dataIndex: 'taxFineAdv',
      key: 'taxFineAdv',
      width: 100,
      render: (val: number, record: PayrollEmployee) => (
        <InputNumber
          defaultValue={val}
          controls={false}
          style={{ width: '100%', borderRadius: '6px' }}
          onBlur={(e) => handleUpdateEntry(record.id, 'fine_adv_extra', Number(e.target.value))}
        />
      )
    },
    {
      title: 'Net Payable',
      dataIndex: 'netSalary',
      key: 'netSalary',
      width: 130,
      render: (v: number) => <span style={{ fontSize: '15px', color: '#0369a1', fontWeight: 800 }}>{v.toLocaleString()}</span>
    },
    {
      title: 'Bank/Cash',
      dataIndex: 'bank_cash',
      key: 'bank_cash',
      width: 120,
      render: (val: string, record: PayrollEmployee) => (
        <Input
          defaultValue={val}
          style={{ width: '100%', borderRadius: '6px' }}
          onBlur={(e) => handleUpdateEntry(record.id, 'bank_cash', e.target.value)}
        />
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      fixed: 'right' as const,
      render: (_: unknown, record: PayrollEmployee) => (
        <Button
          type="link"
          size="middle"
          onClick={() => handleViewPayslip(record)}
          style={{ padding: '0 4px', fontWeight: 600 }}
        >
          View Payslip
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: '32px', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <style>
        {`
          .premium-table .ant-table {
            background: transparent !important;
          }
          .premium-table .ant-table-thead > tr > th {
            background: #f1f5f9 !important;
            color: #475569 !important;
            font-weight: 700 !important;
            text-transform: uppercase;
            font-size: 11px;
            letter-spacing: 0.05em;
            border-bottom: 2px solid #e2e8f0 !important;
          }
          .premium-table .ant-table-tbody > tr > td {
            border-bottom: 1px solid #f1f5f9 !important;
            padding: 12px 16px !important;
          }
          .premium-table .ant-table-tbody > tr:hover > td {
            background-color: #f8fafc !important;
          }
          .premium-table .ant-input-number, .premium-table .ant-input {
            border: 1px solid #e2e8f0 !important;
            transition: all 0.2s;
          }
          .premium-table .ant-input-number:hover, .premium-table .ant-input:hover {
            border-color: #3b82f6 !important;
            box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1) !important;
          }
          .premium-table .ant-input-number-focused, .premium-table .ant-input:focus {
            border-color: #3b82f6 !important;
            box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2) !important;
          }
        `}
      </style>
      {/* Premium Dashboard Header */}
      <div style={{
        marginBottom: '32px',
        padding: '24px',
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        borderRadius: '16px',
        color: 'white',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
      }}>
        <Row align="middle" justify="space-between" gutter={[24, 24]}>
          <Col xs={24} md={12}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px'
              }}>
                <DollarOutlined />
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: 'white', lineHeight: 1.2 }}>
                  Payroll Dashboard
                  {isUpdating && <Badge status="processing" text={<span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px', marginLeft: '8px' }}>Syncing...</span>} />}
                </h1>
                <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px' }}>Managing payroll for {month.format('MMMM YYYY')}</p>
              </div>
            </div>
          </Col>
          <Col xs={24} md={12}>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <DatePicker
                picker="month"
                value={month}
                onChange={(date) => date && setMonth(date)}
                format="MMMM YYYY"
                style={{ height: '40px', borderRadius: '8px', minWidth: '180px' }}
              />
              <Button
                type="primary"
                icon={<PrinterOutlined />}
                onClick={handlePrint}
                style={{ height: '40px', borderRadius: '8px', padding: '0 20px', fontWeight: 600 }}
              >
                Print All Reports
              </Button>
              <Button
                icon={<DollarOutlined />}
                onClick={() => setSummaryModalVisible(true)}
                style={{ height: '40px', borderRadius: '8px', padding: '0 20px', fontWeight: 600 }}
              >
                Client Summary
              </Button>
            </div>
          </Col>
        </Row>
      </div>

      {/* Summary Stats Cards */}
      <div style={{ marginBottom: '32px' }}>
        <Row gutter={[24, 24]}>
          <Col xs={24} sm={12} xl={6}>
            <Card style={{
              borderRadius: '16px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              background: 'linear-gradient(to right bottom, #f0fdf4, #ffffff)',
              border: '1px solid #dcfce7'
            }} hoverable>
              <Statistic
                title={<span style={{ fontWeight: 600, color: '#166534' }}>Gross Payroll</span>}
                value={totalGross}
                prefix={<RiseOutlined style={{ color: '#10b981' }} />}
                formatter={(val) => `Rs. ${val.toLocaleString()}`}
                valueStyle={{ color: '#14532d', fontWeight: 800 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} xl={6}>
            <Card style={{
              borderRadius: '16px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              background: 'linear-gradient(to right bottom, #eff6ff, #ffffff)',
              border: '1px solid #dbeafe'
            }} hoverable>
              <Statistic
                title={<span style={{ fontWeight: 600, color: '#1e40af' }}>Overtime Total</span>}
                value={totalOvertime}
                prefix={<ClockCircleOutlined style={{ color: '#3b82f6' }} />}
                formatter={(val) => `Rs. ${val.toLocaleString()}`}
                valueStyle={{ color: '#1e3a8a', fontWeight: 800 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} xl={6}>
            <Card style={{
              borderRadius: '16px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              background: 'linear-gradient(to right bottom, #fef2f2, #ffffff)',
              border: '1px solid #fee2e2'
            }} hoverable>
              <Statistic
                title={<span style={{ fontWeight: 600, color: '#991b1b' }}>Total Deductions</span>}
                value={totalDeductions}
                prefix={<FallOutlined style={{ color: '#ef4444' }} />}
                formatter={(val) => `Rs. ${val.toLocaleString()}`}
                valueStyle={{ color: '#7f1d1d', fontWeight: 800 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} xl={6}>
            <Card style={{
              borderRadius: '16px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              border: 'none'
            }} hoverable>
              <Statistic
                title={<span style={{ fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>NET PAYABLE</span>}
                value={totalNet}
                prefix={<SafetyCertificateOutlined style={{ color: 'white' }} />}
                formatter={(val) => `Rs. ${val.toLocaleString()}`}
                valueStyle={{ color: 'white', fontWeight: 900, fontSize: '24px' }}
              />
            </Card>
          </Col>
        </Row>
      </div>

      {/* Main Table Controls */}
      <div style={{ marginBottom: '24px', display: 'flex', gap: '16px', alignItems: 'center' }}>
        <Button
          icon={<RiseOutlined rotate={-45} />}
          onClick={loadData}
          style={{
            height: '45px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            fontWeight: 600,
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
          }}
        >
          Refresh
        </Button>
        <Input
          placeholder="Search by Guard Name, ID or FSS No..."
          prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{
            maxWidth: '400px',
            height: '45px',
            borderRadius: '12px',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
          }}
          allowClear
        />
        <Badge count={filteredData.length} overflowCount={999} color="#3b82f6" style={{ fontWeight: 600 }}>
          <Tag color="default" style={{ height: '32px', display: 'flex', alignItems: 'center', borderRadius: '6px', margin: 0 }}>
            Total Guards
          </Tag>
        </Badge>
        {loading && <Spin size="small" style={{ marginLeft: '8px' }} />}
      </div>

      <div style={{ minHeight: '400px' }}>
        {filteredData.length > 0 ? (
          <Table
            dataSource={clients.map((client: any) => {
              const clientGuards = filteredData.filter((emp: PayrollEmployee) => String(emp.client_id) === String(client.id));
              if (clientGuards.length === 0) return null;

              const clientNet = clientGuards.reduce((sum: number, emp: PayrollEmployee) => sum + emp.netSalary, 0);

              const sitesMap = new Map<string, PayrollEmployee[]>();
              clientGuards.forEach((g: PayrollEmployee) => {
                const site = g.site_name || 'Unassigned';
                if (!sitesMap.has(site)) sitesMap.set(site, []);
                sitesMap.get(site)?.push(g);
              });

              return {
                ...client,
                key: client.id,
                guardCount: clientGuards.length,
                totalNet: clientNet,
                sites: Array.from(sitesMap.entries()).map(([name, guards]) => {
                  const siteNet = guards.reduce((sum, g) => sum + g.netSalary, 0);
                  return {
                    key: `${client.id}-${name}`,
                    name,
                    guardCount: guards.length,
                    totalNet: siteNet,
                    guards
                  };
                })
              };
            }).filter(Boolean)}
            columns={[
              {
                title: 'CLIENT NAME',
                dataIndex: 'name',
                key: 'name',
                render: (val) => <span style={{ fontWeight: 700, fontSize: '15px' }}>{val}</span>
              },
              {
                title: 'TOTAL GUARDS',
                dataIndex: 'guardCount',
                key: 'guardCount',
                width: 150,
                render: (count) => <Tag color="blue" bordered={false}>{count} Guards</Tag>
              },
              {
                title: 'TOTAL NET PAYABLE',
                dataIndex: 'totalNet',
                key: 'totalNet',
                width: 250,
                align: 'right',
                render: (val) => <span style={{ fontWeight: 700, color: '#10b981' }}>Rs. {val.toLocaleString()}</span>
              },
              {
                title: 'ACTIONS',
                key: 'actions',
                width: 100,
                render: (_, record: any) => (
                  <Button
                    type="link"
                    icon={<EyeOutlined />}
                    onClick={() => {
                      setSelectedClient(record);
                      setSitesDrawerVisible(true);
                    }}
                  >
                    View Sites
                  </Button>
                )
              }
            ]}
            pagination={{ pageSize: 15, position: ['bottomRight'] }}
            className="premium-table"
            style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
          />
        ) : (
          !loading && <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={<span style={{ color: '#94a3b8' }}>No payroll records found for "{searchText}"</span>}
            style={{ marginTop: '100px' }}
          />
        )}
      </div>

      {/* Sites Drawer */}
      <Drawer
        title={<span style={{ fontSize: '18px', fontWeight: 800 }}>Sites for {selectedClient?.name}</span>}
        placement="right"
        width={800}
        onClose={() => setSitesDrawerVisible(false)}
        open={sitesDrawerVisible}
      >
        {selectedClient && (
          <Table
            dataSource={selectedClient.sites}
            columns={[
              {
                title: 'SITE NAME',
                dataIndex: 'name',
                key: 'name',
                render: (val) => <span style={{ fontWeight: 600 }}>{val}</span>
              },
              {
                title: 'GUARDS',
                dataIndex: 'guardCount',
                key: 'guardCount',
                width: 120,
                render: (c) => <Tag color="cyan">{c}</Tag>
              },
              {
                title: 'SITE TOTAL',
                dataIndex: 'totalNet',
                key: 'totalNet',
                width: 200,
                align: 'right',
                render: (v) => <span style={{ fontWeight: 600 }}>Rs. {v.toLocaleString()}</span>
              },
              {
                title: 'ACTIONS',
                key: 'actions',
                width: 100,
                render: (_, siteRecord: any) => (
                  <Button
                    type="link"
                    icon={<EyeOutlined />}
                    onClick={() => {
                      setSelectedSite(siteRecord);
                      setGuardsDrawerVisible(true);
                    }}
                  >
                    View Guards
                  </Button>
                )
              }
            ]}
            pagination={false}
            className="premium-table"
          />
        )}
      </Drawer>

      {/* Guards Drawer */}
      <Drawer
        title={<span style={{ fontSize: '18px', fontWeight: 800 }}>Guards at {selectedSite?.name} ({selectedClient?.name})</span>}
        placement="right"
        width="95%"
        onClose={() => setGuardsDrawerVisible(false)}
        open={guardsDrawerVisible}
      >
        {selectedSite && (
          <Table
            columns={columns}
            dataSource={selectedSite.guards}
            rowKey="id"
            size="middle"
            bordered={false}
            pagination={false}
            scroll={{ x: 'max-content' }}
            className="premium-table"
            rowClassName={(record: any) => (record.status === 'Inactive' || record.status === 'Suspended') ? 'inactive-row' : ''}
          />
        )}
      </Drawer>

      {/* Payslip Drawer */}
      <Drawer
        title="Employee Payslip"
        placement="right"
        size="large"
        onClose={() => setPayslipDrawerVisible(false)}
        open={payslipDrawerVisible}
        extra={
          <Button icon={<PrinterOutlined />} onClick={() => handlePrintPayslip()}>
            Print
          </Button>
        }
      >
        {selectedEmployee && (
          <div ref={payslipPrintRef} style={{ padding: '20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '30px', borderBottom: '2px solid #1890ff', paddingBottom: '20px' }}>
              <h1 style={{ margin: 0, fontSize: '24px', color: '#1890ff' }}>Flash Security Services</h1>
              <p style={{ margin: '5px 0', fontSize: '12px', color: '#666' }}>Payslip for {month.format('MMMM YYYY')}</p>
            </div>

            <div style={{ marginBottom: '30px' }}>
              <h3 style={{ fontSize: '16px', marginBottom: '15px', color: '#1890ff' }}>Employee Information</h3>
              <Row gutter={[16, 8]}>
                <Col span={12}>
                  <div style={{ padding: '8px', borderLeft: '3px solid #1890ff', backgroundColor: '#f5f5f5' }}>
                    <strong style={{ fontSize: '11px' }}>Employee ID:</strong>
                    <div style={{ fontSize: '12px' }}>{selectedEmployee.employee_id}</div>
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ padding: '8px', borderLeft: '3px solid #1890ff', backgroundColor: '#f5f5f5' }}>
                    <strong style={{ fontSize: '11px' }}>Name:</strong>
                    <div style={{ fontSize: '12px' }}>{selectedEmployee.full_name}</div>
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ padding: '8px', borderLeft: '3px solid #1890ff', backgroundColor: '#f5f5f5' }}>
                    <strong style={{ fontSize: '11px' }}>Department:</strong>
                    <div style={{ fontSize: '12px' }}>{selectedEmployee.department}</div>
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ padding: '8px', borderLeft: '3px solid #1890ff', backgroundColor: '#f5f5f5' }}>
                    <strong style={{ fontSize: '11px' }}>Designation:</strong>
                    <div style={{ fontSize: '12px' }}>{selectedEmployee.designation}</div>
                  </div>
                </Col>
              </Row>
            </div>

            <div style={{ marginBottom: '30px' }}>
              <h3 style={{ fontSize: '16px', marginBottom: '15px', color: '#1890ff' }}>Attendance Summary</h3>
              <Row gutter={[16, 8]}>
                <Col span={6}>
                  <div style={{ padding: '8px', borderLeft: '3px solid #52c41a', backgroundColor: '#f5f5f5' }}>
                    <strong style={{ fontSize: '11px' }}>Present:</strong>
                    <div style={{ fontSize: '12px' }}>{selectedEmployee.presentDays}</div>
                  </div>
                </Col>
                <Col span={6}>
                  <div style={{ padding: '8px', borderLeft: '3px solid #ff4d4f', backgroundColor: '#f5f5f5' }}>
                    <strong style={{ fontSize: '11px' }}>Absent:</strong>
                    <div style={{ fontSize: '12px' }}>{selectedEmployee.absentDays}</div>
                  </div>
                </Col>
                <Col span={6}>
                  <div style={{ padding: '8px', borderLeft: '3px solid #1890ff', backgroundColor: '#f5f5f5' }}>
                    <strong style={{ fontSize: '11px' }}>Leave:</strong>
                    <div style={{ fontSize: '12px' }}>{selectedEmployee.leaveDays}</div>
                  </div>
                </Col>
                <Col span={6}>
                  <div style={{ padding: '8px', borderLeft: '3px solid #faad14', backgroundColor: '#f5f5f5' }}>
                    <strong style={{ fontSize: '11px' }}>Late:</strong>
                    <div style={{ fontSize: '12px' }}>{selectedEmployee.lateDays}</div>
                  </div>
                </Col>
              </Row>
            </div>

            <div style={{ marginBottom: '30px' }}>
              <h3 style={{ fontSize: '16px', marginBottom: '15px', color: '#1890ff' }}>Salary Breakdown</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#1890ff', color: 'white' }}>
                    <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Description</th>
                    <th style={{ padding: '10px', textAlign: 'right', border: '1px solid #ddd' }}>Amount (Rs.)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>Basic Salary</td>
                    <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #ddd' }}>{selectedEmployee.basicSalary.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>Allowances</td>
                    <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #ddd' }}>{selectedEmployee.allowances.toLocaleString()}</td>
                  </tr>
                  <tr style={{ backgroundColor: '#f0f0f0', fontWeight: 600 }}>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>Gross Salary</td>
                    <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #ddd' }}>{selectedEmployee.grossSalary.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px', border: '1px solid #ddd', color: '#52c41a' }}>Overtime Pay</td>
                    <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #ddd', color: '#52c41a' }}>+{selectedEmployee.overtimePay.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px', border: '1px solid #ddd', color: '#ff4d4f' }}>Deductions</td>
                    <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #ddd', color: '#ff4d4f' }}>-{selectedEmployee.deductions.toLocaleString()}</td>
                  </tr>
                  <tr style={{ backgroundColor: '#52c41a', color: 'white', fontWeight: 600, fontSize: '14px' }}>
                    <td style={{ padding: '12px', border: '1px solid #ddd' }}>Net Salary</td>
                    <td style={{ padding: '12px', textAlign: 'right', border: '1px solid #ddd' }}>{selectedEmployee.netSalary.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: '50px', paddingTop: '20px', borderTop: '1px solid #ddd', fontSize: '11px', color: '#666' }}>
              <p>Computer-generated payslip.</p>
              <p>Date: {dayjs().format('DD MMM YYYY')}</p>
            </div>
          </div>
        )}
      </Drawer>

      {/* Print Layout */}
      <div style={{ display: 'none' }}>
        <div ref={printRef} style={{ width: '297mm', padding: '10px' }}>
          <style>
            {`
              @media print {
                @page { size: landscape; margin: 10mm; }
                table { border-collapse: collapse; width: 100%; font-size: 8px; }
                th, td { border: 1px solid black; padding: 2px; text-align: center; }
                .site-header { background-color: #f0f0f0; font-weight: bold; text-align: left; padding: 4px; }
              }
            `}
          </style>
          <h2 style={{ textAlign: 'center' }}>FLASH SECURITY SERVICES - PAYROLL SHEET ({month.format('MMMM YYYY')})</h2>

          {clients.map(client => {
            const clientGuards = payrollData.filter(emp => String(emp.client_id) === String(client.id));
            if (clientGuards.length === 0) return null;

            const sitesMap = new Map<string, PayrollEmployee[]>();
            clientGuards.forEach(g => {
              const site = g.site_name || 'Generic';
              if (!sitesMap.has(site)) sitesMap.set(site, []);
              sitesMap.get(site)?.push(g);
            });

            return (
              <div key={client.id} style={{ marginBottom: '20px', pageBreakInside: 'avoid' }}>
                <h3 style={{ textDecoration: 'underline' }}>Client: {String((client as any).name)}</h3>
                {Array.from(sitesMap.entries()).map(([siteName, guards]) => (
                  <div key={siteName} style={{ marginBottom: '10px' }}>
                    <div className="site-header">Site: {String(siteName)}</div>
                    <table>
                      <thead>
                        <tr>
                          <th>Sr.</th>
                          <th>FSS No</th>
                          <th>Employee Name</th>
                          <th>Salary/Mo</th>
                          <th>Pre. Days</th>
                          <th>Cur. Days</th>
                          <th>Leave</th>
                          <th>Total Days</th>
                          <th>O.T</th>
                          <th>O.T Amt</th>
                          <th>Allow.</th>
                          <th>Gross</th>
                          <th>EOBI</th>
                          <th>Tax/Fine</th>
                          <th>Net Payable</th>
                          <th>Bank/Cash</th>
                        </tr>
                      </thead>
                      <tbody>
                        {guards.map((g, idx) => (
                          <tr key={g.id}>
                            <td>{idx + 1}</td>
                            <td>{g.fss_no}</td>
                            <td style={{ textAlign: 'left' }}>{g.full_name}</td>
                            <td>{g.totalSalary.toLocaleString()}</td>
                            <td>{g.preDays}</td>
                            <td>{g.curDays}</td>
                            <td>{g.leaveDays}</td>
                            <td>{g.totalDays}</td>
                            <td>{Math.floor(g.totalOvertimeMinutes / 60)}</td>
                            <td>{g.overtimePay.toLocaleString()}</td>
                            <td>{g.allow_other.toLocaleString()}</td>
                            <td>{g.grossSalary.toLocaleString()}</td>
                            <td>{g.eobi.toLocaleString()}</td>
                            <td>{g.taxFineAdv.toLocaleString()}</td>
                            <td style={{ fontWeight: 'bold' }}>{g.netSalary.toLocaleString()}</td>
                            <td>{g.bank_cash}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
      {/* Client Summary Modal */}
      <Drawer
        title={<span style={{ fontSize: '20px', fontWeight: 800 }}>Salary Summary - {month.format('MMMM YYYY')}</span>}
        open={summaryModalVisible}
        onClose={() => setSummaryModalVisible(false)}
        width={800}
        extra={
          <Button type="primary" icon={<PrinterOutlined />} onClick={handlePrintSummary}>
            Print Summary
          </Button>
        }
      >
        <div ref={summaryPrintRef} style={{ padding: '20px' }}>
          <div className="print-only" style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h2 style={{ margin: 0 }}>Flash Security Services (Private) Limited</h2>
            <h3 style={{ margin: 0 }}>Salary Summary for the Month of {month.format('MMMM-YYYY')}</h3>
          </div>
          <Table
            dataSource={clientSummaryData}
            columns={summaryColumns}
            pagination={false}
            rowKey="id"
            bordered
            size="middle"
            summary={() => (
              <Table.Summary.Row style={{ backgroundColor: '#f8fafc' }}>
                <Table.Summary.Cell index={0}>
                  <strong style={{ fontSize: '16px' }}>GRAND TOTAL</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1} align="center">
                  <strong style={{ fontSize: '16px' }}>{clientSummaryData.reduce((s: number, c: any) => s + c.currentEmployees, 0)}</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2}></Table.Summary.Cell>
                <Table.Summary.Cell index={3} align="right">
                  <strong style={{ fontSize: '16px' }}>Rs. {clientSummaryData.reduce((s: number, c: any) => s + c.currentAmount, 0).toLocaleString()}</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={4} align="right">
                  <strong>Rs. {clientSummaryData.reduce((s: number, c: any) => s + c.prevAmount, 0).toLocaleString()}</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={5} align="right">
                  <strong style={{ color: '#0369a1', fontSize: '16px' }}>
                    Rs. {(clientSummaryData.reduce((s: number, c: any) => s + c.currentAmount, 0) - clientSummaryData.reduce((s: number, c: any) => s + c.prevAmount, 0)).toLocaleString()}
                  </strong>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            )}
          />
        </div>
      </Drawer>

      <style>
        {`
          @media print {
            .print-only { display: block !important; }
            .ant-drawer-close, .ant-drawer-header-extra { display: none !important; }
          }
          .print-only { display: none; }
        `}
      </style>
    </div>
  );
}
