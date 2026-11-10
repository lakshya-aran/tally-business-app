import { z } from 'zod';
import { email, name } from './authValidators.js';
import { ROLES } from '../utils/permissions.js';

const assignableRole = z.enum([ROLES.ADMIN, ROLES.ACCOUNTANT, ROLES.STAFF], {
  message: 'Choose a valid role',
});

export const objectIdParam = z.object({
  id: z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id'),
});

export const listUsersQuery = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().trim().max(100).optional(),
  role: z.enum(Object.values(ROLES)).optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

export const inviteUserSchema = z.object({ name, email, role: assignableRole });

export const updateUserSchema = z
  .object({
    role: assignableRole.optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((d) => Object.keys(d).length > 0, { message: 'Nothing to update' });
