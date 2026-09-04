import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import PendingApproval from "@/components/PendingApproval";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { LogIn, Eye, EyeOff } from "lucide-react";
import BackButton from "@/components/BackButton";
import CrewlyLogo from "@/components/CrewlyLogo";

export default function Login() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [pendingApproval, setPendingApproval] = useState(false);

  // Redirect already authenticated users to home page
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/home", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Show loading spinner while checking authentication
  if (isLoadingAuth) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // If already authenticated, don't show form (will redirect via useEffect)
  if (isAuthenticated) {
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await base44.auth.loginViaEmailPassword(email, password);
      const user = await base44.auth.me();
      if (!user || !user.role) {
        setPendingApproval(true);
      } else {
        window.location.href = "/home";
      }
    } catch (err) {
      setError(err.message || "ログインに失敗しました。メールアドレスまたはパスワードをご確認ください。");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await base44.auth.loginWithProvider("google", "/home");
    } catch (err) {
      setError(err.message || "Google ログインに失敗しました。");
    }
  };

  if (pendingApproval) return <PendingApproval />;

  return (
    <div className="h-screen bg-background flex flex-col items-center justify-center px-6">
      {/* Fixed top bar with logo */}
      <div className="fixed top-0 left-0 right-0 h-12 flex items-center px-2 gap-1 border-b border-border bg-background/80 backdrop-blur-md z-50 safe-area-top">
        <BackButton to="/" label="ポータルへ戻る" />
        <CrewlyLogo />
      </div>
      <motion.div
        className="flex flex-col items-center text-center max-w-sm w-full"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex flex-col items-center mb-5">
          <svg width="56" height="56" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="26" height="26" rx="7" fill="hsl(230 65% 45%)" />
            <path d="M 18.2 8.3 A 6.5 6.5 0 1 0 18.2 17.7" stroke="white" strokeWidth="2.2" strokeLinecap="round" fill="none" />
            <circle cx="18.2" cy="17.7" r="1.6" fill="hsl(195 80% 65%)" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-1 tracking-tight">ログイン</h1>
        <p className="text-sm text-muted-foreground mb-8">Crewly - コンサート運営システム</p>

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

        <div className="w-full my-4 flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">または</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="h-11 text-sm font-semibold gap-2 w-full"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Google でログイン
        </Button>

        <div className="flex flex-col gap-2 mt-5 text-sm">
          <Link to="/forgot-password" className="text-primary hover:underline">
            パスワードをお忘れの方
          </Link>
          <span className="text-muted-foreground">
            アカウントをお持ちでない方は{" "}
            <Link to="/register" className="text-primary hover:underline">新規登録</Link>
          </span>
        </div>

      </motion.div>
    </div>
  );
}