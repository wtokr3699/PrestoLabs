"use client";

import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Notification, NOTIFICATION_MESSAGES } from "@/types";
import Link from "next/link";
import axios from "axios";

export function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(20)
    );

    const unsub = onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Notification));
    });

    return unsub;
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  async function markRead(id: string) {
    const token = await user?.getIdToken();
    await axios.patch(
      `/api/notifications/${id}/read`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
  }

  async function markAllRead() {
    const token = await user?.getIdToken();
    await axios.patch("/api/notifications/read-all", {}, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition"
      >
        <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-80 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <span className="font-semibold text-sm">알림</span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-[#7c3aed] hover:underline">
                모두 읽음
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-8">알림이 없습니다.</p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`px-4 py-3 border-b last:border-0 text-sm cursor-pointer hover:bg-gray-50 ${
                    !n.read ? "bg-purple-50" : ""
                  }`}
                  onClick={() => {
                    if (!n.read) markRead(n.id);
                    setOpen(false);
                  }}
                >
                  <Link href={`/projects/${n.projectId}`} className="block">
                    <span className={!n.read ? "font-medium" : "text-gray-600"}>
                      {NOTIFICATION_MESSAGES[n.type]}
                    </span>
                    <span className="block text-xs text-gray-400 mt-1">
                      {n.createdAt?.toDate?.()?.toLocaleDateString("ko-KR")}
                    </span>
                  </Link>
                </div>
              ))
            )}
          </div>
          <div className="px-4 py-2 border-t">
            <Link href="/notifications" className="text-xs text-[#7c3aed] hover:underline" onClick={() => setOpen(false)}>
              전체 알림 보기
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
