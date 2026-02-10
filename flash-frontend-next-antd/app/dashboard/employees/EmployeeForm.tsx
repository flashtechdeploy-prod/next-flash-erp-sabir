'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { CameraOutlined, HolderOutlined, EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Form, Input, Button, Row, Col, DatePicker, InputNumber, Select, Divider, Upload, Modal, Space, Tag, message } from 'antd';
import { employeeApi } from '@/lib/api';
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

// Define field metadata
interface FieldConfig {
  id: string;
  label: string;
  name: string;
  span: number;
  component: 'input' | 'datepicker' | 'select' | 'inputnumber' | 'textarea' | 'upload';
  rules?: any[];
  options?: { label: string; value: string }[];
  placeholder?: string;
  section?: string;
}

const DEFAULT_FIELDS: FieldConfig[] = [
  // Enrolment Details (Top Section of Image)
  { id: 'profile_photo', label: 'Profile Picture', name: 'profile_photo', span: 24, component: 'upload', section: 'Enrolment Details' },
    {
    id: 'status', label: 'Status', name: 'status', span: 6, component: 'select', rules: [{ required: true, message: 'Status is required' }], section: 'Enrolment Details',
    options: [{ label: 'Active', value: 'Active' }, { label: 'Inactive', value: 'Inactive' }, { label: 'Suspended', value: 'Suspended' }]  },
  { id: 'fss_no', label: 'FSS Number', name: 'fss_no', span: 6, component: 'input', placeholder: 'FSS-2024-001', section: 'Enrolment Details' },
  { id: 'interviewed_by', label: 'Interviewed By', name: 'interviewed_by', span: 6, component: 'input', section: 'Enrolment Details' },
  { id: 'introduced_by', label: 'Introduced By', name: 'introduced_by', span: 6, component: 'input', section: 'Enrolment Details' },

  { id: 'enrolled_as', label: 'Enrolled As', name: 'enrolled_as', span: 6, component: 'input', placeholder: 'Security Guard', section: 'Enrolment Details' },
  { id: 'deployed_at', label: 'Deployed At', name: 'deployed_at', span: 12, component: 'input', placeholder: 'Site/Location', section: 'Enrolment Details' },

  { id: 'pay_rs', label: 'Pay (Rs)', name: 'pay_rs', span: 6, component: 'inputnumber', placeholder: '25000', section: 'Enrolment Details' },
  { id: 'bdm', label: 'BDM', name: 'bdm', span: 6, component: 'input', section: 'Enrolment Details' },


  {
    id: 'served_in', label: ' Past Experince', name: 'served_in', span: 6, component: 'input', rules: [{ required: false, message: 'Person Experience' }], section: 'Enrolment Details',
  },
  { id: 'experience_in_security', label: 'Experience in Security', name: 'experience_in_security', span: 6, component: 'input', section: 'Enrolment Details' },
  {
    id: 'person_status', label: 'Status (Army/Navy/etc)', name: 'person_status', span: 6, component: 'select', rules: [{ required: true, message: 'Person Status is required' }], section: 'Enrolment Details',
    options: [] // Will be populated dynamically
  },
  { id: 'unit', label: 'Unit', name: 'unit', span: 6, component: 'input', placeholder: 'Alpha/Bravo', section: 'Enrolment Details' },
  { id: 'rank', label: 'Rank', name: 'rank', span: 6, component: 'input', placeholder: 'Enter Rank', section: 'Enrolment Details' },

  { id: 'date_of_enrolment', label: 'Date of Enrolment', name: 'date_of_enrolment', span: 8, component: 'datepicker', section: 'Enrolment Details' },
  { id: 'date_of_re_enrolment', label: 'Date of Re-Enrolment', name: 'date_of_re_enrolment', span: 8, component: 'datepicker', section: 'Enrolment Details' },
  { id: 'agreement_date', label: 'Agreement Date', name: 'agreement_date', span: 12, component: 'datepicker', section: 'Verification & Documents' },
  { id: 'original_document_held', label: 'Original Doc Held', name: 'original_document_held', span: 8, component: 'input', placeholder: 'CNIC, Certificates', section: 'Enrolment Details' },

  // BIO DATA
  { id: 'full_name', label: 'Full Name', name: 'full_name', span: 6, component: 'input', rules: [{ required: true, message: 'Name is required' }], placeholder: 'Full name as per CNIC', section: 'Bio Data' },
  {
    id: 'blood_group', label: 'Blood Group', name: 'blood_group', span: 6, component: 'select', section: 'Bio Data',
    options: [{ label: 'A+', value: 'A+' }, { label: 'A-', value: 'A-' }, { label: 'B+', value: 'B+' }, { label: 'B-', value: 'B-' }, { label: 'O+', value: 'O+' }, { label: 'O-', value: 'O-' }, { label: 'AB+', value: 'AB+' }, { label: 'AB-', value: 'AB-' }]
  },

  { id: 'father_name', label: 'Father Name', name: 'father_name', span: 6, component: 'input', placeholder: "Father's name", section: 'Bio Data' },
  { id: 'gender', label: 'Gender', name: 'gender', span: 6, component: 'select', section: 'Bio Data', options: [{ label: 'Male', value: 'Male' }, { label: 'Female', value: 'Female' }] },

  { id: 'cnic', label: 'CNIC No', name: 'cnic', span: 6, component: 'input', placeholder: '12345-1234567-1', section: 'Bio Data' },
  { id: 'cnic_expiry_date', label: 'CNIC Expiry', name: 'cnic_expiry_date', span: 6, component: 'datepicker', section: 'Bio Data' },
  { id: 'date_of_birth', label: 'Date of Birth', name: 'date_of_birth', span: 6, component: 'datepicker', section: 'Bio Data' },
  { id: 'height', label: 'Height', name: 'height', span: 6, component: 'input', placeholder: "5'10\"", section: 'Bio Data' },

  { id: 'education', label: 'Civil Education', name: 'education', span: 8, component: 'input', placeholder: 'Matric/Inter/Graduate', section: 'Bio Data' },
  { id: 'medical_category', label: 'Med Cat & Cause of Disch', name: 'medical_category', span: 8, component: 'input', placeholder: 'A/B/C', section: 'Bio Data' },
  { id: 'phone', label: 'Personal Mobile No', name: 'phone', span: 8, component: 'input', placeholder: '03001234567', section: 'Bio Data' },
  { id: 'email', label: 'Email', name: 'email', span: 12, component: 'input', placeholder: 'email@example.com', section: 'Bio Data' },
  { id: 'main_number', label: 'Main Number', name: 'main_number', span: 12, component: 'input', placeholder: '03001234567', section: 'Bio Data' },
  { id: 'eobi_no', label: 'EOBI Number', name: 'eobi_no', span: 12, component: 'input', placeholder: 'EOBI account number', section: 'Bio Data' },
  { id: 'social_security', label: 'Social Security #', name: 'social_security', span: 12, component: 'input', placeholder: 'SSN or Social Security Number', section: 'Bio Data' },
  { id: 'insurance', label: 'Insurance #', name: 'insurance', span: 24, component: 'input', placeholder: 'Insurance details, policy number...', section: 'Bio Data' },


  // Permanent Address
  { id: 'permanent_village', label: 'Village/Mohalla', name: 'permanent_village', span: 8, component: 'input', section: 'Permanent Address' },
  { id: 'permanent_post_office', label: 'Post Office', name: 'permanent_post_office', span: 8, component: 'input', section: 'Permanent Address' },
  { id: 'permanent_thana', label: 'Thana', name: 'permanent_thana', span: 8, component: 'input', section: 'Permanent Address' },
  { id: 'permanent_tehsil', label: 'Tehsil', name: 'permanent_tehsil', span: 12, component: 'input', section: 'Permanent Address' },
  { id: 'permanent_district', label: 'District', name: 'permanent_district', span: 12, component: 'input', section: 'Permanent Address' },

  // Present Address
  { id: 'present_village', label: 'Village/Mohalla', name: 'present_village', span: 8, component: 'input', section: 'Present Address' },
  { id: 'present_post_office', label: 'Post Office', name: 'present_post_office', span: 8, component: 'input', section: 'Present Address' },
  { id: 'present_thana', label: 'Thana', name: 'present_thana', span: 8, component: 'input', section: 'Present Address' },
  { id: 'present_tehsil', label: 'Tehsil', name: 'present_tehsil', span: 12, component: 'input', section: 'Present Address' },
  { id: 'present_district', label: 'District', name: 'present_district', span: 12, component: 'input', section: 'Present Address' },

  // Family & NOK
  { id: 'sons', label: 'Sons', name: 'sons', span: 3, component: 'inputnumber', section: 'Family & Next of Kin' },
  { id: 'daughters', label: 'Daughters', name: 'daughters', span: 3, component: 'inputnumber', section: 'Family & Next of Kin' },
  { id: 'brothers', label: 'Brothers', name: 'brothers', span: 3, component: 'inputnumber', section: 'Family & Next of Kin' },
  { id: 'sisters', label: 'Sisters', name: 'sisters', span: 3, component: 'inputnumber', section: 'Family & Next of Kin' },
  { id: 'nok_name', label: 'NOK Name', name: 'nok_name', span: 8, component: 'input', placeholder: 'Next of Kin name', section: 'Family & Next of Kin' },
  { id: 'nok_cnic_no', label: 'NOK CNIC', name: 'nok_cnic_no', span: 8, component: 'input', placeholder: '12345-1234567-1', section: 'Family & Next of Kin' },
  { id: 'nok_mobile_no', label: 'NOK Mobile', name: 'nok_mobile_no', span: 8, component: 'input', placeholder: '03001234567', section: 'Family & Next of Kin' },
  { id: 'emergency_contact_number', label: 'Emergency Contact', name: 'emergency_contact_number', span: 8, component: 'input', placeholder: '03001234567', section: 'Family & Next of Kin' },

  // Verification & Documents
  { id: 'sho_verification_date', label: 'SHO Verification Date', name: 'sho_verification_date', span: 6, component: 'datepicker', section: 'Verification & Documents' },
  { id: 'ssp_verification_date', label: 'SSP Verification Date', name: 'ssp_verification_date', span: 6, component: 'datepicker', section: 'Verification & Documents' },
  { id: 'verified_by_khidmat_markaz', label: 'Al-Khidmat Verification Date', name: 'verified_by_khidmat_markaz', span: 6, component: 'datepicker', section: 'Verification & Documents' },
  { id: 'remarks', label: 'Remarks', name: 'remarks', span: 24, component: 'textarea', placeholder: 'Any additional notes...', section: 'Verification & Documents' },
];

