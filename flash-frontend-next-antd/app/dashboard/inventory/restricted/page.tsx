'use client';

import { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, Drawer, Form, Input, InputNumber, Select, message, Popconfirm, Card, Row, Col, Statistic, Tabs, Modal } from 'antd';
import { PlusOutlined, SafetyOutlined, LockOutlined, CheckCircleOutlined, CloseCircleOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { restrictedInventoryApi, employeeApi } from '@/lib/api';

export default function RestrictedInventoryPage() {
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [serialUnits, setSerialUnits] = useState<Record<string, unknown>[]>([]);
  const [transactions, setTransactions] = useState<Record<string, unknown>[]>([]);
  const [employees, setEmployees] = useState<Record<string, unknown>[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [weaponRegions, setWeaponRegions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [itemDrawerVisible, setItemDrawerVisible] = useState(false);
  const [serialDrawerVisible, setSerialDrawerVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [weaponRegionModalVisible, setWeaponRegionModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<Record<string, unknown> | null>(null);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingWeaponRegion, setEditingWeaponRegion] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<Record<string, unknown> | null>(null);
  const [form] = Form.useForm();
  const [serialForm] = Form.useForm();
  const [issueForm] = Form.useForm();
  const [transactionForm] = Form.useForm();
  const [categoryForm] = Form.useForm();
  const [weaponRegionForm] = Form.useForm();
  const [transactionDrawerVisible, setTransactionDrawerVisible] = useState(false);
  const [transactionType, setTransactionType] = useState<string>('issue');
  const [searchText, setSearchText] = useState('');
  const [serialModalVisible, setSerialModalVisible] = useState(false);
  const [issueModalVisible, setIssueModalVisible] = useState(false);
  const [returnDrawerVisible, setReturnDrawerVisible] = useState(false);
  const [returnForm] = Form.useForm();
  const [selectedSerialUnitId, setSelectedSerialUnitId] = useState<number | null>(null);
  const [employeeReportVisible, setEmployeeReportVisible] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [employeeAssignments, setEmployeeAssignments] = useState<{ general: any[], restricted: any[], vehicles: any[] }>({ general: [], restricted: [], vehicles: [] });
  const [loadingReport, setLoadingReport] = useState(false);

  useEffect(() => {
    loadData();
    loadEmployees();
    loadCategories();
    loadWeaponRegions();
  }, []);

  const loadEmployees = async () => {
    try {
      const response = await employeeApi.getAll({ limit: '10000' });
      console.log('=== EMPLOYEES API RESPONSE ===');
      console.log('Full response:', response);
      let empData: Record<string, unknown>[] = [];

      if (Array.isArray(response)) {
        empData = response;
      } else if (response?.data) {
        if (Array.isArray(response.data)) {
          empData = response.data;
        } else if (Array.isArray((response.data as any).employees)) {
          empData = (response.data as any).employees;
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

  const loadWeaponRegions = async () => {
    try {
      const response = await restrictedInventoryApi.getWeaponRegions();
      console.log('Weapon regions response:', response);
      const regionList = response.data ? (Array.isArray(response.data) ? response.data : []) : [];
      console.log('Loaded weapon regions:', regionList);
      setWeaponRegions(regionList);
    } catch (error) {
      console.error('Failed to load weapon regions:', error);
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
      const itemsData = Array.isArray(itemsResponse?.data) ? itemsResponse.data : (Array.isArray(itemsResponse) ? itemsResponse : []);
      console.log('✅ Loaded items:', itemsData);
      setItems(itemsData);

      console.log('=== RESTRICTED INVENTORY TRANSACTIONS API RESPONSE ===');
      console.log('Full response:', transResponse);
      const transData = Array.isArray(transResponse?.data) ? transResponse.data : (Array.isArray(transResponse) ? transResponse : []);
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
      item_name: record.name,
      item_type: record.category,
      unit_name: record.unit_name,
      quantity_on_hand: record.quantity_on_hand || 0,
      min_quantity: record.min_quantity || 0,
      is_serial_tracked: record.is_serial_tracked || false,
      description: record.description,
      license_number: record.license_number,
      weapon_region: record.weapon_region,
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
      const quantity_on_hand = values.quantity_on_hand || 0;
      const min_quantity = values.min_quantity || 0;

      if (!item_name || !item_type) {
        message.error('Item name and category are required');
        return;
      }

      const data: any = {
        name: String(item_name),
        category: String(item_type),
        unit_name: String(unit_name),
        quantity_on_hand: Number(quantity_on_hand),
        min_quantity: Number(min_quantity),
        description: values.description || undefined,
        is_serial_tracked: values.is_serial_tracked || false,
        license_number: values.license_number || undefined,
        weapon_region: values.weapon_region || undefined,
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

  const handleTransaction = (item: Record<string, unknown>, type: string) => {
    setSelectedItem(item);
    setTransactionType(type);
    transactionForm.resetFields();
    setTransactionDrawerVisible(true);
  };

  const handleSubmitTransaction = async () => {
    try {
      const values = await transactionForm.validateFields();
      const itemCode = String(selectedItem?.item_code);

      await restrictedInventoryApi.issueItem(itemCode, values);
      message.success('Transaction recorded');
      setTransactionDrawerVisible(false);
      loadData();
    } catch (error) {
      console.error('❌ Failed to record transaction:', error);
      message.error('Failed to record transaction');
    }
  };

  const handleReturnItem = (item: Record<string, unknown>) => {
    setSelectedItem(item);
    returnForm.resetFields();
    setReturnDrawerVisible(true);
  };

  const handleSubmitReturn = async () => {
    try {
      const values = await returnForm.validateFields();
      const itemCode = String(selectedItem?.item_code);

      await restrictedInventoryApi.returnItem(itemCode, values);
      message.success('Return recorded');
      setReturnDrawerVisible(false);
      loadData();
    } catch (error) {
      console.error('❌ Failed to record return:', error);
      message.error('Failed to record return');
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
      const fssNumber = String(values.employee_id);

      console.log('📤 Issuing serial unit to employee:', fssNumber);

      await restrictedInventoryApi.issueSerial(selectedSerialUnitId!, fssNumber);
      message.success('Serial unit issued');
      issueForm.resetFields();
      setIssueModalVisible(false);
      loadSerialUnits(String(selectedItem?.item_code));
      loadData(); // Refresh items to update statistics
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
      loadData(); // Refresh items to update statistics
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

  const handleEditWeaponRegion = (region: string) => {
    setEditingWeaponRegion(region);
    weaponRegionForm.setFieldsValue({ region });
  };

  const handleSubmitWeaponRegion = async () => {
    try {
      const values = await weaponRegionForm.validateFields();
      if (editingWeaponRegion) {
        await restrictedInventoryApi.updateWeaponRegion(editingWeaponRegion, values.region);
        message.success('Weapon region updated');
      } else {
        await restrictedInventoryApi.createWeaponRegion(values.region);
        message.success('Weapon region added');
      }
      setWeaponRegionModalVisible(false);
      weaponRegionForm.resetFields();
      setEditingWeaponRegion(null);
      loadWeaponRegions();
    } catch (error) {
      console.error('Save error:', error);
      message.error('Failed to save weapon region');
    }
  };

  const handleDeleteWeaponRegion = async (region: string) => {
    try {
      await restrictedInventoryApi.deleteWeaponRegion(region);
      message.success('Weapon region deleted');
      loadWeaponRegions();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to delete weapon region');
    }
  };

  const handleViewEmployeeReport = async (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    setEmployeeReportVisible(true);
    setLoadingReport(true);

    try {
      const token = localStorage.getItem('token');
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      // Fetch transactions, items, vehicles, and vehicle assignments
      const [generalTransResponse, restrictedTransResponse, generalItemsResponse, restrictedItemsResponse, vehiclesResponse, vehicleAssignmentsResponse] = await Promise.all([
        fetch(`${API_BASE}/api/general-inventory/transactions?employee_id=${employeeId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(r => r.json()),
        restrictedInventoryApi.getTransactions({ employee_id: employeeId }),
        fetch(`${API_BASE}/api/general-inventory/items`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(r => r.json()),
        restrictedInventoryApi.getItems(),
        fetch(`${API_BASE}/api/vehicles`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(r => r.json()).catch(() => ({ data: [] })),
        fetch(`${API_BASE}/api/vehicle-assignments?employee_fss=${employeeId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(r => r.json()).catch(() => ({ data: [] }))
      ]);

      const generalTrans = generalTransResponse?.data || (Array.isArray(generalTransResponse) ? generalTransResponse : []);
      const restrictedTrans = restrictedTransResponse?.data || (Array.isArray(restrictedTransResponse) ? restrictedTransResponse : []);
      const generalItems = generalItemsResponse?.data || (Array.isArray(generalItemsResponse) ? generalItemsResponse : []);
      const restrictedItems = restrictedItemsResponse?.data || (Array.isArray(restrictedItemsResponse) ? restrictedItemsResponse : []);
      const vehicles = vehiclesResponse?.data || (Array.isArray(vehiclesResponse) ? vehiclesResponse : []);
      const vehicleAssignments = vehicleAssignmentsResponse?.data || (Array.isArray(vehicleAssignmentsResponse) ? vehicleAssignmentsResponse : []);

      // Create item lookup maps
      const generalItemMap = new Map(generalItems.map((item: any) => [item.item_code, item.name || item.item_name]));
      const restrictedItemMap = new Map(restrictedItems.map((item: any) => [item.item_code, item.name]));
      const vehicleMap = new Map(vehicles.map((v: any) => [v.vehicle_id || v.id, v.vehicle_name || v.name || v.make_model]));

      // Filter only 'issue' transactions and add item names
      const generalIssued = generalTrans
        .filter((t: any) => t.action === 'issue')
        .map((t: any) => ({ ...t, item_name: generalItemMap.get(t.item_code) || 'Unknown Item' }));

      const restrictedIssued = restrictedTrans
        .filter((t: any) => t.action === 'issue')
        .map((t: any) => ({ ...t, item_name: restrictedItemMap.get(t.item_code) || 'Unknown Item' }));

      // Add vehicle names to assignments
      const vehiclesWithNames = vehicleAssignments.map((va: any) => ({
        ...va,
        vehicle_name: vehicleMap.get(va.vehicle_id) || va.vehicle_name || 'Unknown Vehicle'
      }));

      setEmployeeAssignments({ general: generalIssued, restricted: restrictedIssued, vehicles: vehiclesWithNames });
    } catch (error) {
      console.error('Failed to load employee report:', error);
      message.error('Failed to load employee assignments');
    } finally {
      setLoadingReport(false);
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
    {
      title: 'Total',
      dataIndex: 'serial_total',
      key: 'serial_total',
      width: 100,
      render: (v: number, record: Record<string, unknown>) => {
        const isAmmo = String(record.category || '').toUpperCase() === 'AMMUNITION' || record.is_serial_tracked === false;
        const label = isAmmo ? 'qty' : 'units';
        // For ammo, use quantity_on_hand directly; for weapons, use serial_total
        const displayValue = isAmmo ? (record.quantity_on_hand || 0) : v;
        return <span style={{ fontSize: '11px', fontWeight: 600 }}>{displayValue} {label}</span>;
      }
    },
    {
      title: 'Available',
      dataIndex: 'serial_in_stock',
      key: 'serial_in_stock',
      width: 100,
      render: (v: number, record: Record<string, unknown>) => {
        const isAmmo = String(record.category || '').toUpperCase() === 'AMMUNITION' || record.is_serial_tracked === false;
        const label = isAmmo ? 'qty' : 'units';
        return <span style={{ fontSize: '11px', color: '#52c41a' }}>{v || 0} {label}</span>;
      }
    },
    {
      title: 'Issued',
      dataIndex: 'issued_units',
      key: 'issued_units',
      width: 100,
      render: (v: number, record: Record<string, unknown>) => {
        const isAmmo = String(record.category || '').toUpperCase() === 'AMMUNITION' || record.is_serial_tracked === false;
        const label = isAmmo ? 'qty' : 'units';
        return <span style={{ fontSize: '11px', color: '#1890ff' }}>{(Number(v) || 0) > 0 ? v : 0} {label}</span>;
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 250,
      render: (_: unknown, record: Record<string, unknown>) => {
        const isAmmo = String(record.category || '').toUpperCase() === 'AMMUNITION' || record.is_serial_tracked === false;
        return (
          <Space size="small">
            {!isAmmo && record.is_serial_tracked === true && (
              <Button type="link" size="small" onClick={() => handleViewSerials(record)} style={{ fontSize: '11px', padding: '0 4px' }}>View Units</Button>
            )}
            {isAmmo && (
              <>
                <Button type="link" size="small" onClick={() => handleTransaction(record, 'issue')} style={{ fontSize: '11px', padding: '0 4px', color: '#1890ff' }}>Issue</Button>
                <Button type="link" size="small" onClick={() => handleReturnItem(record)} style={{ fontSize: '11px', padding: '0 4px', color: '#52c41a' }}>Return</Button>
              </>
            )}
            <Button type="link" size="small" onClick={() => handleEditItem(record)} style={{ fontSize: '11px', padding: '0 4px' }}>Edit</Button>
            <Popconfirm title="Delete?" onConfirm={() => handleDeleteItem(String(record.item_code))} okText="Yes" cancelText="No">
              <Button type="link" danger size="small" style={{ fontSize: '11px', padding: '0 4px' }}>Delete</Button>
            </Popconfirm>
          </Space>
        );
      },
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
    { title: 'Issued To (FSS)', dataIndex: 'issued_to_employee_id', key: 'issued_to_employee_id', width: 140, render: (t: string) => <span style={{ fontSize: '11px' }}>{t || '-'}</span> },
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
    { title: 'Date', dataIndex: 'created_at', key: 'created_at', width: 110, render: (t: string) => <span style={{ fontSize: '11px' }}>{t ? new Date(t).toLocaleDateString() : '-'}</span> },
    {
      title: 'FSS No.',
      dataIndex: 'employee_id',
      key: 'employee_id',
      width: 120,
      render: (t: string) => (
        <Button
          type="link"
          size="small"
          onClick={() => handleViewEmployeeReport(t)}
          style={{ fontSize: '11px', padding: 0, fontWeight: 600 }}
        >
          {t}
        </Button>
      )
    },
    { title: 'Item', dataIndex: 'item_code', key: 'item_code', width: 100, render: (t: string) => <span style={{ fontSize: '11px', fontWeight: 600 }}>{t}</span> },
    {
      title: 'Item Name',
      dataIndex: 'item_code',
      key: 'item_name',
      width: 150,
      render: (code: string) => {
        const item = items.find((i: any) => i.item_code === code);
        return <span style={{ fontSize: '11px' }}>{item ? (item.name as string) : '-'}</span>;
      }
    },
    {
      title: 'Category',
      dataIndex: 'item_code',
      key: 'category',
      width: 100,
      render: (code: string) => {
        const item = items.find((i: any) => i.item_code === code);
        const category = item ? (item.category as string) : '';
        const colors: Record<string, string> = { weapon: 'red', ammunition: 'orange', equipment: 'blue' };
        return category ? <Tag color={colors[category] || 'default'} style={{ fontSize: '11px' }}>{category.toUpperCase()}</Tag> : '-';
      }
    },
    { title: 'Serial', dataIndex: 'serial_number', key: 'serial_number', width: 120, render: (t: string) => <span style={{ fontSize: '11px' }}>{t || '-'}</span> },
    { title: 'Quantity', dataIndex: 'quantity', key: 'quantity', width: 90, render: (v: number) => <span style={{ fontSize: '11px' }}>{v || '-'}</span> },
    {
      title: 'Type',
      dataIndex: 'action',
      key: 'action',
      width: 100,
      render: (type: string) => {
        const colors: Record<string, string> = { issue: 'blue', return: 'green' };
        return <Tag color={colors[type] || 'default'} style={{ fontSize: '11px' }}>{type?.toUpperCase()}</Tag>;
      }
    },

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
          <Button onClick={() => setWeaponRegionModalVisible(true)}>Manage Regions</Button>
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
          <Form.Item name="quantity_on_hand" label="Total Quantity" initialValue={0}><InputNumber style={{ width: '100%' }} min={0} placeholder="Enter total quantity" /></Form.Item>
          <Form.Item name="min_quantity" label="Minimum Stock Level" initialValue={0}><InputNumber style={{ width: '100%' }} min={0} placeholder="Enter minimum stock level" /></Form.Item>
          <Form.Item name="license_number" label="License Number"><Input placeholder="Enter license number" /></Form.Item>
          <Form.Item name="weapon_region" label="Weapon Region">
            <Select placeholder="Select weapon region" allowClear options={weaponRegions.map(region => ({ label: region, value: region }))} />
          </Form.Item>
          <Form.Item name="is_serial_tracked" label="Track by Serial Number" valuePropName="checked" initialValue={false}><div style={{ fontSize: '12px', color: '#666' }}>Check for weapons (rifles, etc.). Uncheck for ammo/consumables.</div></Form.Item>
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
          <Form.Item name="quantity" label="Quantity" rules={[{ required: true, message: 'Quantity is required' }]}><InputNumber style={{ width: '100%' }} min={1} /></Form.Item>
          <Form.Item name="employee_id" label="FSS Number" rules={[{ required: true, message: 'FSS Number is required' }]}>
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
              filterOption={(input, option) =>
                (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>
          <Form.Item name="notes" label="Notes"><Input.TextArea rows={3} placeholder="Additional notes" /></Form.Item>
        </Form>
      </Drawer>

      {/* Return Drawer */}
      <Drawer
        title="Return Item"
        placement="right"
        width={720}
        onClose={() => setReturnDrawerVisible(false)}
        open={returnDrawerVisible}
        footer={<div style={{ textAlign: 'right' }}><Space><Button onClick={() => setReturnDrawerVisible(false)}>Cancel</Button><Button type="primary" onClick={handleSubmitReturn}>Submit</Button></Space></div>}
      >
        <Form form={returnForm} layout="vertical">
          <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: '12px 16px', marginBottom: '24px', borderRadius: '4px', fontSize: '14px', fontWeight: 600 }}>Return Details</div>
          <Form.Item label="Item"><Input value={`${selectedItem?.item_code} - ${selectedItem?.name}`} disabled /></Form.Item>
          <Form.Item name="quantity" label="Quantity to Return" rules={[{ required: true, message: 'Quantity is required' }]}><InputNumber style={{ width: '100%' }} min={1} /></Form.Item>
          <Form.Item name="employee_id" label="FSS Number" rules={[{ required: true, message: 'FSS Number is required' }]}>
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
              filterOption={(input, option) =>
                (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>
          <Form.Item name="notes" label="Return Reason"><Input.TextArea rows={3} placeholder="Why is this being returned?" /></Form.Item>
        </Form>
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
          <Form.Item name="employee_id" label="FSS Number" rules={[{ required: true, message: 'Employee is required' }]}>
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
                    label: `${fss} - ${emp.full_name || emp.name || 'Unknown'}`
                  };
                })}
              filterOption={(input, option) =>
                (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
              }
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

      {/* Weapon Region Management Modal */}
      <Modal
        title="Manage Weapon Regions"
        open={weaponRegionModalVisible}
        onCancel={() => {
          setWeaponRegionModalVisible(false);
          weaponRegionForm.resetFields();
          setEditingWeaponRegion(null);
        }}
        onOk={handleSubmitWeaponRegion}
        okText={editingWeaponRegion ? 'Update' : 'Add'}
        width={600}
      >
        {editingWeaponRegion ? (
          <Form form={weaponRegionForm} layout="vertical">
            <Form.Item name="region" label="Region Name" rules={[{ required: true, message: 'Please enter region name' }]}>
              <Input placeholder="Enter region name" />
            </Form.Item>
          </Form>
        ) : (
          <>
            <Form form={weaponRegionForm} layout="vertical" style={{ marginBottom: 24 }}>
              <Form.Item name="region" label="New Region Name" rules={[{ required: true, message: 'Please enter region name' }]}>
                <Input placeholder="Enter region name" />
              </Form.Item>
            </Form>
            <div style={{ marginTop: '24px' }}>
              <h4 style={{ marginBottom: '12px', fontWeight: 600 }}>Existing Weapon Regions:</h4>
              <Space wrap>
                {weaponRegions.length > 0 ? (
                  weaponRegions.map(region => (
                    <Tag key={region} color="green" style={{ padding: '6px 12px', fontSize: '12px' }}>
                      {region}
                      <DeleteOutlined
                        onClick={() => {
                          Modal.confirm({
                            title: 'Delete Weapon Region?',
                            content: 'This action cannot be undone if items exist in this region.',
                            okText: 'Delete',
                            cancelText: 'Cancel',
                            onOk: () => handleDeleteWeaponRegion(region),
                          });
                        }}
                        style={{ marginLeft: '8px', cursor: 'pointer' }}
                      />
                      <EditOutlined
                        onClick={() => handleEditWeaponRegion(region)}
                        style={{ marginLeft: '8px', cursor: 'pointer' }}
                      />
                    </Tag>
                  ))
                ) : (
                  <p style={{ color: '#999' }}>No weapon regions yet</p>
                )}
              </Space>
            </div>
          </>
        )}
      </Modal>

      {/* Employee Assignment Report Modal */}
      <Modal
        title={`Employee Assignment Report - FSS: ${selectedEmployeeId}`}
        open={employeeReportVisible}
        onCancel={() => setEmployeeReportVisible(false)}
        width={1000}
        footer={[
          <Button key="close" onClick={() => setEmployeeReportVisible(false)}>Close</Button>
        ]}
      >
        {loadingReport ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>
        ) : (
          <>
            <Row gutter={16} style={{ marginBottom: '24px' }}>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="General Inventory"
                    value={employeeAssignments.general.reduce((sum, t) => sum + (t.quantity || 0), 0)}
                    valueStyle={{ color: '#1890ff', fontSize: '20px' }}
                    suffix="items"
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="Restricted Inventory"
                    value={employeeAssignments.restricted.length}
                    valueStyle={{ color: '#52c41a', fontSize: '20px' }}
                    suffix="items"
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="Vehicles Assigned"
                    value={employeeAssignments.vehicles.length}
                    valueStyle={{ color: '#faad14', fontSize: '20px' }}
                    suffix="vehicles"
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="Total Assignments"
                    value={employeeAssignments.general.length + employeeAssignments.restricted.length + employeeAssignments.vehicles.length}
                    valueStyle={{ color: '#722ed1', fontSize: '20px' }}
                  />
                </Card>
              </Col>
            </Row>

            <Tabs defaultActiveKey="general">
              <Tabs.TabPane tab={`General Inventory (${employeeAssignments.general.length})`} key="general">
                <Table
                  dataSource={employeeAssignments.general}
                  rowKey="id"
                  size="small"
                  pagination={{ pageSize: 10 }}
                  columns={[
                    { title: 'Item Code', dataIndex: 'item_code', key: 'item_code', width: 120 },
                    { title: 'Item Name', dataIndex: 'item_name', key: 'item_name', width: 200, render: (t: string) => <span style={{ fontWeight: 600 }}>{t}</span> },
                    { title: 'Quantity', dataIndex: 'quantity', key: 'quantity', width: 100 },
                    { title: 'Date', dataIndex: 'transaction_date', key: 'transaction_date', width: 120 },
                    { title: 'Notes', dataIndex: 'notes', key: 'notes', ellipsis: true },
                  ]}
                />
              </Tabs.TabPane>
              <Tabs.TabPane tab={`Restricted Inventory (${employeeAssignments.restricted.length})`} key="restricted">
                <Table
                  dataSource={employeeAssignments.restricted}
                  rowKey="id"
                  size="small"
                  pagination={{ pageSize: 10 }}
                  columns={[
                    { title: 'Item Code', dataIndex: 'item_code', key: 'item_code', width: 120 },
                    { title: 'Item Name', dataIndex: 'item_name', key: 'item_name', width: 200, render: (t: string) => <span style={{ fontWeight: 600 }}>{t}</span> },
                    { title: 'Serial Number', dataIndex: 'serial_number', key: 'serial_number', width: 150, render: (t: string) => t || '-' },
                    { title: 'Quantity', dataIndex: 'quantity', key: 'quantity', width: 100, render: (v: number) => v || '-' },
                    { title: 'Date', dataIndex: 'created_at', key: 'created_at', width: 120, render: (t: string) => t ? new Date(t).toLocaleDateString() : '-' },
                    { title: 'Notes', dataIndex: 'notes', key: 'notes', ellipsis: true },
                  ]}
                />
              </Tabs.TabPane>
              <Tabs.TabPane tab={`Vehicles (${employeeAssignments.vehicles.length})`} key="vehicles">
                <Table
                  dataSource={employeeAssignments.vehicles}
                  rowKey="id"
                  size="small"
                  pagination={{ pageSize: 10 }}
                  columns={[
                    { title: 'Vehicle ID', dataIndex: 'vehicle_id', key: 'vehicle_id', width: 120, render: (t: string) => <span style={{ fontWeight: 600 }}>{t}</span> },
                    { title: 'Vehicle Name', dataIndex: 'vehicle_name', key: 'vehicle_name', width: 200 },
                    { title: 'Type', dataIndex: 'vehicle_type', key: 'vehicle_type', width: 120 },
                    { title: 'Start Date', dataIndex: 'start_date', key: 'start_date', width: 120, render: (t: string) => t ? new Date(t).toLocaleDateString() : '-' },
                    { title: 'End Date', dataIndex: 'end_date', key: 'end_date', width: 120, render: (t: string) => t ? new Date(t).toLocaleDateString() : 'Active' },
                    { title: 'Purpose', dataIndex: 'purpose', key: 'purpose', ellipsis: true },
                  ]}
                />
              </Tabs.TabPane>
            </Tabs>
          </>
        )}
      </Modal>
    </div>
  );
}
