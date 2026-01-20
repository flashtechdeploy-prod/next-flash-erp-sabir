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
    console.log('🔧 Fixing all ammunition items...\n');
    
    // Step 1: Update all ammunition items to is_serial_tracked = false
    const fixResult = await pool.query(
      `UPDATE restricted_inventory_items 
       SET is_serial_tracked = false 
       WHERE (category = 'ammunition' OR category = 'AMMUNITION') 
       RETURNING item_code, name, is_serial_tracked;`
    );
    
    console.log(`✅ Updated ${fixResult.rows.length} items to is_serial_tracked = false:`);
    fixResult.rows.forEach(row => {
      console.log(`   ${row.item_code}: ${row.name}`);
    });
    
    // Step 2: Delete all transactions for these items
    console.log('\n🗑️  Deleting all transactions for ammunition items...');
    const deleteResult = await pool.query(
      `DELETE FROM restricted_transactions
       WHERE item_code IN (
         SELECT item_code FROM restricted_inventory_items 
         WHERE category = 'ammunition' OR category = 'AMMUNITION'
       )
       RETURNING item_code, action, quantity;`
    );
    
    const grouped = {};
    deleteResult.rows.forEach(row => {
      if (!grouped[row.item_code]) grouped[row.item_code] = [];
      grouped[row.item_code].push(`${row.action}(${row.quantity})`);
    });
    
    console.log(`✅ Deleted ${deleteResult.rows.length} transactions:`);
    Object.entries(grouped).forEach(([code, actions]) => {
      console.log(`   ${code}: ${actions.join(', ')}`);
    });
    
    console.log('\n🎉 All ammunition items are now clean and ready!');
    
    await pool.end();
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

fix();
