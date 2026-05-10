import { connectToDatabase, closeDatabaseConnection } from './packages/core/src/database/connection';
import { UserModel } from './packages/core/src/database/user-model';
import { AuthService } from './packages/core/src/services/auth';

async function main() {
  const args = process.argv.slice(2);
  const email = args[0] || 'admin@zenith.com';
  const password = args[1] || 'Zenith2024!';
  const reset = args.includes('--reset');

  await connectToDatabase();
  
  const existing = await UserModel.findOne({ email });
  if (existing && !reset) {
    console.log(`User ${email} already exists. Use --reset to update password.`);
  } else {
    const hashedPassword = await AuthService.hashPassword(password);
    if (existing && reset) {
      await UserModel.updateOne({ email }, { password: hashedPassword });
      console.log(`Updated password for ${email}`);
    } else {
      await UserModel.create({
        email,
        password: hashedPassword,
        role: 'admin',
      });
      console.log(`Created admin user: ${email} / ${password}`);
    }
  }
  
  await closeDatabaseConnection();
}

main().catch(console.error);
