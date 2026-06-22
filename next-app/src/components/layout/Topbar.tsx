"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useState, useRef, useEffect } from "react";
import { AuthModal } from "@/components/auth/AuthModal";

export function Topbar() {
  const { user, profile, signOut } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 메뉴 닫기
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 h-16">
      <div className="max-w-6xl mx-auto px-4 h-full flex items-center justify-between">
        <Link href="/" className="font-bold text-xl text-[#7c3aed]">
          PrestoLabs
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm text-gray-600">
          <Link href="/projects" className="hover:text-gray-900">프로젝트</Link>
          <Link href="/experts" className="hover:text-gray-900">전문가</Link>
        </nav>

        <div className="flex items-center gap-3">
          {user && profile ? (
            <>
              <NotificationBell />
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex items-center gap-2 text-sm"
                >
                  <span className="w-8 h-8 rounded-full bg-[#7c3aed] text-white flex items-center justify-center font-medium">
                    {profile.name?.[0] ?? "U"}
                  </span>
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-10 w-48 bg-white border border-gray-200 rounded-xl shadow-lg py-2 z-50">
                    <Link href="/profile" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-sm hover:bg-gray-50">
                      내 프로필
                    </Link>
                    {profile.role === "client" && (
                      <Link href="/my-projects" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-sm hover:bg-gray-50">
                        내 프로젝트
                      </Link>
                    )}
                    {profile.role === "freelancer" && (
                      <>
                        <Link href="/my-applications" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-sm hover:bg-gray-50">
                          내 지원 현황
                        </Link>
                        <Link href="/bookmarks" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-sm hover:bg-gray-50">
                          북마크
                        </Link>
                      </>
                    )}
                    {profile.role === "admin" && (
                      <Link href="/admin" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-sm hover:bg-gray-50">
                        관리자
                      </Link>
                    )}
                    <hr className="my-1" />
                    <button
                      onClick={() => { signOut(); setMenuOpen(false); }}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
                    >
                      로그아웃
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <button
              onClick={() => setShowAuth(true)}
              className="px-4 py-2 rounded-lg bg-[#7c3aed] text-white text-sm font-medium hover:bg-purple-700 transition"
            >
              로그인 / 회원가입
            </button>
          )}
        </div>
      </div>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </header>
  );
}
