const fs = require('fs');
let code = fs.readFileSync('src/features/issues/types.ts', 'utf8');

const regex = /export interface TaskDetailModalProps {/;
const replacement = `export interface TaskDetailModalProps {\n  isUpdatingTask?: Record<string, boolean>;`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/features/issues/types.ts', code);
