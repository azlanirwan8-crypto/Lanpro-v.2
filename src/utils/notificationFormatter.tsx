import React from "react";
import { 
  Sparkles, 
  UserPlus, 
  ArrowRightLeft, 
  MessageSquare, 
  Clock, 
  ShieldAlert, 
  PlusCircle, 
  Edit3,
  HelpCircle,
  FileText,
  UserCheck,
  Bug
} from "lucide-react";

export interface ParsedNotification {
  icon: React.ReactNode;
  iconBgClass: string;
  badgeText: string;
  badgeClass: string;
  formattedTitle: React.ReactNode;
  formattedMessage: React.ReactNode;
  activityType: "create" | "status" | "assignee" | "comment" | "update" | "deadline" | "blocked" | "general" | "bug_retest";
}

/**
 * Translates technical backend field names to clear, Indonesian human-readable terms.
 */
const translateFieldName = (field: string): string => {
  const mapping: { [key: string]: string } = {
    status: "Status Tugas",
    assigneeId: "Penerima Tugas",
    reporterId: "Pelapor Tugas",
    description: "Deskripsi",
    deskripsi: "Deskripsi",
    title: "Judul Tugas",
    acceptanceCriteria: "Kriteria Penerimaan (AC)",
    dueDate: "Tenggat Waktu",
    startDate: "Tanggal Mulai",
    endDate: "Tanggal Selesai",
    storyPoints: "Story Points",
    priority: "Prioritas",
    estimatedHours: "Estimasi Jam Kerja",
    loggedHours: "Log Jam Kerja",
    release: "Rilis",
    sprintId: "Sprint",
    projectRisk: "Risiko Proyek",
    labels: "Label/Tag"
  };
  return mapping[field] || field;
};

/**
 * Renders status value with standard Jira/Linear color badges (Ultra Compact)
 */
const renderStatusBadge = (status: string) => {
  const s = status ? status.trim().toLowerCase() : "";
  let colorClass = "bg-slate-100 text-slate-700 border-slate-200";
  
  if (s === "to do" || s === "backlog" || s === "none" || s === "unassigned") {
    colorClass = "bg-slate-100 text-slate-600 border-slate-200/80";
  } else if (s === "in progress" || s === "dev" || s === "development" || s === "ready for dev") {
    colorClass = "bg-blue-50 text-blue-700 border-blue-100";
  } else if (s === "review" || s === "qa" || s === "testing" || s === "ready for qa") {
    colorClass = "bg-amber-50 text-amber-700 border-amber-100";
  } else if (s === "done" || s === "closed" || s === "resolved") {
    colorClass = "bg-emerald-50 text-emerald-700 border-emerald-100";
  } else if (s === "blocked") {
    colorClass = "bg-rose-50 text-rose-700 border-rose-100";
  }

  return (
    <span className={`inline-flex items-center px-1.5 py-0 rounded-full text-[10px] font-semibold border ${colorClass} mx-0.5`}>
      {status}
    </span>
  );
};

/**
 * Helper to strip UUID strings from text
 */
const stripUUIDs = (text: string): string => {
  const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/ig;
  return text.replace(uuidPattern, "").replace(/\s+/g, " ").trim();
};

/**
 * Main formatter function that parses raw backend payload and maps it into standard UI structure.
 */
