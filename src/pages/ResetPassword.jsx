import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { KeyRound, Eye, EyeOff, ArrowLeft } from "lucide-react";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const token = new URLSearchParams(window.location.search).get("token");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("パスワードが一致しません。");
      return;
    }
    if (password.length < 8) {
      setError("パスワードは8文字以上で入力してください。");
      return;
    }
    setIsLoading(true);
    try {
      await base44.auth.resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(err.message || "パスワードの再設定に失敗しました。リンクの有効期限が切れている可能性があります。");
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
          <KeyRound className="w-7 h-7 text-primary" />
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-1 tracking-tight">パスワード再設定</h1>
        <p className="text-sm text-muted-foreground mb-8">新しいパスワードを入力してください。</p>

        {done ? (
          <div className="w-full">
            <div className="bg-primary/10 rounded-lg p-4 text-center mb-5">
              <p className="text-sm font-medium text-primary mb-1">パスワードを変更しました</p>
              <p className="text-xs text-muted-foreground">新しいパスワードでログインしてください。</p>
            </div>
            <Link to="/login">
              <Button className="w-full h-11 text-sm font-semibold">ログインページへ</Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
            <div className="text-left">
              <Label htmlFor="password" className="text-sm font-medium mb-1.5 block">新しいパスワード</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="8文字以上のパスワード"
                  required
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="text-left">
              <Label htmlFor="confirmPassword" className="text-sm font-medium mb-1.5 block">パスワード（確認）</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="もう一度入力してください"
                required
                className="h-11"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2 text-left">{error}</p>
            )}

            <Button type="submit" disabled={isLoading} className="h-11 text-sm font-semibold gap-2 mt-1">
              <KeyRound className="w-4 h-4" />
              {isLoading ? "変更中..." : "パスワードを変更する"}
            </Button>
          </form>
        )}

        {!done && (
          <Link to="/login" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mt-5 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            ログインページへ戻る
          </Link>
        )}
      </motion.div>
    </div>
  );
}