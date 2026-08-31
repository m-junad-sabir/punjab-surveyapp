const bcrypt = require('bcrypt');

const passwords = {
  admin: 'admin123',
  surveyor: 'surveyor123',
  supervisor: 'supervisor123'
};

async function generateHashes() {
  console.log('\nGenerating bcrypt hashes for new passwords...\n');
  
  for (const [user, password] of Object.entries(passwords)) {
    const hash = await bcrypt.hash(password, 10);
    console.log(`${user}/${password}:`);
    console.log(`  Hash: ${hash}\n`);
  }
}

generateHashes();
