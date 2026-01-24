import fs from 'fs';
import { parse } from 'csv-parse/sync';

const csvPath = 'c:/Users/HomePC/Downloads/erp-fls/data - Sheet1.csv';
const csvContent = fs.readFileSync(csvPath, 'utf8');
const records = parse(csvContent, { columns: false, skip_empty_lines: true });

for (let i = 0; i < 20; i++) {
  console.log(`[Row ${i+1}] fss_no candidate: "${records[i][1]}" | Content: ${records[i].slice(0, 5).join(',')}`);
}
