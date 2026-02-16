'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Card, Button, Space, Table, Drawer, Form, Input,
  message, Popconfirm, Tag, Spin, Select, Tabs, InputNumber, DatePicker,
  Upload, Modal, List, Avatar, Image
} from 'antd';
import {
  ArrowLeftOutlined, EditOutlined, DeleteOutlined, PlusOutlined,
  PrinterOutlined, TeamOutlined, EnvironmentOutlined, FileTextOutlined,
  UserOutlined, UploadOutlined, FileOutlined, UserAddOutlined,
  UserDeleteOutlined, DownloadOutlined, FilePdfOutlined
} from '@ant-design/icons';
import { clientApi } from '@/lib/api';
import ClientForm from '../ClientForm';
import dayjs from 'dayjs';

const { TextArea } = Input;

const Field = ({ label, value }: { label: string; value: unknown }) => (
  <div className="field">
    <div className="field-label"><strong>{label}:</strong></div>
    <div className="field-value">{String(value || '-')}</div>
  </div>
);

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = parseInt(params.id as string);
  const printRef = useRef<HTMLDivElement>(null);

  const [client, setClient] = useState<Record<string, unknown> | null>(null);
  const [contacts, setContacts] = useState<Array<Record<string, unknown>>>([]);
  const [sites, setSites] = useState<Array<Record<string, unknown>>>([]);
  const [contracts, setContracts] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [editDrawerVisible, setEditDrawerVisible] = useState(false);
  const [contactDrawerVisible, setContactDrawerVisible] = useState(false);
  const [siteDrawerVisible, setSiteDrawerVisible] = useState(false);
  const [contractDrawerVisible, setContractDrawerVisible] = useState(false);
  const [editingContact, setEditingContact] = useState<Record<string, unknown> | null>(null);
  const [editingSite, setEditingSite] = useState<Record<string, unknown> | null>(null);
  const [editingContract, setEditingContract] = useState<Record<string, unknown> | null>(null);
  const [contactForm] = Form.useForm();
  const [siteForm] = Form.useForm();
  const [contractForm] = Form.useForm();

  // New states for contract documents and guard assignments
  const [documentsModalVisible, setDocumentsModalVisible] = useState(false);
  const [selectedContractId, setSelectedContractId] = useState<number | null>(null);
  const [contractDocuments, setContractDocuments] = useState<Array<Record<string, unknown>>>([]);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewFile, setPreviewFile] = useState('');

  const [guardsModalVisible, setGuardsModalVisible] = useState(false);
  const [assignGuardDrawerVisible, setAssignGuardDrawerVisible] = useState(false);
  const [selectedSiteId, setSelectedSiteId] = useState<number | null>(null);
  const [siteGuards, setSiteGuards] = useState<Array<Record<string, unknown>>>([]);
  const [availableGuards, setAvailableGuards] = useState<Array<Record<string, unknown>>>([]);
  const [assignGuardForm] = Form.useForm();

  const fetchClient = async () => {
    setLoading(true);
    const response = await clientApi.getOne(clientId);
    setLoading(false);
    if (response.error) {
      message.error(response.error);
      return;
    }
    setClient((response.data as any)?.client || (response.data as any) || null);
  };

  const fetchContacts = async () => {
    const response = await clientApi.getContacts(clientId);
    if (!response.error) {
      setContacts((response.data as any)?.contacts || (response.data as any) || []);
    }
  };

  const fetchSites = async () => {
    const response = await clientApi.getSites(clientId);
    if (!response.error) {
      setSites((response.data as any)?.sites || (response.data as any) || []);
    }
  };

  const fetchContracts = async () => {
    const response = await clientApi.getContracts(clientId);
    if (!response.error) {
      setContracts((response.data as any)?.contracts || (response.data as any) || []);
    }
  };

  useEffect(() => {
    fetchClient();
    fetchContacts();
    fetchSites();
    fetchContracts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const handleUpdate = async (values: Record<string, unknown>) => {
    const response = await clientApi.update(clientId, values);
    if (response.error) {
      message.error(response.error);
      return;
    }
    message.success('Client updated');
    setEditDrawerVisible(false);
    fetchClient();
  };

  const handleDelete = async () => {
    const response = await clientApi.delete(clientId);
    if (response.error) {
      message.error(response.error);
      return;
    }
    message.success('Client deleted');
    router.push('/dashboard/clients');
  };

  // Contact handlers
  const handleContactSubmit = async (values: Record<string, unknown>) => {
    const response = editingContact
      ? await clientApi.updateContact(clientId, editingContact.id as number, values)
      : await clientApi.createContact(clientId, values);

    if (response.error) {
      message.error(response.error);
      return;
    }
    message.success(`Contact ${editingContact ? 'updated' : 'created'}`);
    setContactDrawerVisible(false);
    contactForm.resetFields();
    fetchContacts();
  };

  const handleDeleteContact = async (contactId: number) => {
    const response = await clientApi.deleteContact(clientId, contactId);
    if (response.error) {
      message.error(response.error);
      return;
    }
    message.success('Contact deleted');
    fetchContacts();
  };


  // Site handlers
  const handleSiteSubmit = async (values: Record<string, unknown>) => {
    const response = editingSite
      ? await clientApi.updateSite(clientId, editingSite.id as number, values)
      : await clientApi.createSite(clientId, values);

    if (response.error) {
      message.error(response.error);
      return;
    }
    message.success(`Site ${editingSite ? 'updated' : 'created'}`);
    setSiteDrawerVisible(false);
    siteForm.resetFields();
    fetchSites();
  };

  const handleDeleteSite = async (siteId: number) => {
    const response = await clientApi.deleteSite(clientId, siteId);
    if (response.error) {
      message.error(response.error);
      return;
    }
    message.success('Site deleted');
    fetchSites();
  };

  // Contract handlers
  const handleContractSubmit = async (values: Record<string, unknown>) => {
    const formattedValues = { ...values };
    if (formattedValues.start_date) {
      formattedValues.start_date = dayjs(formattedValues.start_date as string).format('YYYY-MM-DD');
    }
    if (formattedValues.end_date) {
      formattedValues.end_date = dayjs(formattedValues.end_date as string).format('YYYY-MM-DD');
    }

    const response = editingContract
      ? await clientApi.updateContract(clientId, editingContract.id as number, formattedValues)
      : await clientApi.createContract(clientId, formattedValues);

    if (response.error) {
      message.error(response.error);
      return;
    }
    message.success(`Contract ${editingContract ? 'updated' : 'created'}`);
    setContractDrawerVisible(false);
    contractForm.resetFields();
    fetchContracts();
  };

  const handleDeleteContract = async (contractId: number) => {
    const response = await clientApi.deleteContract(clientId, contractId);
    if (response.error) {
      message.error(response.error);
      return;
    }
    message.success('Contract deleted');
    fetchContracts();
  };

  // Contract Documents handlers
  const handleViewDocuments = async (contractId: number) => {
    setSelectedContractId(contractId);
    setDocumentsModalVisible(true);
    const response = await clientApi.getContractDocuments(contractId);
    if (!response.error) {
      setContractDocuments((response.data as any)?.documents || (response.data as any) || []);
    }
  };

  const handleUploadDocument = async (contractId: number, file: File) => {
    setUploadingDocument(true);
    const response = await clientApi.uploadContractDocument(contractId, file);
    setUploadingDocument(false);

    if (response.error) {
      message.error(response.error);
      return;
    }
    message.success('Document uploaded');
    handleViewDocuments(contractId);
  };

  const handleDeleteDocument = async (contractId: number, documentId: number) => {
    const response = await clientApi.deleteContractDocument(contractId, documentId);
    if (response.error) {
      message.error(response.error);
      return;
    }
    message.success('Document deleted');
    handleViewDocuments(contractId);
  };

  // Guard Assignment handlers
  const handleViewSiteGuards = async (siteId: number) => {
    setSelectedSiteId(siteId);
    setGuardsModalVisible(true);
    const response = await clientApi.getSiteGuards(siteId);
    if (!response.error) {
      setSiteGuards((response.data as any)?.guards || (response.data as any) || []);
    }
  };

  const handleOpenAssignGuard = async (siteId: number) => {
    setSelectedSiteId(siteId);
    setAssignGuardDrawerVisible(true);
    assignGuardForm.resetFields();

    const response = await clientApi.getAllActiveAndInActiveGuards();
    if (!response.error) {
      const data = (response.data as any)?.guards || (response.data as any)?.employees || (response.data as any)?.data || (response.data as any) || [];
      const guardsArray = Array.isArray(data) ? data : [];
      console.log('Available guards fetched:', guardsArray.length, guardsArray);
      setAvailableGuards(guardsArray);
    } else {
      message.error('Failed to fetch guards: ' + response.error);
    }
  };

  const handleAssignGuard = async (values: Record<string, unknown>) => {
    if (!selectedSiteId) return;

    const formattedValues = { ...values };
    if (formattedValues.assignment_date) {
      formattedValues.assignment_date = dayjs(formattedValues.assignment_date as string).format('YYYY-MM-DD');
    }

    const response = await clientApi.assignGuard(selectedSiteId, formattedValues);
    if (response.error) {
      message.error(response.error);
      return;
    }
    message.success('Guard assigned successfully');
    setAssignGuardDrawerVisible(false);
    assignGuardForm.resetFields();
    fetchSites(); // Refresh to update guard counts
  };

  const handleEjectGuard = async (siteId: number, assignmentId: number) => {
    const endDate = dayjs().format('YYYY-MM-DD');
    const response = await clientApi.ejectGuard(siteId, assignmentId, {
      end_date: endDate,
      notes: 'Ejected from site'
    });

    if (response.error) {
      message.error(response.error);
      return;
    }
    message.success('Guard ejected from site');
    handleViewSiteGuards(siteId);
    fetchSites(); // Refresh to update guard counts
  };

  console.log('contacts', contacts);


  
  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`<!DOCTYPE html><html><head>
      <title>Client Report - ${client?.name}</title>
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
        <p>Client Information Report</p>
      </div>
      ${printContent.innerHTML}
      </body></html>`);
    printWindow.document.close();
    printWindow.print();
  };

  if (loading) return <div className="flex justify-center items-center h-96"><Spin size="large" /></div>;
  if (!client) return <div>Client not found</div>;

  const contactColumns = [
    { title: 'Contact ID', dataIndex: 'id', key: 'id', width: 100, render: (id: number) => `CIT-${String(id).padStart(4, '0')}` },
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Phone', dataIndex: 'phone', key: 'phone' },
    { title: 'Role', dataIndex: 'role', key: 'role' },
    {
      title: 'Primary',
      dataIndex: 'is_primary',
      key: 'is_primary',
      render: (val: boolean) => val ? <Tag color="blue">Primary</Tag> : null
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: unknown, record: Record<string, unknown>) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => { setEditingContact(record); contactForm.setFieldsValue(record); setContactDrawerVisible(true); }} />
      
        </Space>
      ),
    },
  ];

  const siteColumns = [
    { title: 'Site ID', dataIndex: 'id', key: 'id', width: 100, render: (id: number) => `SITE-${String(id).padStart(4, '0')}` },
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Address', dataIndex: 'address', key: 'address', ellipsis: true },
    { title: 'City', dataIndex: 'city', key: 'city' },
    { title: 'Guards Required', dataIndex: 'guards_required', key: 'guards_required' },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => <Tag color={status === 'active' ? 'green' : 'red'}>{status?.toUpperCase()}</Tag>
    },
    {
      title: 'Guards',
      key: 'guards',
      width: 200,
      render: (_: unknown, record: Record<string, unknown>) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<UserAddOutlined />}
            onClick={() => handleOpenAssignGuard(record.id as number)}
          >
            Assign
          </Button>
          <Button
            size="small"
            icon={<TeamOutlined />}
            onClick={() => handleViewSiteGuards(record.id as number)}
          >
            View
          </Button>
        </Space>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: unknown, record: Record<string, unknown>) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => { setEditingSite(record); siteForm.setFieldsValue(record); setSiteDrawerVisible(true); }} />
        </Space>
      ),
    },
  ];

  const contractColumns = [
    { title: 'Contract #', dataIndex: 'contract_number', key: 'contract_number', width: 120, render: (val: string) => val || '-' },
    { title: 'Start Date', dataIndex: 'start_date', key: 'start_date' },
    { title: 'End Date', dataIndex: 'end_date', key: 'end_date' },
    { title: 'Value', dataIndex: 'value', key: 'value', render: (val: number) => val ? `Rs ${val.toLocaleString()}` : '-' },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => <Tag color={status === 'active' ? 'green' : 'red'}>{status?.toUpperCase()}</Tag>
    },
    {
      title: 'Documents',
      key: 'documents',
      width: 120,
      render: (_: unknown, record: Record<string, unknown>) => (
        <Button
          size="small"
          icon={<FileOutlined />}
          onClick={() => handleViewDocuments(record.id as number)}
        >
          View
        </Button>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: unknown, record: Record<string, unknown>) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => {
            const values = { ...record };
            if (values.start_date) values.start_date = dayjs(values.start_date as string);
            if (values.end_date) values.end_date = dayjs(values.end_date as string);
            setEditingContract(record);
            contractForm.setFieldsValue(values);
            setContractDrawerVisible(true);
          }} />
    
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
            <TeamOutlined /> {client.name as string}
          </h1>
          <Tag color={client.status === 'active' ? 'green' : 'red'}>{(client.status as string)?.toUpperCase()}</Tag>
        </Space>
        <Space>
          <Button icon={<PrinterOutlined />} onClick={handlePrint}>Print</Button>
          <Button icon={<EditOutlined />} onClick={() => setEditDrawerVisible(true)}>Edit</Button>
          <Popconfirm title="Delete client?" onConfirm={handleDelete}>
            <Button danger icon={<DeleteOutlined />}>Delete</Button>
          </Popconfirm>
        </Space>
      </div>

      <Card className="mb-6">
        <div ref={printRef}>
          <div className="section">
            <div className="section-title">Client Information</div>
            <div className="field-grid">
              <Field label="Client Name" value={client.name} />
              <Field label="Company Name" value={client.company_name} />
              <Field label="Email" value={client.email} />
              <Field label="Phone" value={client.phone} />
              <Field label="Industry" value={client.industry} />
              <Field label="Status" value={client.status} />
              <div className="field" style={{ gridColumn: 'span 3' }}>
                <div className="field-label"><strong>Address:</strong></div>
                <div className="field-value">{String(client.address || '-')}</div>
              </div>
              <div className="field" style={{ gridColumn: 'span 3' }}>
                <div className="field-label"><strong>Notes:</strong></div>
                <div className="field-value">{String(client.notes || '-')}</div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Tabs
        items={[
          {
            key: 'contacts',
            label: <span><UserOutlined /> Contacts</span>,
            children: (
              <Card extra={
                <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingContact(null); contactForm.resetFields(); setContactDrawerVisible(true); }}>
                  Add Contact
                </Button>
              }>
                <Table columns={contactColumns} dataSource={contacts} rowKey="id" pagination={false} size="small" />
              </Card>
            ),
          },
          {
            key: 'sites',
            label: <span><EnvironmentOutlined /> Sites</span>,
            children: (
              <Card extra={
                <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingSite(null); siteForm.resetFields(); setSiteDrawerVisible(true); }}>
                  Add Site
                </Button>
              }>
                <Table columns={siteColumns} dataSource={sites} rowKey="id" pagination={false} size="small" />
              </Card>
            ),
          },
          {
            key: 'contracts',
            label: <span><FileTextOutlined /> Contracts</span>,
            children: (
              <Card extra={
                <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingContract(null); contractForm.resetFields(); setContractDrawerVisible(true); }}>
                  Add Contract
                </Button>
              }>
                <Table columns={contractColumns} dataSource={contracts} rowKey="id" pagination={false} size="small" />
              </Card>
            ),
          },
        ]}
      />

      <Drawer title="Edit Client" open={editDrawerVisible} onClose={() => setEditDrawerVisible(false)} width={720} destroyOnClose>
        <ClientForm initialValues={client} onSubmit={handleUpdate} onCancel={() => setEditDrawerVisible(false)} />
      </Drawer>

      <Drawer
        title={editingContact ? 'Edit Contact' : 'Add Contact'}
        open={contactDrawerVisible}
        onClose={() => setContactDrawerVisible(false)}
        width={480}
        footer={
          <div style={{ textAlign: 'right' }}>
            <Button onClick={() => setContactDrawerVisible(false)} style={{ marginRight: 8 }}>Cancel</Button>
            <Button type="primary" onClick={() => contactForm.submit()}>Save</Button>
          </div>
        }
      >
        <Form form={contactForm} layout="vertical" onFinish={handleContactSubmit}>
          <Form.Item label="Name" name="name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Email" name="email" rules={[{ type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Phone" name="phone">
            <Input />
          </Form.Item>
          <Form.Item label="Role" name="role">
            <Input placeholder="Manager, Director, etc." />
          </Form.Item>
          <Form.Item label="Primary Contact" name="is_primary" valuePropName="checked">
            <Select options={[
              { label: 'Yes', value: true },
              { label: 'No', value: false },
            ]} />
          </Form.Item>
        </Form>
      </Drawer>

      <Drawer
        title={editingSite ? 'Edit Site' : 'Add Site'}
        open={siteDrawerVisible}
        onClose={() => setSiteDrawerVisible(false)}
        width={480}
        footer={
          <div style={{ textAlign: 'right' }}>
            <Button onClick={() => setSiteDrawerVisible(false)} style={{ marginRight: 8 }}>Cancel</Button>
            <Button type="primary" onClick={() => siteForm.submit()}>Save</Button>
          </div>
        }
      >
        <Form form={siteForm} layout="vertical" onFinish={handleSiteSubmit}>
          <Form.Item label="Site Name" name="name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Address" name="address">
            <TextArea rows={2} />
          </Form.Item>
          <Form.Item label="City" name="city">
            <Input />
          </Form.Item>
          <Form.Item label="Guards Required" name="guards_required">
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
          <Form.Item label="Status" name="status">
            <Select options={[
              { label: 'Active', value: 'active' },
              { label: 'Inactive', value: 'inactive' },
            ]} />
          </Form.Item>
        </Form>
      </Drawer>

      <Drawer
        title={editingContract ? 'Edit Contract' : 'Add Contract'}
        open={contractDrawerVisible}
        onClose={() => setContractDrawerVisible(false)}
        width={480}
        footer={
          <div style={{ textAlign: 'right' }}>
            <Button onClick={() => setContractDrawerVisible(false)} style={{ marginRight: 8 }}>Cancel</Button>
            <Button type="primary" onClick={() => contractForm.submit()}>Save</Button>
          </div>
        }
      >
        <Form form={contractForm} layout="vertical" onFinish={handleContractSubmit}>
          <Form.Item label="Contract Number" name="contract_number">
            <Input placeholder={editingContract ? "CTN-0001" : "Auto-generated (CTN-####)"} disabled={!editingContract} />
          </Form.Item>
          <Form.Item label="Start Date" name="start_date">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="End Date" name="end_date">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Value (Rs)" name="value">
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
          <Form.Item label="Status" name="status">
            <Select options={[
              { label: 'Active', value: 'active' },
              { label: 'Expired', value: 'expired' },
              { label: 'Pending', value: 'pending' },
            ]} />
          </Form.Item>
          <Form.Item label="Terms" name="terms">
            <TextArea rows={3} placeholder="Contract terms and conditions..." />
          </Form.Item>
        </Form>
      </Drawer>

      {/* Contract Documents Modal */}
      <Modal
        title="Contract Documents"
        open={documentsModalVisible}
        onCancel={() => setDocumentsModalVisible(false)}
        width={700}
        footer={[
          <Button key="close" onClick={() => setDocumentsModalVisible(false)}>
            Close
          </Button>,
        ]}
      >
        <Upload
          beforeUpload={(file) => {
            if (selectedContractId) {
              handleUploadDocument(selectedContractId, file);
            }
            return false;
          }}
          showUploadList={false}
        >
          <Button icon={<UploadOutlined />} loading={uploadingDocument} style={{ marginBottom: 16 }}>
            Upload Document
          </Button>
        </Upload>

        <List
          dataSource={contractDocuments}
          renderItem={(item: Record<string, unknown>) => (
            <List.Item
              actions={[
                <Button
                  key="preview"
                  type="link"
                  onClick={() => {
                    setPreviewFile(item.file_path as string);
                    setPreviewVisible(true);
                  }}
                >
                  Preview
                </Button>,
                <Button
                  key="download"
                  type="link"
                  href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/${item.file_path}`}
                  target="_blank"
                >
                  Download
                </Button>,
              ]}
            >
              <List.Item.Meta
                avatar={<FileOutlined style={{ fontSize: 24 }} />}
                title={item.filename as string}
                description={`${((item.file_size as number) / 1024).toFixed(2)} KB • ${new Date(item.uploaded_at as string).toLocaleDateString()}`}
              />
            </List.Item>
          )}
        />
      </Modal>

      {/* Site Guards Modal */}
      <Modal
        title="Assigned Guards"
        open={guardsModalVisible}
        onCancel={() => setGuardsModalVisible(false)}
        width={800}
        footer={[
          <Button key="close" onClick={() => setGuardsModalVisible(false)}>
            Close
          </Button>,
        ]}
      >
        <List
          dataSource={siteGuards}
          renderItem={(item: Record<string, unknown>) => (
            <List.Item
              actions={[
                item.status === 'active' ? (
                  <Popconfirm
                    key="eject"
                    title="Eject this guard from site?"
                    onConfirm={() => selectedSiteId && handleEjectGuard(selectedSiteId, item.id as number)}
                  >
                    <Button type="primary" danger icon={<UserDeleteOutlined />}>
                      Eject
                    </Button>
                  </Popconfirm>
                ) : (
                  <Tag key="status" color="red">EJECTED</Tag>
                ),
              ]}
            >
              <List.Item.Meta
                avatar={<Avatar src={item.employee_photo as string} icon={<UserOutlined />} />}
                title={`${item.employee_name} (${item.employee_id})`}
                description={
                  <Space direction="vertical" size="small">
                    <div>Shift: <Tag>{(item.shift as string)?.toUpperCase()}</Tag></div>
                    <div>Assigned: {String(item.assignment_date)}</div>
                    {item.end_date ? <div>Ended: {String(item.end_date)}</div> : null}
                    {item.notes ? <div>Notes: {String(item.notes)}</div> : null}
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      </Modal>

      {/* Assign Guard Drawer */}
      <Drawer
        title="Assign Guard to Site"
        open={assignGuardDrawerVisible}
        onClose={() => setAssignGuardDrawerVisible(false)}
        width={480}
        footer={
          <div style={{ textAlign: 'right' }}>
            <Button onClick={() => setAssignGuardDrawerVisible(false)} style={{ marginRight: 8 }}>
              Cancel
            </Button>
            <Button type="primary" onClick={() => assignGuardForm.submit()}>
              Assign Guard
            </Button>
          </div>
        }
      >
        <Form form={assignGuardForm} layout="vertical" onFinish={handleAssignGuard}>
          <Form.Item
            label="Select Guard"
            name="employee_id"
            rules={[{ required: true, message: 'Please select a guard' }]}
          >
            <Select
              showSearch
              placeholder="Select guard"
              optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={availableGuards.map((guard) => ({
                value: guard.employee_id,
                label: `${guard.employee_id} - ${guard.full_name || guard.first_name}`,
              }))}
            />
          </Form.Item>
          <Form.Item
            label="Shift"
            name="shift"
            rules={[{ required: true, message: 'Please select shift' }]}
          >
            <Select placeholder="Select shift">
              <Select.Option value="morning">Morning</Select.Option>
              <Select.Option value="evening">Evening</Select.Option>
              <Select.Option value="night">Night</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            label="Assignment Date"
            name="assignment_date"
            rules={[{ required: true, message: 'Please select date' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Notes" name="notes">
            <TextArea rows={3} placeholder="Any additional notes..." />
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
