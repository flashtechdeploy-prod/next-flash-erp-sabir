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
    console.log('🔍 Finding all ammunition items...');
    
    // Get all ammunition items
    const ammoItems = await pool.query(
      `SELECT item_code, name, category, is_serial_tracked, quantity_on_hand
       FROM restricted_inventory_items
       WHERE (category = 'ammunition' OR category = 'AMMUNITION') 
          AND is_serial_tracked = false
          AND status = 'active'
       ORDER BY id DESC;`
    );
    
    console.log(`Found ${ammoItems.rows.length} ammunition items:\n`);
    
    let totalCleaned = 0;
    
    for (const item of ammoItems.rows) {
      console.log(`📦 Processing: ${item.item_code} (${item.name})`);
      
      // Check transactions
      const checkResult = await pool.query(
        `SELECT action, COUNT(*) as count, SUM(quantity) as total_qty
         FROM restricted_transactions
         WHERE item_code = $1
         GROUP BY action;`,
        [item.item_code]
      );
      
      let hasIssues = false;
      checkResult.rows.forEach(row => {
        console.log(`   ${row.action}: ${row.count} records, ${row.total_qty} qty`);
        if (row.action === 'issue' || row.action === 'return') {
          hasIssues = true;
        }
      });
      
      // Delete all transactions if any exist
      if (hasIssues) {
        const deleteResult = await pool.query(
          `DELETE FROM restricted_transactions
           WHERE item_code = $1
           RETURNING id;`,
          [item.item_code]
        );
        console.log(`   ✅ Cleaned: deleted ${deleteResult.rows.length} transactions`);
        totalCleaned++;
      } else {
        console.log(`   ✅ Already clean`);
      }
      console.log('');
    }
    
    console.log(`\n🎉 Total items cleaned: ${totalCleaned}/${ammoItems.rows.length}`);
    
    // Verify final state
    console.log('\n📋 Verification - All transactions remaining:');
    const remaining = await pool.query(
      `SELECT item_code, action, COUNT(*) as count
       FROM restricted_transactions
       GROUP BY item_code, action
       ORDER BY item_code;`
    );
    
    if (remaining.rows.length === 0) {
      console.log('   ✅ All transactions cleaned!');
    } else {
      remaining.rows.forEach(row => {
        console.log(`   ${row.item_code}: ${row.action} (${row.count})`);
      });
    }
    
    await pool.end();
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

fix();
