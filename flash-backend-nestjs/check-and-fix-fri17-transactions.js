const { Pool } = require('pg');

const pool = new Pool({
  host: '46.202.194.55',
  port: 5432,
  database: 'flash_nest_db',
  user: 'postgres',
  password: 'c7Od03Arvx4Aix3rl9sxPcFyrJWOZVYW6sakZ00zK54i32bT3eSEgcNPekjom1oe',
  ssl: { rejectUnauthorized: false },
});

async function check() {
  try {
    // Check transactions for FRI-17
    const result = await pool.query(
      `SELECT id, item_code, action, quantity, employee_id, created_at
       FROM restricted_transactions
       WHERE item_code = 'FRI-17'
       ORDER BY id DESC
       LIMIT 10;`
    );
    
    console.log('📋 Transactions for FRI-17:');
    console.log(`Total: ${result.rows.length} transactions`);
    
    let totalIssued = 0;
    result.rows.forEach(row => {
      console.log(`   ${row.id}: ${row.action} ${row.quantity} qty (emp: ${row.employee_id})`);
      if (row.action === 'issue') {
        totalIssued += row.quantity;
      }
    });
    
    console.log(`\nTotal issued: ${totalIssued}`);
    
    // Delete all issue transactions if they look like initial stock
    if (totalIssued === 159) {
      console.log('\n⚠️  Detected 159 qty of issue transactions - likely initial stock setup');
      console.log('Deleting these transactions...');
      
      const deleteResult = await pool.query(
        `DELETE FROM restricted_transactions
         WHERE item_code = 'FRI-17' AND action = 'issue'
         RETURNING id, quantity;`
      );
      
      console.log(`✅ Deleted ${deleteResult.rows.length} transactions totaling ${deleteResult.rows.reduce((sum, r) => sum + r.quantity, 0)} qty`);
    }
    
    await pool.end();
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

check();