function FormField({
  field,
  handleProfilePictureChange,
  onStatusManage,
}: {
  field: FieldConfig;
  handleProfilePictureChange: (e: any) => void;
  onStatusManage?: () => void;
}) {
  const renderComponent = () => {
    switch (field.component) {
      case 'input':
        return <Input placeholder={field.placeholder} />;
      case 'datepicker':
        return <DatePicker style={{ width: '100%' }} />;
      case 'select':
        return <Select placeholder="Select" options={field.options} showSearch optionFilterProp="label" />;
      case 'inputnumber':
        return <InputNumber style={{ width: '100%' }} min={0} placeholder={field.placeholder} />;
      case 'textarea':
        return <TextArea rows={3} placeholder={field.placeholder} />;
      case 'upload':
        return (
          <Upload
            maxCount={1}
            beforeUpload={() => false}
            listType="picture"
            accept="image/*"
            onChange={handleProfilePictureChange}
          >
            <Button icon={<CameraOutlined />}>Upload Picture</Button>
          </Upload>
        );
      default:
        return <Input />;
    }
  };

  return (
    <Col span={field.span}>
      <Form.Item
        label={
          field.id === 'person_status' ? (
            <div className="flex justify-between items-center w-full">
              <span>{field.label}</span>
              <Button
                type="link"
                size="small"
                icon={<EditOutlined style={{ fontSize: '12px' }} />}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onStatusManage?.();
                }}
                style={{ padding: 0, height: 'auto', marginLeft: '0px' }}
              >
                Manage
              </Button>
            </div>
          ) : field.label
        }
        name={field.name}
        rules={field.rules}
        {...(field.component === 'upload' ? {
          valuePropName: "fileList",
          getValueFromEvent: (e: any) => {
            if (Array.isArray(e)) return e;
            return e?.fileList || [];
          },
          normalize: (value: any) => {
            if (!value) return [];
            if (Array.isArray(value)) return value;
            return [];
          }
        } : {})}
        className="mb-4"
      >
        {renderComponent()}
      </Form.Item>
    </Col>
  );
}

