const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const target = `  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }`;

const replacement = `  if (loading) {
    return <GlobalSkeleton />;
  }

  if (isInitialDataLoading) {
    return <GlobalSkeleton />;
  }`;

code = code.replace(target, replacement);
fs.writeFileSync('src/App.tsx', code);
