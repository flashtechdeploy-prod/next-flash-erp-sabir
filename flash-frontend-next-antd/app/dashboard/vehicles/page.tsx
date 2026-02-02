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
  Modal,
  Form,
  Row,
  Col,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ReloadOutlined,
  CarOutlined,
} from '@ant-design/icons';
import { vehicleApi } from '@/lib/api';
import VehicleForm from './VehicleForm';

const { Search } = Input;

interface Vehicle extends Record<string, unknown> {
  vehicle_id: string;
  vehicle_type: string;
  category: string;
  make_model: string;
  license_plate: string;
  chassis_number?: string;
  year?: number;
  status: string;
  compliance?: string;
}

export default function VehiclesPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  // Category Management State
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [categoryForm] = Form.useForm();

  // Vehicle Type Management State
  const [vehicleTypes, setVehicleTypes] = useState<string[]>([]);
  const [typeModalVisible, setTypeModalVisible] = useState(false);
  const [editingType, setEditingType] = useState<string | null>(null);
  const [typeForm] = Form.useForm();

  const fetchCategories = async () => {
    try {
      const response = await vehicleApi.getCategories();
      if (!response.error && Array.isArray(response.data)) {
        setCategories(response.data as string[]);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchVehicleTypes = async () => {
    try {
      const response = await vehicleApi.getTypes();
      if (!response.error && Array.isArray(response.data)) {
        setVehicleTypes(response.data as string[]);
      }
    } catch (error) {
      console.error('Failed to fetch vehicle types:', error);
    }
  };

  const fetchVehicles = async () => {
    setLoading(true);
    const response = await vehicleApi.getAll();
    setLoading(false);

    if (response.error) {
      message.error(response.error);
      return;
    }

    setVehicles((response.data as any)?.vehicles || (response.data as any) || []);
  };

  useEffect(() => {
    fetchVehicles();
    fetchCategories();
    fetchVehicleTypes();
  }, []);

  const handleManageCategories = () => {
    fetchCategories();
    setCategoryModalVisible(true);
  };

  const handleEditCategory = (category: string) => {
    setEditingCategory(category);
    categoryForm.setFieldsValue({ name: category });
  };

  const handleDeleteCategory = async (category: string) => {
    try {
      await vehicleApi.deleteCategory(category);
      message.success('Category deleted');
      fetchCategories();
      fetchVehicles();
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const handleCategorySubmit = async (values: { name: string }) => {
    const response = editingCategory
      ? await vehicleApi.updateCategory(editingCategory, values.name)
      : await vehicleApi.createCategory(values.name);

    if (!response.error) {
      message.success(`Category ${editingCategory ? 'updated' : 'created'}`);
      setEditingCategory(null);
      categoryForm.resetFields();
      fetchCategories();
      fetchVehicles();
    }
  };

  const handleTypeEdit = (type: string) => {
    setEditingType(type);
    typeForm.setFieldsValue({ name: type });
  };

  const handleTypeDelete = async (type: string) => {
    try {
      await vehicleApi.deleteType(type);
      message.success('Type deleted');
      fetchVehicleTypes();
      fetchVehicles();
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const handleTypeSubmit = async (values: { name: string }) => {
    const response = editingType
      ? await vehicleApi.updateType(editingType, values.name)
      : await vehicleApi.createType(values.name);

    if (!response.error) {
      message.success(`Type ${editingType ? 'updated' : 'created'}`);
      setEditingType(null);
      typeForm.resetFields();
      fetchVehicleTypes();
      fetchVehicles();
    }
  };

  const handleCreate = () => {
    setEditingVehicle(null);
    setDrawerVisible(true);
  };

  const handleEdit = (record: Vehicle) => {
    setEditingVehicle(record);
    setDrawerVisible(true);
  };

  const handleFormSubmit = async (values: Record<string, unknown>) => {
    let payload = values;
    if (editingVehicle) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { vehicle_id, ...rest } = values;
      payload = rest;
    }

    const response = editingVehicle
      ? await vehicleApi.update(editingVehicle.vehicle_id, payload)
      : await vehicleApi.create(values);

    if (response.error) {
      message.error(response.error);
      return;
    }

    message.success(
      `Vehicle ${editingVehicle ? 'updated' : 'created'} successfully`
    );
    setDrawerVisible(false);
    fetchVehicles();
  };

  const handleDelete = async (id: string) => {
    const response = await vehicleApi.delete(id);
    if (response.error) {
      message.error(response.error);
      return;
    }
    message.success('Vehicle deleted successfully');
    fetchVehicles();
  };

  const columns = [
    {
      title: 'Vehicle ID',
      dataIndex: 'vehicle_id',
      key: 'vehicle_id',
      width: 120,
    },
    {
      title: 'Type',
      dataIndex: 'vehicle_type',
      key: 'vehicle_type',
      width: 120,
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      width: 120,
    },
    {
      title: 'Make/Model',
      dataIndex: 'make_model',
      key: 'make_model',
      width: 200,
    },
    {
      title: 'License Plate',
      dataIndex: 'license_plate',
      key: 'license_plate',
      width: 130,
    },
    {
      title: 'Year',
      dataIndex: 'year',
      key: 'year',
      width: 80,
    },
    {
      title: 'Reg. Date',
      dataIndex: 'registration_date',
      key: 'registration_date',
      width: 110,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const color = status === 'active' ? 'green' : status === 'inactive' ? 'red' : 'orange';
        return <Tag color={color}>{status?.toUpperCase() || 'UNKNOWN'}</Tag>;
      },
    },
    {
      title: 'Compliance',
      dataIndex: 'compliance',
      key: 'compliance',
      width: 120,
      render: (compliance: string) => {
        const color = compliance === 'compliant' ? 'green' : 'red';
        return <Tag color={color}>{compliance?.toUpperCase() || 'N/A'}</Tag>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      fixed: 'right' as const,
      render: (_: unknown, record: Vehicle) => (
        <Space>
          <Button
            type="link"
            onClick={() => router.push(`/dashboard/vehicles/${record.vehicle_id}`)}
          >
            View
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="Delete vehicle?"
            description="This action cannot be undone."
            onConfirm={() => handleDelete(record.vehicle_id)}
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
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <CarOutlined /> Vehicles
          </h1>
          <p className="text-gray-500 mt-1">Manage your fleet</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate} size="large">
          Add Vehicle
        </Button>
      </div>

      <div className="mb-4 flex gap-4">
        <Button icon={<ReloadOutlined />} onClick={() => fetchVehicles()}>
          Refresh
        </Button>
        <Button onClick={handleManageCategories}>
          Manage Categories
        </Button>
        <Button onClick={() => setTypeModalVisible(true)}>
          Manage Vehicle Types
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={vehicles}
        rowKey="vehicle_id"
        loading={loading}
        size="small"
        scroll={{ x: 1200 }}
        className="compact-table"
      />

      <Drawer
        title={editingVehicle ? 'Edit Vehicle' : 'Add Vehicle'}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        width={720}
        destroyOnClose
      >
        <VehicleForm
          initialValues={editingVehicle}
          onSubmit={handleFormSubmit}
          onCancel={() => setDrawerVisible(false)}
          allVehicles={vehicles}
        />
      </Drawer>

      {/* Category Management Modal */}
      <Modal
        title="Manage Vehicle Categories"
        open={categoryModalVisible}
        onCancel={() => {
          setCategoryModalVisible(false);
          setEditingCategory(null);
          categoryForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={categoryForm}
          onFinish={handleCategorySubmit}
          layout="inline"
          className="mb-6"
        >
          <Form.Item
            name="name"
            rules={[{ required: true, message: 'Please input category name' }]}
            style={{ flex: 1 }}
          >
            <Input placeholder="Enter category name" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">
              {editingCategory ? 'Update' : 'Add'}
            </Button>
            {editingCategory && (
              <Button
                style={{ marginLeft: 8 }}
                onClick={() => {
                  setEditingCategory(null);
                  categoryForm.resetFields();
                }}
              >
                Cancel
              </Button>
            )}
          </Form.Item>
        </Form>

        <Table
          dataSource={categories.map(c => ({ name: c }))}
          columns={[
            { title: 'Category Name', dataIndex: 'name', key: 'name' },
            {
              title: 'Actions',
              key: 'actions',
              width: 150,
              render: (_, record) => (
                <Space>
                  <Button type="link" onClick={() => handleEditCategory(record.name)}>Edit</Button>
                  <Popconfirm title="Delete category?" onConfirm={() => handleDeleteCategory(record.name)}>
                    <Button type="link" danger>Delete</Button>
                  </Popconfirm>
                </Space>
              )
            }
          ]}
          size="small"
          pagination={{ pageSize: 5 }}
          rowKey="name"
        />
      </Modal>

      {/* Vehicle Type Management Modal */}
      <Modal
        title="Manage Vehicle Types"
        open={typeModalVisible}
        onCancel={() => {
          setTypeModalVisible(false);
          setEditingType(null);
          typeForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={typeForm}
          onFinish={handleTypeSubmit}
          layout="inline"
          className="mb-6"
        >
          <Form.Item
            name="name"
            rules={[{ required: true, message: 'Please input type name' }]}
            style={{ flex: 1 }}
          >
            <Input placeholder="Enter type name" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">
              {editingType ? 'Update' : 'Add'}
            </Button>
            {editingType && (
              <Button
                style={{ marginLeft: 8 }}
                onClick={() => {
                  setEditingType(null);
                  typeForm.resetFields();
                }}
              >
                Cancel
              </Button>
            )}
          </Form.Item>
        </Form>

        <Table
          dataSource={vehicleTypes.map(t => ({ name: t }))}
          columns={[
            { title: 'Type Name', dataIndex: 'name', key: 'name' },
            {
              title: 'Actions',
              key: 'actions',
              width: 150,
              render: (_, record) => (
                <Space>
                  <Button type="link" onClick={() => handleTypeEdit(record.name)}>Edit</Button>
                  <Popconfirm title="Delete type?" onConfirm={() => handleTypeDelete(record.name)}>
                    <Button type="link" danger>Delete</Button>
                  </Popconfirm>
                </Space>
              )
            }
          ]}
          size="small"
          pagination={{ pageSize: 5 }}
          rowKey="name"
        />
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
