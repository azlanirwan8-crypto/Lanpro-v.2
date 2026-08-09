const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const oldAvatar = `                {/* Avatar Stack Singularity: Seluruh pengguna disatukan dengan indikator online via Socket.io / API */}
                <div className="flex -space-x-2">
                  {(() => {
                    const activeUserUid = currentUser?.uid || user?.uid;
                    // Pastikan current user selalu ada
                    let displayMembers = projectMembers.filter((member) =>
                      member.uid === activeUserUid ||
                      onlineUsers.some((ou) => (ou.uid || (ou as any).id) === member.uid)
                    );
                    // Jika current user belum masuk di projectMembers, inject ke awal array
                    if (!displayMembers.some(m => m.uid === activeUserUid)) {
                      if (currentUserProfile) {
                         displayMembers = [currentUserProfile, ...displayMembers];
                      }
                    }

                    return (
                      <>
                        {displayMembers.slice(0, 5).map((member) => {
                          const isCurrentUser = member.uid === activeUserUid;
                          
                          // Hybrid Presence Check
                          // isOnline = Current user SELALU online, atau terdeteksi di socket onlineUsers, atau last_seen kurang dari 2 menit
                          let isOnline = isCurrentUser || onlineUsers.some((ou) => (ou.uid || (ou as any).id) === member.uid);
                          
                          if (!isOnline && member.lastSeen) {
                            try {
                              const lastSeenTime = new Date(member.lastSeen).getTime();
                              const twoMinsAgo = Date.now() - (2 * 60 * 1000);
                              if (lastSeenTime > twoMinsAgo) isOnline = true;
                            } catch (e) {}
                          }

                          return (
                          <div key={member.uid} className="relative group">
                            <UserAvatar
                              uid={member.uid}
                              user={member}
                              members={projectMembers}
                              className="w-8 h-8 border-2 border-white ring-1 ring-slate-100 relative z-0 group-hover:z-10 group-hover:scale-110 transition-all shadow-sm"
                            />
                            {/* Indikator Online/Offline: Bullet hijau atau abu-abu kecil di pojok kanan bawah */}
                            <span className={\`w-2.5 h-2.5 rounded-full border border-white absolute bottom-0 right-0 z-20 \${isOnline ? 'bg-emerald-500' : 'bg-slate-300'}\`}></span>
                            {/* Tooltip Nama Pengguna */}
                            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-30">
                              {member.displayName || member.name || "Anggota Tim"} {isCurrentUser ? "(You)" : ""}
                            </div>
                          </div>
                          );
                        })}
                        {displayMembers.length > 5 && (
                          <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 shadow-sm ring-1 ring-slate-100 z-0">
                            +{displayMembers.length - 5}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>`;

const newAvatar = `                {/* Global Avatar Stack Singularity: Seluruh pengguna disatukan dengan indikator online via Socket.io / API */}
                <div className="flex -space-x-2">
                  {(() => {
                    const activeUserUid = currentUser?.uid || user?.uid;
                    
                    // Kita cari dari allUsers untuk mendapatkan data lastSeen paling fresh
                    // Filter: Harus member project ini DAN (sedang online OR adalah current user)
                    let onlineProjectMembers = allUsers.filter(u => {
                      if (!selectedProject?.members?.includes(u.uid)) return false;
                      
                      if (u.uid === activeUserUid) return true;
                      if (onlineUsers.some(ou => (ou.uid || (ou as any).id) === u.uid)) return true;
                      
                      if (u.lastSeen) {
                        try {
                          const lastSeenTime = new Date(u.lastSeen).getTime();
                          const twoMinsAgo = Date.now() - (2 * 60 * 1000);
                          if (lastSeenTime > twoMinsAgo) return true;
                        } catch(e) {}
                      }
                      return false;
                    });
                    
                    // Pastikan current user SELALU ada di urutan pertama (jika ia belum terambil)
                    if (!onlineProjectMembers.some(m => m.uid === activeUserUid)) {
                      if (currentUserProfile) {
                        const freshCurrent = allUsers.find(u => u.uid === activeUserUid);
                        onlineProjectMembers = [freshCurrent ? { ...currentUserProfile, ...freshCurrent } : currentUserProfile, ...onlineProjectMembers];
                      }
                    } else {
                      // Bawa current user ke urutan pertama
                      const cuIndex = onlineProjectMembers.findIndex(m => m.uid === activeUserUid);
                      if (cuIndex > 0) {
                        const cu = onlineProjectMembers.splice(cuIndex, 1)[0];
                        onlineProjectMembers.unshift(cu);
                      }
                    }

                    return (
                      <>
                        {onlineProjectMembers.slice(0, 4).map((member) => {
                          const isCurrentUser = member.uid === activeUserUid;
                          
                          return (
                          <div key={member.uid} className="relative group">
                            <UserAvatar
                              uid={member.uid}
                              user={member}
                              members={allUsers}
                              className={\`w-8 h-8 border-2 \${isCurrentUser ? 'border-indigo-400 ring-2 ring-indigo-100 z-10' : 'border-white ring-1 ring-slate-100'} relative group-hover:z-20 group-hover:scale-110 transition-all shadow-sm\`}
                            />
                            {/* Indikator Online: Bullet hijau */}
                            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white absolute bottom-0 right-0 z-20"></span>
                            {/* Tooltip Nama Pengguna */}
                            <div className="absolute top-10 left-1/2 -translate-x-1/2 px-2.5 py-1.5 bg-slate-800 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-30 flex flex-col items-center">
                              <span className="font-semibold">{member.displayName || member.name || "Anggota Tim"} {isCurrentUser ? "(Anda)" : ""}</span>
                              <span className="text-[8px] text-slate-300 capitalize mt-0.5">{member.role || "User"}</span>
                            </div>
                          </div>
                          );
                        })}
                        {onlineProjectMembers.length > 4 && (
                          <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-50 flex items-center justify-center text-[10px] font-black text-slate-500 shadow-sm ring-1 ring-slate-200 z-0 relative hover:z-10 hover:bg-slate-100 transition-all cursor-default">
                            +{onlineProjectMembers.length - 4}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>`;

code = code.replace(oldAvatar, newAvatar);
fs.writeFileSync('src/App.tsx', code);
console.log("Avatar stack refactored.");
