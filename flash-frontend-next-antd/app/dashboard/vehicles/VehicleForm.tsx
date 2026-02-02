'use client';

import { Form, Input, Button, Row, Col, InputNumber, Select, Divider, AutoComplete, DatePicker } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { vehicleApi } from '@/lib/api';
import { DownOutlined } from '@ant-design/icons';

interface VehicleFormProps {
  initialValues?: Record<string, unknown> | null;
  onSubmit: (values: Record<string, unknown>) => void;
  onCancel: () => void;
  allVehicles?: Array<Record<string, unknown>>;
}

export default function VehicleForm({ initialValues, onSubmit, onCancel, allVehicles = [] }: VehicleFormProps) {
  const [form] = Form.useForm();
  const [nextVehicleId, setNextVehicleId] = useState<string>('FCID-001');

  useEffect(() => {
    if (!initialValues) {
      const generateNextId = () => {
        const existingIds = allVehicles
          .map(v => v.vehicle_id as string)
          .filter(id => id && id.startsWith('FCID-'))
          .map(id => {
            const num = parseInt(id.replace('FCID-', ''), 10);
            return isNaN(num) ? 0 : num;
          });

        const maxNum = existingIds.length > 0 ? Math.max(...existingIds) : 0;
        const nextNum = maxNum + 1;
        const newId = `FCID-${String(nextNum).padStart(3, '0')}`;
        return newId;
      };

      const newId = generateNextId();
      setNextVehicleId(newId);
      form.setFieldValue('vehicle_id', newId);
    }
  }, [initialValues, allVehicles, form]);

  const [categories, setCategories] = useState<string[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<string[]>([]);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [catRes, typeRes] = await Promise.all([
          vehicleApi.getCategories(),
          vehicleApi.getTypes()
        ]);

        if (!catRes.error && Array.isArray(catRes.data)) {
          setCategories(catRes.data as string[]);
        }
        if (!typeRes.error && Array.isArray(typeRes.data)) {
          setVehicleTypes(typeRes.data as string[]);
        }
      } catch (error) {
        console.error('Failed to fetch options:', error);
      }
    };
    fetchOptions();
  }, []);

  const categoryOptions = categories
    .filter(Boolean)
    .sort()
    .map(c => ({ value: c, label: c }));

  const vehicleTypeOptions = vehicleTypes
    .filter(Boolean)
    .sort()
    .map(t => ({ value: t, label: t }));

  const handleSubmit = (values: Record<string, unknown>) => {
    onSubmit(values);
  };

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={initialValues ? {
        ...initialValues,
        registration_date: initialValues.registration_date ? dayjs(initialValues.registration_date as string) : null
      } : { status: 'active', compliance: 'compliant', government_permit: 'valid' }}
      onFinish={(values) => {
        const data = {
          ...values,
          registration_date: values.registration_date ? (values.registration_date as any).format('YYYY-MM-DD') : undefined
        };
        onSubmit(data);
      }}
      className="max-h-[70vh] overflow-y-auto pr-4"
    >
      <Divider>Basic Information</Divider>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            label="Vehicle ID"
            name="vehicle_id"
            rules={[{ required: true, message: 'Vehicle ID is required' }]}
          >
            <Input placeholder="FCID-001" disabled />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            label="Vehicle Type"
            name="vehicle_type"
            rules={[{ required: true, message: 'Vehicle type is required' }]}
          >
            <AutoComplete
              placeholder="Select or type vehicle type"
              options={vehicleTypeOptions}
              filterOption={(inputValue, option) =>
                String(option?.value).toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
              }
            >
              <Input suffix={<DownOutlined style={{ color: 'rgba(0,0,0,.25)' }} />} />
            </AutoComplete>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            label="Category"
            name="category"
            rules={[{ required: true, message: 'Category is required' }]}
          >
            <AutoComplete
              placeholder="Select or type category"
              options={categoryOptions}
              filterOption={(inputValue, option) =>
                String(option?.value).toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
              }
            >
              <Input suffix={<DownOutlined style={{ color: 'rgba(0,0,0,.25)' }} />} />
            </AutoComplete>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            label="Make/Model"
            name="make_model"
            rules={[{ required: true, message: 'Make/Model is required' }]}
          >
            <Input placeholder="Toyota Corolla 2020" />
          </Form.Item>
        </Col>
      </Row>

      <Divider>Registration Details</Divider>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            label="License Plate"
            name="license_plate"
            rules={[{ required: true, message: 'License plate is required' }]}
          >
            <Input placeholder="ABC-123" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="Chassis Number" name="chassis_number">
            <Input placeholder="1HGBH41JXMN109186" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="Asset Tag" name="asset_tag">
            <Input placeholder="ASSET-001" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="Year" name="year">
            <InputNumber style={{ width: '100%' }} min={1900} max={2100} placeholder="2020" />
          </Form.Item>
        </Col>
        {!initialValues && (
          <Col span={12}>
            <Form.Item label="Registration Date" name="registration_date">
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        )}
      </Row>

      <Divider>Status & Compliance</Divider>
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item label="Status" name="status" rules={[{ required: true }]}>
            <Select options={[
              { label: 'Active', value: 'active' },
              { label: 'Inactive', value: 'inactive' },
              { label: 'Maintenance', value: 'maintenance' },
              { label: 'Retired', value: 'retired' },
            ]} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label="Compliance" name="compliance">
            <Select options={[
              { label: 'Compliant', value: 'compliant' },
              { label: 'Non-Compliant', value: 'non-compliant' },
              { label: 'Pending', value: 'pending' },
            ]} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label="Government Permit" name="government_permit">
            <Select options={[
              { label: 'Valid', value: 'valid' },
              { label: 'Expired', value: 'expired' },
              { label: 'Pending', value: 'pending' },
            ]} />
          </Form.Item>
        </Col>
      </Row>

      <Divider>Fuel Management</Divider>
      <Row gutter={16}>
        <Col span={24}>
          <Form.Item
            label="Monthly Fuel Limit (Liters)"
            name="fuel_limit_monthly"
            extra="Set a monthly fuel consumption limit. You'll be notified when this vehicle exceeds the limit."
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              placeholder="e.g., 200"
              addonAfter="Liters"
            />
          </Form.Item>
        </Col>
      </Row>

      <div className="flex justify-end gap-2 mt-4 pt-4 border-t sticky bottom-0 bg-white">
        <Button onClick={onCancel}>Cancel</Button>
        <Button type="primary" htmlType="submit">
          {initialValues ? 'Update Vehicle' : 'Create Vehicle'}
        </Button>
      </div>
    </Form>
  );
}
