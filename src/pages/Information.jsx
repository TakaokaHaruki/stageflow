import { BookOpen } from "lucide-react";
import AppNav from "@/components/AppNav";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

const SECTIONS = [
  {
    title: "基本の運営フロー",
    items: [
      "① イベント一覧からイベントを作成します（既存イベントのコピー作成も可能です）",
      "② イベント詳細でスタッフを取り込み・登録します（点呼表からの取り込みやCSV読み込みに対応）",
      "③ 配置表でポジションを作成し、スタッフをドラッグ&ドロップで配置します",
      "④ 会場マップでポジションの位置をピン留めし、会場レイアウトを再現します",
      "⑤ チェックリスト・お知らせ・配布資料・緊急連絡先などを整えます",
      "⑥ 公開設定をONにすると、スタッフがポータル（A-CAST ID認証）で自分の配置を確認できます",
    ],
  },
  {
    title: "イベント管理",
    items: [
      "イベント一覧の「新規イベント」から作成できます。日付・会場・各種時刻（開場・開演・終演）を設定します",
      "カード右のボタンで編集・コピー（複製）・削除ができます",
      "公開/非公開の切り替えは各イベントカードの公開スイッチで行います",
      "イベント詳細内の「管理設定」タブでは、そのイベント固有の表示モードや機能のON/OFFを切り替えられます",
    ],
  },
  {
    title: "スタッフ管理",
    items: [
      "点呼表URLからの自動取り込み、CSV一括読み込み、手動追加に対応しています",
      "スキル（照明・音響など）や役割（インカム・チーフなど）をタグとして登録できます",
      "男性はブルー、女性はレッドで名前が色分け表示されます（性別は同一A-CAST IDの過去データから自動反映）",
      "「固定」をONにしたスタッフは自動配置の対象から除外されます",
    ],
  },
  {
    title: "配置表",
    items: [
      "スタッフをポジションカードへドラッグ&ドロップで配置できます",
      "「自動配置」でスキル・役割・推奨性別を考慮した配置案を一括適用できます",
      "複数公演モード（部制）では部ごとに配置を管理でき、「部間同期」で複数部へ同一配置を共有できます",
      "「全体一覧」モードで全ての部の人員過不足を一望できます",
      "PDF出力では部ごとにページを分けて印刷できます",
    ],
  },
  {
    title: "会場マップ・客席図",
    items: [
      "会場の画像やPDFを背景に設定し、ポジションをピンで配置できます",
      "エリア（ステージ・客席など）を図形で描画して共有できます",
      "客席図はSVG形式で管理画面から登録・編集できます",
    ],
  },
  {
    title: "チェックリスト・お知らせ・配布資料",
    items: [
      "チェックリストはタスク単位で追加し、ポータルでスタッフが確認・消化できます",
      "お知らせは全員または特定スタッフ宛てに送信でき、緊急アラートとしてバナー表示も可能です",
      "配布資料は公開範囲を「全体」「役割指定」「スタッフ名指定」で制御できます",
    ],
  },
  {
    title: "バックアップ・復元",
    items: [
      "管理設定の「バックアップ」から、イベント固有データ（配置・スタッフ・連絡先・お知らせ等）を保存できます",
      "毎日午前3時に自動バックアップが実行され、各イベントごとに最新20件まで保持されます",
      "復元前に現在のデータとの差分を比較してから実行できます",
    ],
  },
  {
    title: "スタッフポータル（当日運用）",
    items: [
      "スタッフはログイン不要でA-CAST ID（またはQRコード）でポータルにアクセスします",
      "自分の配置ポジション・時間帯・集合時刻が確認でき、ポジションのQRを読み取ることでその場に直接参加登録できます",
      "チーフ権限のあるスタッフは、他ポジションの配置確認やQRでのスタッフ追加ができます",
    ],
  },
];

export default function Information() {
  return (
    <AppNav activeTab="information" title="インフォメーション">
      <div className="mx-auto max-w-3xl space-y-3 px-2 py-3">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-md">
          <div className="mb-1 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold">Crewlyの使い方</h2>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Crewlyはコンサート運営のスタッフ配置を一元管理するツールです。イベント作成からスタッフ配置、当日のポータル公開までの流れと各機能の操作方法を説明します。
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card px-4 py-1 shadow-md">
          <Accordion type="multiple" className="divide-y divide-border">
            {SECTIONS.map((section, i) => (
              <AccordionItem key={section.title} value={`section-${i}`} className="border-b-0">
                <AccordionTrigger className="text-sm font-bold text-foreground hover:no-underline">
                  {section.title}
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-1.5">
                    {section.items.map((item) => (
                      <li key={item} className="flex gap-2 text-xs leading-relaxed text-muted-foreground">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/50" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </AppNav>
  );
}