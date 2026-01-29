'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Table,
  Button,
  Space,
  Input,
  Drawer,
  message,
  Tag,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ReloadOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { clientApi } from '@/lib/api';
import ClientForm from './ClientForm';
import IndustriesModal from './IndustriesModal';

const { Search } = Input;

interface Client extends Record<string, unknown> {
  id: number;
  client_id?: string;
  name: string;
  company_name?: string;
  email?: string;
  phone?: string;
  industry?: string;
  status: string;
}

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [industriesModalVisible, setIndustriesModalVisible] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [searchText, setSearchText] = useState('');

  const fetchClients = async () => {
    setLoading(true);
    const response = await clientApi.getAll();
    setLoading(false);

    if (response.error) {
      message.error(response.error);
      return;
    }

    const data = (response.data as any)?.clients || (response.data as any) || [];
    setClients(data);
    setFilteredClients(data);
  };

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    if (searchText) {
      const filtered = clients.filter(client =>
        client.name?.toLowerCase().includes(searchText.toLowerCase()) ||
        client.company_name?.toLowerCase().includes(searchText.toLowerCase()) ||
        client.email?.toLowerCase().includes(searchText.toLowerCase()) ||
        client.phone?.includes(searchText) ||
        client.industry?.toLowerCase().includes(searchText.toLowerCase())
      );
      setFilteredClients(filtered);
    } else {
      setFilteredClients(clients);
    }
  }, [searchText, clients]);

  const handleCreate = () => {
    setEditingClient(null);
    setDrawerVisible(true);
  };

  const handleEdit = (record: Client) => {
    setEditingClient(record);
    setDrawerVisible(true);
  };

  const handleDelete = async (id: number) => {
    const response = await clientApi.delete(id);
    if (response.error) {
      message.error(response.error);
      return;
    }
    message.success('Client deleted successfully');
    fetchClients();
  };

  const handleFormSubmit = async (values: Record<string, unknown>) => {
    const response = editingClient
      ? await clientApi.update(editingClient.id, values)
      : await clientApi.create(values);

    if (response.error) {
      message.error(response.error);
      return;
    }

    message.success(
      `Client ${editingClient ? 'updated' : 'created'} successfully`
    );
    setDrawerVisible(false);
    fetchClients();
  };

  const columns = [
    {
      title: 'Client ID',
      dataIndex: 'client_id',
      key: 'client_id',
      width: 100,
      render: (text: string) => text || '-',
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: 'Company',
      dataIndex: 'company_name',
      key: 'company_name',
      width: 180,
      render: (text: string) => text || '-',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      width: 180,
      ellipsis: true,
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
      width: 130,
    },
    {
      title: 'Industry',
      dataIndex: 'industry',
      key: 'industry',
      width: 120,
      render: (text: string) => text || '-',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const color = status === 'active' ? 'green' : 'red';
        return <Tag color={color}>{status?.toUpperCase() || 'ACTIVE'}</Tag>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      fixed: 'right' as const,
      render: (_: unknown, record: Client) => (
        <Space>
          <Button
            type="link"
            onClick={() => router.push(`/dashboard/clients/${record.id}`)}
          >
            View
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
          />
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <TeamOutlined /> Clients
          </h1>
          <p className="text-gray-500 mt-1">Manage your clients and contracts</p>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => fetchClients()}>
            Refresh
          </Button>
          <Button onClick={() => setIndustriesModalVisible(true)}>
            Manage Industries
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate} size="large">
            Add Client
          </Button>
        </Space>
      </div>

      <div className="mb-4">
        <Search
          placeholder="Search by name, company, email, or phone..."
          allowClear
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 400 }}
          prefix={<SearchOutlined />}
        />
      </div>

      <Table
        columns={columns}
        dataSource={filteredClients}
        rowKey="id"
        loading={loading}
        size="small"
        scroll={{ x: 1200 }}
        className="compact-table"
      />

      <Drawer
        title={editingClient ? 'Edit Client' : 'Add Client'}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        width={720}
        destroyOnClose
      >
        <ClientForm
          initialValues={editingClient}
          onSubmit={handleFormSubmit}
          onCancel={() => setDrawerVisible(false)}
        />
      </Drawer>

      <IndustriesModal
        open={industriesModalVisible}
        onClose={() => setIndustriesModalVisible(false)}
      />

      <style jsx global>{`
        .compact-table .ant-table {
          font-size: 12px;
        }
        .compact-table .ant-table-thead > tr > th {
          font-size: 11px;
          font-weight: 600;
          padding: 8px 8px;
          background: #fafafa;
        }
        .compact-table .ant-table-tbody > tr > td {
          padding: 6px 8px;
          font-size: 12px;
        }
        .compact-table .ant-btn-link {
          font-size: 12px;
          padding: 0 4px;
        }
        .compact-table .ant-tag {
          font-size: 11px;
          padding: 0 6px;
          margin: 0;
        }
      `}</style>
    </div>
  );
}
