'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { Form, Input, Button, Row, Col, DatePicker, InputNumber, Select, Divider, Upload } from 'antd';
import { CameraOutlined, HolderOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis, restrictToFirstScrollableAncestor } from '@dnd-kit/modifiers';

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
  { id: 'profile_photo', label: 'Profile Picture', name: 'profile_photo', span: 24, component: 'upload', section: 'Basic Identification' },
  { id: 'full_name', label: 'Full Name', name: 'full_name', span: 8, component: 'input', rules: [{ required: true, message: 'Name is required' }], placeholder: 'Full name as per CNIC', section: 'Basic Identification' },
  { id: 'father_name', label: 'Father Name', name: 'father_name', span: 8, component: 'input', placeholder: "Father's name", section: 'Basic Identification' },
  { id: 'cnic', label: 'CNIC No', name: 'cnic', span: 8, component: 'input', placeholder: '12345-1234567-1', section: 'Basic Identification' },
  { id: 'cnic_expiry_date', label: 'CNIC Expiry', name: 'cnic_expiry_date', span: 6, component: 'datepicker', section: 'Basic Identification' },
  { id: 'date_of_birth', label: 'Date of Birth', name: 'date_of_birth', span: 6, component: 'datepicker', section: 'Basic Identification' },
  {
    id: 'blood_group', label: 'Blood Group', name: 'blood_group', span: 6, component: 'select', section: 'Basic Identification',
    options: [{ label: 'A+', value: 'A+' }, { label: 'A-', value: 'A-' }, { label: 'B+', value: 'B+' }, { label: 'B-', value: 'B-' }, { label: 'O+', value: 'O+' }, { label: 'O-', value: 'O-' }, { label: 'AB+', value: 'AB+' }, { label: 'AB-', value: 'AB-' }]
  },
  { id: 'gender', label: 'Gender', name: 'gender', span: 6, component: 'select', section: 'Basic Identification', options: [{ label: 'Male', value: 'Male' }, { label: 'Female', value: 'Female' }] },
  { id: 'height', label: 'Height', name: 'height', span: 6, component: 'input', placeholder: "5'10\"", section: 'Basic Identification' },
  { id: 'education', label: 'Education', name: 'education', span: 6, component: 'input', placeholder: 'Matric/Inter/Graduate', section: 'Basic Identification' },
  { id: 'phone', label: 'Mobile No', name: 'phone', span: 6, component: 'input', placeholder: '03001234567', section: 'Basic Identification' },
  { id: 'email', label: 'Email', name: 'email', span: 6, component: 'input', placeholder: 'email@example.com', section: 'Basic Identification' },

  {
    id: 'served_in', label: 'Person Status', name: 'served_in', span: 6, component: 'select', rules: [{ required: true, message: 'Person Status is required' }], section: 'Service Details',
    options: [{ label: 'Army', value: 'Army' }, { label: 'Navy', value: 'Navy' }, { label: 'PAF', value: 'PAF' }, { label: 'Police', value: 'Police' }, { label: 'FC', value: 'FC' }, { label: 'MJD', value: 'MJD' }, { label: 'Civil', value: 'Civil' }]
  },
  { id: 'eobi_no', label: 'EOBI Number', name: 'eobi_no', span: 6, component: 'input', placeholder: 'EOBI account number', section: 'Service Details' },
  { id: 'fss_no', label: 'FSS Number', name: 'fss_no', span: 6, component: 'input', placeholder: 'FSS-2024-001', section: 'Service Details' },
  {
    id: 'status', label: 'Status', name: 'status', span: 6, component: 'select', rules: [{ required: true }], section: 'Service Details',
    options: [{ label: 'Active', value: 'Active' }, { label: 'Inactive', value: 'Inactive' }, { label: 'Suspended', value: 'Suspended' }, { label: 'Left', value: 'Left' }]
  },
  { id: 'rank', label: 'Rank', name: 'rank', span: 6, component: 'input', placeholder: 'Enter Rank', section: 'Service Details' },
  { id: 'unit', label: 'Unit', name: 'unit', span: 6, component: 'input', placeholder: 'Alpha/Bravo', section: 'Service Details' },
  { id: 'enrolled_as', label: 'Enrolled As', name: 'enrolled_as', span: 6, component: 'input', placeholder: 'Security Guard', section: 'Service Details' },
  { id: 'date_of_enrolment', label: 'Date of Enrolment', name: 'date_of_enrolment', span: 6, component: 'datepicker', section: 'Service Details' },
  { id: 'deployed_at', label: 'Deployed At', name: 'deployed_at', span: 6, component: 'input', placeholder: 'Site/Location', section: 'Service Details' },
  { id: 'pay_rs', label: 'Pay (Rs)', name: 'pay_rs', span: 6, component: 'inputnumber', placeholder: '25000', section: 'Service Details' },
  { id: 'medical_category', label: 'Medical Category', name: 'medical_category', span: 6, component: 'input', placeholder: 'A/B/C', section: 'Service Details' },
  { id: 'interviewed_by', label: 'Interviewed By', name: 'interviewed_by', span: 6, component: 'input', section: 'Service Details' },
  { id: 'introduced_by', label: 'Introduced By', name: 'introduced_by', span: 6, component: 'input', section: 'Service Details' },
  { id: 'bdm', label: 'BDM', name: 'bdm', span: 6, component: 'input', section: 'Service Details' },

  // Permanent Address
  { id: 'permanent_village', label: 'Village/Mohalla', name: 'permanent_village', span: 6, component: 'input', section: 'Permanent Address' },
  { id: 'permanent_post_office', label: 'Post Office', name: 'permanent_post_office', span: 6, component: 'input', section: 'Permanent Address' },
  { id: 'permanent_thana', label: 'Thana', name: 'permanent_thana', span: 4, component: 'input', section: 'Permanent Address' },
  { id: 'permanent_tehsil', label: 'Tehsil', name: 'permanent_tehsil', span: 4, component: 'input', section: 'Permanent Address' },
  { id: 'permanent_district', label: 'District', name: 'permanent_district', span: 4, component: 'input', section: 'Permanent Address' },

  // Present Address
  { id: 'present_village', label: 'Village/Mohalla', name: 'present_village', span: 6, component: 'input', section: 'Present Address' },
  { id: 'present_post_office', label: 'Post Office', name: 'present_post_office', span: 6, component: 'input', section: 'Present Address' },
  { id: 'present_thana', label: 'Thana', name: 'present_thana', span: 4, component: 'input', section: 'Present Address' },
  { id: 'present_tehsil', label: 'Tehsil', name: 'present_tehsil', span: 4, component: 'input', section: 'Present Address' },
  { id: 'present_district', label: 'District', name: 'present_district', span: 4, component: 'input', section: 'Present Address' },

  // Family & NOK
  { id: 'sons', label: 'Sons', name: 'sons', span: 3, component: 'inputnumber', section: 'Family & Next of Kin' },
  { id: 'daughters', label: 'Daughters', name: 'daughters', span: 3, component: 'inputnumber', section: 'Family & Next of Kin' },
  { id: 'brothers', label: 'Brothers', name: 'brothers', span: 3, component: 'inputnumber', section: 'Family & Next of Kin' },
  { id: 'sisters', label: 'Sisters', name: 'sisters', span: 3, component: 'inputnumber', section: 'Family & Next of Kin' },
  { id: 'nok_name', label: 'NOK Name', name: 'nok_name', span: 6, component: 'input', placeholder: 'Next of Kin name', section: 'Family & Next of Kin' },
  { id: 'nok_cnic_no', label: 'NOK CNIC', name: 'nok_cnic_no', span: 6, component: 'input', placeholder: '12345-1234567-1', section: 'Family & Next of Kin' },
  { id: 'nok_mobile_no', label: 'NOK Mobile', name: 'nok_mobile_no', span: 6, component: 'input', placeholder: '03001234567', section: 'Family & Next of Kin' },
  { id: 'emergency_contact_number', label: 'Emergency Contact', name: 'emergency_contact_number', span: 6, component: 'input', placeholder: '03001234567', section: 'Family & Next of Kin' },

  // Verification & Documents
  { id: 'sho_verification_date', label: 'SHO Verification Date', name: 'sho_verification_date', span: 6, component: 'datepicker', section: 'Verification & Documents' },
  { id: 'ssp_verification_date', label: 'SSP Verification Date', name: 'ssp_verification_date', span: 6, component: 'datepicker', section: 'Verification & Documents' },
  { id: 'verified_by_khidmat_markaz', label: 'Al-Khidmat Verification Date', name: 'verified_by_khidmat_markaz', span: 6, component: 'datepicker', section: 'Verification & Documents' },
  { id: 'social_security', label: 'Social Security #', name: 'social_security', span: 6, component: 'input', placeholder: 'SSN or Social Security Number', section: 'Verification & Documents' },
  { id: 'agreement_date', label: 'Agreement Date', name: 'agreement_date', span: 6, component: 'datepicker', section: 'Verification & Documents' },
  { id: 'original_document_held', label: 'Documents Held', name: 'original_document_held', span: 6, component: 'input', placeholder: 'CNIC, Certificates', section: 'Verification & Documents' },
  { id: 'insurance', label: 'Insurance', name: 'insurance', span: 24, component: 'textarea', placeholder: 'Insurance details, policy number, coverage...', section: 'Verification & Documents' },
  { id: 'remarks', label: 'Remarks', name: 'remarks', span: 24, component: 'textarea', placeholder: 'Any additional notes...', section: 'Verification & Documents' },
];

