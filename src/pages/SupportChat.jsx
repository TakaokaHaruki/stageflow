import { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { CircleAlert, RefreshCw, SendHorizonal } from "lucide-react";
import { Button } from "@/components/ui/button";
import MessageBubble from "@/components/support/MessageBubble";

const AGENT_NAME = "support_chat";

const SUGGESTIONS = [
  "次回イベントの配置状況を教えて",
  "未配置のスタッフを確認したい",
  "スタッフ数が足りないポジションはある？",
];

export default function SupportChat() {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loadError, setLoadError] = useState(false);
  const [sendError, setSendError] = useState(false);
  const [loading, setLoading] = useState(true);
  const endRef = useRef(null);

  const initConversation = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const list = await base44.agents.listConversations({ agent_name: AGENT_NAME });
      const conv =
        list?.[0] ??
        (await base44.agents.createConversation({
          agent_name: AGENT_NAME,
          metadata: { name: "運営サポート相談", description: "配置や運営についての相談" },
        }));
      setConversation(conv);
      setMessages(conv.messages ?? []);
      base44.agents.subscribeToConversation(conv.id, (data) => {
        setMessages(data.messages ?? []);
        setSendError(false);
      });
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initConversation();
    return () => {};
  }, []);

  // 新着メッセージ時に最下部へスクロール
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const waitingForReply =
    !sendError && messages.length > 0 && messages[messages.length - 1].role === "user";

  const handleSend = async (text) => {
    const content = (text ?? input).trim();
    if (!content || !conversation || waitingForReply) return;
    setInput("");
    setSendError(false);
    setMessages((prev) => [...prev, { role: "user", content }]);
    try {
      await base44.agents.addMessage(conversation, { role: "user", content });
    } catch {
      setSendError(true);
    }
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col px-2 py-3">
      <div className="mb-2 rounded-2xl border border-border bg-card p-3 shadow-md">
        <h2 className="text-sm font-bold">運営サポート相談</h2>
        <p className="text-[11px] leading-snug text-muted-foreground">
          配置や運営についてご相談ください。イベント・ポジション・スタッフのデータを参照して回答します。
        </p>
      </div>

      {loadError ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-6 text-center shadow-md">
          <CircleAlert className="h-8 w-8 text-destructive" />
          <p className="text-sm font-semibold">チャットを開けませんでした</p>
          <p className="text-xs text-muted-foreground">エージェントが利用できないか、通信に問題があります。</p>
          <Button variant="outline" size="sm" onClick={initConversation}>
            <RefreshCw className="h-3 w-3" />再試行
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {loading && messages.length === 0 ? (
            <div className="h-40 animate-pulse rounded-2xl bg-muted" aria-label="読み込み中" />
          ) : messages.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-4 text-center">
              <p className="text-xs text-muted-foreground">以下からも相談を始められます</p>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleSend(s)}
                    className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-foreground transition-colors hover:border-primary/50 hover:bg-primary/5"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message, idx) => <MessageBubble key={idx} message={message} />)
          )}

          {waitingForReply && (
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <span className="flex gap-0.5">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:0ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:300ms]" />
                </span>
              </span>
              <span className="rounded-2xl rounded-bl-md border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
                回答を準備しています…
              </span>
            </div>
          )}
          <div ref={endRef} />
        </div>
      )}

      {sendError && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-destructive">
          <CircleAlert className="h-3.5 w-3.5" />送信できませんでした。もう一度お試しください。
        </p>
      )}

      {/* 入力欄（モバイルは下部ナビの上に固定） */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="sticky bottom-16 z-10 mt-3 sm:bottom-2"
      >
        <div className="flex items-end gap-1.5 rounded-2xl border border-border bg-card p-1.5 shadow-md">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            rows={1}
            placeholder="配置や運営についてご質問ください"
            className="max-h-28 min-h-9 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <Button
            type="submit"
            size="icon"
            className="h-9 w-9 shrink-0"
            disabled={!input.trim() || waitingForReply || !conversation}
            aria-label="送信"
          >
            <SendHorizonal className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}