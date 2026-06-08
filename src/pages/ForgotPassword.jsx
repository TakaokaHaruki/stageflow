import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, ArrowLeft } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await base44.auth.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err.message || "送信に失敗しました。メールアドレスをご確認ください。");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <motion.div
        className="flex flex-col items-center text-center max-w-sm w-full"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
          <Mail className="w-7 h-7 text-primary" />
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-1 tracking-tight">パスワードをお忘れの方</h1>
        <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
          登録済みのメールアドレスを入力してください。<br />パスワードリセット用のリンクをお送りします。
        </p>

        {sent ? (
          <div className="w-full bg-primary/10 rounded-lg p-4 text-center">
            <p className="text-sm font-medium text-primary mb-1">メールを送信しました</p>
            <p className="text-xs text-muted-foreground">
              受信トレイをご確認いただき、リンクからパスワードの再設定を行ってください。
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
            <div className="text-left">
              <Label htmlFor="email" className="text-sm font-medium mb-1.5 block">メールアドレス</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                required
                className="h-11"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2 text-left">{error}</p>
            )}

            <Button type="submit" disabled={isLoading} className="h-11 text-sm font-semibold gap-2 mt-1">
              <Mail className="w-4 h-4" />
              {isLoading ? "送信中..." : "リセットメールを送信"}
            </Button>
          </form>
        )}

        <Link to="/login" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mt-5 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          ログインページへ戻る
        </Link>
      </motion.div>
    </div>
  );
}