'use client';

import { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, Drawer, Form, Input, InputNumber, DatePicker, Select, message, Popconfirm, Card, Row, Col, Statistic, Tabs, Modal } from 'antd';
import { PlusOutlined, DollarOutlined, CheckCircleOutlined, ClockCircleOutlined, WarningOutlined } from '@ant-design/icons';
import { advancesApi, employeeApi } from '@/lib/api';
import dayjs from 'dayjs';

export default function AdvancesPage() {
  const [advances, setAdvances] = useState<Record<string, unknown>[]>([]);
  const [deductions, setDeductions] = useState<Record<string, unknown>[]>([]);
  const [employees, setEmployees] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [summaryModalVisible, setSummaryModalVisible] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Record<string, unknown> | null>(null);
  const [employeeSummary, setEmployeeSummary] = useState<Record<string, unknown> | null>(null);
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    loadData();
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      const res = await employeeApi.getAll();
      if (res.error) {
        console.error('Employee API error:', res.error);
        setEmployees([]);
        return;
      }
      // Backend returns { employees, total }, so access data.employees
      const empData = Array.isArray(res.data)
        ? res.data
        : (res.data as { employees?: Array<Record<string, unknown>> })?.employees || [];
      console.log('Employees loaded:', empData);
      setEmployees(empData);
    } catch (error) {
      console.error('Failed to load employees:', error);
      setEmployees([]);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [advancesRes, deductionsRes] = await Promise.all([
        advancesApi.getAdvances(),
        advancesApi.getDeductions(),
      ]);
      
      // Handle advances - backend may return { data: [...] } or array
      const advancesData = advancesRes.data 
        ? (Array.isArray(advancesRes.data) ? advancesRes.data : [])
        : (Array.isArray(advancesRes) ? advancesRes : []);
      setAdvances(advancesData);
      console.log('Advances loaded:', advancesData);
      
      // Handle deductions - backend may return { data: [...] } or array
      const deductionsData = deductionsRes.data 
        ? (Array.isArray(deductionsRes.data) ? deductionsRes.data : [])
        : (Array.isArray(deductionsRes) ? deductionsRes : []);
      setDeductions(deductionsData);
      console.log('Deductions loaded:', deductionsData);
    } catch (error) {
      console.error('Error loading advances data:', error);
      message.error('Failed to load advances data');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    form.resetFields();
    setDrawerVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await advancesApi.deleteAdvance(id);
      message.success('Advance deleted');
      loadData();
    } catch {
      message.error('Failed to delete advance');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const data = {
        employee_db_id: values.employee_db_id,
        amount: values.amount,
        advance_date: values.date.format('YYYY-MM-DD'),
        note: values.reason,
      };

      await advancesApi.createAdvance(data);
      message.success('Advance created');
      setDrawerVisible(false);
      loadData();
    } catch (error) {
      console.error('Error creating advance:', error);
      message.error('Failed to create advance');
    }
  };

  const handleViewSummary = async (employee: Record<string, unknown>) => {
    try {
      setSelectedEmployee(employee);
      const summary = await advancesApi.getSummary(Number(employee.id));
      setEmployeeSummary(summary as Record<string, unknown>);
      setSummaryModalVisible(true);
    } catch {
      message.error('Failed to load employee summary');
    }
  };

  const advanceColumns = [
    { title: 'Date', dataIndex: 'date', key: 'date', width: 110, render: (d: string) => <span style={{ fontSize: '11px' }}>{dayjs(d).format('DD MMM YYYY')}</span> },
    { title: 'Employee ID', dataIndex: 'employee_id', key: 'employee_id', width: 100, render: (t: string) => <span style={{ fontSize: '11px', fontWeight: 600 }}>{t}</span> },
    { title: 'Employee Name', dataIndex: 'employee_name', key: 'employee_name', width: 150, render: (t: string) => <span style={{ fontSize: '11px' }}>{t}</span> },
    { title: 'Amount', dataIndex: 'amount', key: 'amount', width: 120, render: (v: number) => <span style={{ fontSize: '11px', fontWeight: 600, color: '#ff4d4f' }}>Rs. {v?.toLocaleString()}</span> },
    { title: 'Repayment', dataIndex: 'repayment_months', key: 'repayment_months', width: 100, render: (v: number) => <span style={{ fontSize: '11px' }}>{v} months</span> },
    { title: 'Reason', dataIndex: 'reason', key: 'reason', ellipsis: true, render: (t: string) => <span style={{ fontSize: '11px' }}>{t}</span> },
    { 
      title: 'Status', 
      dataIndex: 'status', 
      key: 'status', 
      width: 100,
      render: (status: string) => {
        const colors: Record<string, string> = { pending: 'orange', approved: 'blue', active: 'green', completed: 'default', rejected: 'red' };
        return <Tag color={colors[status] || 'default'} style={{ fontSize: '11px' }}>{status?.toUpperCase() || 'PENDING'}</Tag>;
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: unknown, record: Record<string, unknown>) => (
        <Space size="small">
          <Popconfirm title="Delete?" onConfirm={() => handleDelete(Number(record.id))} okText="Yes" cancelText="No">
            <Button type="link" danger size="small" style={{ fontSize: '11px', padding: '0 4px' }}>Delete</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const deductionColumns = [
    { title: 'Month', dataIndex: 'month', key: 'month', width: 100, render: (t: string) => <span style={{ fontSize: '11px', fontWeight: 600 }}>{t}</span> },
    { title: 'Employee ID', dataIndex: 'employee_id', key: 'employee_id', width: 100, render: (t: string) => <span style={{ fontSize: '11px' }}>{t}</span> },
    { title: 'Employee Name', dataIndex: 'employee_name', key: 'employee_name', width: 150, render: (t: string) => <span style={{ fontSize: '11px' }}>{t}</span> },
    { title: 'Deduction', dataIndex: 'deduction_amount', key: 'deduction_amount', width: 120, render: (v: number) => <span style={{ fontSize: '11px', color: '#52c41a' }}>Rs. {v?.toLocaleString()}</span> },
    { title: 'Remaining', dataIndex: 'remaining_balance', key: 'remaining_balance', width: 120, render: (v: number) => <span style={{ fontSize: '11px', color: '#ff4d4f' }}>Rs. {v?.toLocaleString()}</span> },
  ];

  const filteredAdvances = advances.filter(adv => 
    String(adv.employee_id || '').toLowerCase().includes(searchText.toLowerCase()) ||
    String(adv.employee_name || '').toLowerCase().includes(searchText.toLowerCase()) ||
    String(adv.reason || '').toLowerCase().includes(searchText.toLowerCase())
  );

  const totalAdvances = filteredAdvances.reduce((sum, adv) => sum + Number(adv.amount || 0), 0);
  const activeAdvances = filteredAdvances.filter(adv => adv.status === 'active' || adv.status === 'approved').length;
  const completedAdvances = filteredAdvances.filter(adv => adv.status === 'completed').length;
  const totalDeductions = deductions.reduce((sum, ded) => sum + Number(ded.deduction_amount || 0), 0);

  // Group advances by employee for summary
  const employeeAdvances = employees.map(emp => {
    const empAdvances = filteredAdvances.filter(adv => adv.employee_db_id === emp.id);
    const totalAmount = empAdvances.reduce((sum, adv) => sum + Number(adv.amount || 0), 0);
    const activeCount = empAdvances.filter(adv => adv.status === 'active' || adv.status === 'approved').length;
    
    return {
      ...emp,
      advanceCount: empAdvances.length,
      totalAdvances: totalAmount,
      activeAdvances: activeCount,
    };
  }).filter(emp => emp.advanceCount > 0);

  const employeeSummaryColumns = [
    { title: 'Employee ID', dataIndex: 'employee_id', key: 'employee_id', width: 100, render: (t: string) => <span style={{ fontSize: '11px', fontWeight: 600 }}>{t}</span> },
    { title: 'Name', dataIndex: 'full_name', key: 'full_name', width: 150, render: (t: string) => <span style={{ fontSize: '11px' }}>{t}</span> },
    { title: 'Total Advances', dataIndex: 'advanceCount', key: 'advanceCount', width: 120, render: (v: number) => <span style={{ fontSize: '11px' }}>{v}</span> },
    { title: 'Total Amount', dataIndex: 'totalAdvances', key: 'totalAdvances', width: 120, render: (v: number) => <span style={{ fontSize: '11px', fontWeight: 600 }}>Rs. {v?.toLocaleString()}</span> },
    { title: 'Active', dataIndex: 'activeAdvances', key: 'activeAdvances', width: 80, render: (v: number) => <span style={{ fontSize: '11px', color: '#52c41a' }}>{v}</span> },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: unknown, record: Record<string, unknown>) => (
        <Button type="link" size="small" onClick={() => handleViewSummary(record)} style={{ fontSize: '11px', padding: '0 4px' }}>View Details</Button>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>Employee Advances</h2>
        <Space>
          <Input.Search placeholder="Search..." value={searchText} onChange={(e) => setSearchText(e.target.value)} style={{ width: 250 }} />
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>Add Advance</Button>
        </Space>
      </div>

      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card>
            <Statistic
              title={<span style={{ fontSize: '12px' }}>Total Advances</span>}
              value={totalAdvances}
              valueStyle={{ fontSize: '20px', color: '#ff4d4f' }}
              prefix={<DollarOutlined />}
              suffix="Rs."
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={<span style={{ fontSize: '12px' }}>Active Advances</span>}
              value={activeAdvances}
              valueStyle={{ fontSize: '20px', color: '#faad14' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={<span style={{ fontSize: '12px' }}>Completed</span>}
              value={completedAdvances}
              valueStyle={{ fontSize: '20px', color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={<span style={{ fontSize: '12px' }}>Total Deductions</span>}
              value={totalDeductions}
              valueStyle={{ fontSize: '20px', color: '#1890ff' }}
              prefix={<WarningOutlined />}
              suffix="Rs."
            />
          </Card>
        </Col>
      </Row>

      <Tabs defaultActiveKey="advances">
        <Tabs.TabPane tab="Advances" key="advances">
          <Table columns={advanceColumns} dataSource={filteredAdvances} rowKey="id" loading={loading} size="small" pagination={{ pageSize: 20 }} style={{ fontSize: '11px' }} />
        </Tabs.TabPane>
        
        <Tabs.TabPane tab="Deductions" key="deductions">
          <Table columns={deductionColumns} dataSource={deductions} rowKey="id" loading={loading} size="small" pagination={{ pageSize: 20 }} style={{ fontSize: '11px' }} />
        </Tabs.TabPane>

        <Tabs.TabPane tab="Employee Summary" key="summary">
          <Table columns={employeeSummaryColumns} dataSource={employeeAdvances} rowKey="id" loading={loading} size="small" pagination={{ pageSize: 20 }} style={{ fontSize: '11px' }} />
        </Tabs.TabPane>
      </Tabs>

      {/* Add Advance Drawer */}
      <Drawer
        title="Add Advance"
        placement="right"
        width={720}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        footer={
          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setDrawerVisible(false)}>Cancel</Button>
              <Button type="primary" onClick={handleSubmit}>Create</Button>
            </Space>
          </div>
        }
      >
        <Form form={form} layout="vertical">
          <div style={{ 
            background: 'linear-gradient(135deg, #ff4d4f 0%, #cf1322 100%)', 
            color: 'white', 
            padding: '12px 16px', 
            marginBottom: '24px', 
            borderRadius: '4px', 
            fontSize: '14px', 
            fontWeight: 600 
          }}>
            Advance Details
          </div>

          <Form.Item name="employee_db_id" label="Employee" rules={[{ required: true }]}>
            <Select
              showSearch
              placeholder="Select employee"
              optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={employees.map((emp) => ({
                value: emp.id,
                label: `${emp.employee_id} - ${emp.full_name}`,
              }))}
            />
          </Form.Item>

          <Form.Item name="date" label="Date" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="amount" label="Amount (Rs.)" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>

          <Form.Item name="reason" label="Reason/Note" rules={[{ required: true }]}>
            <Input.TextArea rows={3} placeholder="Enter reason for advance" />
          </Form.Item>
        </Form>
      </Drawer>

      {/* Employee Summary Modal */}
      <Modal
        title={`Advance Summary - ${selectedEmployee?.full_name}`}
        open={summaryModalVisible}
        onCancel={() => setSummaryModalVisible(false)}
        footer={<Button onClick={() => setSummaryModalVisible(false)}>Close</Button>}
        width={600}
      >
        {employeeSummary && (
          <div>
            <Row gutter={16} style={{ marginBottom: '16px' }}>
              <Col span={12}>
                <Card size="small">
                  <Statistic
                    title="Total Advances"
                    value={Number(employeeSummary.total_advances || 0)}
                    valueStyle={{ fontSize: '18px', color: '#ff4d4f' }}
                    suffix="Rs."
                  />
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small">
                  <Statistic
                    title="Total Deductions"
                    value={Number(employeeSummary.total_deductions || 0)}
                    valueStyle={{ fontSize: '18px', color: '#52c41a' }}
                    suffix="Rs."
                  />
                </Card>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Card size="small">
                  <Statistic
                    title="Remaining Balance"
                    value={Number(employeeSummary.remaining_balance || 0)}
                    valueStyle={{ fontSize: '18px', color: '#faad14', fontWeight: 600 }}
                    suffix="Rs."
                  />
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small">
                  <Statistic
                    title="Active Advances"
                    value={Number(employeeSummary.active_count || 0)}
                    valueStyle={{ fontSize: '18px', color: '#1890ff' }}
                  />
                </Card>
              </Col>
            </Row>
          </div>
        )}
      </Modal>
    </div>
  );
}
