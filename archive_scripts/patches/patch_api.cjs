const fs = require('fs');
let code = fs.readFileSync('src/lib/api.ts', 'utf8');

const apiErrorClass = `
export class ApiError extends Error {
  status: number;
  data: any;
  constructor(message: string, status: number, data: any) {
    super(message);
    this.status = status;
    this.data = data;
  }
}
`;

code = code.replace(
  'export const getAuthToken = () => {',
  apiErrorClass + '\nexport const getAuthToken = () => {'
);

code = code.replace(
  /if \(!response\.ok\) \{[\s\S]*?throw new Error\(message\);\s*\}/,
  `if (!response.ok) {
        let message = \`Server error: \${response.status}\`;
        let errorData = {};
        if (isJson) {
            errorData = await response.json().catch(() => ({}));
            message = errorData.message || message;
        } else {
            const text = await response.text().catch(() => "");
            if (text.includes("<html>")) {
                message = \`Rute API tidak ditemukan atau terjadi kesalahan konfigurasi server (Status: \${response.status}). Response bukan JSON.\`;
            }
        }
        throw new ApiError(message, response.status, errorData);
    }`
);

fs.writeFileSync('src/lib/api.ts', code);
console.log("Patched api.ts with ApiError");
