'use client';

import { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, Drawer, Form, Input, Select, message, Popconfirm, Card, Row, Col, Statistic, Tabs, Modal } from 'antd';
import { PlusOutlined, SafetyOutlined, LockOutlined, CheckCircleOutlined, CloseCircleOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { restrictedInventoryApi, employeeApi } from '@/lib/api';

export default function RestrictedInventoryPage() {
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [serialUnits, setSerialUnits] = useState<Record<string, unknown>[]>([]);
  const [transactions, setTransactions] = useState<Record<string, unknown>[]>([]);
  const [employees, setEmployees] = useState<Record<string, unknown>[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [itemDrawerVisible, setItemDrawerVisible] = useState(false);
  const [serialDrawerVisible, setSerialDrawerVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<Record<string, unknown> | null>(null);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<Record<string, unknown> | null>(null);
  const [form] = Form.useForm();
  const [serialForm] = Form.useForm();
  const [issueForm] = Form.useForm();
  const [categoryForm] = Form.useForm();
  const [searchText, setSearchText] = useState('');
  const [serialModalVisible, setSerialModalVisible] = useState(false);
  const [issueModalVisible, setIssueModalVisible] = useState(false);
  const [selectedSerialUnitId, setSelectedSerialUnitId] = useState<number | null>(null);

  useEffect(() => {
    loadData();
    loadEmployees();
    loadCategories();
  }, []);

  const loadEmployees = async () => {
    try {
      const response = await employeeApi.getAll();
      console.log('=== EMPLOYEES API RESPONSE ===');
      console.log('Full response:', response);
      let empData: Record<string, unknown>[] = [];
      
      if (Array.isArray(response)) {
        empData = response;
      } else if (response?.data) {
        if (Array.isArray(response.data)) {
          empData = response.data;
        } else if (Array.isArray(response.data.employees)) {
          empData = response.data.employees;
        }
      }
      
      console.log('✅ Loaded employees:', empData);
      setEmployees(empData);
    } catch (error) {
      console.error('❌ Employee API error:', error);
      setEmployees([]);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await restrictedInventoryApi.getCategories();
      console.log('Categories response:', response);
      const categoryList = response.data ? (Array.isArray(response.data) ? response.data : []) : [];
      console.log('Loaded categories:', categoryList);
      setCategories(categoryList);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [itemsResponse, transResponse] = await Promise.all([
        restrictedInventoryApi.getItems(),
        restrictedInventoryApi.getTransactions(),
      ]);
      
      console.log('=== RESTRICTED INVENTORY ITEMS API RESPONSE ===');
      console.log('Full response:', itemsResponse);
      const itemsData = itemsResponse?.data || (Array.isArray(itemsResponse) ? itemsResponse : []);
      console.log('✅ Loaded items:', itemsData);
      setItems(itemsData);
      
      console.log('=== RESTRICTED INVENTORY TRANSACTIONS API RESPONSE ===');
      console.log('Full response:', transResponse);
      const transData = transResponse?.data || (Array.isArray(transResponse) ? transResponse : []);
      console.log('✅ Loaded transactions:', transData);
      setTransactions(transData);
    } catch (error) {
      console.error('❌ Inventory API error:', error);
      message.error('Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  };

  const loadSerialUnits = async (itemCode: string) => {
    try {
      const response = await restrictedInventoryApi.getSerialUnits(itemCode);
      console.log('=== SERIAL UNITS API RESPONSE ===');
      console.log('Full response:', response);
      const serialData = response?.data || (Array.isArray(response) ? response : []);
      console.log('✅ Loaded serial units:', serialData);
      setSerialUnits(serialData);
    } catch (error) {
      console.error('❌ Serial units API error:', error);
      message.error('Failed to load serial units');
    }
  };

  const handleAddItem = () => {
    setEditingItem(null);
    form.resetFields();
    setItemDrawerVisible(true);
  };

  const handleEditItem = (record: Record<string, unknown>) => {
    setEditingItem(record);
    form.setFieldsValue({
      item_code: record.item_code,
      item_name: record.name, // Map backend 'name' → form field 'item_name'
      item_type: record.category, // Map backend 'category' → form field 'item_type'
      unit_name: record.unit_name,
      description: record.description,
    });
    setItemDrawerVisible(true);
  };

  const handleDeleteItem = async (itemCode: string) => {
    try {
      await restrictedInventoryApi.deleteItem(itemCode);
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
      const item_name = values.item_name;
      const item_type = values.item_type;
      const unit_name = values.unit_name || 'unit';
      
      if (!item_name || !item_type) {
        message.error('Item name and category are required');
        return;
      }
      
      const data: any = {
        name: String(item_name),
        category: String(item_type),
        unit_name: String(unit_name),
        description: values.description || undefined,
        is_serial_tracked: true,
      };
      
      console.log('📤 Submitting item data:', data);
      
      if (editingItem) {
        // For edit, include item_code to update the correct record
        await restrictedInventoryApi.updateItem(String(editingItem.item_code), data);
        message.success('Item updated');
      } else {
        // For create, don't send item_code - let backend auto-generate it
        await restrictedInventoryApi.createItem(data);
        message.success('Item created');
      }
      setItemDrawerVisible(false);
      form.resetFields();
      loadData();
    } catch (error) {
      console.error('❌ Error saving item:', error);
      message.error('Failed to save item');
    }
  };

  const handleViewSerials = async (item: Record<string, unknown>) => {
    setSelectedItem(item);
    await loadSerialUnits(String(item.item_code));
    setSerialDrawerVisible(true);
  };

  const handleAddSerial = () => {
    serialForm.resetFields();
    serialForm.setFieldsValue({ status: 'in_stock' });
    setSerialModalVisible(true);
  };

  const handleSubmitSerial = async () => {
    try {
      const values = await serialForm.validateFields();
      const data = {
        serial_number: String(values.serial_number),
        status: String(values.status || 'in_stock'),
      };
      
      console.log('📤 Adding serial unit:', data);
      
      await restrictedInventoryApi.createSerialUnit(String(selectedItem?.item_code), data);
      message.success('Serial unit added');
      serialForm.resetFields();
      setSerialModalVisible(false);
      loadSerialUnits(String(selectedItem?.item_code));
    } catch (error) {
      console.error('❌ Failed to add serial unit:', error);
      message.error('Failed to add serial unit');
    }
  };

  const handleIssueSerial = (serialUnitId: number) => {
    issueForm.resetFields();
    setSelectedSerialUnitId(serialUnitId);
    setIssueModalVisible(true);
  };

  const handleSubmitIssue = async () => {
    try {
      const values = await issueForm.validateFields();
      const employeeId = String(values.employee_id);
      
      console.log('📤 Issuing serial unit to employee:', employeeId);
      
      await restrictedInventoryApi.issueSerial(selectedSerialUnitId!, employeeId);
      message.success('Serial unit issued');
      issueForm.resetFields();
      setIssueModalVisible(false);
      loadSerialUnits(String(selectedItem?.item_code));
    } catch (error) {
      console.error('❌ Failed to issue serial unit:', error);
      message.error('Failed to issue serial unit');
    }
  };

  const handleReturnSerial = async (serialUnitId: number) => {
    try {
      await restrictedInventoryApi.returnSerial(serialUnitId);
      message.success('Serial unit returned');
      loadSerialUnits(String(selectedItem?.item_code));
    } catch {
      message.error('Failed to return serial unit');
    }
  };

  const handleAddCategory = () => {
    setEditingCategory(null);
    categoryForm.resetFields();
    setCategoryModalVisible(true);
  };

  const handleEditCategory = (category: string) => {
    setEditingCategory(category);
    categoryForm.setFieldsValue({ category });
    setCategoryModalVisible(true);
  };

  const handleSubmitCategory = async () => {
    try {
      const values = await categoryForm.validateFields();
      if (editingCategory) {
        await restrictedInventoryApi.updateCategory(editingCategory, values.category);
        message.success('Category updated');
      } else {
        await restrictedInventoryApi.createCategory(values.category);
        message.success('Category added');
      }
      setCategoryModalVisible(false);
      categoryForm.resetFields();
      setEditingCategory(null);
      loadCategories();
    } catch (error) {
      console.error('Save error:', error);
      message.error('Failed to save category');
    }
  };

  const handleDeleteCategory = async (category: string) => {
    try {
      await restrictedInventoryApi.deleteCategory(category);
      message.success('Category deleted');
      loadCategories();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to delete category');
    }
  };

  const itemColumns = [
    { title: 'Code', dataIndex: 'item_code', key: 'item_code', width: 100, render: (t: string) => <span style={{ fontSize: '11px', fontWeight: 600 }}>{t}</span> },
    { title: 'Name', dataIndex: 'name', key: 'name', width: 200, render: (t: string) => <span style={{ fontSize: '11px' }}>{t}</span> },
    { 
      title: 'Category', 
      dataIndex: 'category', 
      key: 'category', 
      width: 120,
      render: (category: string) => {
        const colors: Record<string, string> = { weapon: 'red', ammunition: 'orange', equipment: 'blue' };
        return <Tag color={colors[category] || 'default'} style={{ fontSize: '11px' }}>{category?.toUpperCase()}</Tag>;
      }
    },
    { title: 'Total Units', dataIndex: 'serial_total', key: 'serial_total', width: 100, render: (v: number) => <span style={{ fontSize: '11px', fontWeight: 600 }}>{v || 0}</span> },
    { title: 'Available', dataIndex: 'serial_in_stock', key: 'serial_in_stock', width: 100, render: (v: number) => <span style={{ fontSize: '11px', color: '#52c41a' }}>{v || 0}</span> },
    { title: 'Issued', dataIndex: 'issued_units', key: 'issued_units', width: 100, render: (v: number) => <span style={{ fontSize: '11px', color: '#1890ff' }}>{(Number(v) || 0) > 0 ? v : 0}</span> },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (_: unknown, record: Record<string, unknown>) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => handleViewSerials(record)} style={{ fontSize: '11px', padding: '0 4px' }}>View Units</Button>
          <Button type="link" size="small" onClick={() => handleEditItem(record)} style={{ fontSize: '11px', padding: '0 4px' }}>Edit</Button>
          <Popconfirm title="Delete?" onConfirm={() => handleDeleteItem(String(record.item_code))} okText="Yes" cancelText="No">
            <Button type="link" danger size="small" style={{ fontSize: '11px', padding: '0 4px' }}>Delete</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const serialColumns = [
    { title: 'Serial Number', dataIndex: 'serial_number', key: 'serial_number', width: 150, render: (t: string) => <span style={{ fontSize: '11px', fontWeight: 600 }}>{t}</span> },
    { 
      title: 'Status', 
      dataIndex: 'status', 
      key: 'status', 
      width: 120,
      render: (status: string) => {
        const colors: Record<string, string> = { in_stock: 'green', issued: 'blue', maintenance: 'orange', lost: 'red' };
        return <Tag color={colors[status] || 'default'} style={{ fontSize: '11px' }}>{status?.toUpperCase()}</Tag>;
      }
    },
    { title: 'Issued To', dataIndex: 'issued_to_employee_id', key: 'issued_to_employee_id', width: 120, render: (t: string) => <span style={{ fontSize: '11px' }}>{t || '-'}</span> },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_: unknown, record: Record<string, unknown>) => (
        <Space size="small">
          {record.status === 'in_stock' && (
            <Button type="link" size="small" onClick={() => handleIssueSerial(Number(record.id))} style={{ fontSize: '11px', padding: '0 4px' }}>Issue</Button>
          )}
          {record.status === 'issued' && (
            <Popconfirm title="Return this unit?" onConfirm={() => handleReturnSerial(Number(record.id))} okText="Yes" cancelText="No">
              <Button type="link" size="small" style={{ fontSize: '11px', padding: '0 4px' }}>Return</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const transactionColumns = [
    { title: 'Date', dataIndex: 'transaction_date', key: 'transaction_date', width: 110, render: (t: string) => <span style={{ fontSize: '11px' }}>{t}</span> },
    { title: 'Item', dataIndex: 'item_code', key: 'item_code', width: 100, render: (t: string) => <span style={{ fontSize: '11px', fontWeight: 600 }}>{t}</span> },
    { title: 'Serial', dataIndex: 'serial_number', key: 'serial_number', width: 120, render: (t: string) => <span style={{ fontSize: '11px' }}>{t}</span> },
    { 
      title: 'Type', 
      dataIndex: 'transaction_type', 
      key: 'transaction_type', 
      width: 100,
      render: (type: string) => {
        const colors: Record<string, string> = { issue: 'blue', return: 'green' };
        return <Tag color={colors[type] || 'default'} style={{ fontSize: '11px' }}>{type?.toUpperCase()}</Tag>;
      }
    },
    { title: 'Employee', dataIndex: 'employee_id', key: 'employee_id', width: 100, render: (t: string) => <span style={{ fontSize: '11px' }}>{t}</span> },
    { title: 'Notes', dataIndex: 'notes', key: 'notes', ellipsis: true, render: (t: string) => <span style={{ fontSize: '11px' }}>{t}</span> },
  ];

  const filteredItems = items.filter(item => 
    String(item.item_code || '').toLowerCase().includes(searchText.toLowerCase()) ||
    String(item.name || '').toLowerCase().includes(searchText.toLowerCase())
  );

  const totalItems = filteredItems.length;
  const totalUnits = filteredItems.reduce((sum, item) => sum + Number(item.serial_total || 0), 0);
  const availableUnits = filteredItems.reduce((sum, item) => sum + Number(item.serial_in_stock || 0), 0);
  const issuedUnits = filteredItems.reduce((sum, item) => sum + Number(item.issued_units || 0), 0);

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>Restricted Inventory</h2>
        <Space>
          <Input.Search placeholder="Search items..." value={searchText} onChange={(e) => setSearchText(e.target.value)} style={{ width: 250 }} />
          <Button onClick={() => setCategoryModalVisible(true)}>Manage Categories</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAddItem}>Add Item</Button>
        </Space>
      </div>

      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card><Statistic title={<span style={{ fontSize: '12px' }}>Total Items</span>} value={totalItems} valueStyle={{ fontSize: '20px' }} prefix={<SafetyOutlined />} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title={<span style={{ fontSize: '12px' }}>Total Units</span>} value={totalUnits} valueStyle={{ fontSize: '20px', color: '#1890ff' }} prefix={<LockOutlined />} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title={<span style={{ fontSize: '12px' }}>Available</span>} value={availableUnits} valueStyle={{ fontSize: '20px', color: '#52c41a' }} prefix={<CheckCircleOutlined />} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title={<span style={{ fontSize: '12px' }}>Issued</span>} value={issuedUnits} valueStyle={{ fontSize: '20px', color: '#faad14' }} prefix={<CloseCircleOutlined />} /></Card>
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
          <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: '12px 16px', marginBottom: '24px', borderRadius: '4px', fontSize: '14px', fontWeight: 600 }}>Restricted Item Details</div>
          <Form.Item name="item_code" label="Item Code"><Input placeholder={editingItem ? "Cannot edit code" : "Auto-generated (FRI-##)"} disabled /></Form.Item>
          <Form.Item name="item_name" label="Item Name" rules={[{ required: true, message: 'Item name is required' }]}><Input placeholder="Enter item name" /></Form.Item>
          <Form.Item name="item_type" label="Category" rules={[{ required: true, message: 'Category is required' }]}>
            <Select placeholder="Select category" options={categories.map(cat => ({ label: cat, value: cat }))} />
          </Form.Item>
          <Form.Item name="unit_name" label="Unit" initialValue="unit"><Input placeholder="Unit name (e.g., piece, box)" /></Form.Item>
          <Form.Item name="description" label="Description"><Input.TextArea rows={3} placeholder="Item description" /></Form.Item>
        </Form>
      </Drawer>

      {/* Serial Units Drawer */}
      <Drawer
        title={`Serial Units - ${selectedItem?.name || 'Unknown'}`}
        placement="right"
        width={900}
        onClose={() => setSerialDrawerVisible(false)}
        open={serialDrawerVisible}
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={handleAddSerial}>Add Serial Unit</Button>}
      >
        <Table columns={serialColumns} dataSource={serialUnits} rowKey="id" size="small" pagination={{ pageSize: 20 }} style={{ fontSize: '11px' }} />
      </Drawer>

      {/* Add Serial Unit Modal */}
      <Modal
        title="Add Serial Unit"
        open={serialModalVisible}
        onOk={handleSubmitSerial}
        onCancel={() => setSerialModalVisible(false)}
        okText="Add"
      >
        <Form form={serialForm} layout="vertical">
          <Form.Item name="serial_number" label="Serial Number" rules={[{ required: true, message: 'Serial number is required' }]}>
            <Input placeholder="Enter serial number" />
          </Form.Item>
          <Form.Item name="status" label="Status" initialValue="in_stock">
            <Select>
              <Select.Option value="in_stock">In Stock</Select.Option>
              <Select.Option value="issued">Issued</Select.Option>
              <Select.Option value="maintenance">Maintenance</Select.Option>
              <Select.Option value="lost">Lost</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Issue Serial Unit Modal */}
      <Modal
        title="Issue Serial Unit"
        open={issueModalVisible}
        onOk={handleSubmitIssue}
        onCancel={() => setIssueModalVisible(false)}
        okText="Issue"
      >
        <Form form={issueForm} layout="vertical">
          <Form.Item name="employee_id" label="Employee" rules={[{ required: true, message: 'Employee is required' }]}>
            <Select 
              showSearch 
              placeholder="Select employee" 
              notFoundContent={employees.length === 0 ? 'No employees found' : undefined}
              options={Array.isArray(employees) ? employees.map((emp) => ({ 
                value: emp.employee_id, 
                label: `${emp.employee_id} - ${emp.full_name || emp.name || 'Unknown'}` 
              })) : []} 
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Category Management Modal */}
      <Modal
        title="Manage Categories"
        open={categoryModalVisible}
        onCancel={() => {
          setCategoryModalVisible(false);
          categoryForm.resetFields();
          setEditingCategory(null);
        }}
        onOk={handleSubmitCategory}
        okText={editingCategory ? 'Update' : 'Add'}
        width={600}
      >
        {editingCategory ? (
          <Form form={categoryForm} layout="vertical">
            <Form.Item name="category" label="Category Name" rules={[{ required: true, message: 'Please enter category name' }]}>
              <Input placeholder="Enter category name" />
            </Form.Item>
          </Form>
        ) : (
          <>
            <Form form={categoryForm} layout="vertical" style={{ marginBottom: 24 }}>
              <Form.Item name="category" label="New Category Name" rules={[{ required: true, message: 'Please enter category name' }]}>
                <Input placeholder="Enter category name" />
              </Form.Item>
            </Form>
            <div style={{ marginTop: '24px' }}>
              <h4 style={{ marginBottom: '12px', fontWeight: 600 }}>Existing Categories:</h4>
              <Space wrap>
                {categories.length > 0 ? (
                  categories.map(cat => (
                    <Tag key={cat} color="blue" style={{ padding: '6px 12px', fontSize: '12px' }}>
                      {cat}
                      <DeleteOutlined 
                        onClick={() => {
                          Modal.confirm({
                            title: 'Delete Category?',
                            content: 'This action cannot be undone if items exist in this category.',
                            okText: 'Delete',
                            cancelText: 'Cancel',
                            onOk: () => handleDeleteCategory(cat),
                          });
                        }}
                        style={{ marginLeft: '8px', cursor: 'pointer' }}
                      />
                      <EditOutlined 
                        onClick={() => handleEditCategory(cat)}
                        style={{ marginLeft: '8px', cursor: 'pointer' }}
                      />
                    </Tag>
                  ))
                ) : (
                  <p style={{ color: '#999' }}>No categories yet</p>
                )}
              </Space>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
