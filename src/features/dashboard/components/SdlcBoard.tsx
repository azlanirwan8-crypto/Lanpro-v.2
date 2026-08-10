import React from "react";
import { PackageOpen, ShieldAlert, Check, Send, FileText, GripVertical } from "lucide-react";
import { cn } from "../../../lib/utils";

interface SdlcBoardProps {
  waterfallGates: any;
  activeWaterfallTab: string;
  setActiveWaterfallTab: (tab: string) => void;
  waterfallPhaseTaskCounts: any;
  handleToggleGate: (phaseId: string) => void;
}

export const SdlcBoard: React.FC<SdlcBoardProps> = ({
  waterfallGates,
  activeWaterfallTab,
  setActiveWaterfallTab,
  waterfallPhaseTaskCounts,
  handleToggleGate,
}) => {
  return (
    <div className="w-full h-auto bg-slate-900 text-white rounded-xl relative overflow-y-auto no-scrollbar shadow-2xl flex flex-col p-6 md:p-8 min-h-[460px]">
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-amber-400 via-transparent to-transparent pointer-events-none"></div>
      <div className="absolute -right-10 -bottom-10 opacity-5 pointer-events-none">
        <PackageOpen className="w-64 h-64 text-amber-500" />
      </div>

      <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/10 relative z-10 transition-all select-none">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          <span className="font-bold text-slate-200 text-xs tracking-wider uppercase">SDLC Waterfall Governance</span>
        </div>
        <GripVertical className="w-4 h-4 text-slate-500 hover:text-slate-300 cursor-move custom-drag-grip shrink-0" />
      </div>

      {/* Horizontal Phase Timeline */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 mb-6 relative z-10">
        {[
          { id: "requirements", label: "1. Requirements", desc: "Analisis Kebutuhan" },
          { id: "design", label: "2. System Design", desc: "Desain & Arsitektur" },
          { id: "coding", label: "3. Coding & Dev", desc: "Pengembangan" },
          { id: "sit", label: "4. Testing SIT", desc: "System Integration" },
          { id: "uat", label: "5. Testing UAT", desc: "User Acceptance" },
          { id: "golive", label: "6. Go-Live", desc: "Deployment & Ops" },
        ].map((phase, idx) => {
          const isApproved = waterfallGates[phase.id]?.approved;
          const isActive = activeWaterfallTab === phase.id;
          const taskStat = waterfallPhaseTaskCounts[phase.id] || { total: 0, done: 0 };
          const progressVal = taskStat.total > 0
            ? Math.round((taskStat.done / taskStat.total) * 100)
            : isApproved ? 100 : 0;

          return (
            <button
              key={phase.id}
              type="button"
              onClick={() => setActiveWaterfallTab(phase.id)}
              className={cn(
                "flex flex-col p-4 rounded-xl border text-left transition-all h-full relative focus:outline-none cursor-pointer",
                isActive
                  ? "bg-slate-800/90 border-amber-400/80 shadow-[0_0_15px_rgba(251,191,36,0.15)]"
                  : "bg-slate-800/30 border-slate-850 hover:bg-slate-800/60"
              )}
            >
              <div className="flex justify-between items-center w-full mb-3 select-none">
                <span className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black pointer-events-none",
                  isApproved ? "bg-emerald-500 text-white shadow-sm" : "bg-slate-700 text-slate-300"
                )}>
                  {isApproved ? "✓" : idx + 1}
                </span>
                {isApproved && (
                  <span className="text-[8px] font-black tracking-wider text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded leading-none border border-emerald-500/20">
                    SIGNED
                  </span>
                )}
              </div>

              <div className="text-xs font-black truncate text-white">{phase.label}</div>
              <div className="text-[10px] text-slate-400 truncate mt-0.5 leading-tight">{phase.desc}</div>

              {/* Mini task progress */}
              <div className="mt-4 w-full select-none">
                <div className="flex justify-between items-center text-[9px] text-slate-400 mb-1 leading-none">
                  <span>Done: {taskStat.done}/{taskStat.total}</span>
                  <span>{progressVal}%</span>
                </div>
                <div className="w-full bg-slate-700 h-1 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      idx <= Object.keys(waterfallGates).findIndex(k => k === phase.id)
                        ? "bg-amber-400"
                        : "bg-slate-500"
                    )}
                    style={{ width: `${progressVal}%` }}
                  ></div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Detailed Active Phase Pane */}
      {(() => {
        const items = {
          requirements: {
            title: "1. Inisiasi & Analisis Kebutuhan (Requirements)",
            desc: "Dokumentasi detail kebutuhan bisnis dan spesifikasi teknis awal oleh tim Business Analyst, Product Owner, & Architect.",
            deliverables: [
              "Functional Specification Document (FSD)",
              "Business Requirement Document (BRD)",
              "Initial project charter & team list",
            ],
            nextGate: "design",
          },
          design: {
            title: "2. Desain Sistem & Arsitektur (System Design)",
            desc: "Perancangan struktur teknis dasar, arsitektur database, desain API, serta mock-up detail interface aplikasi oleh UI/UX & Technical Lead.",
            deliverables: [
              "Technical Specification Document (TSD)",
              "Skema Database ERD & Data Dictionary",
              "Arsitektur Integrasi API & Payload specs",
            ],
            nextGate: "coding",
          },
          coding: {
            title: "3. Pengembangan & Coding (Development)",
            desc: "Fase konstruksi program utama, penulisan logic code modular, serta unit testing oleh tim Front-End & Back-End Developer.",
            deliverables: [
              "Source Code repositori utama disinkronkan",
              "Dokumentasi API Swagger / Postman Collection",
              "Unit Testing log (Coverage >= 80%)",
            ],
            nextGate: "sit",
          },
          sit: {
            title: "4. Pengujian SIT (System Integration Testing)",
            desc: "Pengujian terintegrasi seluruh komponen sistem perbankan untuk memastikan kelancaran komunikasi antar modul/layanan eksternal.",
            deliverables: [
              "SIT Test Scenario / Plan",
              "SIT Test Report (Zero High & Critical Bugs)",
              "SIT Sign-off Document",
            ],
            nextGate: "uat",
          },
          uat: {
            title: "5. Pengujian UAT (User Acceptance Testing)",
            desc: "Sesi pengujian resmi bersama unit bisnis / stakeholder eksternal Bank BNI untuk menyatakan kesiapan aplikasi secara operasional.",
            deliverables: [
              "Skenario Testing UAT disetujui User",
              "Berita Acara UAT / UAT Sign-off",
              "User Manual Document & Runbook",
            ],
            nextGate: "golive",
          },
          golive: {
            title: "6. Go-Live & Penerapan Operasional (Deployment)",
            desc: "Rilis final aplikasi ke lingkungan production utama (Cloud Run / Container) yang siap diakses secara publik dan dimonitor penuh.",
            deliverables: [
              "Post Implementation Review (PIR)",
              "Dokumen Penyerahan Operasional / Handover",
              "Dokumentasi Monitoring & Logging setup",
            ],
            nextGate: "none",
          },
        };

        const activeInfo = items[activeWaterfallTab as keyof typeof items] || items.requirements;
        const phaseGateStatus = waterfallGates[activeWaterfallTab];

        return (
          <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-5 md:p-6 relative z-10 select-none">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-4 pb-4 border-b border-white/5">
              <div>
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  {activeInfo.title}
                </h4>
                <p className="text-slate-300 text-xs mt-1 max-w-2xl">
                  {activeInfo.desc}
                </p>
              </div>

              {/* Approval Toggle */}
              <div className="shrink-0 w-full lg:w-auto">
                <button
                  type="button"
                  onClick={() => handleToggleGate(activeWaterfallTab)}
                  className={cn(
                    "w-full lg:w-auto px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 border cursor-pointer",
                    phaseGateStatus?.approved
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30"
                      : "bg-amber-400 text-slate-900 border-amber-500 hover:bg-amber-300"
                  )}
                >
                  {phaseGateStatus?.approved ? (
                    <>
                      <Check className="w-4 h-4" /> Signoff Disetujui
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" /> Setujui Gate / Signoff
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              {/* Mandatori Deliverables list */}
              <div>
                <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2 flex items-center gap-1.5 leading-none">
                  <FileText className="w-4 h-4 text-amber-400" /> Mandatori Deliverables BNI SDLC
                </h5>
                <ul className="space-y-1.5">
                  {activeInfo.deliverables.map((del, dIdx) => (
                    <li key={dIdx} className="text-xs text-slate-300 flex items-start gap-2">
                      <span className="text-amber-400 text-sm leading-none">•</span>
                      <span>{del}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Signoff metadata */}
              <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800/80 flex flex-col justify-between">
                <div>
                  <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">
                    Status Gate-Approval
                  </div>
                  <div className="text-xs font-bold">
                    {phaseGateStatus?.approved ? (
                      <span className="text-emerald-400 flex items-center gap-1">
                        ✓ Approved & Closed Gate
                      </span>
                    ) : (
                      <span className="text-amber-400 flex items-center gap-1">
                        ⚠ Pending Gate Approval
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 mt-4 border-t border-white/5 pt-2 flex flex-col gap-0.5">
                  {phaseGateStatus?.approved ? (
                    <>
                      <div>
                        Disetujui oleh:{" "}
                        <span className="font-bold text-white">{phaseGateStatus.approvedBy}</span>
                      </div>
                      <div className="mt-0.5">
                        Waktu: <span className="font-mono text-white">{phaseGateStatus.approvedAt}</span>
                      </div>
                    </>
                  ) : (
                    <span className="italic text-slate-500">
                      Gunakan tombol Signoff di kanan atas untuk menyetujui kriteria phase ini.
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
