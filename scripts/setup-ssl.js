const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔒 Zenith Local SSL/TLS Certificate Setup Helper');
console.log('================================================\n');

const certDir = path.resolve(__dirname, '../certs');
if (!fs.existsSync(certDir)) {
  fs.mkdirSync(certDir);
}

const keyPath = path.join(certDir, 'key.pem');
const certPath = path.join(certDir, 'cert.pem');

let success = false;

// 1. Try mkcert first
try {
  console.log('🔍 Checking if mkcert is installed...');
  execSync('mkcert -version', { stdio: 'ignore' });
  console.log('✅ mkcert found! Generating local trust certificates...');
  execSync(`mkcert -key-file "${keyPath}" -cert-file "${certPath}" localhost 127.0.0.1`, { stdio: 'inherit' });
  success = true;
} catch (e) {
  console.log('ℹ️ mkcert is not available. Trying OpenSSL fallback...');
}

// 2. Fall back to openssl
if (!success) {
  try {
    console.log('🔍 Checking if openssl is installed...');
    execSync('openssl version', { stdio: 'ignore' });
    console.log('✅ OpenSSL found! Generating self-signed certificates...');
    
    // Command to generate self-signed cert
    const cmd = `openssl req -x509 -newkey rsa:2048 -keyout "${keyPath}" -out "${certPath}" -sha256 -days 365 -nodes -subj "/CN=localhost"`;
    execSync(cmd, { stdio: 'inherit' });
    success = true;
  } catch (e) {
    console.log('❌ OpenSSL is also not available in this environment.');
  }
}

if (success) {
  console.log('\n🎉 Local SSL Certificates Generated Successfully!');
  console.log(`🔑 Key:  ${keyPath}`);
  console.log(`📄 Cert: ${certPath}`);
  console.log('\n👉 To use secure local HTTPS in Zenith CMS, add these paths to your .env:');
  console.log(`   ZENITH_SSL_KEY="${keyPath}"`);
  console.log(`   ZENITH_SSL_CERT="${certPath}"`);
} else {
  console.log('\n❌ Failed to generate certificates automatically.');
  console.log('💡 Please install "mkcert" (recommended) or "openssl", then run this script again.');
  console.log('   Alternatively, configure a local reverse proxy (like Caddy or Nginx) to terminate SSL.');
}
