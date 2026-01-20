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
    const result = await pool.query(
      `SELECT item_code, name, category, is_serial_tracked, quantity_on_hand 
       FROM restricted_inventory_items 
       WHERE status = 'active'
       ORDER BY id DESC
       LIMIT 5;`
    );
    
    console.log('📦 Recent items:');
    result.rows.forEach(row => {
      console.log(`   ${row.item_code}: ${row.name} | Category: ${row.category} | is_serial_tracked: ${row.is_serial_tracked} | qty: ${row.quantity_on_hand}`);
    });
    
    // Now fix FRI-17 specifically
    const fixResult = await pool.query(
      `UPDATE restricted_inventory_items 
       SET is_serial_tracked = false 
       WHERE item_code = 'FRI-17'
       RETURNING item_code, name, is_serial_tracked;`
    );
    
    console.log('\n✅ Fixed FRI-17:');
    if (fixResult.rows.length > 0) {
      fixResult.rows.forEach(row => {
        console.log(`   ${row.item_code} (${row.name}): is_serial_tracked = ${row.is_serial_tracked}`);
      });
    } else {
      console.log('   Item not found');
    }
    
    await pool.end();
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

check();
