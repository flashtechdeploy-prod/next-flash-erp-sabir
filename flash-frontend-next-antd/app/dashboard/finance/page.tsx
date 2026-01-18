'use client';

import { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, Drawer, Form, Input, InputNumber, DatePicker, Select, message, Popconfirm, Card, Row, Col, Statistic, Tabs } from 'antd';
import { PlusOutlined, DollarOutlined, RiseOutlined, FallOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { expensesApi, financeApi } from '@/lib/api';
import dayjs from 'dayjs';

export default function FinancePage() {
  const [expenses, setExpenses] = useState<Record<string, unknown>[]>([]);
  const [income, setIncome] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Record<string, unknown> | null>(null);
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('expense');
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [expensesRes, journalRes] = await Promise.all([
        expensesApi.getAll(),
        financeApi.getJournalEntries(),
      ]);
      
      // Handle expenses - backend returns { data: [...] }
      const expensesData = expensesRes.data 
        ? (Array.isArray(expensesRes.data) ? expensesRes.data : [])
        : (Array.isArray(expensesRes) ? expensesRes : []);
      setExpenses(expensesData);
      console.log('Expenses loaded:', expensesData);
      
      // Handle journal entries - backend returns { data: [...] }
      const journalData = journalRes.data 
        ? (Array.isArray(journalRes.data) ? journalRes.data : [])
        : (Array.isArray(journalRes) ? journalRes : []);
      const incomeEntries = journalData.filter((entry: Record<string, unknown>) => 
        String(entry.entry_type || '').toLowerCase() === 'income'
      );
      setIncome(incomeEntries);
      console.log('Income loaded:', incomeEntries);
    } catch (error) {
      console.error('Error loading financial data:', error);
      message.error('Failed to load financial data');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = (type: 'income' | 'expense') => {
    setTransactionType(type);
    setEditingRecord(null);
    form.resetFields();
    form.setFieldsValue({ transaction_type: type });
    setDrawerVisible(true);
  };

  const handleEdit = (record: Record<string, unknown>, type: 'income' | 'expense') => {
    setTransactionType(type);
    setEditingRecord(record);
    const dateField = type === 'expense' ? record.expense_date : record.entry_date || record.date;
    form.setFieldsValue({
      date: dateField ? dayjs(String(dateField)) : null,
      description: record.description,
      category: record.category,
      amount: record.amount,
      vendor: record.vendor,
      reference: record.reference,
      notes: record.notes || record.memo,
      payment_method: record.payment_method,
      reference_no: record.reference_no,
      transaction_type: type,
    });
    setDrawerVisible(true);
  };

  const handleDelete = async (id: number, type: 'income' | 'expense') => {
    try {
      if (type === 'expense') {
        await expensesApi.delete(id);
      } else {
        await financeApi.deleteJournalEntry(id);
      }
      message.success('Record deleted');
      loadData();
    } catch {
      message.error('Failed to delete record');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const formattedDate = values.date.format('YYYY-MM-DD');

      if (transactionType === 'expense') {
        const expenseData = {
          expense_date: formattedDate,
          category: values.category,
          description: values.description,
          amount: values.amount,
          vendor: values.vendor || null,
          payment_method: values.payment_method || null,
          reference_no: values.reference_no || null,
        };
        
        if (editingRecord) {
          await expensesApi.update(Number(editingRecord.id), expenseData);
          message.success('Expense updated');
        } else {
          await expensesApi.create(expenseData);
          message.success('Expense created');
        }
      } else {
        const journalData = {
          entry_type: 'income',
          entry_date: formattedDate,
          description: values.description,
          amount: values.amount,
          category: values.category,
          reference: values.reference,
          memo: values.notes,
        };
        
        if (editingRecord) {
          await financeApi.updateJournalEntry(Number(editingRecord.id), journalData);
          message.success('Income updated');
        } else {
          await financeApi.createJournalEntry(journalData);
          message.success('Income created');
        }
      }

      setDrawerVisible(false);
      loadData();
    } catch {
      message.error('Failed to save record');
    }
  };

  const handleApprove = async (id: number) => {
    try {
      await expensesApi.approve(id);
      message.success('Expense approved');
      loadData();
    } catch {
      message.error('Failed to approve expense');
    }
  };

  const handlePay = async (id: number) => {
    try {
      await expensesApi.pay(id);
      message.success('Expense marked as paid');
      loadData();
    } catch {
      message.error('Failed to mark as paid');
    }
  };

  const expenseColumns = [
    { title: 'Date', dataIndex: 'date', key: 'date', width: 110, render: (d: string) => <span style={{ fontSize: '11px' }}>{dayjs(d).format('DD MMM YYYY')}</span> },
    { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true, render: (t: string) => <span style={{ fontSize: '11px' }}>{t}</span> },
    { 
      title: 'Category', 
      dataIndex: 'category', 
      key: 'category', 
      width: 120,
      render: (cat: string) => <Tag color="orange" style={{ fontSize: '11px' }}>{cat}</Tag>
    },
    { title: 'Amount', dataIndex: 'amount', key: 'amount', width: 120, render: (v: number) => <span style={{ fontSize: '11px', color: '#ff4d4f', fontWeight: 600 }}>Rs. {v?.toLocaleString()}</span> },
    { 
      title: 'Status', 
      dataIndex: 'status', 
      key: 'status', 
      width: 100,
      render: (status: string) => {
        const colors: Record<string, string> = { pending: 'orange', approved: 'blue', paid: 'green', rejected: 'red' };
        return <Tag color={colors[status] || 'default'} style={{ fontSize: '11px' }}>{status?.toUpperCase() || 'PENDING'}</Tag>;
      }
    },
    { title: 'Vendor', dataIndex: 'vendor', key: 'vendor', width: 150, render: (t: string) => <span style={{ fontSize: '11px' }}>{t}</span> },
    {
      title: 'Actions',
      key: 'actions',
      width: 250,
      render: (_: unknown, record: Record<string, unknown>) => (
        <Space size="small">
          {record.status === 'pending' && (
            <Button type="link" size="small" onClick={() => handleApprove(Number(record.id))} style={{ fontSize: '11px', padding: '0 4px', color: '#52c41a' }}>Approve</Button>
          )}
          {record.status === 'approved' && (
            <Button type="link" size="small" onClick={() => handlePay(Number(record.id))} style={{ fontSize: '11px', padding: '0 4px', color: '#1890ff' }}>Mark Paid</Button>
          )}
          <Button type="link" size="small" onClick={() => handleEdit(record, 'expense')} style={{ fontSize: '11px', padding: '0 4px' }}>Edit</Button>
          <Popconfirm title="Delete?" onConfirm={() => handleDelete(Number(record.id), 'expense')} okText="Yes" cancelText="No">
            <Button type="link" danger size="small" style={{ fontSize: '11px', padding: '0 4px' }}>Delete</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const incomeColumns = [
    { title: 'Date', dataIndex: 'date', key: 'date', width: 110, render: (d: string) => <span style={{ fontSize: '11px' }}>{dayjs(d).format('DD MMM YYYY')}</span> },
    { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true, render: (t: string) => <span style={{ fontSize: '11px' }}>{t}</span> },
    { 
      title: 'Category', 
      dataIndex: 'category', 
      key: 'category', 
      width: 120,
      render: (cat: string) => <Tag color="green" style={{ fontSize: '11px' }}>{cat}</Tag>
    },
    { title: 'Amount', dataIndex: 'amount', key: 'amount', width: 120, render: (v: number) => <span style={{ fontSize: '11px', color: '#52c41a', fontWeight: 600 }}>Rs. {v?.toLocaleString()}</span> },
    { title: 'Reference', dataIndex: 'reference', key: 'reference', width: 150, render: (t: string) => <span style={{ fontSize: '11px' }}>{t}</span> },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_: unknown, record: Record<string, unknown>) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => handleEdit(record, 'income')} style={{ fontSize: '11px', padding: '0 4px' }}>Edit</Button>
          <Popconfirm title="Delete?" onConfirm={() => handleDelete(Number(record.id), 'income')} okText="Yes" cancelText="No">
            <Button type="link" danger size="small" style={{ fontSize: '11px', padding: '0 4px' }}>Delete</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const filteredExpenses = expenses.filter(exp => 
    String(exp.description || '').toLowerCase().includes(searchText.toLowerCase()) ||
    String(exp.category || '').toLowerCase().includes(searchText.toLowerCase()) ||
    String(exp.vendor || '').toLowerCase().includes(searchText.toLowerCase())
  );

  const filteredIncome = income.filter(inc => 
    String(inc.description || '').toLowerCase().includes(searchText.toLowerCase()) ||
    String(inc.category || '').toLowerCase().includes(searchText.toLowerCase())
  );

  const totalIncome = filteredIncome.reduce((sum, inc) => sum + Number(inc.amount || 0), 0);
  const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
  const netBalance = totalIncome - totalExpenses;
  const paidExpenses = filteredExpenses.filter(exp => exp.status === 'paid').reduce((sum, exp) => sum + Number(exp.amount || 0), 0);

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>Finance Management</h2>
        <Space>
          <Input.Search placeholder="Search..." value={searchText} onChange={(e) => setSearchText(e.target.value)} style={{ width: 250 }} />
        </Space>
      </div>

      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card>
            <Statistic
              title={<span style={{ fontSize: '12px' }}>Total Income</span>}
              value={totalIncome}
              valueStyle={{ fontSize: '20px', color: '#52c41a' }}
              prefix={<RiseOutlined />}
              suffix="Rs."
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={<span style={{ fontSize: '12px' }}>Total Expenses</span>}
              value={totalExpenses}
              valueStyle={{ fontSize: '20px', color: '#ff4d4f' }}
              prefix={<FallOutlined />}
              suffix="Rs."
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={<span style={{ fontSize: '12px' }}>Net Balance</span>}
              value={netBalance}
              valueStyle={{ fontSize: '20px', color: netBalance >= 0 ? '#52c41a' : '#ff4d4f', fontWeight: 600 }}
              prefix={<DollarOutlined />}
              suffix="Rs."
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={<span style={{ fontSize: '12px' }}>Paid Expenses</span>}
              value={paidExpenses}
              valueStyle={{ fontSize: '20px', color: '#1890ff' }}
              prefix={<CheckCircleOutlined />}
              suffix="Rs."
            />
          </Card>
        </Col>
      </Row>

      <Tabs defaultActiveKey="expenses">
        <Tabs.TabPane 
          tab={
            <span>
              <FallOutlined /> Expenses
            </span>
          } 
          key="expenses"
        >
          <div style={{ marginBottom: '16px', textAlign: 'right' }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => handleAdd('expense')}>Add Expense</Button>
          </div>
          <Table columns={expenseColumns} dataSource={filteredExpenses} rowKey="id" loading={loading} size="small" pagination={{ pageSize: 20 }} style={{ fontSize: '11px' }} />
        </Tabs.TabPane>
        
        <Tabs.TabPane 
          tab={
            <span>
              <RiseOutlined /> Income
            </span>
          } 
          key="income"
        >
          <div style={{ marginBottom: '16px', textAlign: 'right' }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => handleAdd('income')}>Add Income</Button>
          </div>
          <Table columns={incomeColumns} dataSource={filteredIncome} rowKey="id" loading={loading} size="small" pagination={{ pageSize: 20 }} style={{ fontSize: '11px' }} />
        </Tabs.TabPane>
      </Tabs>

      <Drawer
        title={editingRecord ? `Edit ${transactionType === 'income' ? 'Income' : 'Expense'}` : `Add ${transactionType === 'income' ? 'Income' : 'Expense'}`}
        placement="right"
        width={720}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        footer={
          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setDrawerVisible(false)}>Cancel</Button>
              <Button type="primary" onClick={handleSubmit}>{editingRecord ? 'Update' : 'Create'}</Button>
            </Space>
          </div>
        }
      >
        <Form form={form} layout="vertical">
          <div style={{ 
            background: transactionType === 'income' 
              ? 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)' 
              : 'linear-gradient(135deg, #ff4d4f 0%, #cf1322 100%)', 
            color: 'white', 
            padding: '12px 16px', 
            marginBottom: '24px', 
            borderRadius: '4px', 
            fontSize: '14px', 
            fontWeight: 600 
          }}>
            {transactionType === 'income' ? 'Income' : 'Expense'} Details
          </div>

          <Form.Item name="transaction_type" hidden>
            <Input />
          </Form.Item>

          <Form.Item name="date" label="Date" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="description" label="Description" rules={[{ required: true }]}>
            <Input.TextArea rows={3} placeholder="Enter description" />
          </Form.Item>

          <Form.Item name="category" label="Category" rules={[{ required: true }]}>
            <Select placeholder="Select category">
              {transactionType === 'expense' ? (
                <>
                  <Select.Option value="Salaries">Salaries</Select.Option>
                  <Select.Option value="Utilities">Utilities</Select.Option>
                  <Select.Option value="Rent">Rent</Select.Option>
                  <Select.Option value="Fuel">Fuel</Select.Option>
                  <Select.Option value="Maintenance">Maintenance</Select.Option>
                  <Select.Option value="Supplies">Supplies</Select.Option>
                  <Select.Option value="Insurance">Insurance</Select.Option>
                  <Select.Option value="Other">Other</Select.Option>
                </>
              ) : (
                <>
                  <Select.Option value="Service Revenue">Service Revenue</Select.Option>
                  <Select.Option value="Contract Revenue">Contract Revenue</Select.Option>
                  <Select.Option value="Other Income">Other Income</Select.Option>
                </>
              )}
            </Select>
          </Form.Item>

          <Form.Item name="amount" label="Amount (Rs.)" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>

          {transactionType === 'expense' ? (
            <>
              <Form.Item name="vendor" label="Vendor">
                <Input placeholder="Vendor/Supplier name" />
              </Form.Item>
              
              <Form.Item name="status" label="Status" initialValue="pending">
                <Select>
                  <Select.Option value="pending">Pending</Select.Option>
                  <Select.Option value="approved">Approved</Select.Option>
                  <Select.Option value="paid">Paid</Select.Option>
                  <Select.Option value="rejected">Rejected</Select.Option>
                </Select>
              </Form.Item>
            </>
          ) : (
            <Form.Item name="reference" label="Reference">
              <Input placeholder="Invoice/Reference number" />
            </Form.Item>
          )}

          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} placeholder="Additional notes" />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}