export const formatNotification = (
  type: string | undefined,
  title: string | undefined,
  message: string | undefined
): ParsedNotification => {
  // Clean raw inputs
  const rawTitle = title || "Notifikasi Baru";
  let rawMessage = message || "";
  
  // Clean up any UUIDs
  rawMessage = stripUUIDs(rawMessage);

  // Initialize output fields
  let icon = <HelpCircle className="w-4 h-4" />;
  let iconBgClass = "bg-slate-100 text-slate-500";
  let badgeText = "NOTIFIKASI";
  let badgeClass = "bg-slate-50 text-slate-600 border-slate-200";
  let formattedTitleStr = rawTitle;
  let activityType: ParsedNotification["activityType"] = "general";

  // Determine Activity Type based on title, message, or type
  const lowerTitle = rawTitle.toLowerCase();
  const lowerMsg = rawMessage.toLowerCase();
  const lowerType = (type || "").toLowerCase();

  if (lowerType === "bug_retest" || lowerType === "qa_retest" || lowerTitle.includes("retest") || lowerMsg.includes("retest")) {
    activityType = "bug_retest";
  } else if (lowerType === "blocked" || lowerTitle.includes("block") || lowerMsg.includes("terblokir")) {
    activityType = "blocked";
  } else if (lowerType === "deadline" || lowerTitle.includes("deadline") || lowerTitle.includes("tenggat") || lowerMsg.includes("tempo")) {
    activityType = "deadline";
  } else if (lowerTitle.includes("tugas baru") || lowerTitle.includes("create_task") || lowerMsg.includes("membuat tugas baru") || lowerTitle.includes("ditambahkan")) {
    activityType = "create";
  } else if (lowerTitle.includes("komentar") || lowerMsg.includes("mengomentari")) {
    activityType = "comment";
  } else if (lowerTitle.includes("status") || lowerMsg.includes("mengubah status")) {
    activityType = "status";
  } else if (lowerMsg.includes("menugaskan") || lowerMsg.includes("assigned")) {
    activityType = "assignee";
  } else if (lowerTitle.includes("update") || lowerMsg.includes("memperbarui") || lowerMsg.includes("update")) {
    activityType = "update";
  }

  // Set visual properties depending on activity types
  switch (activityType) {
    case "bug_retest":
      icon = <Bug className="w-4 h-4 text-emerald-600" />;
      iconBgClass = "bg-emerald-50 border border-emerald-100 text-emerald-600";
      badgeText = "BUG RETEST";
      badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
      formattedTitleStr = "Bug Ready for Retest";
      break;
    case "create":
      icon = <PlusCircle className="w-4 h-4 text-emerald-600" />;
      iconBgClass = "bg-emerald-50 border border-emerald-100 text-emerald-600";
      badgeText = "TUGAS BARU";
      badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
      formattedTitleStr = "Tugas Baru Ditambahkan";
      break;

    case "status":
      icon = <ArrowRightLeft className="w-4 h-4 text-indigo-600" />;
      iconBgClass = "bg-indigo-50 border border-indigo-100 text-indigo-600";
      badgeText = "PERUBAHAN STATUS";
      badgeClass = "bg-indigo-50 text-indigo-700 border-indigo-200";
      formattedTitleStr = "Update Status Tugas";
      break;

    case "assignee":
      icon = <UserPlus className="w-4 h-4 text-sky-600" />;
      iconBgClass = "bg-sky-50 border border-sky-100 text-sky-600";
      badgeText = "PENUGASAN";
      badgeClass = "bg-sky-50 text-sky-700 border-sky-200";
      formattedTitleStr = "Penugasan Tugas";
      break;

    case "comment":
      icon = <MessageSquare className="w-4 h-4 text-violet-600" />;
      iconBgClass = "bg-violet-50 border border-violet-100 text-violet-600";
      badgeText = "KOMENTAR";
      badgeClass = "bg-violet-50 text-violet-700 border-violet-200";
      formattedTitleStr = "Komentar Baru";
      break;

    case "update":
      icon = <Edit3 className="w-4 h-4 text-slate-600" />;
      iconBgClass = "bg-slate-100 border border-slate-200 text-slate-600";
      badgeText = "PEMBARUAN";
      badgeClass = "bg-slate-100 text-slate-700 border-slate-300";
      formattedTitleStr = "Detail Tugas Diperbarui";
      break;

    case "deadline":
      icon = <Clock className="w-4 h-4 text-amber-600" />;
      iconBgClass = "bg-amber-50 border border-amber-100 text-amber-600 animate-pulse";
      badgeText = "DEADLINE";
      badgeClass = "bg-amber-50 text-amber-800 border-amber-200";
      formattedTitleStr = "Mendekati Tenggat Waktu";
      break;

    case "blocked":
      icon = <ShieldAlert className="w-4 h-4 text-rose-600" />;
      iconBgClass = "bg-rose-50 border border-rose-100 text-rose-600";
      badgeText = "TERBLOKIR";
      badgeClass = "bg-rose-50 text-rose-700 border-rose-200";
      formattedTitleStr = "Tugas Terblokir / Issue";
      break;

    default:
      icon = <FileText className="w-4 h-4 text-slate-500" />;
      iconBgClass = "bg-slate-50 border border-slate-100 text-slate-500";
      badgeText = "PROYEK";
      badgeClass = "bg-slate-50 text-slate-600 border-slate-200";
      break;
  }

  // Formatting Title element with styling (Compact: text-xs)
  const formattedTitle = (
    <div className="flex items-center gap-1 font-semibold text-slate-800 text-xs">
      <span>{formattedTitleStr}</span>
    </div>
  );

  // Formatting message body
  // Goal: Find `[TASK_KEY: TITLE]` and format it as bold block, parse comments into quote, map technical keys.
  const taskRegex = /\[([A-Za-z0-9-]+):\s*([^\]]+)\]/g;
  
  // Check if there is a task identity match
  let taskCode = "";
  let taskTitle = "";

  const matches = [...rawMessage.matchAll(taskRegex)];
  if (matches.length > 0) {
    taskCode = matches[0][1];
    taskTitle = matches[0][2];
  }

  // Parse technical field terms and details
  // Example: "...memperbarui field "acceptanceCriteria" menjadi..."
  // Match quoted fields and replace with Indonesian terms
  let processedMsg = rawMessage;
  const fieldQuoteRegex = /field\s+"([^"]+)"/g;
  processedMsg = processedMsg.replace(fieldQuoteRegex, (match, fieldName) => {
    return `kolom "${translateFieldName(fieldName)}"`;
  });

  // Terapkan UX Copywriting yang Konsisten untuk Assignee: "[Nama Pengubah] menugaskan tugas ke Ribka"
  if (activityType === "assignee") {
    let actor = "Seorang anggota tim";
    let assignee = "penerima";

    // Extract actor: everything before "menugaskan" or "assigned"
    const actorMatch = rawMessage.match(/^(.+?)\s+(?:menugaskan|assigned)/i);
    if (actorMatch) {
      actor = actorMatch[1].trim();
    }

    // Extract assignee: search for ke "Nama" or ke Nama or to "Nama" or to Nama
    const assigneeMatch = rawMessage.match(/(?:ke|to)\s+"?([^"\.\s]+(?:\s+[^"\.\s]+)?)"?/i);
    if (assigneeMatch) {
      assignee = assigneeMatch[1].trim();
    }

    if (actor.toLowerCase() === "task") {
      if (taskCode && taskTitle) {
        processedMsg = `Tugas [${taskCode}: ${taskTitle}] ditugaskan ke ${assignee}`;
      } else {
        processedMsg = `Tugas ditugaskan ke ${assignee}`;
      }
    } else {
      if (taskCode && taskTitle) {
        processedMsg = `${actor} menugaskan tugas ke ${assignee} [${taskCode}: ${taskTitle}]`;
      } else {
        processedMsg = `${actor} menugaskan tugas ke ${assignee}`;
      }
    }
  }

  // Extract comment blocks (anything in double quotes after "mengomentari tugas ... :")
  let commentBlock: string | null = null;
  const commentRegex = /mengomentari\s+tugas\s+.*:\s*"([^"]+)"/i;
  const commentMatch = processedMsg.match(commentRegex);
  if (commentMatch) {
    commentBlock = commentMatch[1];
  }

  // Split message to isolate the [TASK_KEY: TITLE] for custom React styling
  const parts = [];
  let lastIndex = 0;
  
  // Reset regex
  taskRegex.lastIndex = 0;
  let match;
  while ((match = taskRegex.exec(processedMsg)) !== null) {
    const startIndex = match.index;
    const endIndex = taskRegex.lastIndex;

    // Push the text before the match
    if (startIndex > lastIndex) {
      parts.push(processedMsg.substring(lastIndex, startIndex));
    }

    // Push the beautiful bold task identity - Ultra Compact (text-[10px])
    const code = match[1];
    const name = match[2];
    parts.push(
      <span key={`task-${code}-${startIndex}`} className="inline-flex items-center gap-0.5 px-1 py-0 rounded bg-slate-100 hover:bg-slate-200 border border-slate-200/60 text-[10px] font-semibold text-slate-800 font-mono transition-colors my-0.5 select-all">
        <span className="text-violet-600 font-bold">{code}</span>
        <span className="text-slate-300">|</span>
        <span className="truncate max-w-[120px]">{name}</span>
      </span>
    );

    lastIndex = endIndex;
  }

  if (lastIndex < processedMsg.length) {
    parts.push(processedMsg.substring(lastIndex));
  }

  // Render finalized beautiful message Node (Compact: text-[11px])
  const formattedMessage = (
    <div className="text-[11px] text-slate-500 leading-tight mt-0.5">
      <div className="flex flex-wrap items-center gap-x-0.5">
        {parts.length > 0 ? (
          parts.map((p, i) => <React.Fragment key={i}>{p}</React.Fragment>)
        ) : (
          <span>{processedMsg}</span>
        )}
      </div>

      {/* Special Block: If there's an update with a transition of status, parse and render beautifully (Compact: mt-1 p-1 px-1.5) */}
      {activityType === "status" && (() => {
        const statusMatch = rawMessage.match(/dari\s+"([^"]+)"\s+menjadi\s+"([^"]+)"/i);
        const toMatch = rawMessage.match(/menjadi\s+"([^"]+)"/i);
        if (statusMatch && statusMatch[1] && statusMatch[2]) {
          return (
            <div className="mt-1 flex items-center gap-1 text-slate-500 bg-slate-50 border border-slate-100 rounded-md p-1 px-1.5 max-w-fit">
              <span className="text-[9px] font-medium text-slate-400">Transisi:</span>
              <div className="flex items-center gap-0.5">
                {renderStatusBadge(statusMatch[1])}
                <span className="text-slate-400 text-[9px]">➔</span>
                {renderStatusBadge(statusMatch[2])}
              </div>
            </div>
          );
        } else if (toMatch && toMatch[1]) {
          return (
            <div className="mt-1 flex items-center gap-1 text-slate-500 bg-slate-50 border border-slate-100 rounded-md p-1 px-1.5 max-w-fit">
              <span className="text-[9px] font-medium text-slate-400">Transisi:</span>
              <div className="flex items-center gap-0.5">
                <span className="text-slate-400 text-[9px] font-medium">Ke</span>
                {renderStatusBadge(toMatch[1])}
              </div>
            </div>
          );
        }
        return null;
      })()}

      {/* Special Block: Render comments inside stylized blockquotes (Compact: mt-1 pl-2 py-0.5 px-1.5) */}
      {commentBlock && (
        <div className="mt-1 pl-2 border-l-2 border-violet-500 bg-slate-50/60 py-0.5 px-1.5 rounded-r text-slate-600 italic font-medium text-[11px] max-w-prose">
          "{commentBlock}"
        </div>
      )}
    </div>
  );

  return {
    icon,
    iconBgClass,
    badgeText,
    badgeClass,
    formattedTitle,
    formattedMessage,
    activityType
  };
};
