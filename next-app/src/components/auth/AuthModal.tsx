"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toKoreanError } from "@/lib/errors";
import { UserRole } from "@/types";
import { FirebaseError } from "firebase/app";
import { useRouter } from "next/navigation";

interface Props {
  onClose: () => void;
}

type Tab = "login" | "signup";

export function AuthModal({ onClose }: Props) {
  const { signInEmail, signUpEmail, signInGoogle, deferredAction, setDeferredAction } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<UserRole>("client");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (tab === "login") {
        await signInEmail(email, password);
      } else {
        await signUpEmail(email, password, name, role);
      }
      onClose();
      if (deferredAction) {
        deferredAction();
        setDeferredAction(null);
      }
    } catch (err) {
      if (err instanceof FirebaseError) {
        setError(toKoreanError(err.code));
      } else {
        setError("오류가 발생했습니다. 다시 시도해주세요.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError("");
    setLoading(true);
    try {
      const { isNew } = await signInGoogle();
      onClose();
      if (isNew) {
        router.push("/profile/complete?from=social");
      } else if (deferredAction) {
        deferredAction();
        setDeferredAction(null);
      }
    } catch (err) {
      if (err instanceof FirebaseError) {
        setError(toKoreanError(err.code));
      } else {
        setError("Google 로그인에 실패했습니다.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl"
        >
          ✕
        </button>

        {/* 탭 */}
        <div className="flex rounded-lg bg-gray-100 p-1 mb-6">
          {(["login", "signup"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition ${
                tab === t ? "bg-white shadow text-gray-900" : "text-gray-500"
              }`}
            >
              {t === "login" ? "로그인" : "회원가입"}
            </button>
          ))}
        </div>

        {/* Google 로그인 */}
        <button
          onClick={handleGoogle}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-xl py-3 text-sm font-medium hover:bg-gray-50 transition mb-4"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Google로 계속하기
        </button>

        <div className="flex items-center gap-3 mb-4">
          <hr className="flex-1 border-gray-200" />
          <span className="text-xs text-gray-400">또는</span>
          <hr className="flex-1 border-gray-200" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {tab === "signup" && (
            <input
              type="text"
              placeholder="이름"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#7c3aed]"
            />
          )}
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#7c3aed]"
          />
          <input
            type="password"
            placeholder="비밀번호 (8자 이상)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#7c3aed]"
          />

          {tab === "signup" && (
            <div className="flex gap-3">
              {(["client", "freelancer"] as UserRole[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`flex-1 py-3 rounded-xl border text-sm font-medium transition ${
                    role === r
                      ? "border-[#7c3aed] bg-purple-50 text-[#7c3aed]"
                      : "border-gray-300 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {r === "client" ? "🏢 의뢰인" : "💻 프리랜서"}
                </button>
              ))}
            </div>
          )}

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-[#7c3aed] text-white font-medium text-sm hover:bg-purple-700 transition disabled:opacity-50"
          >
            {loading ? "처리 중..." : tab === "login" ? "로그인" : "가입하기"}
          </button>
        </form>
      </div>
    </div>
  );
}
