import { Info, Scale, ShieldCheck, MailQuestion, BookOpen } from "lucide-react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { APP_NAME, APP_VERSION, APP_RELEASE_LABEL, OPEN_SOURCE_LICENSES } from "@/lib/appInfo";

const LICENSE_ORDER = ["MIT", "Apache-2.0", "ISC", "BSD-3-Clause", "その他"];

const TERMS_ITEMS = [
  "本アプリはイベント運営スタッフおよび運営関係者向けのツールです。関係者以外の利用はできません。",
  "アカウント（メールアドレス・パスワード）は本人が責任を持って管理してください。他人への貸与・共有は禁止します。",
  "他のスタッフの個人情報や配置情報を、運営目的以外で利用・転載することを禁止します。",
  "不正アクセス、データの改ざん、システムに負荷をかける行為を禁止します。",
  "保守・障害対応のため、管理者がデータのバックアップ・復元を行う場合があります。",
  "本規約は予告なく改定される場合があります。",
];

const PRIVACY_ITEMS = [
  "本アプリでは、イベント運営に必要な範囲で「氏名・メールアドレス・A-CAST ID・性別・配置情報」を保存します。",
  "保存した情報は、スタッフ配置の管理と当日運営（ポータルでの配置確認・QRチェックイン）にのみ使用します。",
  "保存した情報をイベント運営以外の目的で第三者に提供することはありません。",
  "性別情報は、同一A-CAST IDの過去データから自動反映されます（表示の色分けに使用）。",
  "イベント終了後、データは管理者がバックアップのうえ適切に管理・削除します。",
];

const CONTACT_ITEMS = [
  "ご不明点や不具合については、所属イベントの統括チーフまたは管理者までお問い合わせください。",
  "当日の緊急連絡は、スタッフポータルに表示される緊急連絡先をご利用ください。",
];

function OssLicenseSection() {
  const groups = LICENSE_ORDER.map((license) => ({
    license,
    packages: OPEN_SOURCE_LICENSES.filter((p) => p.license === license),
  })).filter((g) => g.packages.length > 0);

  return (
    <div className="rounded-2xl border border-border bg-card px-4 shadow-md">
      <div className="flex items-center gap-2 py-3">
        <BookOpen className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-bold">オープンソースライセンス</h2>
      </div>
      <p className="pb-2 text-xs leading-relaxed text-muted-foreground">
        本アプリは以下のオープンソースソフトウェアを使用しています。各ライブラリの著作権はそれぞれの開発者に帰属します。
      </p>
      <Accordion type="multiple" className="divide-y divide-border border-t border-border">
        {groups.map((group) => (
          <AccordionItem key={group.license} value={group.license} className="border-b-0">
            <AccordionTrigger className="py-2.5 text-xs font-bold text-foreground hover:no-underline">
              <span className="flex items-center gap-2">
                {group.license === "その他" ? "その他" : `${group.license}ライセンス`}
                <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                  {group.packages.length}件
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <ul className="grid grid-cols-2 gap-x-3 gap-y-1">
                {group.packages.map((pkg) => (
                  <li key={pkg.name} className="min-w-0">
                    <p className="truncate text-xs font-medium text-foreground">{pkg.name}</p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {pkg.version}
                      {pkg.note ? `（${pkg.note}）` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

export default function Information() {
  return (
    <div className="mx-auto max-w-2xl space-y-3 px-2 py-3">
      {/* アプリ情報・バージョン */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-md">
        <div className="mb-3 flex items-center gap-2">
          <Info className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold">アプリ情報</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-lg font-bold text-primary">
            C
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold">{APP_NAME}</p>
              <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                v{APP_VERSION}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              コンサート運営スタッフ配置管理ツール（リリース: {APP_RELEASE_LABEL}）
            </p>
          </div>
        </div>
      </div>

      {/* オープンソースライセンス */}
      <OssLicenseSection />

      {/* 利用規約 */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-md">
        <div className="mb-2.5 flex items-center gap-2">
          <Scale className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold">利用規約</h2>
        </div>
        <ul className="space-y-1.5">
          {TERMS_ITEMS.map((item) => (
            <li key={item} className="flex gap-2 text-xs leading-relaxed text-muted-foreground">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/50" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* プライバシーポリシー */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-md">
        <div className="mb-2.5 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold">プライバシーポリシー</h2>
        </div>
        <ul className="space-y-1.5">
          {PRIVACY_ITEMS.map((item) => (
            <li key={item} className="flex gap-2 text-xs leading-relaxed text-muted-foreground">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/50" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* お問い合わせ */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-md">
        <div className="mb-2.5 flex items-center gap-2">
          <MailQuestion className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold">お問い合わせ</h2>
        </div>
        <ul className="space-y-1.5">
          {CONTACT_ITEMS.map((item) => (
            <li key={item} className="flex gap-2 text-xs leading-relaxed text-muted-foreground">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/50" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}