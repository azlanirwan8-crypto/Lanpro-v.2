const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /const handleManualLogin = async \([\s\S]*?handleAuthApiResponse\(401, \{ message: e\.message \}\);\s*\}\s*\}\s*setLoading\(false\);\s*\};/m;

const replacement = `const handleManualLogin = async (
    username: string,
    password: string,
    remember: boolean,
    force: boolean = false
  ) => {
    if (loading && !force) return;
    console.log("Attempting custom database login for:", username, "force:", force);

    try {
      setLoading(true);

      // Special Hardcoded Admin bypass
      if (
        username === "admin" &&
        (password === "admin" || password === "admin123")
      ) {
        const adminData = {
          uid: "admin-fixed-id",
          username: "admin",
          status: "approved",
          role: "admin",
          displayName: "Admin Manager",
        };
        try {
           await apiRequest('/api/auth/register', {
             method: "POST",
             body: { ...adminData, password: password, id: "admin-fixed-id" }
           })
        } catch (e) {}
        if (remember) {
          localStorage.setItem("isAdminMode", "true");
        } else {
          sessionStorage.setItem("isAdminMode", "true");
        }
      }

      const data = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: { username, password, force }
      });
      
      if (data.status !== 'success') {
         toast.error(data.message);
         setLoading(false);
         return;
      }

      if (data.token) {
        setAuthToken(data.token);
      }
      
      const userData = data.user as UserProfile;
      userData.permissions = typeof userData.permissions === 'string' ? JSON.parse(userData.permissions) : userData.permissions;
      
      // Prefetch critical dashboard data
      try {
        const canSeeAllProjects = userData.role === "admin" || userData.role === "head";
        const url = canSeeAllProjects ? "/api/projects" : \`/api/projects?userId=\${userData.uid}\`;
        const [projectsRes, masterRes] = await Promise.all([
           apiRequest(url).catch(() => null),
           apiRequest("/api/master-data").catch(() => null)
        ]);
        
        if (projectsRes?.status === "success") {
           const projs = projectsRes.data as Project[];
           setProjects(projs);
           setSelectedProject(projs.length > 0 ? projs[0] : null);
        }
        
        if (masterRes?.status === "success") {
           const result = masterRes.data as MasterData[];
           const uniqueData = Array.from(new Map(result.map((m) => [\`\${m.type}-\${m.label}\`, m])).values());
           setMasterData(uniqueData);
           if (uniqueData.length > 0) {
              const statuses = uniqueData.filter((d) => d.type === "status");
              const priorities = uniqueData.filter((d) => d.type === "priority");
              if (statuses.length > 0) setNewTaskStatus(statuses[0].label);
              if (priorities.length > 0) setNewTaskPriority(priorities[0].label);
           }
        }
      } catch (e) {
         console.warn("Failed to prefetch data:", e);
      }

      setIsLoggedIn(true);
      setUserRole(userData.role);
      setCurrentUser(userData);
      setCurrentUserProfile(userData);
      setShowCollisionModal(false);
      setActiveSessionData(null);
      setPendingLoginCredentials(null);

      if (remember) {
        localStorage.setItem("sessionUser", JSON.stringify(userData));
        localStorage.setItem("rememberUser", "true");
      } else {
        sessionStorage.setItem("sessionUser", JSON.stringify(userData));
        localStorage.removeItem("rememberUser");
      }

      toast.success(\`Selamat datang kembali, \${userData?.displayName || username}\`);
    } catch (e: any) {
      if (e instanceof ApiError && e.status === 409) {
        console.warn("Session collision detected");
        setActiveSessionData(e.data.activeSession);
        setPendingLoginCredentials({ username, password, remember });
        setShowCollisionModal(true);
        setLoading(false);
        return;
      }

      setLoading(false);
      const isExpectedAuthError = e.message && (
        e.message.includes("belum aktif") ||
        e.message.includes("pending") ||
        e.message.toLowerCase().includes("salah") ||
        e.message.toLowerCase().includes("credentials") ||
        e.message.toLowerCase().includes("tidak ditemukan")
      );

      if (isExpectedAuthError) {
        console.warn("Login validation issue:", e.message);
      } else {
        console.error("Critical login error:", e);
      }

      if (e.message && (e.message.includes("belum aktif") || e.message.includes("pending"))) {
        setIsPendingModalOpen(true);
        handleAuthApiResponse(403, { message: e.message }, () => setIsPendingModalOpen(true));
      } else if (e.message && (e.message.toLowerCase().includes("salah") || e.message.toLowerCase().includes("credentials") || e.message.toLowerCase().includes("tidak ditemukan"))) {
        handleAuthApiResponse(401, { message: e.message });
      } else {
        toast.error(e.message || "Gagal melakukan login");
      }
    }
    setLoading(false);
  };`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/App.tsx', code);
console.log("Patched App.tsx handleManualLogin");
