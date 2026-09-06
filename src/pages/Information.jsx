import { Info, BookOpen } from "lucide-react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { APP_NAME, APP_VERSION, APP_RELEASE_LABEL, OPEN_SOURCE_LICENSES } from "@/lib/appInfo";

const LICENSE_ORDER = ["MIT", "Apache-2.0", "ISC", "BSD-3-Clause", "その他"];

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
    </div>
  );
}