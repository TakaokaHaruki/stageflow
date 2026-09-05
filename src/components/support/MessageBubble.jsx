import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Bot, CircleAlert, CircleCheck, Loader2, Wrench } from "lucide-react";

const TOOL_STATUS_LABEL = {
  pending: "準備中",
  running: "実行中",
  in_progress: "実行中",
  completed: "完了",
  success: "完了",
  failed: "失敗",
  error: "エラー",
};

function parseJsonSafe(value) {
  if (value == null) return null;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function ToolCallDisplay({ toolCall }) {
  const [expanded, setExpanded] = useState(false);
  const status = toolCall.status ?? "pending";
  const results = toolCall.results;
  const parsed = parseJsonSafe(results);
  const failed =
    ["failed", "error"].includes(status) ||
    /error|failed/i.test(String(results ?? "")) ||
    parsed?.success === false;
  const projection = toolCall.display_projection;
  const hideDetails = projection?.hide_details && projection?.details_redacted;
  const label = failed
    ? projection?.error_label ?? TOOL_STATUS_LABEL[status] ?? status
    : ["pending", "running", "in_progress"].includes(status)
      ? projection?.active_label ?? TOOL_STATUS_LABEL[status] ?? status
      : projection?.label ?? TOOL_STATUS_LABEL[status] ?? status;
  const args = parseJsonSafe(toolCall.arguments_string);

  return (
    <div className="mt-1.5 rounded-lg border border-border bg-background/60 text-xs">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-1.5 px-2 py-1.5 text-left text-muted-foreground"
      >
        {["pending", "running", "in_progress"].includes(status) ? (
          <Loader2 className="h-3 w-3 shrink-0 animate-spin text-primary" />
        ) : failed ? (
          <CircleAlert className="h-3 w-3 shrink-0 text-destructive" />
        ) : (
          <CircleCheck className="h-3 w-3 shrink-0 text-primary" />
        )}
        <Wrench className="h-3 w-3 shrink-0" />
        <span className="min-w-0 flex-1 truncate">
          {toolCall.name} <span className={failed ? "text-destructive" : ""}>{label}</span>
        </span>
      </button>
      {!hideDetails && expanded && (
        <div className="space-y-1 border-t border-border px-2 py-1.5 text-muted-foreground">
          {args && (
            <div>
              <span className="font-medium">パラメータ:</span>
              <pre className="mt-0.5 overflow-x-auto whitespace-pre-wrap break-all text-[10px] leading-relaxed">
                {JSON.stringify(args, null, 2)}
              </pre>
            </div>
          )}
          {results != null && (
            <div>
              <span className="font-medium">結果:</span>
              <pre className="mt-0.5 overflow-x-auto whitespace-pre-wrap break-all text-[10px] leading-relaxed">
                {JSON.stringify(parsed ?? results, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function MessageBubble({ message }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex items-start gap-2 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Bot className="h-3.5 w-3.5" />
        </span>
      )}
      <div className={`max-w-[85%] min-w-0 ${isUser ? "text-right" : "text-left"}`}>
        <div
          className={`inline-block max-w-full rounded-2xl px-3 py-2 text-left ${
            isUser
              ? "rounded-br-md bg-primary text-primary-foreground"
              : "rounded-bl-md border border-border bg-card text-card-foreground"
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.content}</p>
          ) : (
            <ReactMarkdown className="break-words text-sm leading-relaxed [&_li]:ml-4 [&_li]:list-disc [&_p+p]:mt-1.5">
              {message.content}
            </ReactMarkdown>
          )}
        </div>
        {message.tool_calls?.map((toolCall, idx) => (
          <ToolCallDisplay key={idx} toolCall={toolCall} />
        ))}
      </div>
    </div>
  );
}