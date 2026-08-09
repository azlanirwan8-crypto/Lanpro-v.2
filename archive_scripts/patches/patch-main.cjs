const fs = require('fs');
let code = fs.readFileSync('src/main.tsx', 'utf8');

if (!code.includes('ErrorBoundary')) {
  code = code.replace(
    'import App from \'./App\';',
    'import App from \'./App\';\nimport { ErrorBoundary } from \'./components/ErrorBoundary\';'
  );
  
  code = code.replace(
    '<App />',
    '<ErrorBoundary>\n      <App />\n    </ErrorBoundary>'
  );
  
  fs.writeFileSync('src/main.tsx', code);
  console.log("Patched main.tsx");
} else {
  console.log("ErrorBoundary already in main.tsx");
}
