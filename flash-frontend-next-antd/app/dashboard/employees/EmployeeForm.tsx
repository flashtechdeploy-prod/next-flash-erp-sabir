'use client';

import { Form, Input, Button, Row, Col, DatePicker, InputNumber, Select, Divider } from 'antd';
import dayjs from 'dayjs';

const { TextArea } = Input;

interface EmployeeFormProps {
  initialValues?: Record<string, unknown> | null;
  onSubmit: (values: Record<string, unknown>) => void;
  onCancel: () => void;
}

const DOCUMENT_CATEGORIES = [
  { label: 'CNIC (Front)', value: 'cnic_front' },
  { label: 'CNIC (Back)', value: 'cnic_back' },
  { label: 'Photo', value: 'photo' },
  { label: 'Educational Certificate', value: 'education_cert' },
  { label: 'Experience Letter', value: 'experience_letter' },
  { label: 'Police Verification', value: 'police_verification' },
  { label: 'Medical Certificate', value: 'medical_cert' },
  { label: 'Agreement/Contract', value: 'agreement' },
  { label: 'NOK CNIC', value: 'nok_cnic' },
  { label: 'Domicile', value: 'domicile' },
  { label: 'Character Certificate', value: 'character_cert' },
  { label: 'Other', value: 'other' },
];

export { DOCUMENT_CATEGORIES };

