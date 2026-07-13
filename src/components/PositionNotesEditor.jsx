import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { FileText } from "lucide-react";
import SectionHeader from "@/components/SectionHeader";
import PositionTypeOverrideSection from "@/components/PositionTypeOverrideSection";
import { LIVE_SYNC_INTERVAL } from "@/lib/liveSync";

const SLOT_ORDER = ["開場中", "開演中", "終演後"];
const SLOT_COLORS = {
  "開場中": "text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400",
  "開演中": "text-green-600 bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400",
  "終演後": "text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-400",
};

function PositionNoteRow({ position }) {
  const [notes, setNotes] = useState(position.notes || "");
  const prevRef = useRef(position.notes || "");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (value) => {
      await base44.entities.Position.update(position.id, { notes: value });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["positions", position.event_id] });
      toast.success("保存しました");
    },
    onError: () => toast.error("保存に失敗しました"),
  });

  useEffect(() => {
    if (notes === prevRef.current) return;
    const timer = setTimeout(() => {
      mutation.mutate(notes, {
        onSuccess: () => { prevRef.current = notes; }
      });
    }, 600);
    return () => clearTimeout(timer);
  }, [notes]);

  return (
    <div className="flex items-center gap-2 py-2 border-b border-border last:border-0">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{position.name}</div>
        {position.staff_names?.length > 0 && (
          <div className="text-xs text-muted-foreground truncate mt-0.5">
            {position.staff_names.join("、")}
          </div>
        )}
      </div>
      <div className="flex-1">
        <Input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="説明テキスト（スタッフに表示）"
          className="h-7 text-xs"
        />
      </div>
    </div>
  );
}

export default function PositionNotesEditor({ eventId }) {
  const { data: positions = [], isLoading } = useQuery({
    queryKey: ["positions", eventId],
    queryFn: () => base44.entities.Position.filter({ event_id: eventId }, "order"),
  });

  const { data: positionTypes = [] } = useQuery({
    queryKey: ["positionTypes"],
    queryFn: () => base44.entities.PositionType.list(),
    select: (d) => [...d].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    refetchInterval: LIVE_SYNC_INTERVAL,
  });

  if (isLoading) {
    return (
      <div>
        <SectionHeader
          icon={FileText}
          title="ポジション説明"
          subtitle="各ポジションの説明テキストを入力してください。スタッフポータルで担当スタッフに表示されます。"
        />
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (positions.length === 0) {
    return (
      <div>
        <SectionHeader
          icon={FileText}
          title="ポジション説明"
          subtitle="各ポジションの説明テキストを入力してください。スタッフポータルで担当スタッフに表示されます。"
        />
        <div className="text-center py-12">
          <FileText className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">ポジションがまだ登録されていません</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        icon={FileText}
        title="ポジション説明"
        subtitle="各ポジションの説明テキストを入力してください。スタッフポータルで担当スタッフに表示されます。"
      />
      {/* PositionType-level overrides */}
      {positionTypes.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <FileText className="w-3.5 h-3.5 text-primary" />
            ポジション属性ごとの説明・資料（イベント上書き）
          </div>
          <p className="text-[11px] text-muted-foreground -mt-1">
            基本設定（PositionType）を引き継ぎつつ、このイベント固有の内容で上書きできます。
          </p>
          {positionTypes.map((pt) => (
            <PositionTypeOverrideSection key={pt.id} eventId={eventId} positionType={pt} />
          ))}
        </div>
      )}

      {/* Position-level notes */}
      <div className="pt-2 border-t border-border">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground mb-2">
          <FileText className="w-3.5 h-3.5 text-muted-foreground" />
          ポジション個別メモ
        </div>
        {SLOT_ORDER.map((slot) => {
          const slotPositions = positions.filter((p) => p.time_slot === slot);
          if (slotPositions.length === 0) return null;
          return (
            <div key={slot} className="bg-card border border-border rounded-xl overflow-hidden">
              <div className={`px-3 py-2 text-xs font-semibold border-b ${SLOT_COLORS[slot]}`}>
                {slot}
              </div>
              <div className="px-3">
                {slotPositions.map((pos) => (
                  <PositionNoteRow key={pos.id} position={pos} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}