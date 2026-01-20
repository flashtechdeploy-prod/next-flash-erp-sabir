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
    fss_number: '',
    full_name: '',
    cnic: '',
    father_name: '',
    date_of_birth: '',
    mobile_number: '',
    department: '',
    designation: '',
    enrolled_as: '',
    date_of_enrolment: '',
  });

  const fetchEmployees = async (page = pagination.current, pageSize = pagination.pageSize) => {
    setLoading(true);
    const params: Record<string, string> = {
      skip: String((page - 1) * pageSize),
      limit: String(pageSize),
      with_total: 'true',
    };

    if (filters.search) params.search = filters.search;
    if (filters.status) params.status = filters.status;
    if (filters.fss_number) params.fss_number = filters.fss_number;
    if (filters.full_name) params.full_name = filters.full_name;
    if (filters.cnic) params.cnic = filters.cnic;
    if (filters.father_name) params.father_name = filters.father_name;
    if (filters.date_of_birth) params.date_of_birth = filters.date_of_birth;
    if (filters.mobile_number) params.mobile_number = filters.mobile_number;
    if (filters.department) params.department = filters.department;
    if (filters.designation) params.designation = filters.designation;
    if (filters.enrolled_as) params.enrolled_as = filters.enrolled_as;
    if (filters.date_of_enrolment) params.date_of_enrolment = filters.date_of_enrolment;

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
  }, [filters.search, filters.status, filters.fss_number, filters.full_name, filters.cnic, filters.father_name, filters.date_of_birth, filters.mobile_number, filters.department, filters.designation, filters.enrolled_as, filters.date_of_enrolment]);

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
    // Never send _profilePhotoFile or any other underscore-prefixed fields to the API
    const cleanValues = { ...values };
    Object.keys(cleanValues).forEach(key => {
      if (key.startsWith('_')) {
        delete (cleanValues as any)[key];
      }
    });

    // Get profile photo file from form ref (check if form has it attached)
    let profilePhotoFile = (values as any)._profilePhotoFile;

    // First create or update the employee
    const response = editingEmployee
      ? await employeeApi.update(editingEmployee.employee_id, cleanValues)
      : await employeeApi.create(cleanValues);

    if (response.error) {
      message.error(response.error);
      return;
    }

    const employeeData = response.data as Employee;

    // Then upload profile picture if provided
    if (profilePhotoFile && Array.isArray(profilePhotoFile) && profilePhotoFile.length > 0 && profilePhotoFile[0].originFileObj) {
      // Get the employee's database ID
      const empResponse = await employeeApi.getOne(employeeData.employee_id);
      if (!empResponse.error && empResponse.data) {
        const empId = (empResponse.data as any).id;

        // Upload the profile picture as a document
        const formData = new FormData();
        formData.append('file', profilePhotoFile[0].originFileObj);
        formData.append('name', 'Profile Picture');
        formData.append('category', 'profile_photo');

        const uploadResponse = await employeeApi.uploadDocument(empId, formData);
        console.log('Upload response:', uploadResponse);

        if (!uploadResponse.error && (uploadResponse.data as any)?.file_path) {
          const filePath = (uploadResponse.data as any).file_path;
          console.log('Updating employee profile_photo with:', filePath);

          // Update employee with profile picture URL
          const finalUpdateResponse = await employeeApi.update(employeeData.employee_id, {
            profile_photo: filePath
          });
          console.log('Final update response:', finalUpdateResponse);
        }
      }
    }

    message.success(
      `Employee ${editingEmployee ? 'updated' : 'created'} successfully`
    );
    setDrawerVisible(false);
    fetchEmployees();
  };

  const getColumnSearchProps = (dataIndex: keyof typeof filters, placeholder: string) => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }: any) => (
      <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
        <Input
          placeholder={`Search ${placeholder}`}
          value={selectedKeys[0]}
          onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
          onPressEnter={() => {
            confirm();
            setFilters((prev) => ({ ...prev, [dataIndex]: selectedKeys[0] }));
          }}
          style={{ marginBottom: 8, display: 'block' }}
        />
        <Space>
          <Button
            type="primary"
            onClick={() => {
              confirm();
              setFilters((prev) => ({ ...prev, [dataIndex]: selectedKeys[0] }));
            }}
            icon={<SearchOutlined />}
            size="small"
            style={{ width: 90 }}
          >
            Search
          </Button>
          <Button
            onClick={() => {
              clearFilters && clearFilters();
              setFilters((prev) => ({ ...prev, [dataIndex]: '' }));
              confirm();
            }}
            size="small"
            style={{ width: 90 }}
          >
            Reset
          </Button>
        </Space>
      </div>
    ),
    filterIcon: (filtered: boolean) => (
      <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />
    ),
  });

  const columns = [
    {
      title: 'FSS Number',
      dataIndex: 'fss_number',
      key: 'fss_number',
      width: 120,
      fixed: 'left' as const,
      ...getColumnSearchProps('fss_number', 'FSS No'),
    },
    {
      title: 'Name',
      dataIndex: 'full_name',
      key: 'full_name',
      width: 200,
      fixed: 'left' as const,
      render: (text: string, record: Employee) => text || record.name || '-',
      ...getColumnSearchProps('full_name', 'Name'),
    },
    {
      title: 'Father Name',
      dataIndex: 'father_name',
      key: 'father_name',
      width: 150,
      ...getColumnSearchProps('father_name', 'Father Name'),
    },
    {
      title: 'CNIC',
      dataIndex: 'cnic',
      key: 'cnic',
      width: 150,
      render: (text: string, record: Employee) => text || record.cnic_no || '-',
      ...getColumnSearchProps('cnic', 'CNIC'),
    },
    {
      title: 'Date of Birth',
      dataIndex: 'date_of_birth',
      key: 'date_of_birth',
      width: 120,
      render: (text: string, record: Employee) => text || record.dob || '-',
      ...getColumnSearchProps('date_of_birth', 'Date of Birth'),
    },
    {
      title: 'Mobile',
      dataIndex: 'mobile_number',
      key: 'mobile_number',
      width: 130,
      render: (text: string, record: Employee) => text || record.mobile_no || record.phone || '-',
      ...getColumnSearchProps('mobile_number', 'Mobile Number'),
    },
    {
      title: 'Rank',
      dataIndex: 'rank',
      key: 'rank',
      width: 100,
    },
    {
      title: 'Unit',
      dataIndex: 'unit',
      key: 'unit',
      width: 100,
    },
    {
      title: 'Designation',
      dataIndex: 'designation',
      key: 'designation',
      width: 150,
      ...getColumnSearchProps('designation', 'Designation'),
    },
    {
      title: 'Department',
      dataIndex: 'department',
      key: 'department',
      width: 150,
      ...getColumnSearchProps('department', 'Department'),
    },
    {
      title: 'Enrolled As',
      dataIndex: 'enrolled_as',
      key: 'enrolled_as',
      width: 120,
      ...getColumnSearchProps('enrolled_as', 'Enrolled As'),
    },
    {
      title: 'Joining Date',
      dataIndex: 'date_of_enrolment',
      key: 'date_of_enrolment',
      width: 120,
      ...getColumnSearchProps('date_of_enrolment', 'Joining Date'),
    },
    {
      title: 'Deployed At',
      dataIndex: 'deployed_at',
      key: 'deployed_at',
      width: 150,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      fixed: 'right' as const,
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
        scroll={{ x: 'max-content' }}
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
