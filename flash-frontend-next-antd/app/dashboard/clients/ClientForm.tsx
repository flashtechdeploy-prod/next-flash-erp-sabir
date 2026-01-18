'use client';

import { Form, Input, Button, Row, Col, Select, Divider } from 'antd';

const { TextArea } = Input;

interface ClientFormProps {
  initialValues?: Record<string, unknown> | null;
  onSubmit: (values: Record<string, unknown>) => void;
  onCancel: () => void;
}

export default function ClientForm({ initialValues, onSubmit, onCancel }: ClientFormProps) {
  const [form] = Form.useForm();

  const handleSubmit = (values: Record<string, unknown>) => {
    onSubmit(values);
  };

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={initialValues || { status: 'active' }}
      onFinish={handleSubmit}
      className="max-h-[70vh] overflow-y-auto pr-4"
    >
      <Divider>Basic Information</Divider>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item 
            label="Client Name" 
            name="name" 
            rules={[{ required: true, message: 'Client name is required' }]}
          >
            <Input placeholder="John Doe" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="Company Name" name="company_name">
            <Input placeholder="ABC Corporation" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item 
            label="Email" 
            name="email"
            rules={[{ type: 'email', message: 'Please enter a valid email' }]}
          >
            <Input placeholder="client@example.com" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="Phone" name="phone">
            <Input placeholder="03001234567" />
          </Form.Item>
        </Col>
      </Row>

      <Divider>Business Details</Divider>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label="Industry" name="industry">
            <Select placeholder="Select industry" options={[
              { label: 'Banking & Finance', value: 'Banking & Finance' },
              { label: 'Healthcare', value: 'Healthcare' },
              { label: 'Education', value: 'Education' },
              { label: 'Retail', value: 'Retail' },
              { label: 'Manufacturing', value: 'Manufacturing' },
              { label: 'Real Estate', value: 'Real Estate' },
              { label: 'Hospitality', value: 'Hospitality' },
              { label: 'Technology', value: 'Technology' },
              { label: 'Government', value: 'Government' },
              { label: 'Other', value: 'Other' },
            ]} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="Status" name="status" rules={[{ required: true }]}>
            <Select options={[
              { label: 'Active', value: 'active' },
              { label: 'Inactive', value: 'inactive' },
              { label: 'Pending', value: 'pending' },
            ]} />
          </Form.Item>
        </Col>
        <Col span={24}>
          <Form.Item label="Address" name="address">
            <TextArea rows={2} placeholder="Complete address" />
          </Form.Item>
        </Col>
        <Col span={24}>
          <Form.Item label="Notes" name="notes">
            <TextArea rows={3} placeholder="Any additional notes..." />
          </Form.Item>
        </Col>
      </Row>

      <div className="flex justify-end gap-2 mt-4 pt-4 border-t sticky bottom-0 bg-white">
        <Button onClick={onCancel}>Cancel</Button>
        <Button type="primary" htmlType="submit">
          {initialValues ? 'Update Client' : 'Create Client'}
        </Button>
      </div>
    </Form>
  );
}
