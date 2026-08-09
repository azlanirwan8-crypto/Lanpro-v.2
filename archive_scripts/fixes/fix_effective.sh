sed -i -e '/const user: any = currentUser;/a\
  const effectiveRole = useMemo(() => {\
    if (userRole === "admin") return "admin";\
    if (selectedProject && currentUser?.uid && selectedProject.memberRoles?.[currentUser?.uid]) {\
        return selectedProject.memberRoles[currentUser?.uid] as AppRole;\
    }\
    return userRole as AppRole;\
  }, [userRole, selectedProject, currentUser?.uid]);' src/App.tsx
