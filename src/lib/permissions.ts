import { RoleLevel, TabType } from '../types';

export const TAB_PERMISSIONS: Record<RoleLevel, TabType[]> = {
  owner: [
    'operations',
    'customers',
    'customerDetails',
    'creditCustomers',
    'warehouse',
    'summary',
    'reconciliation',
    'expenses',
    'icePurchase',
    'assistant',
    'attendance',
    'vehicles',
  ],
  accountant: [
    'operations',
    'customers',
    'customerDetails',
    'creditCustomers',
    'warehouse',
    'summary',
    'reconciliation',
    'expenses',
    'icePurchase',
    'assistant',
    'attendance',
    'vehicles',
  ],
  staff: ['operations', 'warehouse', 'summary'],
};

export function canAccessTab(roleLevel: RoleLevel, tab: TabType): boolean {
  return TAB_PERMISSIONS[roleLevel].includes(tab);
}

export function canManageAdmins(roleLevel: RoleLevel): boolean {
  return roleLevel === 'owner';
}

export function canEditPaymentStatusLabels(roleLevel: RoleLevel): boolean {
  return roleLevel === 'owner' || roleLevel === 'accountant';
}

export function canViewNetProfit(roleLevel: RoleLevel): boolean {
  return roleLevel === 'owner';
}
