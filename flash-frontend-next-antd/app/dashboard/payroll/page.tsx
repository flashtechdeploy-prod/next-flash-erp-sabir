'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Table, Button, DatePicker, Space, Tag, Drawer, Popconfirm, Card, Statistic, App, Collapse, Spin, Empty, Col, Row } from 'antd';
import { PrinterOutlined, DollarOutlined, CheckCircleOutlined, ClockCircleOutlined, UserOutlined } from '@ant-design/icons';
import { employeeApi, attendanceApi, payrollApi, clientApi } from '@/lib/api';
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
  const [clients, setClients] = useState<any[]>([]);
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

      const [empRes, attRes, assignRes, clientRes] = await Promise.all([
        employeeApi.getAll({ limit: '1000' }),
        attendanceApi.getByRange(fromDate, toDate),
        clientApi.getActiveAssignments(),
        clientApi.getAll(),
      ]);

      const empData = Array.isArray(empRes.data) ? empRes.data : (empRes.data as any)?.employees || [];
      const attData = Array.isArray(attRes.data) ? attRes.data : [];
      const assignData = Array.isArray(assignRes.data) ? assignRes.data : [];
      const clientData = Array.isArray(clientRes.data) ? clientRes.data : [];

      setClients(clientData);

      const activeEmployees = empData.filter((e: Record<string, unknown>) =>
        e.status === 'Active' || e.status === 'active'
      );

      const empAssignmentMap = new Map();
      assignData.forEach((a: any) => {
        empAssignmentMap.set(String(a.employee_id), a);
      });

      // Optimized Attendance Grouping (O(M))
      const attGroupMap = new Map<string, any[]>();
      attData.forEach((a: any) => {
        const eid = String(a.employee_id);
        if (!attGroupMap.has(eid)) attGroupMap.set(eid, []);
        attGroupMap.get(eid)?.push(a);
      });

      const workingDays = month.daysInMonth();

      // Optimized Employee Processing (O(N))
      const calculated: PayrollEmployee[] = activeEmployees.map((emp: Record<string, unknown>) => {
        const employeeId = String(emp.employee_id);
        const empAttendance = attGroupMap.get(employeeId) || [];

        // Single-pass calculation for attendance metrics
        let presentDays = 0;
        let absentDays = 0;
        let leaveDays = 0;
        let lateDays = 0;
        let totalFines = 0;
        let totalOvertimeMinutes = 0;

        empAttendance.forEach((a: Record<string, unknown>) => {
          const status = String(a.status).toLowerCase();
          if (status === 'present' || status === 'late') presentDays++;
          if (status === 'absent') absentDays++;
          if (status === 'leave') leaveDays++;
          if (status === 'late') lateDays++;

          totalFines += (Number(a.fine_amount) || 0) + (Number(a.late_deduction) || 0);
          totalOvertimeMinutes += (Number(a.overtime_minutes) || 0);
        });

        const basicSalary = parseFloat(String(emp.basic_salary || '0'));
        const totalSalary = parseFloat(String(emp.total_salary || basicSalary.toString()));
        const perDaySalary = totalSalary / workingDays;

        const grossSalary = (presentDays + leaveDays) * perDaySalary;
        const overtimePay = (totalOvertimeMinutes / 60) * (perDaySalary / 8);
        const deductions = totalFines + (absentDays * perDaySalary);
        const netSalary = grossSalary + overtimePay - deductions;

        const assignment = empAssignmentMap.get(employeeId);

        return {
          ...emp,
          id: Number(emp.id),
          employee_id: employeeId,
          full_name: String(emp.full_name),
          department: String(emp.department || "-"),
          account_no: String(emp.account_no || '-'),
          designation: String(emp.designation || "-"),
          mobile_no: String(emp.mobile_no || emp.mobile_number || "-"),
          client_id: assignment?.client_id || null,
          client_name: assignment?.client_name || "Unassigned",
          site_name: assignment?.site_name || "N/A",
          presentDays,
          lateDays,
          absentDays,
          leaveDays,
          totalOvertimeMinutes,
          totalFines,
          basicSalary,
          allowances: parseFloat(String(emp.allowances || '0')),
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
  }, [month, message]);

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
    { title: 'ID', dataIndex: 'fss_no', key: 'fss_no', width: 80 },
    { title: 'Name', dataIndex: 'full_name', key: 'full_name', width: 150 },
    { title: 'Site', dataIndex: 'site_name', key: 'site_name', width: 120 },
    { title: 'Designation', dataIndex: 'designation', key: 'designation', width: 120 },
    {
      title: 'P',
      dataIndex: 'presentDays',
      key: 'presentDays',
      width: 50,
    },
    {
      title: 'A',
      dataIndex: 'absentDays',
      key: 'absentDays',
      width: 50,
      render: (val: number) => <span style={{ color: val > 0 ? '#ff4d4f' : undefined }}>{val}</span>
    },
    {
      title: 'Basic Slry',
      dataIndex: 'basicSalary',
      key: 'basicSalary',
      width: 110,
      render: (val: number) => `Rs. ${val.toLocaleString()}`
    },
    {
      title: 'OT Pay',
      dataIndex: 'overtimePay',
      key: 'overtimePay',
      width: 100,
      render: (val: number) => <span style={{ color: '#52c41a' }}>Rs. {val.toLocaleString()}</span>
    },
    {
      title: 'Deductions',
      dataIndex: 'deductions',
      key: 'deductions',
      width: 110,
      render: (val: number) => <span style={{ color: '#ff4d4f' }}>Rs. {val.toLocaleString()}</span>
    },
    {
      title: 'Net Salary',
      dataIndex: 'netSalary',
      key: 'netSalary',
      width: 120,
      render: (val: number) => <span style={{ fontWeight: 600 }}>Rs. {val.toLocaleString()}</span>
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_: unknown, record: PayrollEmployee) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            onClick={() => handleViewPayslip(record)}
            style={{ padding: '0 4px' }}
          >
            Payslip
          </Button>
          {record.paymentStatus !== 'paid' && (
            <Popconfirm title="Mark paid?" onConfirm={() => handleMarkPaid(record)}>
              <Button type="link" size="small" style={{ padding: '0 4px', color: '#52c41a' }}>
                Paid
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const totalPayrollNet = payrollData.reduce((sum, emp) => sum + emp.netSalary, 0);

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>Payroll Management</h2>
          <p style={{ margin: 0, color: '#666', fontSize: '12px' }}>Total Payroll: Rs. {totalPayrollNet.toLocaleString()}</p>
        </div>
        <Space>
          <DatePicker
            picker="month"
            value={month}
            onChange={(date) => date && setMonth(date)}
            format="MMMM YYYY"
          />
          <Button icon={<PrinterOutlined />} onClick={handlePrint}>
            Print All
          </Button>
        </Space>
      </div>

      <Spin spinning={loading} tip="Loading payroll data...">
        <div style={{ minHeight: '200px' }}>
          {clients.length > 0 ? (
            <Collapse accordion expandIconPosition="end" ghost style={{ backgroundColor: 'white', borderRadius: '8px' }}>
              {clients.map(client => {
                const clientGuards = payrollData.filter(emp => String(emp.client_id) === String(client.id));
                const clientNet = clientGuards.reduce((sum, emp) => sum + emp.netSalary, 0);

                return (
                  <Collapse.Panel
                    key={client.id}
                    header={
                      <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: '20px' }}>
                        <Space size="large">
                          <span style={{ fontWeight: 600, fontSize: '16px', color: '#1890ff' }}>{client.name}</span>
                          <Tag color="cyan" icon={<UserOutlined />} style={{ borderRadius: '12px' }}>{clientGuards.length} Guards</Tag>
                        </Space>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '12px', color: '#8c8c8c', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Monthly Net</div>
                          <div style={{ fontWeight: 700, color: '#52c41a', fontSize: '16px' }}>Rs. {clientNet.toLocaleString()}</div>
                        </div>
                      </div>
                    }
                    style={{
                      marginBottom: '16px',
                      border: '1px solid #e8e8e8',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      backgroundColor: '#ffffff',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                    }}
                  >
                    <div style={{ padding: '16px', backgroundColor: '#fafafa' }}>
                      <Table
                        columns={columns}
                        dataSource={clientGuards}
                        rowKey="id"
                        size="small"
                        bordered
                        className="compact-table"
                        pagination={false}
                        scroll={{ x: 'max-content' }}
                        locale={{ emptyText: 'No guards assigned to this client' }}
                      />
                    </div>
                  </Collapse.Panel>
                );
              })}
            </Collapse>
          ) : (
            !loading && (
              <Empty
                description="No clients found. Please add clients in Client Management."
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )
          )}
        </div>
      </Spin>

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
          {clients.map(client => {
            const clientGuards = payrollData.filter(emp => emp.client_id === client.id);
            if (clientGuards.length === 0) return null;
            const clientNet = clientGuards.reduce((sum, emp) => sum + emp.netSalary, 0);

            return (
              <div key={client.id} style={{ marginBottom: '40px', pageBreakAfter: 'always' }}>
                <div style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '2px solid #1890ff', paddingBottom: '10px' }}>
                  <h1 style={{ margin: 0, fontSize: '20px', color: '#1890ff' }}>Flash Security Services</h1>
                  <p style={{ margin: '5px 0', fontSize: '14px', fontWeight: 600 }}>{client.name} - {month.format('MMMM YYYY')}</p>
                  <p style={{ margin: 0, fontSize: '12px' }}>Client Total: Rs. {clientNet.toLocaleString()} | Guards: {clientGuards.length}</p>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f0f0f0' }}>
                      <th style={{ padding: '4px', border: '1px solid #ddd' }}>ID</th>
                      <th style={{ padding: '4px', border: '1px solid #ddd' }}>Name</th>
                      <th style={{ padding: '4px', border: '1px solid #ddd' }}>Site</th>
                      <th style={{ padding: '4px', border: '1px solid #ddd' }}>P</th>
                      <th style={{ padding: '4px', border: '1px solid #ddd' }}>A</th>
                      <th style={{ padding: '4px', border: '1px solid #ddd' }}>Basic</th>
                      <th style={{ padding: '4px', border: '1px solid #ddd' }}>OT</th>
                      <th style={{ padding: '4px', border: '1px solid #ddd' }}>Deduct</th>
                      <th style={{ padding: '4px', border: '1px solid #ddd' }}>Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientGuards.map((emp) => (
                      <tr key={emp.id}>
                        <td style={{ padding: '4px', border: '1px solid #ddd' }}>{emp.employee_id}</td>
                        <td style={{ padding: '4px', border: '1px solid #ddd' }}>{emp.full_name}</td>
                        <td style={{ padding: '4px', border: '1px solid #ddd' }}>{emp.site_name}</td>
                        <td style={{ padding: '4px', border: '1px solid #ddd', textAlign: 'center' }}>{emp.presentDays}</td>
                        <td style={{ padding: '4px', border: '1px solid #ddd', textAlign: 'center' }}>{emp.absentDays}</td>
                        <td style={{ padding: '4px', border: '1px solid #ddd', textAlign: 'right' }}>{emp.basicSalary.toLocaleString()}</td>
                        <td style={{ padding: '4px', border: '1px solid #ddd', textAlign: 'right' }}>{emp.overtimePay.toLocaleString()}</td>
                        <td style={{ padding: '4px', border: '1px solid #ddd', textAlign: 'right' }}>{emp.deductions.toLocaleString()}</td>
                        <td style={{ padding: '4px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 600 }}>{emp.netSalary.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
