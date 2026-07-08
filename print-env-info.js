const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
let supabaseUrl = 'None';
let supabaseAnonKey = 'None';

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  const urlMatch = content.match(/^SUPABASE_URL\s*=\s*(.+)$/m);
  const keyMatch = content.match(/^SUPABASE_ANON_KEY\s*=\s*(.+)$/m);
  if (urlMatch) supabaseUrl = urlMatch[1].trim();
  if (keyMatch) supabaseAnonKey = keyMatch[1].trim();
}

console.log('\n=========================================');
console.log('      Supabase Configuration Info');
console.log('=========================================');
console.log('URL:      ', supabaseUrl);
console.log('Anon Key: ', supabaseAnonKey !== 'None' ? supabaseAnonKey.substring(0, 5) + '...' : 'None');
console.log('=========================================\n');
