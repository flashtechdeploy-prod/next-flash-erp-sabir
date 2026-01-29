'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Card, Button, Space, Table, Drawer, Form, Upload, Input, Statistic, Row, Col, Progress,
  message, Popconfirm, Tag, Spin, Image, Tabs
} from 'antd';
import {
  ArrowLeftOutlined, EditOutlined, DeleteOutlined, UploadOutlined,
  FilePdfOutlined, EyeOutlined, DownloadOutlined, PrinterOutlined, WarningOutlined,
  CarOutlined, FileImageOutlined
} from '@ant-design/icons';
import { vehicleApi, fuelEntryApi } from '@/lib/api';
import VehicleForm from '../VehicleForm';
import dayjs from 'dayjs';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const Field = ({ label, value }: { label: string; value: unknown }) => (
  <div className="field">
    <div className="field-label"><strong>{label}:</strong></div>
    <div className="field-value">{String(value || '-')}</div>
  </div>
);

export default function VehicleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const vehicleId = params.id as string;
  const printRef = useRef<HTMLDivElement>(null);

  const [vehicle, setVehicle] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [editDrawerVisible, setEditDrawerVisible] = useState(false);
  const [uploadDrawerVisible, setUploadDrawerVisible] = useState(false);
  const [uploadType, setUploadType] = useState<'document' | 'image'>('document');
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewFile, setPreviewFile] = useState<string>('');
  const [uploadForm] = Form.useForm();
  const [monthlyFuelUsage, setMonthlyFuelUsage] = useState(0);
  const [loadingFuelData, setLoadingFuelData] = useState(false);

  const fetchVehicle = async () => {
    setLoading(true);
    const response = await vehicleApi.getOne(vehicleId);
    setLoading(false);
    if (response.error) {
      message.error(response.error);
      return;
    }
    setVehicle(response.data as Record<string, unknown>);
  };

  const fetchMonthlyFuelUsage = async () => {
    setLoadingFuelData(true);
    try {
      const startOfMonth = dayjs().startOf('month').format('YYYY-MM-DD');
      const endOfMonth = dayjs().endOf('month').format('YYYY-MM-DD');
      
      const response = await fuelEntryApi.getAll({ 
        vehicle_id: vehicleId,
        from_date: startOfMonth,
        to_date: endOfMonth
      });
      
      if (!response.error) {
        const entries = (response.data as any)?.fuel_entries || (response.data as any) || [];
        const totalLiters = entries.reduce((sum: number, entry: any) => sum + (Number(entry.liters) || 0), 0);
        setMonthlyFuelUsage(totalLiters);
      }
    } catch (error) {
      console.error('Failed to fetch fuel usage:', error);
    } finally {
      setLoadingFuelData(false);
    }
  };

  useEffect(() => {
    fetchVehicle();
      fetchMonthlyFuelUsage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicleId]);

  const handleUpdate = async (values: Record<string, unknown>) => {
    const response = await vehicleApi.update(vehicleId, values);
    if (response.error) {
      message.error(response.error);
      return;
    }
    message.success('Vehicle updated');
    setEditDrawerVisible(false);
      fetchMonthlyFuelUsage();
    fetchVehicle();
  };

  const handleDelete = async () => {
    const response = await vehicleApi.delete(vehicleId);
    if (response.error) {
      message.error(response.error);
      return;
    }
    message.success('Vehicle deleted');
    router.push('/dashboard/vehicles');
  };

  const handleUpload = async (values: { file: { file: File }; title?: string }) => {
    if (!values.file) return;
    
    const formData = new FormData();
    const file = values.file.file;
    
    if (values.title) {
      const originalExtension = file.name.split('.').pop();
      const newFilename = `${values.title}.${originalExtension}`;
      const renamedFile = new File([file], newFilename, { type: file.type });
      formData.append('file', renamedFile);
    } else {
      formData.append('file', file);
    }

    const response = uploadType === 'document'
      ? await vehicleApi.uploadDocument(vehicleId, formData)
      : await vehicleApi.uploadImage(vehicleId, formData);
      
    if (response.error) {
      message.error(response.error);
      return;
    }
    message.success(`${uploadType === 'document' ? 'Document' : 'Image'} uploaded`);
    setUploadDrawerVisible(false);
    uploadForm.resetFields();
    fetchVehicle();
  };

  const handleDeleteDocument = async (docId: number) => {
    const response = await vehicleApi.deleteDocument(vehicleId, docId);
    if (response.error) {
      message.error(response.error);
      return;
    }
    message.success('Document deleted');
    fetchVehicle();
  };

  const handleDeleteImage = async (imageId: number) => {
    const response = await vehicleApi.deleteImage(vehicleId, imageId);
    if (response.error) {
      message.error(response.error);
      return;
    }
    message.success('Image deleted');
    fetchVehicle();
  };

  const handlePreviewFile = (filePath: string) => {
    const decodedPath = decodeURIComponent(filePath);
    const fullUrl = decodedPath.startsWith('http') ? decodedPath : `${API_BASE}${decodedPath}`;
    setPreviewFile(fullUrl);
    setPreviewVisible(true);
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    printWindow.document.write(`<!DOCTYPE html><html><head>
      <title>Vehicle Report - ${vehicle?.vehicle_id}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; padding: 30px; font-size: 11px; }
        .header { text-align: center; border-bottom: 3px solid #1890ff; padding-bottom: 15px; margin-bottom: 25px; }
        .logo { width: 80px; height: 80px; margin: 0 auto 10px; background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 32px; font-weight: bold; }
        .header h1 { margin: 10px 0 5px; font-size: 28px; color: #1890ff; font-weight: bold; }
        .section { margin-bottom: 25px; }
        .section-title { font-size: 15px; font-weight: bold; background: linear-gradient(to right, #1890ff, #40a9ff); color: white; padding: 10px 15px; margin-bottom: 15px; border-radius: 4px; }
        .field-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px 20px; }
        .field { padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
        .field-label { font-size: 9px; color: #1890ff; text-transform: uppercase; font-weight: bold; margin-bottom: 4px; }
        .field-value { font-size: 12px; color: #333; font-weight: 500; }
        @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
      </style></head><body>
      <div class="header">
        <div class="logo">FS</div>
        <h1>FLASH SECURITY</h1>
        <p>Vehicle Information Report</p>
      </div>
      ${printContent.innerHTML}
      </body></html>`);
    printWindow.document.close();
    printWindow.print();
  };

  if (loading) return <div className="flex justify-center items-center h-96"><Spin size="large" /></div>;
  if (!vehicle) return <div>Vehicle not found</div>;

  const documents = (vehicle.documents as Array<Record<string, unknown>>) || [];
  const images = (vehicle.images as Array<Record<string, unknown>>) || [];
  
  console.log('Documents array:', documents);
  console.log('Images array:', images);

  const documentColumns = [
    { 
      title: 'Preview', 
      dataIndex: 'url', 
      key: 'preview', 
      width: 80,
      render: (url: string) => {
        if (!url) return null;
        const decodedPath = decodeURIComponent(url);
        const fullUrl = decodedPath.startsWith('http') ? decodedPath : `${API_BASE}${decodedPath}`;
        const isPdf = decodedPath?.match(/\.pdf$/i);
        
        if (isPdf) {
          return (
            <div onClick={() => handlePreviewFile(url)} style={{ width: 50, height: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', borderRadius: 4, cursor: 'pointer', border: '1px solid #d9d9d9' }}>
              <FilePdfOutlined style={{ fontSize: 24, color: '#ff4d4f' }} />
            </div>
          );
        }
        return (
          <div onClick={() => handlePreviewFile(url)} style={{ width: 50, height: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', borderRadius: 4, cursor: 'pointer', border: '1px solid #d9d9d9' }}>
            <EyeOutlined style={{ fontSize: 20, color: '#1890ff' }} />
          </div>
        );
      }
    },
    { 
      title: 'Title', 
      dataIndex: 'title', 
      key: 'title', 
      width: 250,
      render: (title: string, record: Record<string, unknown>) => {
        // If title exists, show it; otherwise show filename without extension
        if (title) return title;
        const filename = record.filename as string;
        if (filename) {
          // Remove file extension and return
          return filename.replace(/\.[^/.]+$/, '');
        }
        return '-';
      }
    },
    { title: 'File Name', dataIndex: 'filename', key: 'filename', ellipsis: true },
    { title: 'Uploaded', dataIndex: 'created_at', key: 'created_at', width: 120, render: (date: string) => date ? new Date(date).toLocaleDateString() : '-' },
    { 
      title: 'Actions', 
      key: 'actions', 
      width: 120,
      render: (_: unknown, record: Record<string, unknown>) => (
        <Space>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handlePreviewFile(record.url as string)}>View</Button>
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
          <h1 className="text-2xl font-bold m-0 flex items-center gap-2">
            <CarOutlined /> {vehicle.vehicle_id as string}
          </h1>
          <Tag color={vehicle.status === 'active' ? 'green' : 'red'}>{(vehicle.status as string)?.toUpperCase()}</Tag>
        </Space>
        <Space>
          <Button icon={<PrinterOutlined />} onClick={handlePrint}>Print</Button>
          <Button icon={<EditOutlined />} onClick={() => setEditDrawerVisible(true)}>Edit</Button>
          <Popconfirm title="Delete vehicle?" onConfirm={handleDelete}>
            <Button danger icon={<DeleteOutlined />}>Delete</Button>
          </Popconfirm>
        </Space>
      </div>

      <Card className="mb-6">
        <div ref={printRef}>
          <div className="section">
            <div className="section-title">Basic Information</div>
            <div className="field-grid">
              <Field label="Vehicle ID" value={vehicle.vehicle_id} />
              <Field label="Vehicle Type" value={vehicle.vehicle_type} />
              <Field label="Category" value={vehicle.category} />
              <Field label="Make/Model" value={vehicle.make_model} />
              <Field label="License Plate" value={vehicle.license_plate} />
              <Field label="Chassis Number" value={vehicle.chassis_number} />
              <Field label="Asset Tag" value={vehicle.asset_tag} />
              <Field label="Year" value={vehicle.year} />
              <Field label="Status" value={vehicle.status} />
              <Field label="Compliance" value={vehicle.compliance} />
              <Field label="Government Permit" value={vehicle.government_permit} />
            </div>
          </div>
        </div>
      </Card>

      {vehicle?.fuel_limit_monthly && (
        <Card className="mb-6" title="Monthly Fuel Monitoring" loading={loadingFuelData}>
          <Row gutter={16}>
            <Col span={8}>
              <Statistic 
                title="Fuel Limit (Liters)" 
                value={Number(vehicle.fuel_limit_monthly)} 
                precision={2}
                suffix="L"
              />
            </Col>
            <Col span={8}>
              <Statistic 
                title="Current Usage (This Month)" 
                value={monthlyFuelUsage} 
                precision={2}
                suffix="L"
                valueStyle={{ 
                  color: monthlyFuelUsage > Number(vehicle.fuel_limit_monthly) ? '#cf1322' : 
                         monthlyFuelUsage > Number(vehicle.fuel_limit_monthly) * 0.8 ? '#faad14' : '#3f8600' 
                }}
              />
            </Col>
            <Col span={8}>
              <Statistic 
                title="Status" 
                value={monthlyFuelUsage > Number(vehicle.fuel_limit_monthly) ? 'Exceeded' : 'Within Limit'}
                valueStyle={{ 
                  color: monthlyFuelUsage > Number(vehicle.fuel_limit_monthly) ? '#cf1322' : '#3f8600',
                  fontSize: '16px'
                }}
                prefix={monthlyFuelUsage > Number(vehicle.fuel_limit_monthly) ? <WarningOutlined /> : null}
              />
            </Col>
          </Row>
          <div className="mt-4">
            <Progress 
              percent={Math.min((monthlyFuelUsage / Number(vehicle.fuel_limit_monthly)) * 100, 100)} 
              status={
                monthlyFuelUsage > Number(vehicle.fuel_limit_monthly) ? 'exception' : 
                monthlyFuelUsage > Number(vehicle.fuel_limit_monthly) * 0.8 ? 'normal' : 
                'success'
              }
              strokeColor={
                monthlyFuelUsage > Number(vehicle.fuel_limit_monthly) ? '#ff4d4f' : 
                monthlyFuelUsage > Number(vehicle.fuel_limit_monthly) * 0.8 ? '#faad14' : 
                '#52c41a'
              }
            />
            {monthlyFuelUsage > Number(vehicle.fuel_limit_monthly) && (
              <Tag color="error" className="mt-2" icon={<WarningOutlined />}>
                Fuel limit exceeded by {(monthlyFuelUsage - Number(vehicle.fuel_limit_monthly)).toFixed(2)} liters
              </Tag>
            )}
            {monthlyFuelUsage > Number(vehicle.fuel_limit_monthly) * 0.8 && monthlyFuelUsage <= Number(vehicle.fuel_limit_monthly) && (
              <Tag color="warning" className="mt-2" icon={<WarningOutlined />}>
                Approaching fuel limit - {((Number(vehicle.fuel_limit_monthly) - monthlyFuelUsage) || 0).toFixed(2)} liters remaining
              </Tag>
            )}
          </div>
        </Card>
      )}

      <Tabs
        items={[
          {
            key: 'documents',
            label: 'Documents',
            children: (
              <Card extra={
                <Button type="primary" icon={<UploadOutlined />} onClick={() => { setUploadType('document'); setUploadDrawerVisible(true); }}>
                  Upload Document
                </Button>
              }>
                <Table columns={documentColumns} dataSource={documents} rowKey="id" pagination={false} size="small" />
              </Card>
            ),
          },
          {
            key: 'images',
            label: 'Images',
            children: (
              <Card extra={
                <Button type="primary" icon={<FileImageOutlined />} onClick={() => { setUploadType('image'); setUploadDrawerVisible(true); }}>
                  Upload Image
                </Button>
              }>
                <div className="grid grid-cols-4 gap-4">
                  {images.map((img: Record<string, unknown>) => {
                    const decodedPath = decodeURIComponent(img.url as string);
                    const fullUrl = decodedPath.startsWith('http') ? decodedPath : `${API_BASE}${decodedPath}`;
                    const filename = img.filename as string;
                    const title = filename ? filename.replace(/\.[^/.]+$/, '') : 'Image';
                    return (
                      <div key={img.id as number} className="relative group">
                        <Image src={fullUrl} alt={filename} className="rounded" />
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Popconfirm title="Delete?" onConfirm={() => handleDeleteImage(img.id as number)}>
                            <Button danger size="small" icon={<DeleteOutlined />} />
                          </Popconfirm>
                        </div>
                        <div className="mt-2 text-center text-sm text-gray-700 font-medium truncate px-2">
                          {title}
                        </div>
                      </div>
                    );
                  })}
                  {images.length === 0 && <p className="col-span-4 text-center text-gray-400 py-8">No images uploaded</p>}
                </div>
              </Card>
            ),
          },
        ]}
      />

      <Drawer title="Edit Vehicle" open={editDrawerVisible} onClose={() => setEditDrawerVisible(false)} width={720} destroyOnClose>
        <VehicleForm initialValues={vehicle} onSubmit={handleUpdate} onCancel={() => setEditDrawerVisible(false)} />
      </Drawer>

      <Drawer
        title={`Upload ${uploadType === 'document' ? 'Document' : 'Image'}`}
        open={uploadDrawerVisible}
        onClose={() => setUploadDrawerVisible(false)}
        width={480}
        footer={
          <div style={{ textAlign: 'right' }}>
            <Button onClick={() => setUploadDrawerVisible(false)} style={{ marginRight: 8 }}>Cancel</Button>
            <Button type="primary" onClick={() => uploadForm.submit()}>Upload</Button>
          </div>
        }
      >
        <Form form={uploadForm} layout="vertical" onFinish={handleUpload}>
          <Form.Item 
            label="Document Title" 
            name="title"
            rules={[{ required: true, message: 'Please enter document title' }]}
          >
            <Input placeholder="e.g., Vehicle Registration, Insurance Certificate" />
          </Form.Item>
          <Form.Item label="File" name="file" rules={[{ required: true }]}>
            <Upload maxCount={1} beforeUpload={() => false} accept={uploadType === 'image' ? 'image/*' : '*'}>
              <Button icon={<UploadOutlined />}>Select File</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Drawer>

      <Drawer
        title="Preview"
        open={previewVisible}
        onClose={() => setPreviewVisible(false)}
        width={900}
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
              <Image src={previewFile} alt="Preview" style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }} preview={false} />
            </div>
          ) : previewFile.match(/\.pdf$/i) ? (
            <iframe src={previewFile} style={{ width: '100%', height: '70vh', border: 'none', borderRadius: '4px', background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} />
          ) : (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <FilePdfOutlined style={{ fontSize: 80, color: '#bfbfbf', marginBottom: '20px' }} />
              <p style={{ fontSize: '16px', color: '#666', marginBottom: '10px' }}>Preview not available</p>
              <p style={{ fontSize: '14px', color: '#999' }}>Click download to view the file</p>
            </div>
          )}
        </div>
      </Drawer>

      <style jsx>{`
        .section { margin-bottom: 25px; }
        .section-title { font-size: 15px; font-weight: bold; background: linear-gradient(to right, #1890ff, #40a9ff); color: white; padding: 10px 15px; margin-bottom: 15px; border-radius: 4px; text-transform: uppercase; letter-spacing: 1px; }
        .field-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px 20px; }
        .field { padding: 10px; background: #fafafa; border-radius: 4px; border-left: 3px solid #1890ff; }
        .field-label { font-size: 11px; color: #1890ff; margin-bottom: 4px; }
        .field-label strong { font-weight: 600; }
        .field-value { font-size: 13px; color: #333; font-weight: 500; }
      `}</style>
    </div>
  );
}
