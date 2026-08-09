sed -i -e '/return selectedProject.memberRoles\[currentUser?.uid\] as AppRole;/c\
        const pr = selectedProject.memberRoles[currentUser?.uid];\
        if (pr === "developer" || pr === "member") return "user";\
        if (pr === "viewer") return "viewer";\
        return pr as AppRole;' src/App.tsx
