'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Card, Button, Space, Table, Drawer, Form, Input, Upload,
  Popconfirm, Tag, Spin, Select, Image, App
} from 'antd';
import {
  ArrowLeftOutlined, EditOutlined, DeleteOutlined, UploadOutlined,
  FilePdfOutlined, EyeOutlined, DownloadOutlined, PrinterOutlined
} from '@ant-design/icons';
import { employeeApi } from '@/lib/api';
import EmployeeForm, { DOCUMENT_CATEGORIES } from '../EmployeeForm';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Helper function to build full URL from file path
const getFullFileUrl = (filePath: string): string => {
  if (!filePath) return '';
  const decodedPath = decodeURIComponent(filePath);
  if (decodedPath.startsWith('http')) {
    return decodedPath;
  }
  // Remove leading slash if present to avoid double slashes
  const cleanPath = decodedPath.startsWith('/') ? decodedPath : `/${decodedPath}`;
  return `${API_BASE}${cleanPath}`;
};

// Field component moved outside to avoid re-creation during render
const Field = ({ label, value }: { label: string; value: unknown }) => (
  <div className="field">
    <div className="field-label"><strong>{label}:</strong></div>
    <div className="field-value">{String(value || '-')}</div>
  </div>
);

export default function EmployeeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const employeeId = params.id as string;
  const printRef = useRef<HTMLDivElement>(null);
  const { message } = App.useApp();

  const [employee, setEmployee] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [editDrawerVisible, setEditDrawerVisible] = useState(false);
  const [uploadDrawerVisible, setUploadDrawerVisible] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewFile, setPreviewFile] = useState<string>('');
  const [uploadForm] = Form.useForm();

  const fetchEmployee = async () => {
    setLoading(true);
    const response = await employeeApi.getOne(employeeId);
    setLoading(false);
    if (response.error) {
      message.error(response.error);
      return;
    }
    console.log('=== EMPLOYEE DATA FETCHED ===');
    console.log('Full response:', response);
    const employeeData = response.data as Record<string, unknown>;
    console.log('Employee data:', employeeData);
    console.log('Documents:', employeeData.documents);
    if (Array.isArray(employeeData.documents)) {
      employeeData.documents.forEach((doc: any) => {
        console.log('Document:', doc);
      });
    }
    setEmployee(employeeData);
  };

  useEffect(() => {
    fetchEmployee();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  const handleUpdate = async (values: Record<string, unknown>) => {
    const response = await employeeApi.update(employeeId, values);
    if (response.error) {
      message.error(response.error);
      return;
    }
    message.success('Employee updated');
    setEditDrawerVisible(false);
    fetchEmployee();
  };

  const handleDelete = async () => {
    const response = await employeeApi.delete(employeeId);
    if (response.error) {
      message.error(response.error);
      return;
    }
    message.success('Employee deleted');
    router.push('/dashboard/employees');
  };

  const handleUploadDocument = async (values: { category: string; custom_title?: string; file: any }) => {
    if (!employee?.id) return;

    let file: File | undefined;

    // Handle file from Upload component (normalized by getValueFromEvent)
    const fileList = Array.isArray(values.file) ? values.file : values.file?.fileList;
    if (fileList && fileList.length > 0) {
      const fileObj = fileList[0];
      if (fileObj.originFileObj) {
        file = fileObj.originFileObj;
      }
    }

    if (!file) {
      message.error('Please select a file');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', values.custom_title || values.category);
      formData.append('category', values.category);

      console.log('Uploading document:', file.name, 'Category:', values.category);
      const response = await employeeApi.uploadDocument(employee.id as number, formData);

      console.log('Upload response:', response);

      if (response.error) {
        message.error(response.error);
        return;
      }
      message.success('Document uploaded successfully');
      setUploadDrawerVisible(false);
      uploadForm.resetFields();
      fetchEmployee();
    } catch (error) {
      console.error('Upload error:', error);
      message.error('Failed to upload document');
    }
  };

  const handleDeleteDocument = async (docId: number) => {
    if (!employee?.id) return;
    const response = await employeeApi.deleteDocument(employee.id as number, docId);
    if (response.error) {
      message.error(response.error);
      return;
    }
    message.success('Document deleted');
    fetchEmployee();
  };

  const handlePreviewFile = (filePath: string) => {
    const fullUrl = getFullFileUrl(filePath);
    console.log('Preview file path:', filePath);
    console.log('Preview full URL:', fullUrl);
    setPreviewFile(fullUrl);
    setPreviewVisible(true);
  };

  const handlePrintReport = () => {
    const printContent = printRef.current;
    if (!printContent) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Build documents HTML
    let documentsHTML = '';
    if (documents.length > 0) {
      documentsHTML = `
        <div class="section page-break">
          <div class="section-title">Uploaded Documents</div>
          <table class="doc-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>File Name</th>
                <th>Upload Date</th>
              </tr>
            </thead>
            <tbody>
              ${documents.map((doc: Record<string, unknown>) => `
                <tr>
                  <td>${DOCUMENT_CATEGORIES.find(c => c.value === doc.category)?.label || doc.category}</td>
                  <td>${doc.filename}</td>
                  <td>${doc.created_at ? new Date(doc.created_at as string).toLocaleDateString() : '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    printWindow.document.write(`<!DOCTYPE html><html><head>
      <title>Employee Report - ${employee?.full_name || employee?.employee_id}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Arial', sans-serif; padding: 30px; font-size: 11px; color: #333; }
        .header { 
          text-align: center; 
          border-bottom: 3px solid #1890ff; 
          padding-bottom: 15px; 
          margin-bottom: 25px;
          position: relative;
        }
        .logo { 
          width: 80px; 
          height: 80px; 
          margin: 0 auto 10px;
          background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 32px;
          font-weight: bold;
        }
        .header h1 { 
          margin: 10px 0 5px; 
          font-size: 28px; 
          color: #1890ff;
          font-weight: bold;
          letter-spacing: 2px;
        }
        .header p { 
          color: #666; 
          font-size: 13px;
          margin-top: 5px;
        }
        .report-meta {
          text-align: right;
          margin-bottom: 20px;
          font-size: 10px;
          color: #888;
        }
        .section { 
          margin-bottom: 25px; 
          page-break-inside: avoid;
        }
        .section-title { 
          font-size: 15px; 
          font-weight: bold; 
          background: linear-gradient(to right, #1890ff, #40a9ff);
          color: white;
          padding: 10px 15px; 
          margin-bottom: 15px;
          border-radius: 4px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .field-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px 20px;
        }
        .field { 
          padding: 8px 0;
          border-bottom: 1px solid #f0f0f0;
        }
        .field-label { 
          font-size: 9px; 
          color: #1890ff;
          text-transform: uppercase; 
          font-weight: bold;
          margin-bottom: 4px;
          letter-spacing: 0.5px;
        }
        .field-value { 
          font-size: 12px; 
          color: #333;
          font-weight: 500;
        }
        .address-field {
          grid-column: span 3;
        }
        .doc-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }
        .doc-table th {
          background: #f5f5f5;
          padding: 10px;
          text-align: left;
          font-weight: bold;
          border: 1px solid #ddd;
          font-size: 11px;
        }
        .doc-table td {
          padding: 8px 10px;
          border: 1px solid #ddd;
          font-size: 11px;
        }
        .doc-table tr:nth-child(even) {
          background: #fafafa;
        }
        .signature-section {
          margin-top: 60px;
          display: flex;
          justify-content: space-between;
          page-break-inside: avoid;
        }
        .signature-box {
          text-align: center;
          width: 200px;
        }
        .signature-line {
          border-top: 2px solid #333;
          margin-top: 60px;
          margin-bottom: 8px;
        }
        .signature-label {
          font-size: 11px;
          color: #666;
          font-weight: bold;
        }
        .page-break {
          page-break-before: always;
        }
        .footer {
          margin-top: 40px;
          padding-top: 15px;
          border-top: 2px solid #1890ff;
          text-align: center;
          font-size: 10px;
          color: #888;
        }
        @media print { 
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          .page-break { page-break-before: always; }
        }
      </style></head><body>
      <div class="header">
        <div class="logo">FS</div>
        <h1>FLASH SECURITY</h1>
        <p>Employee Service Record & Documentation</p>
      </div>
      <div class="report-meta">
        <div>Report Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</div>
        <div>Employee ID: ${employee?.employee_id || 'N/A'}</div>
      </div>
      ${printContent.innerHTML}
      ${documentsHTML}
      <div class="signature-section">
        <div class="signature-box">
          <div class="signature-line"></div>
          <div class="signature-label">Employee Signature</div>
          <div style="font-size: 9px; color: #999; margin-top: 4px;">Date: _______________</div>
        </div>
        <div class="signature-box">
          <div class="signature-line"></div>
          <div class="signature-label">HR Manager</div>
          <div style="font-size: 9px; color: #999; margin-top: 4px;">Date: _______________</div>
        </div>
        <div class="signature-box">
          <div class="signature-line"></div>
          <div class="signature-label">Authorized Officer</div>
          <div style="font-size: 9px; color: #999; margin-top: 4px;">Date: _______________</div>
        </div>
      </div>
      <div class="footer">
        <p><strong>FLASH SECURITY SERVICES</strong></p>
        <p>Confidential Employee Record - For Official Use Only</p>
      </div>
      </body></html>`);
    printWindow.document.close();
    printWindow.print();
  };

  if (loading) return <div className="flex justify-center items-center h-96"><Spin size="large" /></div>;
  if (!employee) return <div>Employee not found</div>;

  const documents = (employee.documents as Array<Record<string, unknown>>) || [];
  const documentColumns = [
    {
      title: 'Preview',
      dataIndex: 'file_path',
      key: 'preview',
      width: 80,
      render: (filePath: string) => {
        if (!filePath) {
          return (
            <div
              style={{
                width: 50,
                height: 50,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#f5f5f5',
                borderRadius: 4,
                border: '1px solid #d9d9d9'
              }}
            >
              <span style={{ fontSize: '10px', color: '#999' }}>No file</span>
            </div>
          );
        }

        const fullUrl = getFullFileUrl(filePath);
        const isImage = filePath?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
        const isPdf = filePath?.match(/\.pdf$/i);

        console.log('Document file path:', filePath);
        console.log('Full URL:', fullUrl);
        console.log('Is image:', isImage);

        if (isImage) {
          return (
            <Image
              src={fullUrl}
              alt="Preview"
              width={50}
              height={50}
              style={{ objectFit: 'cover', borderRadius: 4, cursor: 'pointer' }}
              preview={{
                mask: <div className="ant-image-mask-inner"><EyeOutlined style={{ fontSize: 16 }} /></div>
              }}
              onError={(e) => {
                // Only log errors for remote (B2) images to avoid cluttering logs with known stale local references
                if (fullUrl.includes('backblazeb2.com')) {
                  console.error('Image load error:', fullUrl, e);
                }
              }}
              fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6ZAAAAFUlEQVR42mNk+M9QzwAEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC"
            />
          );
        } else if (isPdf) {
          return (
            <div
              onClick={() => handlePreviewFile(filePath)}
              style={{
                width: 50,
                height: 50,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#f5f5f5',
                borderRadius: 4,
                cursor: 'pointer',
                border: '1px solid #d9d9d9'
              }}
              title="Click to preview PDF"
            >
              <FilePdfOutlined style={{ fontSize: 24, color: '#ff4d4f' }} />
            </div>
          );
        } else {
          return (
            <div
              onClick={() => handlePreviewFile(filePath)}
              style={{
                width: 50,
                height: 50,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#f5f5f5',
                borderRadius: 4,
                cursor: 'pointer',
                border: '1px solid #d9d9d9'
              }}
              title="Click to preview"
            >
              <EyeOutlined style={{ fontSize: 20, color: '#1890ff' }} />
            </div>
          );
        }
      }
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (cat: string) => DOCUMENT_CATEGORIES.find(c => c.value === cat)?.label || cat
    },
    {
      title: 'File Name',
      dataIndex: 'filename',
      key: 'filename',
      ellipsis: true
    },
    {
      title: 'Uploaded',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      render: (date: string) => date ? new Date(date).toLocaleDateString() : '-'
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: unknown, record: Record<string, unknown>) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handlePreviewFile(record.file_path as string)}
          >
            View
          </Button>
          <Popconfirm title="Delete?" onConfirm={() => handleDeleteDocument(record.id as number)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()}>Back</Button>
          <h1 className="text-2xl font-bold m-0">{(employee.full_name as string) || (employee.employee_id as string)}</h1>
          <Tag color={employee.status === 'Active' ? 'green' : 'red'}>{employee.status as string}</Tag>
        </Space>
        <Space>
          <Button icon={<PrinterOutlined />} onClick={handlePrintReport}>Print Report</Button>
          <Button icon={<EditOutlined />} onClick={() => setEditDrawerVisible(true)}>Edit</Button>
          <Popconfirm title="Delete employee?" onConfirm={handleDelete}>
            <Button danger icon={<DeleteOutlined />}>Delete</Button>
          </Popconfirm>
        </Space>
      </div>

      <Card className="mb-6">
        <div ref={printRef}>
          <div className="section">
            <div className="section-title">Basic Identification</div>
            <div className="field-grid">
              <Field label="Employee ID" value={employee.employee_id} />
              <Field label="Full Name" value={employee.full_name} />
              <Field label="Father Name" value={employee.father_name} />
              <Field label="CNIC" value={employee.cnic || employee.cnic_no} />
              <Field label="CNIC Expiry" value={employee.cnic_expiry_date} />
              <Field label="Date of Birth" value={employee.date_of_birth || employee.dob} />
              <Field label="Blood Group" value={employee.blood_group} />
              <Field label="Gender" value={employee.gender} />
              <Field label="Height" value={employee.height} />
              <Field label="Education" value={employee.education} />
              <Field label="Mobile" value={employee.phone || employee.mobile_no} />
              <Field label="Email" value={employee.email} />
            </div>
          </div>

          <div className="section">
            <div className="section-title">Service Details</div>
            <div className="field-grid">
              <Field label="FSS Number" value={employee.fss_number || employee.fss_no} />
              <Field label="Rank" value={employee.rank} />
              <Field label="Unit" value={employee.unit} />
              <Field label="Status" value={employee.status} />
              <Field label="Enrolled As" value={employee.enrolled_as} />
              <Field label="Date of Enrolment" value={employee.date_of_enrolment} />
              <Field label="Deployed At" value={employee.deployed_at} />
              <Field label="Pay (Rs)" value={employee.pay_rs} />
              <Field label="Medical Category" value={employee.medical_category} />
              <Field label="Interviewed By" value={employee.interviewed_by} />
              <Field label="Introduced By" value={employee.introduced_by} />
              <Field label="BDM" value={employee.bdm} />
            </div>
          </div>

          <div className="section">
            <div className="section-title">Address Information</div>
            <div className="field-grid">
              <div className="field address-field">
                <div className="field-label"><strong>Permanent Address:</strong></div>
                <div className="field-value">
                  {[employee.permanent_village, employee.permanent_post_office,
                  employee.permanent_thana, employee.permanent_tehsil, employee.permanent_district]
                    .filter(Boolean).join(', ') || '-'}
                </div>
              </div>
              <div className="field address-field">
                <div className="field-label"><strong>Present Address:</strong></div>
                <div className="field-value">
                  {[employee.present_village, employee.present_post_office,
                  employee.present_thana, employee.present_tehsil, employee.present_district]
                    .filter(Boolean).join(', ') || '-'}
                </div>
              </div>
            </div>
          </div>

          <div className="section">
            <div className="section-title">Family & Next of Kin</div>
            <div className="field-grid">
              <Field label="Sons" value={employee.sons} />
              <Field label="Daughters" value={employee.daughters} />
              <Field label="Brothers" value={employee.brothers} />
              <Field label="Sisters" value={employee.sisters} />
              <Field label="NOK Name" value={employee.nok_name || employee.next_of_kin_name} />
              <Field label="NOK CNIC" value={employee.nok_cnic_no || employee.next_of_kin_cnic} />
              <Field label="NOK Mobile" value={employee.nok_mobile_no || employee.next_of_kin_mobile_number} />
              <Field label="Emergency Contact" value={employee.emergency_contact_number} />
            </div>
          </div>

          <div className="section">
            <div className="section-title">Verification & Documents</div>
            <div className="field-grid">
              <Field label="SHO Verification" value={employee.sho_verification_date} />
              <Field label="SSP Verification" value={employee.ssp_verification_date} />
              <Field label="Agreement Date" value={employee.agreement_date} />
              <Field label="Documents Held" value={employee.original_document_held} />
              <div className="field address-field">
                <div className="field-label"><strong>Remarks:</strong></div>
                <div className="field-value">{String(employee.remarks || '-')}</div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card title="Documents" extra={
        <Button type="primary" icon={<UploadOutlined />} onClick={() => setUploadDrawerVisible(true)}>Upload Document</Button>
      }>
        <Table columns={documentColumns} dataSource={documents} rowKey="id" pagination={false} size="small" />
      </Card>

      <Drawer
        title="Edit Employee"
        open={editDrawerVisible}
        onClose={() => setEditDrawerVisible(false)}
        size="large"
        destroyOnClose
      >
        <EmployeeForm initialValues={employee} onSubmit={handleUpdate} onCancel={() => setEditDrawerVisible(false)} />
      </Drawer>

      <Drawer
        title="Upload Document"
        open={uploadDrawerVisible}
        onClose={() => setUploadDrawerVisible(false)}
        size="default"
        footer={
          <div style={{ textAlign: 'right' }}>
            <Button onClick={() => setUploadDrawerVisible(false)} style={{ marginRight: 8 }}>Cancel</Button>
            <Button type="primary" onClick={() => uploadForm.submit()}>Upload</Button>
          </div>
        }
      >
        <Form form={uploadForm} layout="vertical" onFinish={handleUploadDocument}>
          <Form.Item label="Document Category" name="category" rules={[{ required: true, message: 'Please select a category' }]}>
            <Select placeholder="Select category" options={DOCUMENT_CATEGORIES} />
          </Form.Item>
          <Form.Item label="Custom Title (Optional)" name="custom_title">
            <Input placeholder="Enter custom title if needed" />
          </Form.Item>
          <Form.Item
            label="File"
            name="file"
            rules={[{ required: true, message: 'Please select a file' }]}
            valuePropName="fileList"
            getValueFromEvent={(e) => {
              if (Array.isArray(e)) {
                return e;
              }
              return e?.fileList;
            }}
          >
            <Upload maxCount={1} beforeUpload={() => false} accept="image/*,.pdf,.doc,.docx">
              <Button icon={<UploadOutlined />}>Select File</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Drawer>

      <Drawer
        title="Document Preview"
        open={previewVisible}
        onClose={() => setPreviewVisible(false)}
        size="large"
        footer={
          <div style={{ textAlign: 'right' }}>
            <Button icon={<DownloadOutlined />} href={previewFile} target="_blank" style={{ marginRight: 8 }}>Download</Button>
            <Button onClick={() => setPreviewVisible(false)}>Close</Button>
          </div>
        }
      >
        <div style={{ background: '#f5f5f5', padding: '20px', borderRadius: '8px', minHeight: '500px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {previewFile.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
            <div style={{ background: 'white', padding: '10px', borderRadius: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <Image
                src={previewFile}
                alt="Preview"
                style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }}
                preview={false}
              />
            </div>
          ) : previewFile.match(/\.pdf$/i) ? (
            <iframe
              src={previewFile}
              style={{
                width: '100%',
                height: '70vh',
                border: 'none',
                borderRadius: '4px',
                background: 'white',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <FilePdfOutlined style={{ fontSize: 80, color: '#bfbfbf', marginBottom: '20px' }} />
              <p style={{ fontSize: '16px', color: '#666', marginBottom: '10px' }}>Preview not available for this file type</p>
              <p style={{ fontSize: '14px', color: '#999' }}>Click download to view the file</p>
            </div>
          )}
        </div>
      </Drawer>

      <style jsx>{`
        .section { margin-bottom: 25px; }
        .section-title { 
          font-size: 15px; 
          font-weight: bold; 
          background: linear-gradient(to right, #1890ff, #40a9ff);
          color: white;
          padding: 10px 15px; 
          margin-bottom: 15px; 
          border-radius: 4px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .field-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px 20px;
        }
        .field { 
          padding: 10px;
          background: #fafafa;
          border-radius: 4px;
          border-left: 3px solid #1890ff;
        }
        .field-label { 
          font-size: 11px; 
          color: #1890ff;
          margin-bottom: 4px;
        }
        .field-label strong {
          font-weight: 600;
        }
        .field-value { 
          font-size: 13px; 
          color: #333;
          font-weight: 500;
        }
        .address-field {
          grid-column: span 3;
        }
      `}</style>
    </div>
  );
}