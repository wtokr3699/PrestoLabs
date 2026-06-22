"use client";

import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Notification, NOTIFICATION_MESSAGES } from "@/types";
import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function NotificationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!user) { router.push("/"); return; }

    const q = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid)
    );

    return onSnapshot(q, (snap) => {
      const sorted = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as Notification)
        .sort((a, b) => {
          const ta = (a.createdAt as unknown as { seconds?: number })?.seconds ?? 0;
          const tb = (b.createdAt as unknown as { seconds?: number })?.seconds ?? 0;
          return tb - ta;
        });
      setNotifications(sorted);
    });
  }, [user]);

  async function markAllRead() {
    if (!user) return;
    const token = await user.getIdToken();
    await axios.patch("/api/notifications/read-all", {}, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async function markRead(id: string) {
    if (!user) return;
    const token = await user.getIdToken();
    await axios.patch(`/api/notifications/${id}/read`, {}, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">알림 센터</h1>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="text-sm text-[#7c3aed] hover:underline">
            모두 읽음 ({unreadCount})
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-20 text-gray-400">알림이 없습니다.</div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`rounded-xl border p-4 cursor-pointer transition ${
                !n.read ? "bg-purple-50 border-purple-200" : "bg-white border-gray-200"
              }`}
              onClick={() => {
                if (!n.read) markRead(n.id);
                router.push(`/projects/${n.projectId}`);
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <span className={`text-sm ${!n.read ? "font-medium text-gray-900" : "text-gray-600"}`}>
                    {NOTIFICATION_MESSAGES[n.type]}
                  </span>
                  <p className="text-xs text-gray-400 mt-1">
                    {(n.createdAt as unknown as { toDate?: () => Date })?.toDate?.()?.toLocaleDateString("ko-KR", {
                      year: "numeric", month: "long", day: "numeric",
                    })}
                  </p>
                </div>
                {!n.read && <div className="w-2 h-2 rounded-full bg-[#7c3aed] mt-1.5 shrink-0" />}
              </div>
              <Link href={`/projects/${n.projectId}`} className="text-xs text-[#7c3aed] mt-2 inline-block hover:underline">
                프로젝트 보기 →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
