import fs from 'fs';
import path from 'path';
import { DEFAULT_PERMISSIONS as LIB_DEFAULT_PERMISSIONS, KEY_MAP, normalizeModuleKey } from '../src/lib/permissions';
import { DEFAULT_PERMISSIONS as USER_DEFAULT_PERMISSIONS } from '../src/features/users/types';

console.log('----------------------------------------------------');
console.log('🔒 RBAC & Permission Validation Script');
console.log('----------------------------------------------------');

let errors: string[] = [];
let warnings: string[] = [];

// 1. Read UserPermissions interface keys from src/types.ts
const typesFilePath = path.resolve('src/types.ts');
const typesContent = fs.readFileSync(typesFilePath, 'utf-8');

const userPermissionsMatch = typesContent.match(/export interface UserPermissions \{([\s\S]*?)\}/);
if (!userPermissionsMatch) {
  errors.push('Could not find "export interface UserPermissions" in src/types.ts');
}

const userPermissionKeys: string[] = [];
if (userPermissionsMatch) {
  const interfaceBody = userPermissionsMatch[1];
  const keyMatches = interfaceBody.matchAll(/^\s*([a-zA-Z0-9_]+)\?:/gm);
  for (const match of keyMatches) {
    userPermissionKeys.push(match[1]);
  }
}

console.log(`\n📋 Registered keys in UserPermissions interface (${userPermissionKeys.length}):`);
console.log(userPermissionKeys.sort().join(', '));

// 2. Read feature modules from src/features
const featuresDir = path.resolve('src/features');
const featureFolders = fs.readdirSync(featuresDir).filter(f => {
  const stat = fs.statSync(path.join(featuresDir, f));
  return stat.isDirectory();
});

// Folders that are internal sub-components, dialogs, or sub-widgets rather than primary permissioned views
const EXCLUDED_FEATURE_FOLDERS = new Set(['sidebar', 'CreateIssueBar', 'activity', 'backup', 'connect']);

console.log(`\n📁 Feature directories in src/features (${featureFolders.length}):`);

featureFolders.forEach(folder => {
  if (EXCLUDED_FEATURE_FOLDERS.has(folder)) return;

  const normalized = normalizeModuleKey(folder);
  const isKeyInTypes = userPermissionKeys.includes(normalized) || userPermissionKeys.includes(folder);

  if (!isKeyInTypes) {
    errors.push(`Feature folder "${folder}" (normalized: "${normalized}") is missing from UserPermissions interface in src/types.ts!`);
  }
});

// 3. Check DEFAULT_PERMISSIONS in src/lib/permissions.ts
console.log(`\n⚙️ Checking DEFAULT_PERMISSIONS in src/lib/permissions.ts...`);
const adminPerms = LIB_DEFAULT_PERMISSIONS.admin || {};
userPermissionKeys.forEach(key => {
  const normKey = normalizeModuleKey(key);
  if (!(normKey in adminPerms) && !(key in adminPerms)) {
    errors.push(`Module "${key}" is defined in UserPermissions interface but missing from DEFAULT_PERMISSIONS.admin in src/lib/permissions.ts!`);
  }
});

// 4. Check DEFAULT_PERMISSIONS in src/features/users/types.ts
console.log(`\n⚙️ Checking DEFAULT_PERMISSIONS in src/features/users/types.ts...`);
userPermissionKeys.forEach(key => {
  const normKey = normalizeModuleKey(key);
  if (!(normKey in USER_DEFAULT_PERMISSIONS) && !(key in USER_DEFAULT_PERMISSIONS)) {
    warnings.push(`Module "${key}" is missing from DEFAULT_PERMISSIONS in src/features/users/types.ts (used in User Management modal).`);
  }
});

// 5. Read sidebar configuration to ensure all sidebar items have module permission checks
const sidebarConfigPath = path.resolve('src/features/sidebar/config.tsx');
if (fs.existsSync(sidebarConfigPath)) {
  const sidebarContent = fs.readFileSync(sidebarConfigPath, 'utf-8');
  const moduleMatches = sidebarContent.matchAll(/module:\s*'([^']+)'/g);
  for (const match of moduleMatches) {
    const moduleName = match[1];
    const normModule = normalizeModuleKey(moduleName);
    if (!userPermissionKeys.includes(normModule) && !userPermissionKeys.includes(moduleName)) {
      errors.push(`Sidebar item references module "${moduleName}" which is not defined in UserPermissions!`);
    }
  }
}

// Final Summary
console.log('\n----------------------------------------------------');
if (warnings.length > 0) {
  console.log(`⚠️ Warnings (${warnings.length}):`);
  warnings.forEach(w => console.log(` - ${w}`));
}

if (errors.length > 0) {
  console.error(`❌ Validation Failed with ${errors.length} error(s):`);
  errors.forEach(e => console.error(` - ${e}`));
  process.exit(1);
} else {
  console.log('✅ All features and sidebar modules are properly registered in UserPermissions and DEFAULT_PERMISSIONS!');
  console.log('----------------------------------------------------');
  process.exit(0);
}
