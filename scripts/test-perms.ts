import { hasPermission } from '../src/lib/permissions';
console.log(hasPermission('admin', 'settings', 'read', false, { settings: { create: false, read: false, update: false, delete: false } }));
console.log(hasPermission('admin', 'settings', 'read', false, { 'Integration Settings': { create: false, read: false, update: false, delete: false } } as any));
