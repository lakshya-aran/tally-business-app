/**
 * Create (or promote) the platform Super Admin.
 *
 *   npm run create-super-admin -- --email you@example.com --name "Your Name" --password "S3curePass!"
 *
 * The super admin role can never be granted through the API.
 */
import { parseArgs } from 'node:util';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db.js';
import User from '../models/User.js';
import Account from '../models/Account.js';
import { ROLES } from '../utils/permissions.js';
import { password as passwordSchema } from '../validators/authValidators.js';

const { values } = parseArgs({
  options: { email: { type: 'string' }, name: { type: 'string' }, password: { type: 'string' } },
});

if (!values.email || !values.password) {
  console.error('Usage: npm run create-super-admin -- --email <email> --name <name> --password <password>');
  process.exit(1);
}
const pw = passwordSchema.safeParse(values.password);
if (!pw.success) {
  console.error(pw.error.issues.map((i) => i.message).join('\n'));
  process.exit(1);
}

await connectDB();
const email = values.email.toLowerCase().trim();
let user = await User.findOne({ email });

if (user) {
  user.role = ROLES.SUPER_ADMIN;
  user.password = values.password;
  user.isEmailVerified = true;
  user.mustSetPassword = false;
  await user.save();
  console.log(`Promoted ${email} to Super Admin.`);
} else {
  const accountId = new mongoose.Types.ObjectId();
  user = new User({
    name: values.name || 'Super Admin',
    email,
    password: values.password,
    role: ROLES.SUPER_ADMIN,
    account: accountId,
    isEmailVerified: true,
  });
  await Account.create({ _id: accountId, name: 'Platform', owner: user._id });
  await user.save();
  console.log(`Created Super Admin ${email}.`);
}

await disconnectDB();
