// 端末認証で制限可能な機能のレジストリ
// バックエンド (base44/shared/deviceAuth.ts) と同じ内容を保持する
export const RESTRICTABLE_FEATURES = [
  { key: "export_pdf", label: "配置表PDF出力", description: "配置表のPDF出力機能を端末限定にします" },
  { key: "backup", label: "バックアップ・復元", description: "バックアップ作成・復元機能を端末限定にします" },
  { key: "export_logs", label: "アクセスログ出力", description: "アクセスログのCSV出力を端末限定にします" },
  { key: "scrape", label: "外部データ取得", description: "スタッフ名・公演情報の取得を端末限定にします" },
];

export const CONFIG_KEY = "device_restricted_features";