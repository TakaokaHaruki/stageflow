import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { FileText, ImageIcon, ChevronRight, Loader2, FolderOpen } from "lucide-react";
import { LIVE_SYNC_INTERVAL } from "@/lib/liveSync";
import PdfViewerModal from "@/components/PdfViewerModal";

function isFileVisibleToStaff(file, staffName, staffRoles) {
  if (file.visibility === "public") return true;
  if (file.visibility === "roles") {
    const allowed = file.allowed_roles || [];
    return allowed.some((r) => (staffRoles || []).includes(r));
  }
  if (file.visibility === "staff_names") {
    return (file.allowed_staff_names || []).includes(staffName);
  }
  return false;
}

function getFileIcon(url) {
  const lower = (url || "").toLowerCase().split("?")[0];
  if (/\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(lower)) return ImageIcon;
  return FileText;
}

export default function StaffFileViewer({ events, staffName, staffRoles }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);

  const fetchFiles = async (evts, sName, sRoles) => {
    if (!evts || evts.length === 0) return [];
    const allFiles = [];
    for (const event of evts) {
      try {
        const eventFiles = await base44.entities.SharedFile.filter({ event_id: event.id }, "-created_date");
        for (const f of eventFiles) {
          if (isFileVisibleToStaff(f, sName, sRoles)) {
            allFiles.push({ ...f, _eventName: event.name });
          }
        }
      } catch (_) {}
    }
    return allFiles;
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const result = await fetchFiles(events, staffName, staffRoles);
        if (!cancelled) setFiles(result);
      } catch (_) {
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [events, staffName, staffRoles]);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const result = await fetchFiles(events, staffName, staffRoles);
        setFiles(result);
      } catch (_) {}
    }, LIVE_SYNC_INTERVAL);
    return () => clearInterval(interval);
  }, [events, staffName, staffRoles]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (files.length === 0) {
    return null;
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-6 bg-card border border-border rounded-2xl shadow-md p-4"
      >
        <h3 className="font-bold text-sm mb-3 flex items-center gap-1.5">
          <span className="bg-primary/10 text-primary rounded-lg p-1.5">
            <FolderOpen className="w-4 h-4" />
          </span>
          配布資料
        </h3>
        <div>
          {files.map((f, fIdx) => {
            const Icon = getFileIcon(f.file_url);
            const isLast = fIdx === files.length - 1;
            return (
              <button
                key={f.id}
                onClick={() => {
              const isChief = (staffRoles || []).includes("セクションチーフ");
              const isPdf = (f.file_url || "").toLowerCase().split("?")[0].endsWith(".pdf");
              if (isChief && isPdf && f.file_url) {
                window.open(f.file_url, "_blank");
                return;
              }
              setSelectedFile(f);
            }}
                className={`w-full flex items-start gap-3 py-3 hover:bg-muted/50 transition-colors active:scale-[0.98] text-left ${isLast ? "" : "border-b border-border"} ${fIdx === 0 ? "pt-0" : ""}`}
              >
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{f.title}</p>
                  {f.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{f.description}</p>
                  )}
                  {f._eventName && (
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5 truncate">{f._eventName}</p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
              </button>
            );
          })}
        </div>
      </motion.div>

      {selectedFile && (
        <PdfViewerModal
          fileUrl={selectedFile.file_url}
          fileName={selectedFile.file_name || selectedFile.title}
          onClose={() => setSelectedFile(null)}
        />
      )}
    </>
  );
}