const { Pool } = require('pg');

const pool = new Pool({
  host: '46.202.194.55',
  port: 5432,
  database: 'flash_nest_db',
  user: 'postgres',
  password: 'c7Od03Arvx4Aix3rl9sxPcFyrJWOZVYW6sakZ00zK54i32bT3eSEgcNPekjom1oe',
  ssl: { rejectUnauthorized: false },
});

async function fix() {
  try {
    console.log('🔍 Checking FRI-17 transactions...');
    
    const checkResult = await pool.query(
      `SELECT action, COUNT(*) as count, SUM(quantity) as total_qty
       FROM restricted_transactions
       WHERE item_code = 'FRI-17'
       GROUP BY action;`
    );
    
    console.log('Current transactions:');
    checkResult.rows.forEach(row => {
      console.log(`   ${row.action}: ${row.count} records, total ${row.total_qty} qty`);
    });
    
    // Delete all issue transactions for FRI-17 (these are the bad ones)
    console.log('\n🗑️  Deleting bad issue transactions...');
    const deleteResult = await pool.query(
      `DELETE FROM restricted_transactions
       WHERE item_code = 'FRI-17' AND action = 'issue'
       RETURNING id, quantity;`
    );
    
    console.log(`✅ Deleted ${deleteResult.rows.length} issue transactions`);
    
    // Verify
    const verifyResult = await pool.query(
      `SELECT action, COUNT(*) as count, SUM(quantity) as total_qty
       FROM restricted_transactions
       WHERE item_code = 'FRI-17'
       GROUP BY action;`
    );
    
    console.log('\nTransactions after cleanup:');
    if (verifyResult.rows.length === 0) {
      console.log('   (none)');
    } else {
      verifyResult.rows.forEach(row => {
        console.log(`   ${row.action}: ${row.count} records, total ${row.total_qty} qty`);
      });
    }
    
    await pool.end();
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

fix();