function SortableField({
  field,
  handleProfilePictureChange,
}: {
  field: FieldConfig;
  handleProfilePictureChange: (e: any) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 1,
    opacity: isDragging ? 0.5 : 1,
    cursor: 'default',
  };

  const renderComponent = () => {
    switch (field.component) {
      case 'input':
        return <Input placeholder={field.placeholder} />;
      case 'datepicker':
        return <DatePicker style={{ width: '100%' }} />;
      case 'select':
        return <Select placeholder="Select" options={field.options} />;
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
    <Col span={field.span} ref={setNodeRef} style={style}>
      <div className="group relative border border-transparent hover:border-blue-200 hover:bg-blue-50/10 rounded-lg p-1 transition-all">
        <div
          {...attributes}
          {...listeners}
          className="absolute -left-1 top-2 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-blue-500 transition-opacity z-10"
        >
          <HolderOutlined />
        </div>
        <Form.Item
          label={field.label}
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
          className="!mb-4 pl-4"
        >
          {renderComponent()}
        </Form.Item>
      </div>
    </Col>
  );
}

export default function EmployeeForm({
  initialValues,
  onSubmit,
  onCancel,
}: EmployeeFormProps) {
  const [form] = Form.useForm();
  const profilePhotoFileRef = useRef<any>(null);
  const [fields, setFields] = useState<FieldConfig[]>(DEFAULT_FIELDS);

  // Load saved order from localStorage
  useEffect(() => {
    const savedOrder = localStorage.getItem('employee_form_field_order');
    if (savedOrder) {
      try {
        const orderIds = JSON.parse(savedOrder) as string[];
        const orderedFields = orderIds
          .map(id => DEFAULT_FIELDS.find(f => f.id === id))
          .filter((f): f is FieldConfig => !!f);

        // Add any new fields that might not be in the saved order
        const missingFields = DEFAULT_FIELDS.filter(f => !orderIds.includes(f.id));
        setFields([...orderedFields, ...missingFields]);
      } catch (e) {
        console.error('Failed to parse saved field order', e);
      }
    }
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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setFields((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);

        // Save new order to localStorage
        localStorage.setItem('employee_form_field_order', JSON.stringify(newItems.map(i => i.id)));

        return newItems;
      });
    }
  };

  const handleResetLayout = () => {
    localStorage.removeItem('employee_form_field_order');
    setFields(DEFAULT_FIELDS);
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

  // Group fields by section for rendering (optional but keeps headers)
  // Or just render them all in order and insert dividers when section changes
  const renderedFields = useMemo(() => {
    let currentSection = '';
    return fields.reduce((acc: React.ReactNode[], field) => {
      if (field.section && field.section !== currentSection) {
        currentSection = field.section;
        acc.push(
          <Col span={24} key={`divider-${field.section}`}>
            <Divider>{field.section}</Divider>
          </Col>
        );
      }
      acc.push(
        <SortableField
          key={field.id}
          field={field}
          handleProfilePictureChange={handleProfilePictureChange}
        />
      );
      return acc;
    }, []);
  }, [fields]);

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={getInitialValues()}
      onFinish={handleSubmit}
      className="max-h-[70vh] overflow-y-auto pr-4"
    >
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToFirstScrollableAncestor]}
      >
        <SortableContext
          items={fields.map(f => f.id)}
          strategy={verticalListSortingStrategy}
        >
          <Row gutter={16}>
            {renderedFields}
          </Row>
        </SortableContext>
      </DndContext>

      <div className="flex justify-between items-center mt-4 pt-4 border-t sticky bottom-0 bg-white">
        <Button onClick={handleResetLayout} variant="text" color="danger" size="small">
          Reset Layout
        </Button>
        <div className="flex gap-2">
          <Button onClick={onCancel}>Cancel</Button>
          <Button type="primary" htmlType="submit">
            {initialValues ? 'Update Employee' : 'Create Employee'}
          </Button>
        </div>
      </div>
    </Form>
  );
}