export default function EmployeeForm({
  initialValues,
  onSubmit,
  onCancel,
}: EmployeeFormProps) {
  const [form] = Form.useForm();

  const handleSubmit = (values: Record<string, unknown>) => {
    const formattedValues = { ...values };
    
    // Convert dates to strings
    const dateFields = ['cnic_expiry_date', 'date_of_birth', 'date_of_enrolment', 
      'date_of_re_enrolment', 'agreement_date', 'sho_verification_date', 'ssp_verification_date'];
    
    dateFields.forEach(field => {
      if (formattedValues[field]) {
        formattedValues[field] = dayjs(formattedValues[field] as string).format('YYYY-MM-DD');
      }
    });
    
    onSubmit(formattedValues);
  };

  // Convert string dates to dayjs for initial values
  const getInitialValues = () => {
    if (!initialValues) return { status: 'Active' };
    
    const values = { ...initialValues };
    const dateFields = ['cnic_expiry_date', 'date_of_birth', 'date_of_enrolment', 
      'date_of_re_enrolment', 'agreement_date', 'sho_verification_date', 'ssp_verification_date'];
    
    dateFields.forEach(field => {
      const val = values[field];
      if (val && typeof val === 'string') {
        values[field] = dayjs(val);
      }
    });
    
    return values;
  };

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={getInitialValues()}
      onFinish={handleSubmit}
      className="max-h-[70vh] overflow-y-auto pr-4"
    >
      {/* BASIC IDENTIFICATION */}
      <Divider>Basic Identification</Divider>
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item label="Full Name" name="full_name" rules={[{ required: true, message: 'Name is required' }]}>
            <Input placeholder="Full name as per CNIC" />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label="Father Name" name="father_name">
            <Input placeholder="Father's name" />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label="CNIC No" name="cnic">
            <Input placeholder="12345-1234567-1" />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item label="CNIC Expiry" name="cnic_expiry_date">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item label="Date of Birth" name="date_of_birth">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item label="Blood Group" name="blood_group">
            <Select placeholder="Select" options={[
              { label: 'A+', value: 'A+' }, { label: 'A-', value: 'A-' },
              { label: 'B+', value: 'B+' }, { label: 'B-', value: 'B-' },
              { label: 'O+', value: 'O+' }, { label: 'O-', value: 'O-' },
              { label: 'AB+', value: 'AB+' }, { label: 'AB-', value: 'AB-' },
            ]} />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item label="Gender" name="gender">
            <Select placeholder="Select" options={[
              { label: 'Male', value: 'Male' },
              { label: 'Female', value: 'Female' },
            ]} />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item label="Height" name="height">
            <Input placeholder="5'10&quot;" />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item label="Education" name="education">
            <Input placeholder="Matric/Inter/Graduate" />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item label="Mobile No" name="phone">
            <Input placeholder="03001234567" />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item label="Email" name="email">
            <Input placeholder="email@example.com" />
          </Form.Item>
        </Col>
      </Row>

      {/* SERVICE DETAILS */}
      <Divider>Service Details</Divider>
      <Row gutter={16}>
        <Col span={6}>
          <Form.Item label="FSS Number" name="fss_number">
            <Input placeholder="FSS-2024-001" />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item label="Rank" name="rank">
            <Input placeholder="Guard/Supervisor" />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item label="Unit" name="unit">
            <Input placeholder="Alpha/Bravo" />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item label="Status" name="status" rules={[{ required: true }]}>
            <Select options={[
              { label: 'Active', value: 'Active' },
              { label: 'Inactive', value: 'Inactive' },
              { label: 'Suspended', value: 'Suspended' },
              { label: 'Left', value: 'Left' },
            ]} />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item label="Enrolled As" name="enrolled_as">
            <Input placeholder="Security Guard" />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item label="Date of Enrolment" name="date_of_enrolment">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item label="Deployed At" name="deployed_at">
            <Input placeholder="Site/Location" />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item label="Pay (Rs)" name="pay_rs">
            <InputNumber style={{ width: '100%' }} min={0} placeholder="25000" />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item label="Medical Category" name="medical_category">
            <Input placeholder="A/B/C" />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item label="Interviewed By" name="interviewed_by">
            <Input />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item label="Introduced By" name="introduced_by">
            <Input />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item label="BDM" name="bdm">
            <Input />
          </Form.Item>
        </Col>
      </Row>

      {/* ADDRESS */}
      <Divider>Permanent Address</Divider>
      <Row gutter={16}>
        <Col span={6}>
          <Form.Item label="Village/Mohalla" name="permanent_village">
            <Input />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item label="Post Office" name="permanent_post_office">
            <Input />
          </Form.Item>
        </Col>
        <Col span={4}>
          <Form.Item label="Thana" name="permanent_thana">
            <Input />
          </Form.Item>
        </Col>
        <Col span={4}>
          <Form.Item label="Tehsil" name="permanent_tehsil">
            <Input />
          </Form.Item>
        </Col>
        <Col span={4}>
          <Form.Item label="District" name="permanent_district">
            <Input />
          </Form.Item>
        </Col>
      </Row>

      <Divider>Present Address</Divider>
      <Row gutter={16}>
        <Col span={6}>
          <Form.Item label="Village/Mohalla" name="present_village">
            <Input />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item label="Post Office" name="present_post_office">
            <Input />
          </Form.Item>
        </Col>
        <Col span={4}>
          <Form.Item label="Thana" name="present_thana">
            <Input />
          </Form.Item>
        </Col>
        <Col span={4}>
          <Form.Item label="Tehsil" name="present_tehsil">
            <Input />
          </Form.Item>
        </Col>
        <Col span={4}>
          <Form.Item label="District" name="present_district">
            <Input />
          </Form.Item>
        </Col>
      </Row>

      {/* FAMILY & NOK */}
      <Divider>Family & Next of Kin</Divider>
      <Row gutter={16}>
        <Col span={3}>
          <Form.Item label="Sons" name="sons">
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
        </Col>
        <Col span={3}>
          <Form.Item label="Daughters" name="daughters">
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
        </Col>
        <Col span={3}>
          <Form.Item label="Brothers" name="brothers">
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
        </Col>
        <Col span={3}>
          <Form.Item label="Sisters" name="sisters">
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item label="NOK Name" name="nok_name">
            <Input placeholder="Next of Kin name" />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item label="NOK CNIC" name="nok_cnic_no">
            <Input placeholder="12345-1234567-1" />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item label="NOK Mobile" name="nok_mobile_no">
            <Input placeholder="03001234567" />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item label="Emergency Contact" name="emergency_contact_number">
            <Input placeholder="03001234567" />
          </Form.Item>
        </Col>
      </Row>

      {/* VERIFICATION & DOCUMENTS */}
      <Divider>Verification & Documents</Divider>
      <Row gutter={16}>
        <Col span={6}>
          <Form.Item label="SHO Verification Date" name="sho_verification_date">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item label="SSP Verification Date" name="ssp_verification_date">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item label="Agreement Date" name="agreement_date">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item label="Documents Held" name="original_document_held">
            <Input placeholder="CNIC, Certificates" />
          </Form.Item>
        </Col>
        <Col span={24}>
          <Form.Item label="Remarks" name="remarks">
            <TextArea rows={2} placeholder="Any additional notes..." />
          </Form.Item>
        </Col>
      </Row>

      {/* FORM ACTIONS */}
      <div className="flex justify-end gap-2 mt-4 pt-4 border-t sticky bottom-0 bg-white">
        <Button onClick={onCancel}>Cancel</Button>
        <Button type="primary" htmlType="submit">
          {initialValues ? 'Update Employee' : 'Create Employee'}
        </Button>
      </div>
    </Form>
  );
}
