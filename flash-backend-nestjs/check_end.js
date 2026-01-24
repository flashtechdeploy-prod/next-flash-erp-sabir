import fs from 'fs';
import { parse } from 'csv-parse/sync';

const csvPath = 'c:/Users/HomePC/Downloads/erp-fls/data - Sheet1.csv';
const csvContent = fs.readFileSync(csvPath, 'utf8');
const records = parse(csvContent, { columns: false, skip_empty_lines: true });

console.log(`Total Records: ${records.length}`);
const start = Math.max(0, records.length - 10);
for (let i = start; i < records.length; i++) {
  console.log(`[Record ${i}] fss_no: "${records[i][1]}" | Content: ${records[i].slice(0, 5).join(',')}`);
}
