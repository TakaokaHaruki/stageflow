import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { getDeviceInfo, setDeviceToken, getDeviceToken } from "@/lib/deviceRequest";
import { unwrapFunctionResponse } from "@/lib/base44Response";
import { CheckCircle2, XCircle, ShieldCheck, LogOut } from "lucide-react";

export default function DeviceActivate() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const navigate = useNavigate();
  const [status, setStatus] = useState("checking"); // checking | success | error | already
  const [message, setMessage] = useState("");
  const [deviceLabel, setDeviceLabel] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("認証トークンがありません。管理者から共有されたURLを開いてください。");
      return;
    }

    // 既にこの端末で同じトークンが有効化済みか確認
    const existing = getDeviceToken();
    if (existing === token) {
      setStatus("already");
      return;
    }

    (async () => {
      try {
        const user = await base44.auth.me().catch(() => null);
        if (!user) {
          // 未ログインの場合はログイン後に戻ってくるようリダイレクト
          const returnTo = `/devices/activate?token=${encodeURIComponent(token)}`;
          base44.auth.redirectToLogin(returnTo);
          return;
        }
        const info = getDeviceInfo();
        const rawRes = await base44.functions.invoke("activateDevice", {
          device_token: token,
          device_info: `${info.browser} / ${info.os}`,
        });
        const res = unwrapFunctionResponse(rawRes);
        if (res?.ok) {
          setDeviceToken(res.device_token || token);
          setDeviceLabel(res.label || "");
          setStatus("success");
        } else {
          setStatus("error");
          setMessage(res?.error || "認証に失敗しました。トークンが無効か期限切れの可能性があります。");
        }
      } catch (e) {
        setStatus("error");
        setMessage("認証中にエラーが発生しました。");
      }
    })();
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md space-y-4 rounded-xl border border-border bg-card p-8 shadow-elevated">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <ShieldCheck className="h-8 w-8 text-primary" />
          </div>
        </div>

        {status === "checking" && (
          <>
            <h1 className="text-center text-lg font-bold">端末認証中...</h1>
            <p className="text-center text-sm text-muted-foreground">しばらくお待ちください</p>
            <div className="flex justify-center">
              <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          </>
        )}

        {status === "success" && (
          <>
            <div className="flex justify-center">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
            </div>
            <h1 className="text-center text-lg font-bold">認証完了</h1>
            <p className="text-center text-sm text-muted-foreground">
              この端末を貸与端末として登録しました{deviceLabel ? `（${deviceLabel}）` : ""}。
              <br />制限対象機能が利用可能になりました。
            </p>
            <button
              onClick={() => navigate("/home")}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              ホームへ
            </button>
          </>
        )}

        {status === "already" && (
          <>
            <div className="flex justify-center">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
            </div>
            <h1 className="text-center text-lg font-bold">認証済みの端末です</h1>
            <p className="text-center text-sm text-muted-foreground">
              この端末は既に貸与端末として登録されています。
            </p>
            <button
              onClick={() => navigate("/home")}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              ホームへ
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <div className="flex justify-center">
              <XCircle className="h-12 w-12 text-destructive" />
            </div>
            <h1 className="text-center text-lg font-bold">認証失敗</h1>
            <p className="text-center text-sm text-muted-foreground">{message}</p>
            <p className="text-center text-xs text-muted-foreground">
              管理者にURLの再発行をご依頼ください。
            </p>
            <button
              onClick={() => navigate("/")}
              className="w-full rounded-lg border border-border px-4 py-2.5 text-sm font-semibold"
            >
              トップへ戻る
            </button>
          </>
        )}
      </div>

      {status === "already" && (
        <button
          onClick={() => {
            setDeviceToken("");
            base44.auth.logout();
          }}
          className="fixed bottom-4 right-4 flex items-center gap-1 rounded-lg bg-card border border-border px-3 py-2 text-xs text-muted-foreground"
        >
          <LogOut className="w-3.5 h-3.5" /> この端末の登録を解除
        </button>
      )}
    </div>
  );
}