sed -i -e '/if (userRole === .user. && (action === .delete. || action === .update.) && !isOwner) {/c\
    // General users can only update or delete data they own (Reporter or Assignee), unless custom permissions bypass it\
    // For project modules (list, board, sprints), let them update if permission allows\
    const isProjectModuleUpdate = action === "update" && ["list", "board", "sprints", "qa"].includes(normModule as string);\
    if (userRole === "user" && (action === "delete" || (action === "update" && !isProjectModuleUpdate)) && !isOwner) {' src/lib/permissions.ts
