'use client';

import { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Tag } from 'antd';
import {
  UserOutlined,
  CarOutlined,
  TeamOutlined,
  DollarOutlined,
  RiseOutlined,
  FallOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  InboxOutlined
} from '@ant-design/icons';
import { employeeApi, vehicleApi, clientApi, attendanceApi, expensesApi, advancesApi, generalInventoryApi } from '@/lib/api';
import dayjs from 'dayjs';

export default function DashboardHome() {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    totalVehicles: 0,
    totalClients: 0,
    todayPresent: 0,
    todayAbsent: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    activeAdvances: 0,
    lowStockItems: 0,
  });

  const [recentActivities, setRecentActivities] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const today = dayjs().format('YYYY-MM-DD');
      const monthStart = dayjs().startOf('month').format('YYYY-MM-DD');
      const monthEnd = dayjs().endOf('month').format('YYYY-MM-DD');

      // Load all data in parallel
      const [
        employeesRes,
        vehiclesRes,
        clientsRes,
        attendanceRes,
        expensesRes,
        advancesRes,
        inventoryRes,
      ] = await Promise.all([
        employeeApi.getAll({ with_total: 'true', limit: '2000' }),
        vehicleApi.getAll(),
        clientApi.getAll(),
        attendanceApi.getByDate(today),
        expensesApi.getAll(),
        advancesApi.getAdvances(),
        generalInventoryApi.getItems(),
      ]);

      // Process employees
      const employees = (employeesRes.data as any)?.employees || (employeesRes.data as any) || [];
      const totalEmployees = (employeesRes.data as any)?.total ?? employees.length;
      const activeEmployees = employees.filter((e: Record<string, unknown>) => e.status === 'Active' || e.status === 'active');

      // Process vehicles
      const vehicles = (vehiclesRes.data as any)?.vehicles || (vehiclesRes.data as any) || [];

      // Process clients
      const clients = (clientsRes.data as any)?.clients || (clientsRes.data as any) || [];

      // Process attendance
      const attendance = (attendanceRes.data as any)?.records || (attendanceRes.data as any) || [];
      const present = attendance.filter((a: Record<string, unknown>) => a.status === 'present' || a.status === 'late').length;
      const absent = attendance.filter((a: Record<string, unknown>) => a.status === 'absent').length;

      // Process expenses (monthly)
      const expenses = (expensesRes.data as any)?.expenses || (expensesRes.data as any) || [];
      const monthlyExpenses = expenses
        .filter((e: Record<string, unknown>) => {
          const expDate = String(e.date || '');
          return expDate >= monthStart && expDate <= monthEnd;
        })
        .reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0);

      // Process advances
      const advances = (advancesRes.data as any)?.advances || (advancesRes.data as any) || [];
      const activeAdvances = advances.filter((a: Record<string, unknown>) =>
        a.status === 'active' || a.status === 'approved'
      ).length;

      // Process inventory
      const inventory = (inventoryRes.data as any)?.items || (inventoryRes.data as any) || [];
      const lowStock = inventory.filter((item: Record<string, unknown>) =>
        Number(item.quantity_in_stock || 0) <= Number(item.min_stock_level || 0)
      ).length;

      setStats({
        totalEmployees,
        activeEmployees: activeEmployees.length,
        totalVehicles: vehicles.length,
        totalClients: clients.length,
        todayPresent: present,
        todayAbsent: absent,
        monthlyIncome: 0, // Would need income data
        monthlyExpenses,
        activeAdvances,
        lowStockItems: lowStock,
      });

      // Create recent activities (mock data based on real data)
      const activities: Record<string, unknown>[] = [];

      // Add recent attendance
      attendance.slice(0, 3).forEach((att: Record<string, unknown>) => {
        activities.push({
          type: 'attendance',
          description: `${att.employee_id} marked ${att.status}`,
          time: 'Today',
          status: att.status,
        });
      });

      // Add recent expenses
      expenses.slice(0, 2).forEach((exp: Record<string, unknown>) => {
        activities.push({
          type: 'expense',
          description: `Expense: ${exp.description}`,
          time: dayjs(String(exp.date)).format('DD MMM'),
          status: exp.status,
        });
      });

      setRecentActivities(activities.slice(0, 10));
    } catch (error) {
      console.error('Failed to load dashboard data', error);
    } finally {
      setLoading(false);
    }
  };

  const activityColumns = [
    {
      title: 'Activity',
      dataIndex: 'description',
      key: 'description',
      render: (text: string) => <span style={{ fontSize: '12px' }}>{text}</span>
    },
    {
      title: 'Time',
      dataIndex: 'time',
      key: 'time',
      width: 120,
      render: (text: string) => <span style={{ fontSize: '11px', color: '#666' }}>{text}</span>
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const colors: Record<string, string> = {
          present: 'green',
          late: 'orange',
          absent: 'red',
          pending: 'orange',
          approved: 'blue',
          paid: 'green',
        };
        return <Tag color={colors[status] || 'default'} style={{ fontSize: '11px' }}>{status?.toUpperCase()}</Tag>;
      }
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <h2 style={{ marginBottom: '24px', fontSize: '24px', fontWeight: 600 }}>Dashboard Overview</h2>

      {/* Main Statistics */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card loading={loading}>
            <Statistic
              title={<span style={{ fontSize: '13px' }}>Total Employees</span>}
              value={stats.totalEmployees}
              valueStyle={{ fontSize: '24px', color: '#1890ff' }}
              prefix={<UserOutlined />}
            />
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#52c41a' }}>
              {stats.activeEmployees} Active
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={8} lg={6}>
          <Card loading={loading}>
            <Statistic
              title={<span style={{ fontSize: '13px' }}>Total Vehicles</span>}
              value={stats.totalVehicles}
              valueStyle={{ fontSize: '24px', color: '#722ed1' }}
              prefix={<CarOutlined />}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} md={8} lg={6}>
          <Card loading={loading}>
            <Statistic
              title={<span style={{ fontSize: '13px' }}>Total Clients</span>}
              value={stats.totalClients}
              valueStyle={{ fontSize: '24px', color: '#13c2c2' }}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} md={8} lg={6}>
          <Card loading={loading}>
            <Statistic
              title={<span style={{ fontSize: '13px' }}>Monthly Expenses</span>}
              value={stats.monthlyExpenses}
              valueStyle={{ fontSize: '24px', color: '#ff4d4f' }}
              prefix={<DollarOutlined />}
              suffix="Rs."
            />
          </Card>
        </Col>
      </Row>

      {/* Today's Attendance */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} md={12}>
          <Card title="Today's Attendance" loading={loading}>
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="Present"
                  value={stats.todayPresent}
                  valueStyle={{ fontSize: '28px', color: '#52c41a' }}
                  prefix={<CheckCircleOutlined />}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Absent"
                  value={stats.todayAbsent}
                  valueStyle={{ fontSize: '28px', color: '#ff4d4f' }}
                  prefix={<ClockCircleOutlined />}
                />
              </Col>
            </Row>
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card title="Alerts & Notifications" loading={loading}>
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="Active Advances"
                  value={stats.activeAdvances}
                  valueStyle={{ fontSize: '28px', color: '#faad14' }}
                  prefix={<WarningOutlined />}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Low Stock Items"
                  value={stats.lowStockItems}
                  valueStyle={{ fontSize: '28px', color: '#ff4d4f' }}
                  prefix={<InboxOutlined />}
                />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* Financial Overview */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24}>
          <Card title="Financial Overview (This Month)" loading={loading}>
            <Row gutter={16}>
              <Col xs={24} sm={8}>
                <Card style={{ backgroundColor: '#f6ffed', border: '1px solid #b7eb8f' }}>
                  <Statistic
                    title="Income"
                    value={stats.monthlyIncome}
                    valueStyle={{ fontSize: '24px', color: '#52c41a' }}
                    prefix={<RiseOutlined />}
                    suffix="Rs."
                  />
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card style={{ backgroundColor: '#fff1f0', border: '1px solid #ffccc7' }}>
                  <Statistic
                    title="Expenses"
                    value={stats.monthlyExpenses}
                    valueStyle={{ fontSize: '24px', color: '#ff4d4f' }}
                    prefix={<FallOutlined />}
                    suffix="Rs."
                  />
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card style={{ backgroundColor: '#e6f7ff', border: '1px solid #91d5ff' }}>
                  <Statistic
                    title="Net Balance"
                    value={stats.monthlyIncome - stats.monthlyExpenses}
                    valueStyle={{
                      fontSize: '24px',
                      color: (stats.monthlyIncome - stats.monthlyExpenses) >= 0 ? '#52c41a' : '#ff4d4f',
                      fontWeight: 600
                    }}
                    prefix={<DollarOutlined />}
                    suffix="Rs."
                  />
                </Card>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* Recent Activities */}
      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <Card title="Recent Activities" loading={loading}>
            <Table
              columns={activityColumns}
              dataSource={recentActivities}
              rowKey={(record, index) => `activity-${index}`}
              size="small"
              pagination={false}
              style={{ fontSize: '12px' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Quick Stats Summary */}
      <Row gutter={[16, 16]} style={{ marginTop: '24px' }}>
        <Col xs={24}>
          <Card>
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>System Status</h3>
              <Row gutter={16}>
                <Col span={6}>
                  <div style={{ fontSize: '32px', fontWeight: 600, color: '#1890ff' }}>{stats.totalEmployees}</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>Employees</div>
                </Col>
                <Col span={6}>
                  <div style={{ fontSize: '32px', fontWeight: 600, color: '#722ed1' }}>{stats.totalVehicles}</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>Vehicles</div>
                </Col>
                <Col span={6}>
                  <div style={{ fontSize: '32px', fontWeight: 600, color: '#13c2c2' }}>{stats.totalClients}</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>Clients</div>
                </Col>
                <Col span={6}>
                  <div style={{ fontSize: '32px', fontWeight: 600, color: '#52c41a' }}>{stats.todayPresent}</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>Present Today</div>
                </Col>
              </Row>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
