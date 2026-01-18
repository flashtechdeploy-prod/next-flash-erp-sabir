'use client';

import { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, Drawer, Form, Input, InputNumber, Select, message, Popconfirm, Card, Row, Col, Statistic, Tabs } from 'antd';
import { PlusOutlined, InboxOutlined, WarningOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { generalInventoryApi, employeeApi } from '@/lib/api';

export default function GeneralInventoryPage() {
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [transactions, setTransactions] = useState<Record<string, unknown>[]>([]);
  const [employees, setEmployees] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [itemDrawerVisible, setItemDrawerVisible] = useState(false);
  const [transactionDrawerVisible, setTransactionDrawerVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<Record<string, unknown> | null>(null);
  const [selectedItem, setSelectedItem] = useState<Record<string, unknown> | null>(null);
  const [form] = Form.useForm();
  const [transactionForm] = Form.useForm();
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    loadData();
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      const response = await employeeApi.getAll();
      console.log('Employees response:', response);
      const employeeList = response.data ? (Array.isArray(response.data) ? response.data : []) : [];
      setEmployees(employeeList);
    } catch {
      console.error('Failed to load employees');
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [itemsResponse, transResponse] = await Promise.all([
        generalInventoryApi.getItems(),
        generalInventoryApi.getTransactions(),
      ]);
      
      console.log('Items response:', itemsResponse);
      console.log('Transactions response:', transResponse);
      
      const itemsList = itemsResponse.data ? (Array.isArray(itemsResponse.data) ? itemsResponse.data : []) : [];
      const transList = transResponse.data ? (Array.isArray(transResponse.data) ? transResponse.data : []) : [];
      
      setItems(itemsList);
      setTransactions(transList);
    } catch {
      message.error('Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    setEditingItem(null);
    form.resetFields();
    setItemDrawerVisible(true);
  };

  const handleEditItem = (record: Record<string, unknown>) => {
    setEditingItem(record);
    form.setFieldsValue(record);
    setItemDrawerVisible(true);
  };

  const handleDeleteItem = async (itemCode: string) => {
    try {
      await generalInventoryApi.deleteItem(itemCode);
      message.success('Item deleted');
      loadData();
    } catch {
      message.error('Failed to delete item');
    }
  };

  const handleSubmitItem = async () => {
    try {
      const values = await form.validateFields();
      // Map form field names to API field names
      const data = {
        item_code: values.item_code,
        name: values.name,  // Backend expects 'name', not 'item_name'
        category: values.category,
        unit_name: values.unit_name,  // Backend expects 'unit_name', not 'unit'
        quantity_on_hand: values.quantity_on_hand,
        min_quantity: values.min_quantity,
        description: values.description,
      };

      if (editingItem) {
        await generalInventoryApi.updateItem(String(editingItem.item_code), data);
        message.success('Item updated');
      } else {
        await generalInventoryApi.createItem(data);
        message.success('Item created');
      }
      setItemDrawerVisible(false);
      loadData();
    } catch (error) {
      console.error('Save error:', error);
      message.error('Failed to save item');
    }
  };

  const handleTransaction = (item: Record<string, unknown>, type: string) => {
    setSelectedItem(item);
    transactionForm.resetFields();
    transactionForm.setFieldsValue({ transaction_type: type });
    setTransactionDrawerVisible(true);
  };

  const handleSubmitTransaction = async () => {
    try {
      const values = await transactionForm.validateFields();
      const itemCode = String(selectedItem?.item_code);
      
      switch (values.transaction_type) {
        case 'issue':
          await generalInventoryApi.issueItem(itemCode, values);
          break;
        case 'return':
          await generalInventoryApi.returnItem(itemCode, values);
          break;
        case 'lost':
          await generalInventoryApi.lostItem(itemCode, values);
          break;
        case 'damaged':
          await generalInventoryApi.damagedItem(itemCode, values);
          break;
        case 'adjust':
          await generalInventoryApi.adjustItem(itemCode, values);
          break;
      }
      
      message.success('Transaction recorded');
      setTransactionDrawerVisible(false);
      loadData();
    } catch {
      message.error('Failed to record transaction');
    }
  };

  const itemColumns = [
    { title: 'Code', dataIndex: 'item_code', key: 'item_code', width: 100, render: (t: string) => <span style={{ fontSize: '11px', fontWeight: 600 }}>{t}</span> },
    { title: 'Name', dataIndex: 'name', key: 'name', width: 200, render: (t: string) => <span style={{ fontSize: '11px' }}>{t}</span> },
    { title: 'Category', dataIndex: 'category', key: 'category', width: 120, render: (t: string) => <Tag color="blue" style={{ fontSize: '11px' }}>{t}</Tag> },
    { title: 'Stock', dataIndex: 'quantity_on_hand', key: 'quantity_on_hand', width: 80, render: (v: number) => <span style={{ fontSize: '11px', fontWeight: 600 }}>{v}</span> },
    { title: 'Min Stock', dataIndex: 'min_quantity', key: 'min_quantity', width: 90, render: (v: number) => <span style={{ fontSize: '11px' }}>{v}</span> },
    { 
      title: 'Status', 
      key: 'status', 
      width: 100,
      render: (_: unknown, record: Record<string, unknown>) => {
        const stock = Number(record.quantity_on_hand || 0);
        const minStock = Number(record.min_quantity || 0);
        if (stock === 0) return <Tag color="red" style={{ fontSize: '11px' }}>OUT OF STOCK</Tag>;
        if (stock <= minStock) return <Tag color="orange" style={{ fontSize: '11px' }}>LOW STOCK</Tag>;
        return <Tag color="green" style={{ fontSize: '11px' }}>IN STOCK</Tag>;
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 280,
      render: (_: unknown, record: Record<string, unknown>) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => handleTransaction(record, 'issue')} style={{ fontSize: '11px', padding: '0 4px' }}>Issue</Button>
          <Button type="link" size="small" onClick={() => handleTransaction(record, 'return')} style={{ fontSize: '11px', padding: '0 4px' }}>Return</Button>
          <Button type="link" size="small" onClick={() => handleEditItem(record)} style={{ fontSize: '11px', padding: '0 4px' }}>Edit</Button>
          <Popconfirm title="Delete?" onConfirm={() => handleDeleteItem(String(record.item_code))} okText="Yes" cancelText="No">
            <Button type="link" danger size="small" style={{ fontSize: '11px', padding: '0 4px' }}>Delete</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const transactionColumns = [
    { title: 'Date', dataIndex: 'transaction_date', key: 'transaction_date', width: 110, render: (t: string) => <span style={{ fontSize: '11px' }}>{t}</span> },
    { title: 'Item', dataIndex: 'item_code', key: 'item_code', width: 100, render: (t: string) => <span style={{ fontSize: '11px', fontWeight: 600 }}>{t}</span> },
    { 
      title: 'Type', 
      dataIndex: 'transaction_type', 
      key: 'transaction_type', 
      width: 100,
      render: (type: string) => {
        const colors: Record<string, string> = { issue: 'blue', return: 'green', lost: 'red', damaged: 'orange', adjust: 'purple' };
        return <Tag color={colors[type] || 'default'} style={{ fontSize: '11px' }}>{type?.toUpperCase()}</Tag>;
      }
    },
    { title: 'Quantity', dataIndex: 'quantity', key: 'quantity', width: 80, render: (v: number) => <span style={{ fontSize: '11px' }}>{v}</span> },
    { title: 'Employee', dataIndex: 'employee_id', key: 'employee_id', width: 100, render: (t: string) => <span style={{ fontSize: '11px' }}>{t}</span> },
    { title: 'Notes', dataIndex: 'notes', key: 'notes', ellipsis: true, render: (t: string) => <span style={{ fontSize: '11px' }}>{t}</span> },
  ];

  const filteredItems = items.filter(item => 
    String(item.item_code || '').toLowerCase().includes(searchText.toLowerCase()) ||
    String(item.item_name || '').toLowerCase().includes(searchText.toLowerCase())
  );

  const totalItems = filteredItems.length;
  const totalStock = filteredItems.reduce((sum, item) => sum + Number(item.quantity_in_stock || 0), 0);
  const lowStockCount = filteredItems.filter(item => Number(item.quantity_in_stock || 0) <= Number(item.min_stock_level || 0)).length;
  const outOfStockCount = filteredItems.filter(item => Number(item.quantity_in_stock || 0) === 0).length;

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>General Inventory</h2>
        <Space>
          <Input.Search placeholder="Search items..." value={searchText} onChange={(e) => setSearchText(e.target.value)} style={{ width: 250 }} />
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAddItem}>Add Item</Button>
        </Space>
      </div>

      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card><Statistic title={<span style={{ fontSize: '12px' }}>Total Items</span>} value={totalItems} valueStyle={{ fontSize: '20px' }} prefix={<InboxOutlined />} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title={<span style={{ fontSize: '12px' }}>Total Stock</span>} value={totalStock} valueStyle={{ fontSize: '20px', color: '#1890ff' }} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title={<span style={{ fontSize: '12px' }}>Low Stock</span>} value={lowStockCount} valueStyle={{ fontSize: '20px', color: '#faad14' }} prefix={<WarningOutlined />} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title={<span style={{ fontSize: '12px' }}>Out of Stock</span>} value={outOfStockCount} valueStyle={{ fontSize: '20px', color: '#ff4d4f' }} /></Card>
        </Col>
      </Row>

      <Tabs defaultActiveKey="items">
        <Tabs.TabPane tab="Items" key="items">
          <Table columns={itemColumns} dataSource={filteredItems} rowKey="item_code" loading={loading} size="small" pagination={{ pageSize: 20 }} style={{ fontSize: '11px' }} />
        </Tabs.TabPane>
        <Tabs.TabPane tab="Transactions" key="transactions">
          <Table columns={transactionColumns} dataSource={transactions} rowKey="id" loading={loading} size="small" pagination={{ pageSize: 20 }} style={{ fontSize: '11px' }} />
        </Tabs.TabPane>
      </Tabs>

      {/* Item Drawer */}
      <Drawer
        title={editingItem ? 'Edit Item' : 'Add Item'}
        placement="right"
        width={720}
        onClose={() => setItemDrawerVisible(false)}
        open={itemDrawerVisible}
        footer={<div style={{ textAlign: 'right' }}><Space><Button onClick={() => setItemDrawerVisible(false)}>Cancel</Button><Button type="primary" onClick={handleSubmitItem}>{editingItem ? 'Update' : 'Create'}</Button></Space></div>}
      >
        <Form form={form} layout="vertical">
          <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: '12px 16px', marginBottom: '24px', borderRadius: '4px', fontSize: '14px', fontWeight: 600 }}>Item Details</div>
          <Form.Item name="item_code" label="Item Code" rules={[{ required: true, message: 'Please enter item code' }]}><Input placeholder="Enter item code" disabled={!!editingItem} /></Form.Item>
          <Form.Item name="name" label="Item Name" rules={[{ required: true, message: 'Please enter item name' }]}><Input placeholder="Enter item name" /></Form.Item>
          <Form.Item name="category" label="Category" rules={[{ required: true, message: 'Please select category' }]}>
            <Select placeholder="Select category">
              <Select.Option value="Uniforms">Uniforms</Select.Option>
              <Select.Option value="Equipment">Equipment</Select.Option>
              <Select.Option value="Stationery">Stationery</Select.Option>
              <Select.Option value="Tools">Tools</Select.Option>
              <Select.Option value="Safety Gear">Safety Gear</Select.Option>
              <Select.Option value="Other">Other</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="unit_name" label="Unit Name" rules={[{ required: true, message: 'Please enter unit name' }]}><Input placeholder="e.g., pcs, kg, box" /></Form.Item>
          <Form.Item name="quantity_on_hand" label="Quantity in Stock" rules={[{ required: true, message: 'Please enter quantity' }]}><InputNumber style={{ width: '100%' }} min={0} /></Form.Item>
          <Form.Item name="min_quantity" label="Minimum Stock Level"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item>
          <Form.Item name="description" label="Description"><Input.TextArea rows={3} placeholder="Item description" /></Form.Item>
        </Form>
      </Drawer>

      {/* Transaction Drawer */}
      <Drawer
        title="Record Transaction"
        placement="right"
        width={720}
        onClose={() => setTransactionDrawerVisible(false)}
        open={transactionDrawerVisible}
        footer={<div style={{ textAlign: 'right' }}><Space><Button onClick={() => setTransactionDrawerVisible(false)}>Cancel</Button><Button type="primary" onClick={handleSubmitTransaction}>Submit</Button></Space></div>}
      >
        <Form form={transactionForm} layout="vertical">
          <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: '12px 16px', marginBottom: '24px', borderRadius: '4px', fontSize: '14px', fontWeight: 600 }}>Transaction Details</div>
          <Form.Item label="Item"><Input value={`${selectedItem?.item_code} - ${selectedItem?.name}`} disabled /></Form.Item>
          <Form.Item name="transaction_type" label="Transaction Type" rules={[{ required: true }]}>
            <Select placeholder="Select type">
              <Select.Option value="issue">Issue</Select.Option>
              <Select.Option value="return">Return</Select.Option>
              <Select.Option value="lost">Lost</Select.Option>
              <Select.Option value="damaged">Damaged</Select.Option>
              <Select.Option value="adjust">Adjust</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="quantity" label="Quantity" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} min={1} /></Form.Item>
          <Form.Item name="employee_id" label="Employee">
            <Select showSearch placeholder="Select employee" options={employees.map((emp) => ({ value: emp.employee_id, label: `${emp.employee_id} - ${emp.full_name}` }))} />
          </Form.Item>
          <Form.Item name="notes" label="Notes"><Input.TextArea rows={3} placeholder="Additional notes" /></Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}
