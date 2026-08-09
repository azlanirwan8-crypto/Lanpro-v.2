const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const badCode = `      const projects = rows as any[];
      for (const p of projects) {
        const [memberRows] = await connection.query(
          \`SELECT u.uid, u.id as uuid, pm.role 
           FROM ProjectMembers pm
           JOIN Users u ON pm.userId = u.id
           WHERE pm.projectId = ?\`,
          [p.id]
        );
        
        const membersList: string[] = [];
        const memberRoles: Record<string, string> = {};
        
        for (const m of (memberRows as any[])) {
          membersList.push(m.uid);
          memberRoles[m.uid] = m.role || 'viewer';
          memberRoles[m.uuid] = m.role || 'viewer';
        }
        
        p.members = membersList;
        p.memberRoles = memberRoles;
      }`;

const goodCode = `      const projects = rows as any[];
      if (projects.length > 0) {
        const projectIds = projects.map(p => p.id);
        
        const [allMemberRows]: any = await connection.query(
          \`SELECT pm.projectId, u.uid, u.id as uuid, pm.role 
           FROM ProjectMembers pm
           JOIN Users u ON pm.userId = u.id
           WHERE pm.projectId IN (?)\`,
          [projectIds]
        );
        
        const membersByProject = new Map();
        
        for (const row of allMemberRows) {
          if (!membersByProject.has(row.projectId)) {
            membersByProject.set(row.projectId, { list: [], roles: {} });
          }
          const pData = membersByProject.get(row.projectId);
          pData.list.push(row.uid);
          pData.roles[row.uid] = row.role || 'viewer';
          pData.roles[row.uuid] = row.role || 'viewer';
        }
        
        for (const p of projects) {
          const pData = membersByProject.get(p.id) || { list: [], roles: {} };
          p.members = pData.list;
          p.memberRoles = pData.roles;
        }
      }`;

code = code.replace(badCode, goodCode);
fs.writeFileSync('server.ts', code);
console.log("Projects N+1 fixed.");
