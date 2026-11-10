/**
 * Role-based access control.
 *
 * Roles are scoped to an Account (the business workspace that owns one or more
 * companies). SUPER_ADMIN is a platform-level role and is never granted through
 * the API; it is created with `npm run create-super-admin`.
 */
export const ROLES = Object.freeze({
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  ACCOUNTANT: 'accountant',
  STAFF: 'staff',
});

export const ROLE_LABELS = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  accountant: 'Accountant',
  staff: 'Staff',
};

// Higher rank = more privilege. Used so admins can't manage peers above them.
export const ROLE_RANK = { staff: 1, accountant: 2, admin: 3, super_admin: 4 };

export const PERMISSIONS = Object.freeze({
  USERS_MANAGE: 'users:manage',
  COMPANY_VIEW: 'company:view',
  COMPANY_MANAGE: 'company:manage',
  PARTIES_VIEW: 'parties:view',
  PARTIES_WRITE: 'parties:write',
  INVENTORY_VIEW: 'inventory:view',
  INVENTORY_WRITE: 'inventory:write',
  SALES_VIEW: 'sales:view',
  SALES_WRITE: 'sales:write',
  PURCHASE_VIEW: 'purchase:view',
  PURCHASE_WRITE: 'purchase:write',
  ACCOUNTING_VIEW: 'accounting:view',
  ACCOUNTING_WRITE: 'accounting:write',
  EXPENSES_VIEW: 'expenses:view',
  EXPENSES_WRITE: 'expenses:write',
  GST_VIEW: 'gst:view',
  REPORTS_VIEW: 'reports:view',
  AUDIT_VIEW: 'audit:view',
  PLATFORM_MANAGE: 'platform:manage',
});

const P = PERMISSIONS;
const ALL = Object.values(P);

export const ROLE_PERMISSIONS = {
  super_admin: ALL,
  admin: ALL.filter((p) => p !== P.PLATFORM_MANAGE),
  accountant: [
    P.COMPANY_VIEW,
    P.PARTIES_VIEW, P.PARTIES_WRITE,
    P.INVENTORY_VIEW, P.INVENTORY_WRITE,
    P.SALES_VIEW, P.SALES_WRITE,
    P.PURCHASE_VIEW, P.PURCHASE_WRITE,
    P.ACCOUNTING_VIEW, P.ACCOUNTING_WRITE,
    P.EXPENSES_VIEW, P.EXPENSES_WRITE,
    P.GST_VIEW,
    P.REPORTS_VIEW,
  ],
  staff: [
    P.COMPANY_VIEW,
    P.PARTIES_VIEW, P.PARTIES_WRITE,
    P.INVENTORY_VIEW,
    P.SALES_VIEW, P.SALES_WRITE,
    P.PURCHASE_VIEW,
    P.EXPENSES_VIEW, P.EXPENSES_WRITE,
  ],
};

export function permissionsFor(role) {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function hasPermission(role, permission) {
  return permissionsFor(role).includes(permission);
}