// Separate component for managing statuses to avoid re-rendering form too often
function StatusManagementModal({ visible, onClose, onRefresh }: { visible: boolean, onClose: () => void, onRefresh: () => void }) {
  const [statuses, setStatuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingStatus, setEditingStatus] = useState<any>(null);
  const [form] = Form.useForm();

  const loadStatuses = async () => {
    setLoading(true);
    try {
      const response = await (employeeApi as any).getPersonStatuses();
      setStatuses(response.data || []);
    } catch (error) {
      message.error('Failed to load statuses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadStatuses();
    }
  }, [visible]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingStatus) {
        await (employeeApi as any).updatePersonStatus(editingStatus.id, values.name);
        message.success('Status updated');
      } else {
        await (employeeApi as any).createPersonStatus(values.name);
        message.success('Status added');
      }
      form.resetFields();
      setEditingStatus(null);
      loadStatuses();
      onRefresh();
    } catch (error) {
      console.error('Save error:', error);
      message.error('Failed to save status');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await (employeeApi as any).deletePersonStatus(id);
      message.success('Status deleted');
      loadStatuses();
      onRefresh();
    } catch (error) {
      message.error('Failed to delete status');
    }
  };

  return (
    <Modal
      title="Manage Person Statuses"
      open={visible}
      onCancel={() => {
        onClose();
        setEditingStatus(null);
        form.resetFields();
      }}
      onOk={handleSubmit}
      okText={editingStatus ? 'Update' : 'Add'}
      width={600}
    >
      <Form form={form} layout="vertical" style={{ marginBottom: 24 }}>
        <Form.Item name="name" label={editingStatus ? "Edit Status Name" : "New Status Name"} rules={[{ required: true, message: 'Please enter status name' }]}>
          <Input placeholder="Enter status name (e.g. Army, Civil, etc.)" />
        </Form.Item>
      </Form>

      <div style={{ marginTop: '24px' }}>
        <h4 style={{ marginBottom: '12px', fontWeight: 600 }}>Existing Statuses:</h4>
        <Space wrap>
          {statuses.map((status: any) => (
            <Tag key={status.id} color="blue" style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center' }}>
              {status.name}
              <Space style={{ marginLeft: '8px' }}>
                <EditOutlined
                  onClick={() => {
                    setEditingStatus(status);
                    form.setFieldsValue({ name: status.name });
                  }}
                  style={{ cursor: 'pointer' }}
                />
                <DeleteOutlined
                  onClick={() => {
                    Modal.confirm({
                      title: 'Delete Status?',
                      content: 'Are you sure you want to delete this status?',
                      okText: 'Delete',
                      okType: 'danger',
                      onOk: () => handleDelete(status.id),
                    });
                  }}
                  style={{ cursor: 'pointer' }}
                />
              </Space>
            </Tag>
          ))}
          {statuses.length === 0 && !loading && <span style={{ color: '#999' }}>No statuses found</span>}
        </Space>
      </div>
    </Modal>
  );
}

