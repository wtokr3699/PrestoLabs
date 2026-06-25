"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  User,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db, googleProvider } from "@/lib/firebase";
import { UserProfile, UserRole } from "@/types";

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  // 로그인 후 실행할 지연 액션 (프로필 완성 게이트 패턴)
  deferredAction: (() => void) | null;
  setDeferredAction: (fn: (() => void) | null) => void;
  signInEmail: (email: string, password: string) => Promise<void>;
  signUpEmail: (email: string, password: string, name: string, role: UserRole) => Promise<void>;
  signInGoogle: () => Promise<{ isNew: boolean; uid: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [deferredAction, setDeferredAction] = useState<(() => void) | null>(null);

  // 레이스 컨디션 방지: 가장 최근 fetchProfile 호출만 state를 업데이트함
  const profileVersion = useRef(0);
  // 회원가입 진행 중 플래그: onAuthStateChanged가 loading=false를 설정하지 않도록 방지
  const isSigningUp = useRef(false);

  const fetchProfile = useCallback(async (uid: string) => {
    profileVersion.current += 1;
    const myVersion = profileVersion.current;
    const snap = await getDoc(doc(db, "users", uid));
    // 더 최신 fetchProfile 호출이 있으면 무시 (stale result 방지)
    if (myVersion < profileVersion.current) return;
    if (snap.exists()) {
      setProfile({ uid, ...snap.data() } as UserProfile);
    } else {
      setProfile(null);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.uid);
  }, [user, fetchProfile]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        await fetchProfile(u.uid);
      } else {
        setProfile(null);
      }
      // 회원가입 중에는 loading 상태를 직접 관리
      if (!isSigningUp.current) {
        setLoading(false);
      }
    });
    return unsub;
  }, [fetchProfile]);

  async function signInEmail(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function signUpEmail(email: string, password: string, name: string, role: UserRole) {
    // 플래그 설정: onAuthStateChanged가 loading=false를 건드리지 않음
    isSigningUp.current = true;
    try {
      const { user: newUser } = await createUserWithEmailAndPassword(auth, email, password);
      const idToken = await newUser.getIdToken();
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, role, idToken }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        // 등록 실패 시 고아 Auth 계정 정리 (프로필 없이 로그인만 되는 반쪽 상태 방지)
        await newUser.delete().catch(() => {});
        throw new Error(err.error ?? "회원 등록에 실패했습니다.");
      }
      // version counter 덕분에 이 fetchProfile 결과가 onAuthStateChanged의 결과보다 우선
      await fetchProfile(newUser.uid);
    } finally {
      isSigningUp.current = false;
      setLoading(false);
    }
  }

  async function signInGoogle(): Promise<{ isNew: boolean; uid: string }> {
    const result = await signInWithPopup(auth, googleProvider);
    const u = result.user;
    const idToken = await u.getIdToken();

    // 기존 계정인지 확인
    const snap = await getDoc(doc(db, "users", u.uid));
    if (snap.exists()) {
      await fetchProfile(u.uid);
      return { isNew: false, uid: u.uid };
    } else {
      // 신규 소셜 로그인 → 역할 선택 필요
      const registerRes = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: u.displayName ?? "사용자",
          role: null, // 역할 미정 - /profile/complete에서 선택
          idToken,
        }),
      });
      if (!registerRes.ok) {
        const err = await registerRes.json().catch(() => ({}));
        // 등록 실패 시 고아 Auth 계정 정리
        await u.delete().catch(() => {});
        throw new Error(err.error ?? "회원 등록에 실패했습니다.");
      }
      await fetchProfile(u.uid);
      return { isNew: true, uid: u.uid };
    }
  }

  async function signOut() {
    await firebaseSignOut(auth);
    setProfile(null);
    setDeferredAction(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        deferredAction,
        setDeferredAction,
        signInEmail,
        signUpEmail,
        signInGoogle,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
