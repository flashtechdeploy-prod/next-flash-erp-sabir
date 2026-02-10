'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Card, Button, Space, Table, Drawer, Form, Input, Upload,
  Popconfirm, Tag, Spin, Select, Image, App, Modal, Radio
} from 'antd';
import {
  ArrowLeftOutlined, EditOutlined, DeleteOutlined, UploadOutlined,
  FilePdfOutlined, EyeOutlined, DownloadOutlined, PrinterOutlined, ExportOutlined, LockOutlined
} from '@ant-design/icons';
import { employeeApi, companySettingsApi, authApi } from '@/lib/api';
import EmployeeForm, { DOCUMENT_CATEGORIES } from '../EmployeeForm';

import { getFullFileUrl } from '@/lib/utils';

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
  const [printModalVisible, setPrintModalVisible] = useState(false);
  const [printWithDocuments, setPrintWithDocuments] = useState(true);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [uploadForm] = Form.useForm();
  const [passwordForm] = Form.useForm();

  const [companySettings, setCompanySettings] = useState<any>(null);

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

  const fetchCompanySettings = async () => {
    try {
      const { data } = await companySettingsApi.get();
      setCompanySettings(data);
    } catch (error) {
      console.error('Failed to load settings', error);
    }
  };

  useEffect(() => {
    fetchEmployee();
    fetchCompanySettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  const handleUpdate = async (values: Record<string, unknown>) => {
    // Never send _profilePhotoFile or any other underscore-prefixed fields to the API
    const cleanValues = { ...values };
    Object.keys(cleanValues).forEach(key => {
      if (key.startsWith('_')) {
        delete (cleanValues as any)[key];
      }
    });

    const profilePhotoFile = (values as any)._profilePhotoFile;

    const response = await employeeApi.update(employeeId, cleanValues);
    if (response.error) {
      message.error(response.error);
      return;
    }

    const employeeData = response.data as any;

    // Then upload profile picture if provided
    if (profilePhotoFile && Array.isArray(profilePhotoFile) && profilePhotoFile.length > 0 && profilePhotoFile[0].originFileObj) {
      if (!employeeData.id) {
        console.error('No database ID found for employee during photo upload');
      } else {
        // Upload the profile picture as a document
        const formData = new FormData();
        formData.append('file', profilePhotoFile[0].originFileObj);
        formData.append('name', 'Profile Picture');
        formData.append('category', 'profile_photo');

        console.log('Uploading profile photo in detail page...');
        const uploadResponse = await employeeApi.uploadDocument(employeeData.id, formData);
        console.log('Upload response:', uploadResponse);

        if (!uploadResponse.error && (uploadResponse.data as any)?.file_path) {
          const filePath = (uploadResponse.data as any).file_path;
          console.log('Updating profile_photo fields with:', filePath);

          // Update employee with profile picture URL
          await employeeApi.update(employeeData.employee_id, {
            profile_photo: filePath
          });
        }
      }
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

  const handlePreviewFile = (filePath: string | undefined) => {
    if (!filePath) return;
    const fullUrl = getFullFileUrl(filePath);
    console.log('Preview file path:', filePath);
    console.log('Preview full URL:', fullUrl);
    if (fullUrl) {
      setPreviewFile(fullUrl);
      setPreviewVisible(true);
    }
  };

  const handleSetPassword = async (values: any) => {
    if (!employee?.fss_no) {
      message.error('Employee FSS number not found');
      return;
    }
    const response = await authApi.setPassword({
      fss_no: employee.fss_no as string,
      password: values.password
    });
    if (response.error) {
      message.error(response.error);
      return;
    }
    message.success('Password updated successfully');
    setPasswordModalVisible(false);
    passwordForm.resetFields();
  };


  const handlePrintReport = (includeDocuments: boolean = true) => {
    const printContent = printRef.current;
    if (!printContent) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Build documents HTML
    let documentsHTML = '';
    if (includeDocuments && documents.length > 0) {
      const docImages = documents.map((doc: Record<string, unknown>) => {
        const fullUrl = getFullFileUrl(doc.file_path as string);
        const isImage = (doc.file_path as string)?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
        const isPdf = (doc.file_path as string)?.match(/\.pdf$/i);

        if (isImage) {
          return `
            <div style="margin-bottom: 20px; page-break-inside: avoid; border: 1px solid #ddd; padding: 10px; border-radius: 4px;">
              <div style="font-size: 10px; font-weight: bold; margin-bottom: 8px; color: #1890ff;">${DOCUMENT_CATEGORIES.find(c => c.value === doc.category)?.label || doc.category}</div>
              <img src="${fullUrl}" style="max-width: 100%; max-height: 300px; border-radius: 4px;" alt="Document preview" />
              <div style="font-size: 9px; color: #666; margin-top: 6px;">${doc.filename || 'Document'}</div>
            </div>
          `;
        } else if (isPdf) {
          return `
            <div style="margin-bottom: 20px; page-break-inside: avoid; border: 1px solid #ddd; padding: 15px; border-radius: 4px; text-align: center; background: #f9f9f9;">
              <div style="font-size: 10px; font-weight: bold; margin-bottom: 8px; color: #1890ff;">${DOCUMENT_CATEGORIES.find(c => c.value === doc.category)?.label || doc.category}</div>
              <div style="font-size: 40px; color: #ff4d4f; margin-bottom: 8px;">📄</div>
              <div style="font-size: 10px; color: #333; font-weight: bold;">${doc.filename || 'PDF Document'}</div>
              <div style="font-size: 9px; color: #999; margin-top: 4px;">PDF - See document preview in digital version</div>
            </div>
          `;
        } else {
          return `
            <div style="margin-bottom: 20px; page-break-inside: avoid; border: 1px solid #ddd; padding: 15px; border-radius: 4px; text-align: center; background: #f9f9f9;">
              <div style="font-size: 10px; font-weight: bold; margin-bottom: 8px; color: #1890ff;">${DOCUMENT_CATEGORIES.find(c => c.value === doc.category)?.label || doc.category}</div>
              <div style="font-size: 40px; color: #1890ff; margin-bottom: 8px;">📎</div>
              <div style="font-size: 10px; color: #333; font-weight: bold;">${doc.filename || 'Document'}</div>
              <div style="font-size: 9px; color: #999; margin-top: 4px;">File - See document in digital version</div>
            </div>
          `;
        }
      }).join('');

      documentsHTML = `
        <div class="section page-break">
          <div class="section-title">Uploaded Documents</div>
          <div style="display: flex; flex-direction: column; gap: 12px;">
            ${docImages}
          </div>
        </div>
      `;
    }

    const profilePhotoUrl = employee?.profile_photo
      ? getFullFileUrl(employee.profile_photo as string)
      : null;

    printWindow.document.write(`<!DOCTYPE html><html><head>
      <title>Employee Report - ${employee?.full_name || employee?.employee_id}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Arial', sans-serif; padding: 30px; font-size: 11px; color: #333; }
        
        .header { 
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 3px solid #1890ff; 
          padding-bottom: 10px; 
          margin-bottom: 20px;
        }
        .header-left {
          flex: 0 0 80px;
          display: flex;
          align-items: center;
        }
        .header-center {
          flex: 1;
          text-align: center;
          padding: 0 10px;
        }
        .header-right {
          flex: 0 0 80px;
          display: flex;
          justify-content: flex-end;
          align-items: center;
        }
        .logo { 
          width: 60px; 
          height: 60px; 
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .header h1 { 
          margin: 0 0 2px; 
          font-size: 16px; 
          color: #1890ff;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .header p { 
          color: #666; 
          font-size: 10px;
          margin: 0;
          line-height: 1.2;
        }
        .report-meta {
          text-align: right;
          margin-bottom: 15px;
          font-size: 9px;
          color: #888;
        }
        
        .profile-section {
          width: 70px;
          height: 85px;
          border: 1px solid #ddd;
          background: #f5f5f5;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .profile-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .section { 
          margin-bottom: 20px; 
          page-break-inside: avoid;
        }
        .section-title { 
          font-size: 12px; 
          font-weight: bold; 
          background: linear-gradient(to right, #1890ff, #40a9ff);
          color: white;
          padding: 8px 12px; 
          margin-bottom: 10px; 
          border-radius: 4px;
          text-transform: uppercase;
        }
        .field-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px 15px;
        }
        .field { 
          padding: 6px 0;
          border-bottom: 1px solid #f0f0f0;
        }
        .field-label { 
          font-size: 9px; 
          color: #1890ff;
          font-weight: bold;
          margin-bottom: 2px;
          text-transform: uppercase;
        }
        .field-value { 
          font-size: 11px; 
          color: #333;
        }
        .address-field {
          grid-column: span 3;
        }
        .doc-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
          font-size: 10px;
        }
        .doc-table th {
          background: #f5f5f5;
          padding: 8px;
          text-align: left;
          font-weight: bold;
          border: 1px solid #ddd;
        }
        .doc-table td {
          padding: 6px 8px;
          border: 1px solid #ddd;
        }
        .signature-section {
          margin-top: 50px;
          display: flex;
          justify-content: space-between;
          page-break-inside: avoid;
        }
        .signature-box {
          text-align: center;
          width: 180px;
        }
        .signature-line {
          border-top: 1px solid #333;
          margin-bottom: 5px;
        }
        .signature-label {
          font-size: 10px;
          font-weight: bold;
          color: #555;
        }
        .page-break {
          page-break-before: always;
        }
        .footer {
          margin-top: 30px;
          padding-top: 10px;
          border-top: 2px solid #1890ff;
          text-align: center;
          font-size: 9px;
          color: #888;
        }
        
        table.print-layout { width: 100%; }
        thead.print-header { display: table-header-group; }
        tfoot.print-footer { display: table-footer-group; }
        
        @media print { 
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; padding: 0; }
          .page-break { page-break-before: always; }
        }
      </style></head><body>
      
      <table class="print-layout">
        <thead class="print-header">
          <tr>
            <td>
              <div class="header">
                <div class="header-left">
                  ${companySettings?.logo_url ? `
                    <div class="logo">
                      <img src="${getFullFileUrl(companySettings.logo_url)}" style="width: 100%; height: 100%; object-fit: contain;" />
                    </div>
                  ` : `
                    <div class="logo" style="background: #1890ff; color: white;">FS</div>
                  `}
                </div>
                <div class="header-center">
                  <h1>${companySettings?.name || 'FLASH SECURITY'}</h1>
                  <p>${companySettings?.address || ''}</p>
                  <p>
                    ${[
        companySettings?.phone,
        companySettings?.email,
        companySettings?.website
      ].filter(Boolean).join(' | ')}
                  </p>
                </div>
                <div class="header-right">
                  ${profilePhotoUrl ? `
                    <div class="profile-section">
                      <img src="${profilePhotoUrl}" class="profile-img" alt="Profile" />
                    </div>
                  ` : ''}
                </div>
              </div>
            </td>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
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
            </td>
          </tr>
        </tbody>
        <tfoot class="print-footer">
          <tr>
            <td>
              <div class="footer">
                <p><strong>FLASH SECURITY SERVICES</strong></p>
                <p>Confidential Employee Record - For Official Use Only</p>
              </div>
            </td>
          </tr>
        </tfoot>
      </table>
      </body></html>`);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 250);
  };

  const handleExportCSV = () => {
    if (!employee) return;

    const escapeCSVValue = (value: unknown): string => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    // Headers
    const headers = [
      'Employee ID',
      'Full Name',
      'Father Name',
      'Phone',
      'Email',
      'Date of Birth',
      'Age',
      'Blood Group',
      'Address',
      'District',
      'State',
      'Zip Code',
      'Aadhar Number',
      'Pan Number',
      'Designation',
      'Enrolled As',
      'Joining Date',
      'Experience',
      'Qualification',
      'Bank Account Number',
      'IFSC Code',
      'Pan Name',
      'Basic Salary',
      'Status',
      'Profile Photo',
      'Number of Documents'
    ];

    // Create CSV row
    const row = [
      employee.employee_id,
      employee.full_name,
      employee.father_name,
      employee.phone || employee.mobile_no,
      employee.email,
      employee.date_of_birth,
      employee.age,
      employee.blood_group,
      employee.address,
      employee.district,
      employee.state,
      employee.zip_code,
      employee.aadhar_number,
      employee.pan_number,
      employee.designation,
      employee.enrolled_as,
      employee.joining_date,
      employee.experience,
      employee.qualification,
      employee.bank_account_number,
      employee.ifsc_code,
      employee.pan_name,
      employee.basic_salary,
      employee.status || 'Active',
      employee.profile_photo || '-',
      ((employee.documents as Array<any>) || []).length
    ];

    // Build CSV content
    const csvContent = [
      headers.map(escapeCSVValue).join(','),
      row.map(escapeCSVValue).join(',')
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    const fileName = `employee-${employee.employee_id}-${new Date().toISOString().split('T')[0]}.csv`;
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    message.success('CSV exported successfully');
  };

  if (loading) return <div className="flex justify-center items-center h-96"><Spin size="large" /></div>;
  if (!employee) return <div>Employee not found</div>;

  const documents = ((employee.documents as Array<Record<string, unknown>>) || []).filter(
    (doc) => doc.category !== 'profile_photo' && doc.category !== 'photo'
  );
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
                if (fullUrl?.includes('backblazeb2.com')) {
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
      {/* Profile Header Card */}
      <Card className="mb-6" style={{ background: '#1890ff', border: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          {/* Profile Picture */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            {employee.profile_photo ? (
              <Image
                src={getFullFileUrl(employee.profile_photo as string)}
                alt={employee.full_name as string}
                width={120}
                height={120}
                style={{
                  borderRadius: '12px',
                  objectFit: 'cover',
                  border: '4px solid white',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}
                preview
                fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6ZAAAAFUlEQVR42mNk+M9QzwAEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC"
              />
            ) : (
              <div style={{
                width: '120px',
                height: '120px',
                borderRadius: '12px',
                background: 'rgba(255,255,255,0.2)',
                border: '4px solid white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '48px',
                color: 'white',
                fontWeight: 'bold',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
              }}>
                {(employee.full_name as string)?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Employee Info */}
          <div style={{ flex: 1, color: 'white' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <h1 style={{ fontSize: '32px', fontWeight: 'bold', margin: 0 }}>
                {(employee.full_name as string) || (employee.employee_id as string)}
              </h1>
              <Tag color={employee.status === 'Active' ? '#87d068' : '#ff4d4f'} style={{ fontSize: '12px', padding: '4px 12px' }}>
                {employee.status as string}
              </Tag>
            </div>
            <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>
              Employee ID: <strong>{employee.employee_id as string}</strong>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', fontSize: '13px', opacity: 0.95 }}>
              <div>
                <div style={{ opacity: 0.8, fontSize: '12px' }}>Designation / Rank</div>
                <div style={{ fontWeight: 'bold' }}>{String(employee?.enrolled_as || employee.designation || 'Guard')} {employee.rank ? `/ ${employee.rank}` : ''}</div>
              </div>
              <div>
                <div style={{ opacity: 0.8, fontSize: '12px' }}>Person Status</div>
                <div style={{ fontWeight: 'bold' }}>{String(employee.served_in || '-')}</div>
              </div>
              <div>
                <div style={{ opacity: 0.8, fontSize: '12px' }}>Mobile</div>
                <div style={{ fontWeight: 'bold' }}>{String(employee.phone || employee.mobile_no || employee.mobile_number || '-')}</div>
              </div>
              <div>
                <div style={{ opacity: 0.8, fontSize: '12px' }}>District</div>
                <div style={{ fontWeight: 'bold' }}>{String(employee.district || employee.permanent_district || '-')}</div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()} style={{ minWidth: '120px' }}>
              Back
            </Button>
            <Button icon={<PrinterOutlined />} onClick={() => setPrintModalVisible(true)} style={{ minWidth: '120px' }}>
              Print
            </Button>
            <Button icon={<ExportOutlined />} onClick={handleExportCSV} style={{ minWidth: '120px' }}>
              Export CSV
            </Button>
            <Button icon={<EditOutlined />} onClick={() => setEditDrawerVisible(true)} type="primary" style={{ minWidth: '120px' }}>
              Edit
            </Button>
            <Button icon={<LockOutlined />} onClick={() => setPasswordModalVisible(true)} style={{ minWidth: '120px' }}>
              Password
            </Button>
            <Popconfirm title="Delete employee?" onConfirm={handleDelete}>
              <Button danger icon={<DeleteOutlined />} style={{ minWidth: '120px' }}>
                Delete
              </Button>
            </Popconfirm>
          </div>
        </div>
      </Card>

      <Card className="mb-6">
        <div ref={printRef}>
          {/* Profile Photo Section */}
    
          {/* Enrolment Details */}
          <div className="section">
            <div className="section-title">Enrolment Details</div>
            <div className="field-grid">
              <Field label="FSS Number" value={employee.fss_no} />
                 <Field label="Interviewed By" value={employee.interviewed_by} />
              <Field label="Introduced By" value={employee.introduced_by} />
              <Field label="Enrolled As" value={employee.enrolled_as} />
                <Field label="Deployed At" value={employee.deployed_at} />

                            <Field label="Pay (Rs)" value={employee.pay_rs} />
                                          <Field label="BDM" value={employee.bdm} />


                     <Field label="Past Experience" value={employee.served_in} />
              {/* <Field label="Previous Employment" value={employee.previous_employment} /> */}
              <Field label="Experience in Security" value={employee.experience_in_security} />
                            <Field label="Person Status" value={employee.person_status} />


       <Field label="Unit" value={employee.unit} />
                            <Field label="Rank" value={employee.rank} />

              <Field label="Date of Enrolment" value={employee.date_of_enrolment} />
              
              <Field label="Date of Re-Enrolment" value={employee.date_of_re_enrolment} />
              <Field label="Agreement Date" value={employee.agreement_date} />

              <Field label="Status" value={employee.status} />
            </div>
          </div>

          {/* Bio Data */}
          <div className="section">
            <div className="section-title">Bio Data</div>
            <div className="field-grid">
              <Field label="Full Name" value={employee.full_name} />
              <Field label="Blood Group" value={employee.blood_group} />
                            <Field label="Father Name" value={employee.father_name} />

                            <Field label="CNIC" value={employee.cnic || employee.cnic_no} />
              <Field label="CNIC Expiry" value={employee.cnic_expiry_date || employee.cnic_expiry} />
                       <Field label="Date of Birth" value={employee.date_of_birth || employee.dob} />
              <Field label="Height" value={employee.height} />
              <Field label="Civil Education" value={employee.education} />
              <Field label="Medical Category & Case of Disch" value={employee.medical_category} />

              <Field label="Gender" value={employee.gender} />

     
              {/* <Field label="Bio Data" value={employee.bio_data} /> */}
              <Field label="Domicile" value={employee.domicile} />
              {/* <Field label="Languages Spoken" value={employee.languages_spoken} /> */}
              <Field label="Personal Mobile No" value={employee.phone || employee.mobile_no || employee.mobile_number} />
              <Field label="Email" value={employee.email} />
              <Field label="Main Number" value={employee.main_number} />
              <Field label="EOBI Number" value={employee.eobi_no} />
                   <Field label="Insurance" value={employee.insurance} />
              <Field label="Social Security #" value={employee.social_security} />
            </div>
          </div>

          {/* Permanent Address */}
          <div className="section">
            <div className="section-title">Permanent Address</div>
            <div className="field-grid">
              <Field label="Village/Mohalla" value={employee.permanent_village} />
              <Field label="Post Office" value={employee.permanent_post_office} />
              <Field label="Thana" value={employee.permanent_thana} />
              <Field label="Tehsil" value={employee.permanent_tehsil} />
              <Field label="District" value={employee.permanent_district} />
            </div>
          </div>

          {/* Present Address */}
          <div className="section">
            <div className="section-title">Present Address</div>
            <div className="field-grid">
              <Field label="Village/Mohalla" value={employee.present_village} />
              <Field label="Post Office" value={employee.present_post_office} />
              <Field label="Thana" value={employee.present_thana} />
              <Field label="Tehsil" value={employee.present_tehsil} />
              <Field label="District" value={employee.present_district} />
            </div>
          </div>

       {/* Family & Next of Kin */}
          <div className="section">
            <div className="section-title">Family & Next of King</div>
            <div className="field-grid">
              <Field label="Sons" value={employee.sons} />
              <Field label="Daughters" value={employee.daughters} />
              <Field label="Brothers" value={employee.brothers} />
              <Field label="Sisters" value={employee.sisters} />
              {/* <Field label="Emergency Contact Name" value={employee.emergency_contact_name} /> */}
              <Field label="NOK Name" value={employee.nok_name || employee.next_of_kin_name} />
              <Field label="NOK CNIC" value={employee.nok_cnic_no || employee.next_of_kin_cnic} />
              <Field label="NOK Mobile" value={employee.nok_mobile_no || employee.next_of_kin_mobile_number} />
                            <Field label="Emergency Contact Number" value={employee.emergency_contact_number} />

            </div>
          </div>

          {/* Banking & Salary Information */}
          {/* <div className="section">
            <div className="section-title">Banking & Salary Information</div>
            <div className="field-grid">
              <Field label="Basic Salary" value={employee.basic_salary} />
              <Field label="Allowances" value={employee.allowances} />
              <Field label="Total Salary" value={employee.total_salary} />
              <Field label="Bank Name" value={employee.bank_name} />
              <Field label="Account Number" value={employee.account_number || employee.bank_account_number} />
              <Field label="IFSC Code" value={employee.ifsc_code} />
              <Field label="PAN Name" value={employee.pan_name} />
         
            </div>
          </div> */}

   
          {/* Verification & Documents */}
          <div className="section">
            <div className="section-title">Verification & Documents</div>
            <div className="field-grid">
              <Field label="SHO Verification Date" value={employee.sho_verification_date} />
              <Field label="SSP Verification Date" value={employee.ssp_verification_date} />
              <Field label="Verified by Khidmat Markaz" value={employee.verified_by_khidmat_markaz} />
              {/* <Field label="Verified by SHO" value={employee.verified_by_sho} /> */}
              {/* <Field label="Verified by SSP" value={employee.verified_by_ssp} /> */}
            </div>
          </div>

          {/* Signatures & Biometrics */}
          {/* <div className="section">
            <div className="section-title">Signatures & Biometrics</div>
            <div className="field-grid">
              <Field label="Signature Recording Officer" value={employee.signature_recording_officer} />
              <Field label="Signature Individual" value={employee.signature_individual} />
              <Field label="Thumb Impression" value={employee.thumb_impression} />
              <Field label="Index Impression" value={employee.index_impression} />
              <Field label="Left Hand Thumb" value={employee.left_hand_thumb} />
              <Field label="Left Hand Index" value={employee.left_hand_index} />
              <Field label="Right Hand Thumb" value={employee.right_hand_thumb} />
              <Field label="Right Hand Index" value={employee.right_hand_index} />
            </div>
          </div> */}

          {/* Additional Information */}
          {/* <div className="section">
            <div className="section-title">Additional Information</div>
            <div className="field-grid">
              <Field label="Government ID" value={employee.government_id} />
              <Field label="Employee Status" value={employee.employment_status} />
              <Field label="Allocation Status" value={employee.allocation_status} />
              <Field label="Left Reason" value={employee.left_reason} />
              <Field label="Remarks" value={employee.remarks} />
            </div>
          </div> */}
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
              return e?.fileList || [];
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

      <Modal
        title="Print Employee Report"
        open={printModalVisible}
        onCancel={() => setPrintModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setPrintModalVisible(false)}>Cancel</Button>,
          <Button key="print" type="primary" onClick={() => {
            handlePrintReport(printWithDocuments);
            setPrintModalVisible(false);
          }}>Print</Button>
        ]}
      >
        <div style={{ paddingBottom: '20px' }}>
          <p><strong>Choose what to include in the print:</strong></p>
          <Radio.Group value={printWithDocuments} onChange={(e) => setPrintWithDocuments(e.target.value)} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Radio value={true}>
              <div>
                <div style={{ fontWeight: '500' }}>With Attachments</div>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>Include all uploaded documents, images, and files</div>
              </div>
            </Radio>
            <Radio value={false}>
              <div>
                <div style={{ fontWeight: '500' }}>Without Attachments</div>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>Print only employee information</div>
              </div>
            </Radio>
          </Radio.Group>
        </div>
      </Modal>

      <Modal
        title="Set Employee Password"
        open={passwordModalVisible}
        onCancel={() => {
          setPasswordModalVisible(false);
          passwordForm.resetFields();
        }}
        onOk={() => passwordForm.submit()}
        okText="Update Password"
      >
        <div style={{ marginBottom: '16px' }}>
          Update login credentials for <strong>{employee?.full_name as string}</strong> (FSS: {employee?.fss_no as string})
        </div>
        <Form form={passwordForm} layout="vertical" onFinish={handleSetPassword}>
          <Form.Item
            name="password"
            label="New Password"
            rules={[
              { required: true, message: 'Please enter a password' },
              { min: 6, message: 'Password must be at least 6 characters' }
            ]}
          >
            <Input.Password placeholder="At least 6 characters" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="Confirm Password"
            dependencies={['password']}
            rules={[
              { required: true, message: 'Please confirm password' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Passwords do not match'));
                },
              }),
            ]}
          >
            <Input.Password placeholder="Confirm new password" />
          </Form.Item>
        </Form>
      </Modal>

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