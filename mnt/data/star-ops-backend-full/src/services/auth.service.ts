import { prisma } from '../lib/prisma.js';
import { verifyPassword } from '../lib/password.js';
import { HttpError } from '../lib/errors.js';

export async function loginAdmin(email: string, password: string) {
  const admin = await prisma.adminUser.findUnique({ where: { email } });
  if (!admin || !admin.isActive) throw new HttpError(401, 'Invalid credentials');

  const valid = await verifyPassword(password, admin.passwordHash);
  if (!valid) throw new HttpError(401, 'Invalid credentials');

  return admin;
}
