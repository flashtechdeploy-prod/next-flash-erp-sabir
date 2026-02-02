'use client';

import { useState, useEffect, useMemo } from 'react';
import { Table, Button, Space, Tag, Drawer, Form, Input, InputNumber, Select, message, Popconfirm, Card, Row, Col, Statistic, Tabs, Modal } from 'antd';
import { PlusOutlined, InboxOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { generalInventoryApi, employeeApi } from '@/lib/api';

export default function GeneralInventoryPage() {
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [transactions, setTransactions] = useState<Record<string, unknown>[]>([]);
  const [employees, setEmployees] = useState<Record<string, unknown>[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [itemDrawerVisible, setItemDrawerVisible] = useState(false);
  const [transactionDrawerVisible, setTransactionDrawerVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<Record<string, unknown> | null>(null);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<Record<string, unknown> | null>(null);
  const [form] = Form.useForm();
  const [transactionForm] = Form.useForm();
  const [categoryForm] = Form.useForm();
  const [searchText, setSearchText] = useState('');

  // Aggregate issued quantities per item (issue adds, return subtracts)
  const issuedByItem = useMemo(() => {
    const acc: Record<string, number> = {};
    transactions.forEach((tx: Record<string, unknown>) => {
      const code = String(tx.item_code || '');
      const qty = Number(tx.quantity || 0);
      const type = String(tx.action || tx.transaction_type || '').toLowerCase();
      if (!code) return;
      if (!acc[code]) acc[code] = 0;
      if (type === 'issue') acc[code] += qty;
      if (type === 'return') acc[code] -= qty;
    });
    return acc;
  }, [transactions]);

  useEffect(() => {
    loadData();
    loadEmployees();
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const response = await generalInventoryApi.getCategories();
      console.log('Categories response:', response);
      const categoryList = response.data ? (Array.isArray(response.data) ? response.data : []) : [];
      console.log('Loaded categories:', categoryList);
      setCategories(categoryList);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadEmployees = async () => {
    try {
      const response = await employeeApi.getAll({ limit: '10000' });
      console.log('Employees response:', response);
      let employeeList: Record<string, unknown>[] = [];

      if (Array.isArray(response)) {
        employeeList = response;
      } else if (response?.data) {
        if (Array.isArray(response.data)) {
          employeeList = response.data;
        } else if (Array.isArray((response.data as any).employees)) {
          employeeList = (response.data as any).employees;
        }
      }

      console.log('Loaded employees:', employeeList);
      setEmployees(employeeList);
    } catch (error) {
      console.error('Failed to load employees:', error);
      setEmployees([]);
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
      const data: any = {
        name: values.name,  // Backend expects 'name', not 'item_name'
        category: values.category,
        unit_name: values.unit_name,  // Backend expects 'unit_name', not 'unit'
        quantity_on_hand: values.quantity_on_hand,
        min_quantity: values.min_quantity,
        description: values.description,
      };

      if (editingItem) {
        // For edit, include the item_code to update the correct record
        await generalInventoryApi.updateItem(String(editingItem.item_code), data);
        message.success('Item updated');
      } else {
        // For create, don't send item_code - let backend auto-generate it
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

      // Extract only the data needed for API (exclude transaction_type)
      const { transaction_type, ...transactionData } = values;

      switch (transaction_type) {
        case 'issue':
          await generalInventoryApi.issueItem(itemCode, transactionData);
          break;
        case 'return':
          await generalInventoryApi.returnItem(itemCode, transactionData);
          break;
        case 'lost':
          await generalInventoryApi.lostItem(itemCode, transactionData);
          break;
        case 'damaged':
          await generalInventoryApi.damagedItem(itemCode, transactionData);
          break;
        case 'adjust':
          await generalInventoryApi.adjustItem(itemCode, transactionData);
          break;
      }

      message.success('Transaction recorded');
      setTransactionDrawerVisible(false);
      loadData();
    } catch {
      message.error('Failed to record transaction');
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
        await generalInventoryApi.updateCategory(editingCategory, values.category);
        message.success('Category updated');
      } else {
        await generalInventoryApi.createCategory(values.category);
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
      await generalInventoryApi.deleteCategory(category);
      message.success('Category deleted');
      loadCategories();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to delete category');
    }
  };

  const itemColumns = [
    { title: 'Code', dataIndex: 'item_code', key: 'item_code', width: 90, render: (t: string) => <span style={{ fontSize: '11px', fontWeight: 600 }}>{t}</span> },
    { title: 'Name', dataIndex: 'name', key: 'name', width: 180, render: (t: string) => <span style={{ fontSize: '11px' }}>{t}</span> },
    { title: 'Category', dataIndex: 'category', key: 'category', width: 110, render: (t: string) => <Tag color="blue" style={{ fontSize: '11px' }}>{t}</Tag> },
    { title: 'Quantity in Stock', dataIndex: 'quantity_on_hand', key: 'quantity_on_hand', width: 110, render: (_: number, record: Record<string, unknown>) => <span style={{ fontSize: '11px', fontWeight: 600 }}>{getQty(record)}</span> },
    {
      title: 'Total Quantity', key: 'total_quantity', width: 110, render: (_: unknown, record: Record<string, unknown>) => {
        const code = String(record.item_code || '');
        const stock = getQty(record);
        const issued = issuedByItem[code] || 0;
        const totalQty = stock + issued;
        return <span style={{ fontSize: '11px' }}>{totalQty}</span>;
      }
    },
    {
      title: 'Total Issues', key: 'total_issues', width: 100, render: (_: unknown, record: Record<string, unknown>) => {
        const code = String(record.item_code || '');
        const issued = issuedByItem[code] || 0;
        return <span style={{ fontSize: '11px', fontWeight: 600 }}>{issued}</span>;
      }
    },
    {
      title: 'Available', key: 'available', width: 100, render: (_: unknown, record: Record<string, unknown>) => {
        const code = String(record.item_code || '');
        const available = getQty(record);
        return <span style={{ fontSize: '11px', fontWeight: 600 }}>{available}</span>;
      }
    },
    { title: 'Min Stock', dataIndex: 'min_quantity', key: 'min_quantity', width: 90, render: (v: number) => <span style={{ fontSize: '11px' }}>{v}</span> },
    {
      title: 'Status',
      key: 'status',
      width: 90,
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
    { title: 'FSS No.', dataIndex: 'employee_id', key: 'employee_id', width: 100, render: (t: string) => <span style={{ fontSize: '11px', fontWeight: 600 }}>{t}</span> },
    {
      title: 'Emp Name',
      dataIndex: 'employee_id',
      key: 'emp_name',
      width: 150,
      render: (empId: string) => {
        const emp = employees.find((e: Record<string, unknown>) =>
          String(e.fss_no || e.id || '') === String(empId)
        );
        return <span style={{ fontSize: '11px' }}>{emp ? (String(emp.full_name || emp.name || '') || (String(emp.first_name || '') + ' ' + String(emp.last_name || '')).trim()) : empId || '-'}</span>;
      }
    },
    { title: 'Item', dataIndex: 'item_code', key: 'item_code', width: 100, render: (t: string) => <span style={{ fontSize: '11px', fontWeight: 600 }}>{t}</span> },
    {
      title: 'Type',
      dataIndex: 'action',
      key: 'action',
      width: 100,
      render: (type: string) => {
        const colors: Record<string, string> = { issue: 'blue', return: 'green', lost: 'red', damaged: 'orange', adjust: 'purple' };
        return <Tag color={colors[type] || 'default'} style={{ fontSize: '11px' }}>{type?.toUpperCase()}</Tag>;
      }
    },
    { title: 'Quantity', dataIndex: 'quantity', key: 'quantity', width: 80, render: (v: number) => <span style={{ fontSize: '11px' }}>{v}</span> },
    { title: 'Notes', dataIndex: 'notes', key: 'notes', width: 180, ellipsis: true, render: (t: string) => <span style={{ fontSize: '11px' }}>{t || '-'}</span> },
    { title: 'Date', dataIndex: 'transaction_date', key: 'transaction_date', width: 110, render: (t: string) => <span style={{ fontSize: '11px' }}>{t}</span> },
  ];

  const filteredItems = items.filter(item => {
    const term = searchText.toLowerCase();
    const code = String(item.item_code || '').toLowerCase();
    const name = String(item.name || item.item_name || '').toLowerCase();
    return code.includes(term) || name.includes(term);
  });

  const getQty = (item: Record<string, unknown>) =>
    Number(item.quantity_on_hand ?? item.quantity_in_stock ?? item.quantity ?? 0);
  const getMin = (item: Record<string, unknown>) =>
    Number(item.min_quantity ?? item.min_stock_level ?? 0);

  const totalItems = filteredItems.length;
  const totalStock = filteredItems.reduce((sum, item) => sum + getQty(item), 0);
  const issuedUnits = transactions.reduce((sum, tx) => {
    const qty = Number((tx as any).quantity || 0);
    const type = String((tx as any).action || (tx as any).transaction_type || '').toLowerCase();
    if (type === 'issue') return sum + qty;
    if (type === 'return') return sum - qty;
    return sum;
  }, 0);
  const totalUnits = totalStock + issuedUnits;
  const availableUnits = totalStock;

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>General Inventory</h2>
        <Space>
          <Input.Search placeholder="Search items..." value={searchText} onChange={(e) => setSearchText(e.target.value)} style={{ width: 250 }} />
          <Button onClick={() => setCategoryModalVisible(true)}>Manage Categories</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAddItem}>Add Item</Button>
        </Space>
      </div>

      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card>
            <Statistic
              title={<span style={{ fontSize: '12px' }}>Total Quantity</span>}
              value={totalStock}
              valueStyle={{ fontSize: '20px', color: '#1890ff' }}
              prefix={<InboxOutlined />}
            />
          </Card>
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
          <Form.Item name="item_code" label="Item Code"><Input placeholder={editingItem ? "Cannot edit code" : "Auto-generated (FGI-##)"} disabled /></Form.Item>
          <Form.Item name="name" label="Item Name" rules={[{ required: true, message: 'Please enter item name' }]}><Input placeholder="Enter item name" /></Form.Item>
          <Form.Item name="category" label="Category" rules={[{ required: true, message: 'Please select category' }]}>
            <Select placeholder="Select category" options={categories.map(cat => ({ label: cat, value: cat }))} />
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
          <Form.Item name="employee_id" label="FSS Number">
            <Select
              showSearch
              placeholder="Select FSS number"
              notFoundContent={employees.length === 0 ? 'No employees found' : undefined}
              options={employees
                .filter((emp) => emp.fss_no)
                .map((emp) => {
                  const fss = emp.fss_no;
                  return {
                    value: fss,
                    label: `${fss} - ${emp.full_name || emp.name || 'Unknown'}`,
                  };
                })}
            />
          </Form.Item>
          <Form.Item name="notes" label="Notes"><Input.TextArea rows={3} placeholder="Additional notes" /></Form.Item>
        </Form>
      </Drawer>

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
