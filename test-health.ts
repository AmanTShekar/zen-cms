import { AdapterFactory } from './packages/core/src/database/adapters/AdapterFactory';
import { AuthService } from './packages/core/src/services/auth';
async function run() {
  const adapter = AdapterFactory.create();
  await adapter.connect();
  const admin = await adapter.findOne('z_users', { role: 'admin' });
  if (!admin) { console.log('no admin'); process.exit(1); }
  const token = AuthService.generateToken(admin);
  const res = await fetch('http://localhost:3000/api/v1/health', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  if (data.data) {
    console.log('collections count:', data.data.collections.length);
    console.log('collections slugs:', data.data.collections.map((c: any) => c.slug).join(', '));
  } else {
    console.log(data);
  }
  process.exit(0);
}
run();
