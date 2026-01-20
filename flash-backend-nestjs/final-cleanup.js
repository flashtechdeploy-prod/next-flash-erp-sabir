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
    console.log('🗑️  Cleaning up orphaned return transactions...');
    
    const deleteResult = await pool.query(
      `DELETE FROM restricted_transactions
       WHERE item_code = 'FRI-17' AND action = 'return'
       RETURNING id, quantity;`
    );
    
    console.log(`✅ Deleted ${deleteResult.rows.length} return transactions (${deleteResult.rows.reduce((sum, r) => sum + r.quantity, 0)} qty total)`);
    
    // Verify - check all items
    const verifyResult = await pool.query(
      `SELECT item_code, action, COUNT(*) as count, SUM(quantity) as total_qty
       FROM restricted_transactions
       WHERE item_code IN ('FRI-17', 'FRI-16', 'FRI-15')
       GROUP BY item_code, action
       ORDER BY item_code, action;`
    );
    
    console.log('\n✅ Final state - Recent items transactions:');
    if (verifyResult.rows.length === 0) {
      console.log('   (no transactions)');
    } else {
      verifyResult.rows.forEach(row => {
        console.log(`   ${row.item_code}: ${row.action} = ${row.count} records, ${row.total_qty} qty`);
      });
    }
    
    await pool.end();
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

fix();
