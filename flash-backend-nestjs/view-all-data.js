require('dotenv/config');
const { Pool } = require('pg');

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL 
});

async function checkData() {
  try {
    console.log('\n📊 DATABASE SUMMARY\n');
    console.log('════════════════════════════════════\n');
    
    // Employees
    const empResult = await pool.query('SELECT COUNT(*) as count FROM employees');
    console.log(`✓ Employees: ${empResult.rows[0].count}`);
    
    // Users
    const usersResult = await pool.query('SELECT COUNT(*) as count FROM users');
    console.log(`✓ Users: ${usersResult.rows[0].count}`);
    
    // Attendance
    const attendanceResult = await pool.query('SELECT COUNT(*) as count FROM attendance');
    console.log(`✓ Attendance Records: ${attendanceResult.rows[0].count}`);
    
    // Leave Periods
    const leaveResult = await pool.query('SELECT COUNT(*) as count FROM leave_periods');
    console.log(`✓ Leave Periods: ${leaveResult.rows[0].count}`);
    
    // Vehicles
    const vehiclesResult = await pool.query('SELECT COUNT(*) as count FROM vehicles');
    console.log(`✓ Vehicles: ${vehiclesResult.rows[0].count}`);
    
    // Clients
    const clientsResult = await pool.query('SELECT COUNT(*) as count FROM clients');
    console.log(`✓ Clients: ${clientsResult.rows[0].count}`);
    
    // General Inventory Items
    const inventoryResult = await pool.query('SELECT COUNT(*) as count FROM general_inventory_items');
    console.log(`✓ General Inventory Items: ${inventoryResult.rows[0].count}`);
    
    // Restricted Inventory Items
    const restrictedResult = await pool.query('SELECT COUNT(*) as count FROM restricted_inventory_items');
    console.log(`✓ Restricted Inventory Items: ${restrictedResult.rows[0].count}`);
    
    // Finance Accounts
    const accountsResult = await pool.query('SELECT COUNT(*) as count FROM finance_accounts');
    console.log(`✓ Finance Accounts: ${accountsResult.rows[0].count}`);
    
    // Employee Advances
    const advancesResult = await pool.query('SELECT COUNT(*) as count FROM employee_advances');
    console.log(`✓ Employee Advances: ${advancesResult.rows[0].count}`);
    
    // Payroll Payment Status
    const payrollResult = await pool.query('SELECT COUNT(*) as count FROM payroll_payment_status');
    console.log(`✓ Payroll Payment Status: ${payrollResult.rows[0].count}`);
    
    console.log('\n════════════════════════════════════\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkData();
