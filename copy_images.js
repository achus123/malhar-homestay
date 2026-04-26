import fs from 'fs';
import path from 'path';

const files = fs.readdirSync('.');
console.log('Files in root:', files);

for (let i = 0; i < 15; i++) {
  const name = `input_file_${i}.png`;
  if (fs.existsSync(name)) {
    console.log(`Found ${name}, copying to public/images/`);
    fs.copyFileSync(name, path.join('public', 'images', name));
  }
}
