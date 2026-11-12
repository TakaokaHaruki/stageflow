import { secrets } from "base44:runtime";

// 定期実行（ワークフロー）からの呼び出しのみが知りうる内部トークン。
// シークレット管理（BACKUP_TRIGGER_TOKEN）から取得する。
// シークレット未設定時はフォールバック値を使用（ダッシュボードの Secrets ページで設定すると無効化されます）。
const FALLBACK_TOKEN = '7dda1d210825105cf2e12f2e3e76a427bf0ecb0b0ad03b249c376530a766e05f';
export const BACKUP_TRIGGER_TOKEN = secrets.get("BACKUP_TRIGGER_TOKEN") || FALLBACK_TOKEN;