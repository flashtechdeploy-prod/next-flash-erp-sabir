'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Table,
  Button,
  Space,
  Input,
  Select,
  Drawer,
  message,
  Popconfirm,
  Tag,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { employeeApi } from '@/lib/api';
import EmployeeForm from './EmployeeForm';

const { Search } = Input;

interface Employee extends Record<string, unknown> {
  employee_id: string;
  full_name?: string;
  name?: string;
  fss_number?: string;
  fss_no?: string;
  cnic_no?: string;
  cnic?: string;
  rank?: string;
  unit?: string;
  status: string;
}

export default function EmployeesPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  const [filters, setFilters] = useState({
    search: '',
    status: '',
  });

  const fetchEmployees = async (page = pagination.current, pageSize = pagination.pageSize) => {
    setLoading(true);
    const params: Record<string, string> = {
      skip: String((page - 1) * pageSize),
      limit: String(pageSize),
      with_total: 'true',
    };

    if (filters.search) {
      params.search = filters.search;
    }
    if (filters.status) {
      params.status = filters.status;
    }

    const response = await employeeApi.getAll(params);
    setLoading(false);

    if (response.error) {
      message.error(response.error);
      return;
    }

    const data = (response.data as any)?.employees || (response.data as any) || [];
    const total = (response.data as any)?.total || (Array.isArray(data) ? data.length : 0);
    setEmployees(Array.isArray(data) ? data : []);
    setPagination((prev) => ({
      ...prev,
      current: page,
      pageSize: pageSize,
      total: total,
    }));
  };

  useEffect(() => {
    fetchEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.search, filters.status]);

  const handleCreate = () => {
    setEditingEmployee(null);
    setDrawerVisible(true);
  };

  const handleEdit = (record: Employee) => {
    setEditingEmployee(record);
    setDrawerVisible(true);
  };

  const handleDelete = async (id: string) => {
    const response = await employeeApi.delete(id);
    if (response.error) {
      message.error(response.error);
      return;
    }
    message.success('Employee deleted successfully');
    fetchEmployees();
  };

  const handleFormSubmit = async (values: Record<string, unknown>) => {
    const response = editingEmployee
      ? await employeeApi.update(editingEmployee.employee_id, values)
      : await employeeApi.create(values);

    if (response.error) {
      message.error(response.error);
      return;
    }

    message.success(
      `Employee ${editingEmployee ? 'updated' : 'created'} successfully`
    );
    setDrawerVisible(false);
    fetchEmployees();
  };

  const columns = [
    {
      title: 'Employee ID',
      dataIndex: 'employee_id',
      key: 'employee_id',
      width: 120,
    },
    {
      title: 'Name',
      dataIndex: 'full_name',
      key: 'full_name',
      width: 200,
      render: (text: string, record: Employee) => text || record.name || '-',
    },
    {
      title: 'FSS Number',
      dataIndex: 'fss_number',
      key: 'fss_number',
      width: 120,
      render: (text: string, record: Employee) => text || record.fss_no || '-',
    },
    {
      title: 'CNIC',
      dataIndex: 'cnic',
      key: 'cnic',
      width: 150,
      render: (text: string, record: Employee) => text || record.cnic_no || '-',
    },
    {
      title: 'Rank',
      dataIndex: 'rank',
      key: 'rank',
      width: 120,
    },
    {
      title: 'Unit',
      dataIndex: 'unit',
      key: 'unit',
      width: 120,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const color =
          status === 'Active' ? 'green' : status === 'Inactive' ? 'red' : 'orange';
        return <Tag color={color}>{status || 'Unknown'}</Tag>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      fixed: 'right' as const,
      render: (_: unknown, record: Employee) => (
        <Space>
          <Button
            type="link"
            onClick={() => router.push(`/dashboard/employees/${record.employee_id}`)}
          >
            View
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="Delete employee?"
            description="This action cannot be undone."
            onConfirm={() => handleDelete(record.employee_id)}
            okText="Yes"
            cancelText="No"
          >
            <Button type="link" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Employees</h1>
          <p className="text-gray-500 mt-1">Manage your workforce</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate} size="large">
          Add Employee
        </Button>
      </div>

      <div className="mb-4 flex gap-4">
        <Search
          placeholder="Search by name, CNIC, FSS number..."
          allowClear
          onSearch={(value) => setFilters({ ...filters, search: value })}
          style={{ width: 300 }}
          prefix={<SearchOutlined />}
        />
        <Select
          placeholder="Filter by status"
          allowClear
          style={{ width: 150 }}
          onChange={(value) => setFilters({ ...filters, status: value || '' })}
          options={[
            { label: 'Active', value: 'Active' },
            { label: 'Inactive', value: 'Inactive' },
            { label: 'Suspended', value: 'Suspended' },
          ]}
        />
        <Button icon={<ReloadOutlined />} onClick={() => fetchEmployees()}>
          Refresh
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={employees}
        rowKey="employee_id"
        loading={loading}
        size="small"
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} employees`,
        }}
        onChange={(newPagination) => {
          fetchEmployees(newPagination.current || 1, newPagination.pageSize || 20);
        }}
        scroll={{ x: 1200 }}
        className="compact-table"
      />

      <Drawer
        title={editingEmployee ? 'Edit Employee' : 'Add Employee'}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        width={720}
        destroyOnClose
      >
        <EmployeeForm
          initialValues={editingEmployee}
          onSubmit={handleFormSubmit}
          onCancel={() => setDrawerVisible(false)}
        />
      </Drawer>

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
