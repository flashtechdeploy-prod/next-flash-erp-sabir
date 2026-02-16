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
  Form,
  InputNumber,
  Row,
  Col,
  Card,
  Statistic,
  Dropdown,
  Menu,
  MenuProps,
  Modal,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ReloadOutlined,
  InboxOutlined,
  DownOutlined,
  LockOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  StopOutlined,
} from '@ant-design/icons';
import { employeeApi, generalInventoryApi, restrictedInventoryApi, authApi } from '@/lib/api';
import EmployeeForm from './EmployeeForm';

const { Search } = Input;

interface Employee extends Record<string, unknown> {
  employee_id: string;
  full_name?: string;
  name?: string;
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
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [selectedEmployeeForPassword, setSelectedEmployeeForPassword] = useState<Employee | null>(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    fss_no: '',
    full_name: '',
    cnic: '',
    father_name: '',
    date_of_birth: '',
    mobile_number: '',
    department: '',
    designation: '',
    enrolled_as: '',
    date_of_enrolment: '',
    served_in: '',
    person_status: '',
  });
  const [kpis, setKpis] = useState<{ total: number; by_status: Record<string, number> }>({
    total: 0,
    by_status: {},
  });

  // Inventory assignment state
  const [generalItemDrawerVisible, setGeneralItemDrawerVisible] = useState(false);
  const [restrictedItemDrawerVisible, setRestrictedItemDrawerVisible] = useState(false);
  const [selectedEmployeeForAssignment, setSelectedEmployeeForAssignment] = useState<Employee | null>(null);
  const [generalItems, setGeneralItems] = useState<Record<string, unknown>[]>([]);
  const [restrictedItems, setRestrictedItems] = useState<Record<string, unknown>[]>([]);
  const [restrictedSerialUnits, setRestrictedSerialUnits] = useState<Record<string, unknown>[]>([]);
  const [selectedRestrictedItem, setSelectedRestrictedItem] = useState<Record<string, unknown> | null>(null);
  const [generalItemForm] = Form.useForm();
  const [restrictedItemForm] = Form.useForm();
  const [passwordForm] = Form.useForm();

  const fetchEmployees = async (page = pagination.current, pageSize = pagination.pageSize, sortBy?: string, sortOrder?: string) => {
    setLoading(true);
    const params: Record<string, string> = {
      skip: String((page - 1) * pageSize),
      limit: String(pageSize),
      with_total: 'true',
    };

    if (filters.search) params.search = filters.search;
    if (filters.status) params.status = filters.status;
    if (filters.fss_no) params.fss_no = filters.fss_no;
    if (filters.full_name) params.full_name = filters.full_name;
    if (filters.cnic) params.cnic = filters.cnic;
    if (filters.father_name) params.father_name = filters.father_name;
    if (filters.date_of_birth) params.date_of_birth = filters.date_of_birth;
    if (filters.mobile_number) params.mobile_number = filters.mobile_number;
    if (filters.department) params.department = filters.department;
    if (filters.designation) params.designation = filters.designation;
    if (filters.enrolled_as) params.enrolled_as = filters.enrolled_as;
    if (filters.date_of_enrolment) params.date_of_enrolment = filters.date_of_enrolment;
    if (filters.served_in) params.served_in = filters.served_in;
    if (filters.person_status) params.person_status = filters.person_status;

    if (sortBy) params.sort_by = sortBy;
    if (sortOrder) params.sort_order = sortOrder;


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
      current: page || 1,
      pageSize: pageSize || 20,
      total: total,
    }));
  };

  const fetchKpis = async () => {
    const params: Record<string, string> = {};
    if (filters.search) params.search = filters.search;
    if (filters.status) params.status = filters.status;
    if (filters.fss_no) params.fss_no = filters.fss_no;
    if (filters.full_name) params.full_name = filters.full_name;
    if (filters.cnic) params.cnic = filters.cnic;
    if (filters.served_in) params.served_in = filters.served_in;
    if (filters.person_status) params.person_status = filters.person_status;


    const response = await employeeApi.getKpis(params);
    if (!response.error && response.data) {
      setKpis(response.data as any);
    }
  };

  useEffect(() => {
    fetchEmployees(1, pagination.pageSize, 'fss_no', 'desc');
    fetchKpis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.search, filters.status, filters.fss_no, filters.full_name, filters.cnic, filters.father_name, filters.date_of_birth, filters.mobile_number, filters.department, filters.designation, filters.enrolled_as, filters.date_of_enrolment, filters.served_in, filters.person_status]);

  const handleCreate = () => {
    setEditingEmployee(null);
    setDrawerVisible(true);
  };

  const handleEdit = (record: Employee) => {
    setEditingEmployee(record);
    setDrawerVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await employeeApi.delete(id);
      if (response.error) {
        message.error(response.error);
        return;
      }
      message.success('Employee deleted successfully');
      // Refresh the employee list
      await fetchEmployees();
    } catch (error) {
      console.error('Delete error:', error);
      message.error('Failed to delete employee');
    }
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

  const handleSetPassword = async (values: any) => {
    if (!selectedEmployeeForPassword?.fss_no) {
      message.error('Employee FSS number not found');
      return;
    }
    const response = await authApi.setPassword({
      fss_no: selectedEmployeeForPassword.fss_no,
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

  // Inventory assignment handlers
  const handleAssignGeneralItem = async (employee: Employee) => {
    setSelectedEmployeeForAssignment(employee);
    generalItemForm.resetFields();
    setGeneralItemDrawerVisible(true);

    // Load general inventory items
    const response = await generalInventoryApi.getItems();
    if (!response.error && response.data) {
      const items = Array.isArray(response.data) ? response.data : [];
      setGeneralItems(items);
    }
  };
  console.log("employees", employees)

  const handleAssignRestrictedItem = async (employee: Employee) => {
    setSelectedEmployeeForAssignment(employee);
    restrictedItemForm.resetFields();
    setRestrictedItemDrawerVisible(true);

    // Load restricted inventory items
    const response = await restrictedInventoryApi.getItems();
    if (!response.error && response.data) {
      const items = Array.isArray(response.data) ? response.data : [];
      setRestrictedItems(items);
    }
  };

  const handleRestrictedItemChange = async (itemCode: string) => {
    const item = restrictedItems.find((i: any) => i.item_code === itemCode);
    setSelectedRestrictedItem(item || null);

    // If item is serial tracked, load serial units
    if (item && item.is_serial_tracked) {
      const response = await restrictedInventoryApi.getSerialUnits(itemCode);
      if (!response.error && response.data) {
        const units = Array.isArray(response.data) ? response.data : [];
        // Filter only available units
        const availableUnits = units.filter((u: any) => u.status === 'in_stock');
        setRestrictedSerialUnits(availableUnits);
      }
    } else {
      setRestrictedSerialUnits([]);
    }
  };

  const handleSubmitGeneralItemAssignment = async () => {
    try {
      const values = await generalItemForm.validateFields();
      const fssNumber = selectedEmployeeForAssignment?.fss_no;

      if (!fssNumber) {
        message.error('Employee FSS number not found');
        return;
      }

      const assignmentData = {
        quantity: values.quantity,
        employee_id: String(fssNumber),
        notes: values.notes || '',
      };

      const response = await generalInventoryApi.issueItem(values.item_code, assignmentData);

      if (response.error) {
        message.error(response.error);
        return;
      }

      message.success('General item assigned successfully');
      setGeneralItemDrawerVisible(false);
      generalItemForm.resetFields();
    } catch (error) {
      console.error('General item assignment error:', error);
      message.error('Failed to assign general item');
    }
  };

  const handleSubmitRestrictedItemAssignment = async () => {
    try {
      const values = await restrictedItemForm.validateFields();
      const fssNumber = selectedEmployeeForAssignment?.fss_no;

      if (!fssNumber) {
        message.error('Employee FSS number not found');
        return;
      }

      // Check if it's serial tracked
      if (selectedRestrictedItem?.is_serial_tracked) {
        // Issue by serial number
        const response = await restrictedInventoryApi.issueSerial(values.serial_unit_id, String(fssNumber));

        if (response.error) {
          message.error(response.error);
          return;
        }

        message.success('Restricted item (serial) assigned successfully');
      } else {
        // Issue by quantity (ammunition/consumables)
        const assignmentData = {
          quantity: values.quantity,
          employee_id: String(fssNumber),
          notes: values.notes || '',
        };

        const response = await restrictedInventoryApi.issueItem(values.item_code, assignmentData);

        if (response.error) {
          message.error(response.error);
          return;
        }

        message.success('Restricted item assigned successfully');
      }

      setRestrictedItemDrawerVisible(false);
      restrictedItemForm.resetFields();
      setSelectedRestrictedItem(null);
      setRestrictedSerialUnits([]);
    } catch (error) {
      console.error('Restricted item assignment error:', error);
      message.error('Failed to assign restricted item');
    }
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
      dataIndex: 'fss_no',
      key: 'fss_no',
      width: 120,
      fixed: 'left' as const,
      sorter: true,
      defaultSortOrder: 'descend' as const,
      render: (_: unknown, record: Employee) =>
        record.fss_no || record.cnic || '-',
      ...getColumnSearchProps('fss_no', 'FSS No'),
    },
    {
      title: 'Name',
      dataIndex: 'full_name',
      key: 'full_name',
      width: 200,
      fixed: 'left' as const,
      sorter: true,
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
      sorter: true,
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
      title: 'Wallet A/C Number',
      dataIndex: 'main_number',
      key: 'main_number',
      width: 130,
      render: (text: string) => text || '-',
    },
    {
      title: 'Person Status',
      dataIndex: 'person_status',
      key: 'person_status',
      width: 120,
      sorter: true,
    },
    {
      title: 'Rank',
      dataIndex: 'rank',
      key: 'rank',
      width: 100,
      sorter: true,
    },
    // {
    //   title: 'Unit',
    //   dataIndex: 'unit',
    //   key: 'unit',
    //   width: 100,
    // },
    // {
    //   title: 'Designation',
    //   dataIndex: 'designation',
    //   key: 'designation',
    //   width: 150,
    //   ...getColumnSearchProps('designation', 'Designation'),
    // },
    // {
    //   title: 'Department',
    //   dataIndex: 'department',
    //   key: 'department',
    //   width: 150,
    //   ...getColumnSearchProps('department', 'Department'),
    // },
    // {
    //   title: 'Enrolled As',
    //   dataIndex: 'enrolled_as',
    //   key: 'enrolled_as',
    //   width: 120,
    //   ...getColumnSearchProps('enrolled_as', 'Enrolled As'),
    // },
    // {
    //   title: 'Joining Date',
    //   dataIndex: 'date_of_enrolment',
    //   key: 'date_of_enrolment',
    //   width: 120,
    //   ...getColumnSearchProps('date_of_enrolment', 'Joining Date'),
    // },
    // {
    //   title: 'Status',
    //   dataIndex: 'status',
    //   key: 'status',
    //   width: 100,
    //   fixed: 'right' as const,
    //   render: (status: string) => {
    //     const color =
    //       status === 'Active' ? 'green' : status === 'Inactive' ? 'red' : 'orange';
    //     return <Tag color={color}>{status || 'Unknown'}</Tag>;
    //   },
    // },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      fixed: 'right' as const,
      render: (_: unknown, record: Employee) => {
        const inventoryMenuItems: MenuProps['items'] = [
          {
            key: 'general',
            label: 'General Item',
            icon: <InboxOutlined />,
            onClick: () => handleAssignGeneralItem(record),
          },
          {
            key: 'restricted',
            label: 'Restricted Item',
            icon: <InboxOutlined />,
            onClick: () => handleAssignRestrictedItem(record),
            danger: true,
          },
          {
            type: 'divider',
          },
          {
            key: 'password',
            label: 'Set Password',
            icon: <LockOutlined />,
            onClick: () => {
              setSelectedEmployeeForPassword(record);
              setPasswordModalVisible(true);
            },
          },
        ];

        return (
          <Space size="small">
            <Button
              type="link"
              size="small"
              onClick={() => router.push(`/dashboard/employees/${record.employee_id}`)}
            >
              View
            </Button>
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
            <Dropdown menu={{ items: inventoryMenuItems }} trigger={['click']}>
              <Button type="link" size="small" icon={<InboxOutlined />}>
                Assign <DownOutlined />
              </Button>
            </Dropdown>
            <Popconfirm
              title="Delete employee?"
              description="This action cannot be undone."
              onConfirm={() => handleDelete(record.employee_id)}
              okText="Yes"
              cancelText="No"
            >
              <Button type="link" size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Space>
        );
      },
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

      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={8}>
          <Card bordered={false} className="shadow-sm">
            <Statistic
              title="Total Employees"
              value={kpis.total}
              prefix={<TeamOutlined className="text-blue-500" />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false} className="shadow-sm">
            <Statistic
              title="Active Employees"
              value={kpis.by_status['Active'] || 0}
              valueStyle={{ color: '#3f8600' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false} className="shadow-sm">
            <Statistic
              title="Inactive/Suspended"
              value={(kpis.by_status['Inactive'] || 0) + (kpis.by_status['Suspended'] || 0)}
              valueStyle={{ color: '#cf1322' }}
              prefix={<StopOutlined />}
            />
          </Card>
        </Col>
      </Row>

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
        <Select
          placeholder="Filter by Person Status"
          allowClear
          style={{ width: 150 }}
          onChange={(value) => setFilters({ ...filters, person_status: value || '' })}
          options={[
            { label: 'Army', value: 'Army' },
            { label: 'Navy', value: 'Navy' },
            { label: 'PAF', value: 'PAF' },
            { label: 'Police', value: 'Police' },
            { label: 'FC', value: 'FC' },
            { label: 'MJD', value: 'MJD' },
            { label: 'Civil', value: 'Civil' },
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
        onChange={(newPagination, filters, sorter: any) => {
          const fetchParams: any = {
            page: newPagination.current || 1,
            pageSize: newPagination.pageSize || 20,
          };

          if (sorter && sorter.field && sorter.order) {
            (fetchParams as any).sort_by = sorter.field;
            (fetchParams as any).sort_order = sorter.order === 'ascend' ? 'asc' : 'desc';
          }

          // Helper to pass params to fetchEmployees
          const executeFetch = async () => {
            setLoading(true);
            const params: Record<string, string> = {
              skip: String((fetchParams.page - 1) * fetchParams.pageSize),
              limit: String(fetchParams.pageSize),
              with_total: 'true',
            };

            if (fetchParams.sort_by) params.sort_by = fetchParams.sort_by;
            if (fetchParams.sort_order) params.sort_order = fetchParams.sort_order;

            // ... existing filters ...
            if (filters.search) params.search = String(filters.search);
            // Note: the component uses local 'filters' state mostly, but we should sync.
            // Actuallly fetchEmployees handles the local 'filters' state.

            // Simpler: just update fetchEmployees to accept optional sort
            await fetchEmployees(fetchParams.page, fetchParams.pageSize, fetchParams.sort_by, fetchParams.sort_order);
          };
          executeFetch();
        }}
        scroll={{ x: 'max-content' }}
        className="compact-table"
        rowClassName={(record) => (record.status === 'Inactive' || record.status === 'Suspended') ? 'inactive-row' : ''}
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

      {/* General Item Assignment Drawer */}
      <Drawer
        title={`Assign General Item - ${selectedEmployeeForAssignment?.full_name || selectedEmployeeForAssignment?.name || ''}`}
        open={generalItemDrawerVisible}
        onClose={() => setGeneralItemDrawerVisible(false)}
        width={600}
        destroyOnClose
        footer={
          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setGeneralItemDrawerVisible(false)}>Cancel</Button>
              <Button type="primary" onClick={handleSubmitGeneralItemAssignment}>
                Assign Item
              </Button>
            </Space>
          </div>
        }
      >
        <Form form={generalItemForm} layout="vertical">
          <div style={{ background: '#f0f2f5', padding: '12px', borderRadius: '4px', marginBottom: '16px' }}>
            <div><strong>Employee:</strong> {selectedEmployeeForAssignment?.full_name || selectedEmployeeForAssignment?.name}</div>
            <div><strong>FSS Number:</strong> {selectedEmployeeForAssignment?.fss_no}</div>
          </div>

          <Form.Item
            name="item_code"
            label="General Item"
            rules={[{ required: true, message: 'Please select an item' }]}
          >
            <Select
              placeholder="Select general inventory item"
              showSearch
              filterOption={(input, option) =>
                String(option?.label || '').toLowerCase().includes(input.toLowerCase())
              }
              options={generalItems.map((item: any) => ({
                label: `${item.item_code} - ${item.name || item.item_name}`,
                value: item.item_code,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="quantity"
            label="Quantity"
            rules={[{ required: true, message: 'Please enter quantity' }]}
          >
            <InputNumber style={{ width: '100%' }} min={1} placeholder="Enter quantity" />
          </Form.Item>

          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={3} placeholder="Additional notes (optional)" />
          </Form.Item>
        </Form>
      </Drawer>

      {/* Restricted Item Assignment Drawer */}
      <Drawer
        title={`Assign Restricted Item - ${selectedEmployeeForAssignment?.full_name || selectedEmployeeForAssignment?.name || ''}`}
        open={restrictedItemDrawerVisible}
        onClose={() => setRestrictedItemDrawerVisible(false)}
        width={600}
        destroyOnClose
        footer={
          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setRestrictedItemDrawerVisible(false)}>Cancel</Button>
              <Button type="primary" onClick={handleSubmitRestrictedItemAssignment}>
                Assign Item
              </Button>
            </Space>
          </div>
        }
      >
        <Form form={restrictedItemForm} layout="vertical">
          <div style={{ background: '#fff1f0', padding: '12px', borderRadius: '4px', marginBottom: '16px', border: '1px solid #ffccc7' }}>
            <div><strong>Employee:</strong> {selectedEmployeeForAssignment?.full_name || selectedEmployeeForAssignment?.name}</div>
            <div><strong>FSS Number:</strong> {selectedEmployeeForAssignment?.fss_no}</div>
          </div>

          <Form.Item
            name="item_code"
            label="Restricted Item"
            rules={[{ required: true, message: 'Please select an item' }]}
          >
            <Select
              placeholder="Select restricted inventory item"
              showSearch
              onChange={handleRestrictedItemChange}
              filterOption={(input, option) =>
                String(option?.label || '').toLowerCase().includes(input.toLowerCase())
              }
              options={restrictedItems.map((item: any) => ({
                label: `${item.item_code} - ${item.name} (${item.category})`,
                value: item.item_code,
              }))}
            />
          </Form.Item>

          {selectedRestrictedItem?.is_serial_tracked ? (
            <Form.Item
              name="serial_unit_id"
              label="Serial Number"
              rules={[{ required: true, message: 'Please select a serial number' }]}
            >
              <Select
                placeholder="Select available serial number"
                options={restrictedSerialUnits.map((unit: any) => ({
                  label: unit.serial_number,
                  value: unit.id,
                }))}
                notFoundContent={restrictedSerialUnits.length === 0 ? 'No available units' : undefined}
              />
            </Form.Item>
          ) : (
            <>
              <Form.Item
                name="quantity"
                label="Quantity"
                rules={[{ required: true, message: 'Please enter quantity' }]}
              >
                <InputNumber style={{ width: '100%' }} min={1} placeholder="Enter quantity" />
              </Form.Item>

              <Form.Item name="notes" label="Notes">
                <Input.TextArea rows={3} placeholder="Additional notes (optional)" />
              </Form.Item>
            </>
          )}
        </Form>
      </Drawer>

      {/* Password Modal */}
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
          Update login credentials for <strong>{selectedEmployeeForPassword?.full_name || selectedEmployeeForPassword?.name}</strong> (FSS: {selectedEmployeeForPassword?.fss_no})
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