export default function EmployeeForm({
  initialValues,
  onSubmit,
  onCancel,
}: EmployeeFormProps) {
  const [form] = Form.useForm();
  const profilePhotoFileRef = useRef<any>(null);
  const [personStatuses, setPersonStatuses] = useState<any[]>([]);
  const [isStatusModalVisible, setIsStatusModalVisible] = useState(false);

  const loadPersonStatuses = async () => {
    try {
      const response = await (employeeApi as any).getPersonStatuses();
      if (response.data) {
        setPersonStatuses(response.data);
      }
    } catch (error) {
      console.error('Failed to load person statuses:', error);
    }
  };

  useEffect(() => {
    loadPersonStatuses();
  }, []);

  const handleProfilePictureChange = ({ fileList }: any) => {
    if (!Array.isArray(fileList)) {
      profilePhotoFileRef.current = null;
      return;
    }
    profilePhotoFileRef.current = fileList;
  };

  const handleSubmit = (values: Record<string, unknown>) => {
    const formattedValues = { ...values };
    const dateFields = ['cnic_expiry_date', 'date_of_birth', 'date_of_enrolment',
      'date_of_re_enrolment', 'agreement_date', 'sho_verification_date', 'ssp_verification_date', 'verified_by_khidmat_markaz'];

    dateFields.forEach(field => {
      if (formattedValues[field]) {
        formattedValues[field] = dayjs(formattedValues[field] as string).format('YYYY-MM-DD');
      }
    });

    delete formattedValues.profile_photo;

    if (profilePhotoFileRef.current && Array.isArray(profilePhotoFileRef.current) && profilePhotoFileRef.current.length > 0) {
      formattedValues._profilePhotoFile = profilePhotoFileRef.current;
    }

    onSubmit(formattedValues);
  };

  const getInitialValues = () => {
    if (!initialValues) return { status: 'Active', profile_photo: [] };
    const values = { ...initialValues };

    if (!values.date_of_birth && values.dob) values.date_of_birth = values.dob;
    if (!values.cnic_expiry_date && values.cnic_expiry) values.cnic_expiry_date = values.cnic_expiry;
    if (!values.phone && (values.mobile_number || values.mobile_no)) values.phone = values.mobile_number || values.mobile_no;

    const dateFields = ['cnic_expiry_date', 'date_of_birth', 'date_of_enrolment',
      'date_of_re_enrolment', 'agreement_date', 'sho_verification_date', 'ssp_verification_date', 'verified_by_khidmat_markaz'];

    dateFields.forEach(field => {
      const val = values[field];
      if (val && typeof val === 'string') {
        const d = dayjs(val);
        values[field] = d.isValid() ? d : null;
      }
    });

    if (values.profile_photo && typeof values.profile_photo === 'string') {
      values.profile_photo = [{
        uid: '-1',
        name: 'profile-photo.jpg',
        status: 'done',
        url: values.profile_photo as string,
      }];
    } else if (!values.profile_photo || !Array.isArray(values.profile_photo)) {
      values.profile_photo = [];
    }

    const services = ['Army', 'Navy', 'PAF', 'Police', 'FC', 'MJD', 'Civil'];
    if (!values.served_in && values.rank && services.includes(values.rank as string)) {
      values.served_in = values.rank;
      values.rank = null;
    }

    return values;
  };

  useEffect(() => {
    form.setFieldsValue(getInitialValues());
  }, [initialValues, form]);

  const renderedFields = useMemo(() => {
    let currentSection = '';
    return DEFAULT_FIELDS.map((field) => {
      // Modify options dynamically for person_status
      const fieldConfig = { ...field };
      if (field.id === 'person_status') {
        fieldConfig.options = personStatuses.map((s: any) => ({ label: s.name, value: s.name }));
      }

      const elements = [];
      if (field.section && field.section !== currentSection) {
        currentSection = field.section;
        elements.push(
          <Col span={24} key={`divider-${field.section}`}>
            <Divider>{field.section}</Divider>
          </Col>
        );
      }
      elements.push(
        <FormField
          key={field.id}
          field={fieldConfig}
          handleProfilePictureChange={handleProfilePictureChange}
          onStatusManage={() => setIsStatusModalVisible(true)}
        />
      );
      return elements;
    });
  }, [personStatuses]);

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={getInitialValues()}
      onFinish={handleSubmit}
      className="max-h-[70vh] overflow-y-auto overflow-x-hidden pr-4"
    >
      <Row gutter={16}>
        {renderedFields}
      </Row>

      <div className="flex justify-end items-center mt-4 pt-4 border-t sticky bottom-0 bg-white">
        <div className="flex gap-2">
          <Button onClick={onCancel}>Cancel</Button>
          <Button type="primary" htmlType="submit">
            {initialValues ? 'Update Employee' : 'Create Employee'}
          </Button>
        </div>
      </div>

      <StatusManagementModal
        visible={isStatusModalVisible}
        onClose={() => setIsStatusModalVisible(false)}
        onRefresh={loadPersonStatuses}
      />
    </Form>
  );
}
