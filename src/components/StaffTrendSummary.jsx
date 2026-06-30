import { useMemo } from "react";
import { TrendingUp, Activity } from "lucide-react";
import { useStaffTrends, SLOT_ORDER } from "@/hooks/useStaffTrends";
import { TIME_SLOT_STYLES } from "@/lib/constants";

function getMostFrequent(slotCounts) {
  if (!slotCounts) return null;
  let maxName = null;
  let maxCount = 0;
  Object.entries(slotCounts).forEach(([posName, count]) => {
    if (count > maxCount || (count === maxCount && posName < maxName)) {
      maxName = posName;
      maxCount = count;
    }
  });
  return maxName ? { name: maxName, count: maxCount } : null;
}

/**
 * スタッフ編集モーダル内に表示する、直近イベントの配置傾向サマリー。
 * staffName に該当する tally から、各時間帯の最頻ポジション・合計件数・分析コメントを表示する。
 */
export default function StaffTrendSummary({ staffName }) {
  const { tally, recentEvents } = useStaffTrends();

  const data = useMemo(() => {
    const slots = tally[staffName];
    if (!slots) return null;

    const slotFreqs = {};
    let total = 0;
    SLOT_ORDER.forEach((slot) => {
      const freq = getMostFrequent(slots[slot]);
      const slotTotal = slots[slot] ? Object.values(slots[slot]).reduce((s, c) => s + c, 0) : 0;
      slotFreqs[slot] = { freq, slotTotal };
      total += slotTotal;
    });

    // 全体の最頻ポジション
    const allCounts = {};
    SLOT_ORDER.forEach((slot) => {
      const sc = slots[slot];
      if (!sc) return;
      Object.entries(sc).forEach(([posName, count]) => {
        allCounts[posName] = (allCounts[posName] || 0) + count;
      });
    });
    const topPositions = Object.entries(allCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    // 分析コメント: 最多配置ポジションに焦点を当てる
    let analysis = "";
    if (total === 0) {
      analysis = "過去の配置データがありません";
    } else {
      const [topName, topCount] = topPositions[0];
      const ratio = Math.round((topCount / total) * 100);
      if (ratio >= 60) {
        analysis = `最多配置は「${topName}」(${topCount}回/配比率${ratio}%)で、このポジションに強く偏っています。`;
      } else if (ratio >= 40) {
        analysis = `最多配置は「${topName}」(${topCount}回/配比率${ratio}%)です。他ポジションへの柔軟性も兼ね備えています。`;
      } else {
        analysis = `最多配置は「${topName}」(${topCount}回/配比率${ratio}%)で、複数ポジションを幅広く担当しています。`;
      }
    }

    return { slotFreqs, total, topPositions, analysis };
  }, [tally, staffName]);

  if (!data) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-3 text-center">
        <Activity className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
        <p className="text-xs text-muted-foreground">過去の配置データがありません</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3">
      <div className="flex items-center gap-1.5 mb-2">
        <TrendingUp className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs font-bold">過去の配置傾向</span>
        <span className="text-[10px] text-muted-foreground ml-auto">直近{recentEvents.length}イベント</span>
      </div>

      {/* スロット別最頻ポジション */}
      <div className="grid grid-cols-3 gap-1.5 mb-2">
        {SLOT_ORDER.map((slot) => {
          const { freq, slotTotal } = data.slotFreqs[slot];
          const style = TIME_SLOT_STYLES[slot] || {};
          return (
            <div key={slot} className={`rounded-md border border-border p-1.5 ${style.badge ? "" : ""}`}>
              <div className={`text-[10px] font-semibold mb-0.5 ${style.header || ""} inline-block px-1 rounded`}>{slot}</div>
              {freq ? (
                <div className="text-[11px] font-medium leading-tight truncate" title={freq.name}>{freq.name}</div>
              ) : (
                <div className="text-[10px] text-muted-foreground/50">—</div>
              )}
              <div className="text-[9px] text-muted-foreground mt-0.5">{slotTotal}件</div>
            </div>
          );
        })}
      </div>

      {/* よく配置されるポジション */}
      {data.topPositions.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap mb-1.5">
          <span className="text-[10px] text-muted-foreground shrink-0">よく配置:</span>
          {data.topPositions.map(([name, count], i) => (
            <span key={name} className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30 font-medium">
              {name}({count})
            </span>
          ))}
        </div>
      )}

      {/* 合計件数 */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-[10px] text-muted-foreground">合計配置:</span>
        <span className="text-xs font-bold tabular-nums">{data.total}件</span>
      </div>

      {/* 分析コメント */}
      <p className="text-[11px] text-muted-foreground leading-relaxed border-t border-border pt-1.5">{data.analysis}</p>
    </div>
  );
}