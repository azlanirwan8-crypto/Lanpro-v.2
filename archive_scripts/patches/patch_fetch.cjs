const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const target = `  useEffect(() => {
    if (!isLoggedIn) return;
    const timer = setTimeout(() => {
      fetchProjects();
    }, 300);
    return () => clearTimeout(timer);
  }, [currentUser?.uid, userRole, isLoggedIn]);`;

const replacement = `  useEffect(() => {
    if (!isLoggedIn) return;
    if (projects.length === 0) {
      setIsInitialDataLoading(true);
    }
    const timer = setTimeout(async () => {
      await fetchProjects();
      setIsInitialDataLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [currentUser?.uid, userRole, isLoggedIn]);`;

code = code.replace(target, replacement);
fs.writeFileSync('src/App.tsx', code);
