'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Table, Button, DatePicker, Space, Tag, Drawer, message, Popconfirm, Card, Statistic, Row, Col } from 'antd';
import { PrinterOutlined, DollarOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { employeeApi, attendanceApi, payrollApi } from '@/lib/api';
import dayjs, { Dayjs } from 'dayjs';
import { useReactToPrint } from 'react-to-print';

interface PayrollEmployee extends Record<string, unknown> {
  id: number;
  employee_id: string;
  full_name: string;
  department: string;
  designation: string;
  presentDays: number;
  lateDays: number;
  absentDays: number;
  leaveDays: number;
  totalOvertimeMinutes: number;
  totalFines: number;
  basicSalary: number;
  allowances: number;
  totalSalary: number;
  grossSalary: number;
  overtimePay: number;
  deductions: number;
  netSalary: number;
  paymentStatus: string;
}

export default function PayrollPage() {
  const [month, setMonth] = useState<Dayjs>(dayjs());
  const [payrollData, setPayrollData] = useState<PayrollEmployee[]>([]);
  const [loading, setLoading] = useState(false);
  const [payslipDrawerVisible, setPayslipDrawerVisible] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<PayrollEmployee | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const payslipPrintRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
  });

  const handlePrintPayslip = useReactToPrint({
    contentRef: payslipPrintRef,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const fromDate = month.startOf('month').format('YYYY-MM-DD');
      const toDate = month.endOf('month').format('YYYY-MM-DD');

      const [empRes, attRes] = await Promise.all([
        employeeApi.getAll({ limit: '1000' }), // Get all employees for calculation
        attendanceApi.getByRange(fromDate, toDate),
      ]);

      const empData = (empRes.data as any)?.employees || [];
      const attData = (attRes.data as any) || [];

      const activeEmployees = empData.filter((e: Record<string, unknown>) =>
        e.status === 'Active' || e.status === 'active'
      );

      // Calculate payroll for each employee
      const calculated: PayrollEmployee[] = activeEmployees.map((emp: Record<string, unknown>) => {
        const empAttendance = attData.filter((a: Record<string, unknown>) => a.employee_id === emp.employee_id);

        const presentDays = empAttendance.filter((a: Record<string, unknown>) => a.status === 'present' || a.status === 'late').length;
        const lateDays = empAttendance.filter((a: Record<string, unknown>) => a.status === 'late').length;
        const absentDays = empAttendance.filter((a: Record<string, unknown>) => a.status === 'absent').length;
        const leaveDays = empAttendance.filter((a: Record<string, unknown>) => a.status === 'leave').length;

        const totalOvertimeMinutes = empAttendance.reduce((sum: number, a: Record<string, unknown>) => sum + (Number(a.overtime_minutes) || 0), 0);
        const totalFines = empAttendance.reduce((sum: number, a: Record<string, unknown>) => sum + (Number(a.fine_amount) || 0) + (Number(a.late_deduction) || 0), 0);

        const basicSalary = parseFloat(String(emp.basic_salary || '0'));
        const allowances = parseFloat(String(emp.allowances || '0'));
        const totalSalary = parseFloat(String(emp.total_salary || basicSalary.toString()));

        const workingDays = month.daysInMonth();
        const perDaySalary = totalSalary / workingDays;

        const grossSalary = (presentDays + leaveDays) * perDaySalary;
        const overtimePay = (totalOvertimeMinutes / 60) * (perDaySalary / 8); // Assuming 8-hour workday
        const deductions = totalFines + (absentDays * perDaySalary);
        const netSalary = grossSalary + overtimePay - deductions;

        return {
          ...emp,
          id: Number(emp.id),
          employee_id: String(emp.employee_id),
          full_name: String(emp.full_name),
          department: String(emp.department),
          designation: String(emp.designation),
          presentDays,
          lateDays,
          absentDays,
          leaveDays,
          totalOvertimeMinutes,
          totalFines,
          basicSalary,
          allowances,
          totalSalary,
          grossSalary: Math.round(grossSalary),
          overtimePay: Math.round(overtimePay),
          deductions: Math.round(deductions),
          netSalary: Math.round(netSalary),
          paymentStatus: 'unpaid',
        };
      });

      setPayrollData(calculated);
    } catch (error) {
      message.error('Failed to load payroll data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [month]);

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
    { title: 'ID', dataIndex: 'employee_id', key: 'employee_id', width: 80 },
    { title: 'Name', dataIndex: 'full_name', key: 'full_name', width: 150 },
    { title: 'Department', dataIndex: 'department', key: 'department', width: 120 },
    { title: 'Designation', dataIndex: 'designation', key: 'designation', width: 120 },
    {
      title: 'Present',
      dataIndex: 'presentDays',
      key: 'presentDays',
      width: 70,
      render: (val: number) => <span style={{ fontSize: '11px' }}>{val}</span>
    },
    {
      title: 'Absent',
      dataIndex: 'absentDays',
      key: 'absentDays',
      width: 70,
      render: (val: number) => <span style={{ fontSize: '11px', color: val > 0 ? '#ff4d4f' : undefined }}>{val}</span>
    },
    {
      title: 'Leave',
      dataIndex: 'leaveDays',
      key: 'leaveDays',
      width: 70,
      render: (val: number) => <span style={{ fontSize: '11px' }}>{val}</span>
    },
    {
      title: 'Basic Salary',
      dataIndex: 'basicSalary',
      key: 'basicSalary',
      width: 100,
      render: (val: number) => <span style={{ fontSize: '11px' }}>Rs. {val.toLocaleString()}</span>
    },
    {
      title: 'Gross',
      dataIndex: 'grossSalary',
      key: 'grossSalary',
      width: 100,
      render: (val: number) => <span style={{ fontSize: '11px' }}>Rs. {val.toLocaleString()}</span>
    },
    {
      title: 'OT Pay',
      dataIndex: 'overtimePay',
      key: 'overtimePay',
      width: 90,
      render: (val: number) => <span style={{ fontSize: '11px', color: '#52c41a' }}>Rs. {val.toLocaleString()}</span>
    },
    {
      title: 'Deductions',
      dataIndex: 'deductions',
      key: 'deductions',
      width: 100,
      render: (val: number) => <span style={{ fontSize: '11px', color: '#ff4d4f' }}>Rs. {val.toLocaleString()}</span>
    },
    {
      title: 'Net Salary',
      dataIndex: 'netSalary',
      key: 'netSalary',
      width: 110,
      render: (val: number) => <span style={{ fontSize: '11px', fontWeight: 600 }}>Rs. {val.toLocaleString()}</span>
    },
    {
      title: 'Status',
      dataIndex: 'paymentStatus',
      key: 'paymentStatus',
      width: 90,
      render: (status: string) => (
        <Tag color={status === 'paid' ? 'green' : 'orange'} style={{ fontSize: '11px' }}>
          {status === 'paid' ? 'Paid' : 'Unpaid'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 180,
      render: (_: unknown, record: PayrollEmployee) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            onClick={() => handleViewPayslip(record)}
            style={{ fontSize: '11px', padding: '0 4px' }}
          >
            Payslip
          </Button>
          {record.paymentStatus !== 'paid' && (
            <Popconfirm
              title="Mark as paid?"
              onConfirm={() => handleMarkPaid(record)}
              okText="Yes"
              cancelText="No"
            >
              <Button
                type="link"
                size="small"
                style={{ fontSize: '11px', padding: '0 4px', color: '#52c41a' }}
              >
                Mark Paid
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const totalGross = payrollData.reduce((sum, emp) => sum + emp.grossSalary, 0);
  const totalDeductions = payrollData.reduce((sum, emp) => sum + emp.deductions, 0);
  const totalNet = payrollData.reduce((sum, emp) => sum + emp.netSalary, 0);
  const paidCount = payrollData.filter(emp => emp.paymentStatus === 'paid').length;
  const unpaidCount = payrollData.filter(emp => emp.paymentStatus === 'unpaid').length;

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>Payroll Management</h2>
        <Space>
          <DatePicker
            picker="month"
            value={month}
            onChange={(date) => date && setMonth(date)}
            format="MMMM YYYY"
          />
          <Button icon={<PrinterOutlined />} onClick={handlePrint}>
            Print Report
          </Button>
        </Space>
      </div>

      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={4}>
          <Card>
            <Statistic
              title={<span style={{ fontSize: '12px' }}>Total Employees</span>}
              value={payrollData.length}
              valueStyle={{ fontSize: '20px' }}
              prefix={<DollarOutlined />}
            />
          </Card>
        </Col>
        <Col span={5}>
          <Card>
            <Statistic
              title={<span style={{ fontSize: '12px' }}>Total Gross</span>}
              value={totalGross}
              valueStyle={{ fontSize: '20px', color: '#1890ff' }}
              prefix="Rs."
            />
          </Card>
        </Col>
        <Col span={5}>
          <Card>
            <Statistic
              title={<span style={{ fontSize: '12px' }}>Total Net</span>}
              value={totalNet}
              valueStyle={{ fontSize: '20px', color: '#52c41a', fontWeight: 600 }}
              prefix="Rs."
            />
          </Card>
        </Col>
        <Col span={5}>
          <Card>
            <Statistic
              title={<span style={{ fontSize: '12px' }}>Paid</span>}
              value={paidCount}
              valueStyle={{ fontSize: '20px', color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={5}>
          <Card>
            <Statistic
              title={<span style={{ fontSize: '12px' }}>Unpaid</span>}
              value={unpaidCount}
              valueStyle={{ fontSize: '20px', color: '#faad14' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Table
        columns={columns}
        dataSource={payrollData}
        rowKey="id"
        loading={loading}
        size="small"
        pagination={{ pageSize: 20 }}
        scroll={{ x: 1400 }}
        style={{ fontSize: '11px' }}
      />

      {/* Payslip Drawer */}
      <Drawer
        title="Employee Payslip"
        placement="right"
        width={720}
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
            {/* Company Header */}
            <div style={{ textAlign: 'center', marginBottom: '30px', borderBottom: '2px solid #1890ff', paddingBottom: '20px' }}>
              <h1 style={{ margin: 0, fontSize: '24px', color: '#1890ff' }}>Flash Security Services</h1>
              <p style={{ margin: '5px 0', fontSize: '12px', color: '#666' }}>Payslip for {month.format('MMMM YYYY')}</p>
            </div>

            {/* Employee Info */}
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

            {/* Attendance Summary */}
            <div style={{ marginBottom: '30px' }}>
              <h3 style={{ fontSize: '16px', marginBottom: '15px', color: '#1890ff' }}>Attendance Summary</h3>
              <Row gutter={[16, 8]}>
                <Col span={6}>
                  <div style={{ padding: '8px', borderLeft: '3px solid #52c41a', backgroundColor: '#f5f5f5' }}>
                    <strong style={{ fontSize: '11px' }}>Present Days:</strong>
                    <div style={{ fontSize: '12px' }}>{selectedEmployee.presentDays}</div>
                  </div>
                </Col>
                <Col span={6}>
                  <div style={{ padding: '8px', borderLeft: '3px solid #ff4d4f', backgroundColor: '#f5f5f5' }}>
                    <strong style={{ fontSize: '11px' }}>Absent Days:</strong>
                    <div style={{ fontSize: '12px' }}>{selectedEmployee.absentDays}</div>
                  </div>
                </Col>
                <Col span={6}>
                  <div style={{ padding: '8px', borderLeft: '3px solid #1890ff', backgroundColor: '#f5f5f5' }}>
                    <strong style={{ fontSize: '11px' }}>Leave Days:</strong>
                    <div style={{ fontSize: '12px' }}>{selectedEmployee.leaveDays}</div>
                  </div>
                </Col>
                <Col span={6}>
                  <div style={{ padding: '8px', borderLeft: '3px solid #faad14', backgroundColor: '#f5f5f5' }}>
                    <strong style={{ fontSize: '11px' }}>Late Days:</strong>
                    <div style={{ fontSize: '12px' }}>{selectedEmployee.lateDays}</div>
                  </div>
                </Col>
              </Row>
            </div>

            {/* Salary Breakdown */}
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
                    <td style={{ padding: '8px', border: '1px solid #ddd', color: '#ff4d4f' }}>Deductions (Fines/Absent)</td>
                    <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #ddd', color: '#ff4d4f' }}>-{selectedEmployee.deductions.toLocaleString()}</td>
                  </tr>
                  <tr style={{ backgroundColor: '#52c41a', color: 'white', fontWeight: 600, fontSize: '14px' }}>
                    <td style={{ padding: '12px', border: '1px solid #ddd' }}>Net Salary</td>
                    <td style={{ padding: '12px', textAlign: 'right', border: '1px solid #ddd' }}>{selectedEmployee.netSalary.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div style={{ marginTop: '50px', paddingTop: '20px', borderTop: '1px solid #ddd', fontSize: '11px', color: '#666' }}>
              <p>This is a computer-generated payslip and does not require a signature.</p>
              <p>Generated on: {dayjs().format('DD MMM YYYY')}</p>
            </div>
          </div>
        )}
      </Drawer>

      {/* Print Layout */}
      <div style={{ display: 'none' }}>
        <div ref={printRef}>
          <style>
            {`
              @media print {
                body { margin: 0; padding: 20px; }
                table { page-break-inside: auto; }
                tr { page-break-inside: avoid; page-break-after: auto; }
              }
            `}
          </style>
          <div style={{ padding: '20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '30px', borderBottom: '2px solid #1890ff', paddingBottom: '20px' }}>
              <h1 style={{ margin: 0, fontSize: '24px', color: '#1890ff' }}>Flash Security Services</h1>
              <p style={{ margin: '5px 0', fontSize: '14px' }}>Payroll Report - {month.format('MMMM YYYY')}</p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <Row gutter={16}>
                <Col span={6}>
                  <div style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', color: '#666' }}>Total Employees</div>
                    <div style={{ fontSize: '20px', fontWeight: 600 }}>{payrollData.length}</div>
                  </div>
                </Col>
                <Col span={6}>
                  <div style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', color: '#666' }}>Total Gross</div>
                    <div style={{ fontSize: '20px', fontWeight: 600, color: '#1890ff' }}>Rs. {totalGross.toLocaleString()}</div>
                  </div>
                </Col>
                <Col span={6}>
                  <div style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', color: '#666' }}>Total Deductions</div>
                    <div style={{ fontSize: '20px', fontWeight: 600, color: '#ff4d4f' }}>Rs. {totalDeductions.toLocaleString()}</div>
                  </div>
                </Col>
                <Col span={6}>
                  <div style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', color: '#666' }}>Total Net</div>
                    <div style={{ fontSize: '20px', fontWeight: 600, color: '#52c41a' }}>Rs. {totalNet.toLocaleString()}</div>
                  </div>
                </Col>
              </Row>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
              <thead>
                <tr style={{ backgroundColor: '#1890ff', color: 'white' }}>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>ID</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>Name</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>Dept</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>P</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>A</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>L</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>Basic</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>Gross</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>OT</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>Deduct</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>Net</th>
                </tr>
              </thead>
              <tbody>
                {payrollData.map((emp) => (
                  <tr key={emp.id}>
                    <td style={{ padding: '6px', border: '1px solid #ddd' }}>{emp.employee_id}</td>
                    <td style={{ padding: '6px', border: '1px solid #ddd' }}>{emp.full_name}</td>
                    <td style={{ padding: '6px', border: '1px solid #ddd' }}>{emp.department}</td>
                    <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'center' }}>{emp.presentDays}</td>
                    <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'center' }}>{emp.absentDays}</td>
                    <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'center' }}>{emp.leaveDays}</td>
                    <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>{emp.basicSalary.toLocaleString()}</td>
                    <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>{emp.grossSalary.toLocaleString()}</td>
                    <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>{emp.overtimePay.toLocaleString()}</td>
                    <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>{emp.deductions.toLocaleString()}</td>
                    <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 600 }}>{emp.netSalary.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ marginTop: '30px', fontSize: '10px', color: '#666' }}>
              <p>Generated on: {dayjs().format('DD MMM YYYY HH:mm')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
