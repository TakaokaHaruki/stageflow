import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { LogIn, Eye, EyeOff, ArrowLeft } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await base44.auth.login(email, password);
      window.location.href = "/events";
    } catch (err) {
      setError(err.message || "ログインに失敗しました。メールアドレスまたはパスワードをご確認ください。");
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
          <span className="text-2xl font-black text-primary tracking-tighter">AC</span>
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-1 tracking-tight">ログイン</h1>
        <p className="text-sm text-muted-foreground mb-8">ACコンサート管理システム</p>

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

          <div className="text-left">
            <Label htmlFor="password" className="text-sm font-medium mb-1.5 block">パスワード</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="パスワードを入力"
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

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2 text-left">{error}</p>
          )}

          <Button type="submit" disabled={isLoading} className="h-11 text-sm font-semibold gap-2 mt-1">
            <LogIn className="w-4 h-4" />
            {isLoading ? "ログイン中..." : "ログイン"}
          </Button>
        </form>

        <div className="flex flex-col gap-2 mt-5 text-sm">
          <Link to="/forgot-password" className="text-primary hover:underline">
            パスワードをお忘れの方
          </Link>
          <span className="text-muted-foreground">
            アカウントをお持ちでない方は{" "}
            <Link to="/register" className="text-primary hover:underline">新規登録</Link>
          </span>
        </div>

        <Link to="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mt-5 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          トップへ戻る
        </Link>
      </motion.div>
    </div>
  );
}