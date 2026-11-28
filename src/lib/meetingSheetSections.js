// ミーティング用紙の入力項目定義（編集画面とPDF出力で共用）
// timeFields: ヘッダー直下のタイムスケジュール（短い1行入力）
// sections: 本文の各項目（複数行テキスト・リッチテキスト対応）

export const TIME_FIELDS = [
  { key: "time_priority", label: "先行販売", placeholder: "例: 15:00-15:45" },
  { key: "time_open", label: "開場時間", placeholder: "例: 16:00-" },
  { key: "time_start", label: "開演時間", placeholder: "例: 17:00-" },
  { key: "time_end", label: "終演時間", placeholder: "例: 19:15" },
];

export const TIME_NOTE_FIELD = { key: "time_note", label: "タイムスケジュール備考" };

export const MEETING_SECTIONS = [
  { key: "ticket", label: "チケット関係" },
  { key: "reception", label: "関係者受付" },
  { key: "goods", label: "グッズ販売" },
  { key: "cd_sale", label: "CD販売" },
  { key: "fanclub", label: "ファンクラブ施策" },
  { key: "reentry", label: "再入場" },
  { key: "audience_rules", label: "客席内でのルール" },
  { key: "after_show", label: "終演後について" },
  { key: "gifts", label: "プレゼント関係" },
  { key: "lost_items", label: "落とし物対応" },
  { key: "luggage", label: "お客様の荷物対応" },
  { key: "seating_guide", label: "客席案内" },
  { key: "facilities", label: "各階の設備" },
  { key: "work_notes", label: "稼働にあたっての注意事項" },
  { key: "emergency", label: "緊急時の対応" },
];

export const ALL_FIELD_KEYS = [
  ...TIME_FIELDS.map((f) => f.key),
  TIME_NOTE_FIELD.key,
  ...MEETING_SECTIONS.map((s) => s.key),
];

// 新規セクションIDを生成
let sectionSeq = 0;
export function newSectionId() {
  sectionSeq += 1;
  return `sec_${Date.now().toString(36)}_${sectionSeq}`;
}

// 従来の固定項目からセクション配列へ変換（互換用）
export function legacyToSections(sheet) {
  return MEETING_SECTIONS.map((s) => ({
    id: s.key,
    label: s.label,
    content: (sheet && sheet[s.key]) || "",
  }));
}

// 用紙から描画・編集用のセクション配列を解決
// sheet.sections が存在すればそれを、なければ従来の固定項目から生成
export function resolveSections(sheet) {
  if (sheet?.sections && Array.isArray(sheet.sections) && sheet.sections.length > 0) {
    return sheet.sections.map((s, i) => ({
      id: s.id || `sec_${i}`,
      label: s.label || "",
      content: s.content || "",
    }));
  }
  return legacyToSections(sheet);
}

// テンプレートから用紙へ適用するためのセクション配列（新ID付与・深コピー）
export function templateToSections(template) {
  if (!template?.sections) return [];
  return template.sections.map((s) => ({
    id: newSectionId(),
    label: s.label || "",
    content: s.content || "",
  }));
}