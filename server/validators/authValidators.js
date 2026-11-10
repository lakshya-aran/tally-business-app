import { z } from 'zod';

export const email = z.string().trim().toLowerCase().email('Enter a valid email address').max(254);

export const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[0-9]/, 'Password must contain a number');

export const name = z.string().trim().min(2, 'Name must be at least 2 characters').max(80);
const phone = z
  .string()
  .trim()
  .regex(/^[+0-9 ()-]{7,20}$/, 'Enter a valid phone number')
  .or(z.literal(''));
const token = z.string().regex(/^[a-f0-9]{64}$/, 'Invalid or malformed token');

export const registerSchema = z.object({
  name,
  email,
  password,
  businessName: z.string().trim().min(2, 'Business name must be at least 2 characters').max(120),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required').max(128),
});

export const emailOnlySchema = z.object({ email });
export const tokenSchema = z.object({ token });

export const resetPasswordSchema = z.object({ token, password });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: password,
  })
  .refine((d) => d.currentPassword !== d.newPassword, {
    message: 'New password must differ from the current one',
    path: ['newPassword'],
  });

export const updateProfileSchema = z
  .object({
    name: name.optional(),
    phone: phone.optional(),
    avatar: z
      .object({
        url: z.string().url().max(2048),
        path: z.string().max(512),
      })
      .nullable()
      .optional(),
  })
  .strict();
