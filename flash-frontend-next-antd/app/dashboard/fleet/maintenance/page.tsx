'use client';

import { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, Drawer, Form, Input, DatePicker, Select, InputNumber, message, Popconfirm, Card, Row, Col, Statistic } from 'antd';
import { PlusOutlined, ToolOutlined } from '@ant-design/icons';
import { vehicleMaintenanceApi, vehicleApi } from '@/lib/api';
import dayjs from 'dayjs';

export default function VehicleMaintenancePage() {
  const [records, setRecords] = useState<Record<string, unknown>[]>([]);
  const [vehicles, setVehicles] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Record<string, unknown> | null>(null);
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    loadData();
    loadVehicles();
  }, []);

  const loadVehicles = async () => {
    try {
      const response = await vehicleApi.getAll();
      console.log('=== MAINTENANCE VEHICLES API RESPONSE ===');
      console.log('Full response:', response);
      console.log('Response data:', response.data);
      console.log('Response error:', response.error);
      console.log('Data type:', typeof response.data);
      console.log('Is array:', Array.isArray(response.data));

      if (response.error) {
        console.error('❌ Vehicle API error:', response.error);
        message.error(`Failed to load vehicles: ${response.error}`);
        setVehicles([]);
        return;
      }

      if (!response.data) {
        console.warn('⚠️ No data in response');
        message.warning('No vehicles found');
        setVehicles([]);
        return;
      }

      const vehicleList = (response.data as any)?.vehicles || (response.data as any) || [];
      console.log(`✅ Loaded ${vehicleList.length} vehicles:`, vehicleList);
      setVehicles(vehicleList);
    } catch (error) {
      console.error('❌ Failed to load vehicles:', error);
      message.error('Failed to load vehicles');
      setVehicles([]);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await vehicleMaintenanceApi.getAll();
      console.log('=== MAINTENANCE RECORDS API RESPONSE ===');
      console.log('Full response:', response);
      console.log('Response data:', response.data);
      console.log('Response error:', response.error);
      console.log('Data type:', typeof response.data);
      console.log('Is array:', Array.isArray(response.data));

      if (response.error) {
        console.error('❌ Maintenance API error:', response.error);
        message.error(`Failed to load maintenance records: ${response.error}`);
        setRecords([]);
        return;
      }

      if (!response.data) {
        console.warn('⚠️ No data in response');
        message.warning('No maintenance records found');
        setRecords([]);
        return;
      }

      const recordList = (response.data as any)?.maintenance_records || (response.data as any) || [];
      console.log(`✅ Loaded ${recordList.length} maintenance records:`, recordList);
      setRecords(recordList);
    } catch (error) {
      console.error('❌ Failed to load maintenance records:', error);
      message.error('Failed to load maintenance records');
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingRecord(null);
    form.resetFields();
    form.setFieldsValue({
      maintenance_date: dayjs(),
      maintenance_type: 'service'
    });
    setDrawerVisible(true);
  };

  const handleEdit = (record: Record<string, unknown>) => {
    setEditingRecord(record);
    form.setFieldsValue({
      vehicle_id: record.vehicle_id,
      maintenance_date: record.maintenance_date ? dayjs(String(record.maintenance_date)) : null,
      maintenance_type: record.maintenance_type,
      description: record.description,
      cost: record.cost,
      vendor: record.vendor,
      odometer_reading: record.odometer_reading,
      notes: record.notes,
    });
    setDrawerVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await vehicleMaintenanceApi.delete(id);
      message.success('Record deleted');
      loadData();
    } catch {
      message.error('Failed to delete record');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const data = {
        vehicle_id: values.vehicle_id,
        maintenance_date: values.maintenance_date.format('YYYY-MM-DD'),
        maintenance_type: values.maintenance_type,
        description: values.description,
        cost: values.cost || null,
        vendor: values.vendor || null,
        odometer_reading: values.odometer_reading || null,
        notes: values.notes || null,
      };

      if (editingRecord) {
        await vehicleMaintenanceApi.update(Number(editingRecord.id), data);
        message.success('Record updated');
      } else {
        await vehicleMaintenanceApi.create(data);
        message.success('Record created');
      }

      setDrawerVisible(false);
      loadData();
    } catch {
      message.error('Failed to save record');
    }
  };

  const columns = [
    { title: 'Date', dataIndex: 'maintenance_date', key: 'maintenance_date', width: 110, render: (d: string) => <span style={{ fontSize: '11px' }}>{dayjs(d).format('DD MMM YYYY')}</span> },
    {
      title: 'Vehicle',
      dataIndex: 'vehicle_id',
      key: 'vehicle_id',
      width: 150,
      render: (id: string, record: any) => (
        <div style={{ fontSize: '11px' }}>
          <div style={{ fontWeight: 600 }}>{id}</div>
          <div style={{ color: '#8c8c8c', fontSize: '10px' }}>
            {record.make_model || ''} {record.vehicle_type ? `(${record.vehicle_type})` : ''}
          </div>
        </div>
      )
    },
    {
      title: 'License Plate',
      dataIndex: 'license_plate',
      key: 'license_plate',
      width: 110,
      render: (plate: string) => <Tag color="blue" style={{ fontSize: '10px' }}>{plate || 'N/A'}</Tag>
    },
    {
      title: 'Type',
      dataIndex: 'maintenance_type',
      key: 'maintenance_type',
      width: 120,
      render: (type: string) => {
        const colors: Record<string, string> = { service: 'blue', repair: 'orange', inspection: 'green', emergency: 'red' };
        return <Tag color={colors[type] || 'default'} style={{ fontSize: '11px' }}>{type?.toUpperCase()}</Tag>;
      }
    },
    { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true, render: (t: string) => <span style={{ fontSize: '11px' }}>{t}</span> },
    { title: 'Cost (Rs.)', dataIndex: 'cost', key: 'cost', width: 100, render: (v: number) => <span style={{ fontSize: '11px' }}>Rs. {v?.toLocaleString()}</span> },
    { title: 'Vendor', dataIndex: 'vendor', key: 'vendor', width: 150, render: (t: string) => <span style={{ fontSize: '11px' }}>{t}</span> },
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

  const filteredRecords = records.filter(r => {
    const search = searchText.toLowerCase();
    return String(r.vehicle_id || '').toLowerCase().includes(search) ||
      String(r.description || '').toLowerCase().includes(search) ||
      String(r.make_model || '').toLowerCase().includes(search) ||
      String(r.license_plate || '').toLowerCase().includes(search) ||
      String(r.vendor || '').toLowerCase().includes(search);
  });

  const totalCost = filteredRecords.reduce((sum, r) => sum + Number(r.cost || 0), 0);
  const serviceCount = filteredRecords.filter(r => r.maintenance_type === 'service').length;
  const repairCount = filteredRecords.filter(r => r.maintenance_type === 'repair').length;

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>Vehicle Maintenance</h2>
        <Space>
          <Input.Search placeholder="Search..." value={searchText} onChange={(e) => setSearchText(e.target.value)} style={{ width: 250 }} />
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>Add Record</Button>
        </Space>
      </div>

      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card><Statistic title={<span style={{ fontSize: '12px' }}>Total Records</span>} value={filteredRecords.length} valueStyle={{ fontSize: '20px' }} prefix={<ToolOutlined />} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title={<span style={{ fontSize: '12px' }}>Total Cost</span>} value={totalCost} valueStyle={{ fontSize: '20px', color: '#52c41a' }} prefix="Rs." /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title={<span style={{ fontSize: '12px' }}>Services</span>} value={serviceCount} valueStyle={{ fontSize: '20px', color: '#1890ff' }} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title={<span style={{ fontSize: '12px' }}>Repairs</span>} value={repairCount} valueStyle={{ fontSize: '20px', color: '#faad14' }} /></Card>
        </Col>
      </Row>

      <Table columns={columns} dataSource={filteredRecords} rowKey="id" loading={loading} size="small" pagination={{ pageSize: 20 }} style={{ fontSize: '11px' }} />

      <Drawer
        title={editingRecord ? 'Edit Record' : 'Add Record'}
        placement="right"
        width={720}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        footer={<div style={{ textAlign: 'right' }}><Space><Button onClick={() => setDrawerVisible(false)}>Cancel</Button><Button type="primary" onClick={handleSubmit}>{editingRecord ? 'Update' : 'Create'}</Button></Space></div>}
      >
        <Form form={form} layout="vertical">
          <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: '12px 16px', marginBottom: '24px', borderRadius: '4px', fontSize: '14px', fontWeight: 600 }}>Maintenance Details</div>
          <Form.Item name="vehicle_id" label="Vehicle" rules={[{ required: true }]}>
            <Select
              showSearch
              placeholder="Select vehicle"
              optionFilterProp="label"
              filterOption={(input, option) =>
                (String(option?.label) ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={vehicles && vehicles.length > 0 ? vehicles.map((v) => ({
                value: v.vehicle_id,
                label: `${v.vehicle_id || 'N/A'} | ${v.make_model || ''} ${v.license_plate ? `(${v.license_plate})` : ''}`
              })) : []}
              notFoundContent={!vehicles || vehicles.length === 0 ? <span style={{ color: '#999' }}>No vehicles available</span> : null}
            />
          </Form.Item>
          <Form.Item name="maintenance_date" label="Date" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="maintenance_type" label="Type" rules={[{ required: true }]}>
            <Select placeholder="Select type">
              <Select.Option value="service">Service</Select.Option>
              <Select.Option value="repair">Repair</Select.Option>
              <Select.Option value="inspection">Inspection</Select.Option>
              <Select.Option value="emergency">Emergency</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="description" label="Description" rules={[{ required: true }]}><Input.TextArea rows={3} placeholder="Describe the maintenance work" /></Form.Item>
          <Form.Item name="cost" label="Cost (Rs.)" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} min={0} /></Form.Item>
          <Form.Item name="vendor" label="Vendor/Workshop"><Input placeholder="Workshop/Garage name" /></Form.Item>
          <Form.Item name="odometer_reading" label="Odometer Reading (km)"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item>
          <Form.Item name="notes" label="Notes"><Input.TextArea rows={2} placeholder="Additional notes" /></Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}
