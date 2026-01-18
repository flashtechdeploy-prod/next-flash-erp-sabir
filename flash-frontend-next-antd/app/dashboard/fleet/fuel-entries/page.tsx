'use client';

import { useState, useEffect } from 'react';
import { Table, Button, Space, Drawer, Form, Input, DatePicker, Select, InputNumber, message, Popconfirm, Card, Row, Col, Statistic } from 'antd';
import { PlusOutlined, DashboardOutlined } from '@ant-design/icons';
import { fuelEntryApi, vehicleApi } from '@/lib/api';
import dayjs from 'dayjs';

export default function FuelEntriesPage() {
  const [entries, setEntries] = useState<Record<string, unknown>[]>([]);
  const [vehicles, setVehicles] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Record<string, unknown> | null>(null);
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    loadData();
    loadVehicles();
  }, []);

  const loadVehicles = async () => {
    try {
      const res = await vehicleApi.getAll();
      setVehicles((res.data as any)?.vehicles || (res.data as any) || []);
    } catch {
      console.error('Failed to load vehicles');
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fuelEntryApi.getAll();
      setEntries((res.data as any)?.fuel_entries || (res.data as any) || []);
    } catch {
      message.error('Failed to load fuel entries');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingEntry(null);
    form.resetFields();
    setDrawerVisible(true);
  };

  const handleEdit = (record: Record<string, unknown>) => {
    setEditingEntry(record);
    const totalCost = Number(record.total_cost || 0);
    const liters = Number(record.liters || 0);
    const pricePerLiter = liters > 0 ? totalCost / liters : 0;

    form.setFieldsValue({
      vehicle_id: record.vehicle_id,
      entry_date: record.entry_date ? dayjs(String(record.entry_date)) : null,
      fuel_type: record.fuel_type || 'petrol',
      liters,
      total_cost: totalCost,
      odometer_km: record.odometer_km || null,
      vendor: record.vendor || null,
      location: record.location || null,
      notes: record.notes || null,
    });
    setDrawerVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await fuelEntryApi.delete(id);
      message.success('Entry deleted');
      loadData();
    } catch {
      message.error('Failed to delete entry');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const liters = Number(values.liters);
      const totalCost = Number(values.total_cost);
      const pricePerLiter = liters > 0 ? totalCost / liters : 0;

      const data = {
        vehicle_id: values.vehicle_id,
        entry_date: values.entry_date.format('YYYY-MM-DD'),
        fuel_type: values.fuel_type || 'petrol',
        liters,
        price_per_liter: pricePerLiter,
        total_cost: totalCost,
        odometer_km: values.odometer_km || null,
        vendor: values.vendor || null,
        location: values.location || null,
        notes: values.notes || null,
      };

      if (editingEntry) {
        await fuelEntryApi.update(Number(editingEntry.id), data);
        message.success('Entry updated');
      } else {
        await fuelEntryApi.create(data);
        message.success('Entry created');
      }

      setDrawerVisible(false);
      loadData();
    } catch {
      message.error('Failed to save entry');
    }
  };

  const columns = [
    { title: 'Date', dataIndex: 'entry_date', key: 'entry_date', width: 110, render: (d: string) => <span style={{ fontSize: '11px' }}>{dayjs(d).format('DD MMM YYYY')}</span> },
    { title: 'Vehicle', dataIndex: 'vehicle_id', key: 'vehicle_id', width: 120, render: (t: string) => <span style={{ fontSize: '11px', fontWeight: 600 }}>{t}</span> },
    { title: 'Type', dataIndex: 'fuel_type', key: 'fuel_type', width: 80, render: (t: string) => <span style={{ fontSize: '11px' }}>{t?.toUpperCase()}</span> },
    { title: 'Liters', dataIndex: 'liters', key: 'liters', width: 80, render: (v: number) => <span style={{ fontSize: '11px' }}>{v}</span> },
    { title: 'Cost (Rs.)', dataIndex: 'total_cost', key: 'total_cost', width: 100, render: (v: number) => <span style={{ fontSize: '11px' }}>Rs. {v?.toLocaleString()}</span> },
    { title: 'Odometer', dataIndex: 'odometer_km', key: 'odometer_km', width: 100, render: (v: number) => <span style={{ fontSize: '11px' }}>{v?.toLocaleString()} km</span> },
    { title: 'Vendor', dataIndex: 'vendor', key: 'vendor', ellipsis: true, render: (t: string) => <span style={{ fontSize: '11px' }}>{t}</span> },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_: unknown, record: Record<string, unknown>) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => handleEdit(record)} style={{ fontSize: '11px', padding: '0 4px' }}>Edit</Button>
          <Popconfirm title="Delete?" onConfirm={() => handleDelete(Number(record.id))} okText="Yes" cancelText="No">
            <Button type="link" danger size="small" style={{ fontSize: '11px', padding: '0 4px' }}>Delete</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const filteredEntries = entries.filter(e =>
    String(e.vehicle_id || '').toLowerCase().includes(searchText.toLowerCase())
  );

  const totalLiters = filteredEntries.reduce((sum, e) => sum + Number(e.liters || 0), 0);
  const totalCost = filteredEntries.reduce((sum, e) => sum + Number(e.total_cost || 0), 0);

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>Fuel Entries</h2>
        <Space>
          <Input.Search placeholder="Search..." value={searchText} onChange={(e) => setSearchText(e.target.value)} style={{ width: 250 }} />
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>Add Entry</Button>
        </Space>
      </div>

      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={8}>
          <Card><Statistic title={<span style={{ fontSize: '12px' }}>Total Entries</span>} value={filteredEntries.length} valueStyle={{ fontSize: '20px' }} prefix={<DashboardOutlined />} /></Card>
        </Col>
        <Col span={8}>
          <Card><Statistic title={<span style={{ fontSize: '12px' }}>Total Liters</span>} value={totalLiters.toFixed(2)} valueStyle={{ fontSize: '20px', color: '#1890ff' }} /></Card>
        </Col>
        <Col span={8}>
          <Card><Statistic title={<span style={{ fontSize: '12px' }}>Total Cost</span>} value={totalCost} valueStyle={{ fontSize: '20px', color: '#52c41a' }} prefix="Rs." /></Card>
        </Col>
      </Row>

      <Table columns={columns} dataSource={filteredEntries} rowKey="id" loading={loading} size="small" pagination={{ pageSize: 20 }} style={{ fontSize: '11px' }} />

      <Drawer
        title={editingEntry ? 'Edit Entry' : 'Add Entry'}
        placement="right"
        width={720}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        footer={<div style={{ textAlign: 'right' }}><Space><Button onClick={() => setDrawerVisible(false)}>Cancel</Button><Button type="primary" onClick={handleSubmit}>{editingEntry ? 'Update' : 'Create'}</Button></Space></div>}
      >
        <Form form={form} layout="vertical">
          <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: '12px 16px', marginBottom: '24px', borderRadius: '4px', fontSize: '14px', fontWeight: 600 }}>Fuel Entry Details</div>
          <Form.Item name="vehicle_id" label="Vehicle" rules={[{ required: true }]}>
            <Select showSearch placeholder="Select vehicle" options={vehicles.map((v) => ({ value: v.vehicle_id, label: `${v.vehicle_id} - ${v.make_model || ''}` }))} />
          </Form.Item>
          <Form.Item name="entry_date" label="Date" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="fuel_type" label="Fuel Type" rules={[{ required: true }]}>
            <Select placeholder="Select fuel type">
              <Select.Option value="petrol">Petrol</Select.Option>
              <Select.Option value="diesel">Diesel</Select.Option>
              <Select.Option value="cng">CNG</Select.Option>
              <Select.Option value="lpg">LPG</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="liters" label="Liters" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} min={0} step={0.1} /></Form.Item>
          <Form.Item name="total_cost" label="Total Cost (Rs.)" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} min={0} /></Form.Item>
          <Form.Item name="odometer_km" label="Odometer Reading (km)"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item>
          <Form.Item name="vendor" label="Fuel Station/Vendor"><Input placeholder="Enter fuel station name" /></Form.Item>
          <Form.Item name="location" label="Location"><Input placeholder="Enter location" /></Form.Item>
          <Form.Item name="notes" label="Notes"><Input.TextArea rows={3} placeholder="Additional notes" /></Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}
