import fs from 'fs';
import { parse } from 'csv-parse/sync';

const csvPath = 'c:/Users/HomePC/Downloads/erp-fls/data - Sheet1.csv';
const csvContent = fs.readFileSync(csvPath, 'utf8');
const records = parse(csvContent, { columns: true, skip_empty_lines: true });

if (records.length > 0) {
  const keys = Object.keys(records[0]).map(k => k.replace(/["\r\n]/g, '').trim().toLowerCase());
  console.log('--- NORMALIZED KEYS ---');
  console.log(JSON.stringify(keys, null, 2));
}
