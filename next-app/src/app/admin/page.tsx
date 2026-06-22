"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

type Stats = {
  totalUsers: number;
  clients: number;
  freelancers: number;
  totalProjects: number;
  openProjects: number;
  completedProjects: number;
  totalApplications: number;
  totalContracts: number;
  totalRevenue: number;
};

export default function AdminPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user || profile?.role !== "admin") { router.push("/"); return; }
  }, [user, profile, authLoading]);

  useEffect(() => {
    if (!user) return;
    fetchStats();
  }, [user]);

  async function fetchStats() {
    try {
      const [usersSnap, projectsSnap, appsSnap, contractsSnap, paymentsSnap] = await Promise.all([
        getDocs(collection(db, "users")),
        getDocs(collection(db, "projects")),
        getDocs(collection(db, "applications")),
        getDocs(collection(db, "contracts")),
        getDocs(query(collection(db, "payments"), where("status", "==", "released"))),
      ]);

      const users = usersSnap.docs.map((d) => d.data());
      const projects = projectsSnap.docs.map((d) => d.data()).filter((p) => !p.deletedAt);

      const totalRevenue = paymentsSnap.docs.reduce((sum, d) => sum + (d.data().fee ?? 0), 0);

      setStats({
        totalUsers: users.length,
        clients: users.filter((u) => u.role === "client").length,
        freelancers: users.filter((u) => u.role === "freelancer").length,
        totalProjects: projects.length,
        openProjects: projects.filter((p) => p.status === "open" || p.status === "in_review").length,
        completedProjects: projects.filter((p) => p.status === "completed").length,
        totalApplications: appsSnap.size,
        totalContracts: contractsSnap.size,
        totalRevenue,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (authLoading || loading) {
    return <div className="text-center py-20 text-gray-400">불러오는 중...</div>;
  }

  if (!stats) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">어드민 대시보드</h1>
        <span className="text-sm text-gray-400">{new Date().toLocaleDateString("ko-KR")} 기준</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="전체 사용자" value={stats.totalUsers} />
        <StatCard label="의뢰인" value={stats.clients} color="text-blue-600" />
        <StatCard label="프리랜서" value={stats.freelancers} color="text-purple-600" />
        <StatCard label="총 수수료 수익" value={`${stats.totalRevenue.toLocaleString()}원`} color="text-green-600" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="전체 프로젝트" value={stats.totalProjects} />
        <StatCard label="모집 중" value={stats.openProjects} color="text-yellow-600" />
        <StatCard label="완료" value={stats.completedProjects} color="text-green-600" />
        <StatCard label="지원서" value={stats.totalApplications} />
        <StatCard label="계약서" value={stats.totalContracts} color="text-blue-600" />
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        <QuickLink href="/projects" label="프로젝트 목록" />
        <QuickLink href="/experts" label="프리랜서 목록" />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color = "text-gray-900",
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="flex items-center justify-between bg-white rounded-2xl border border-gray-200 p-5 hover:border-purple-300 transition group"
    >
      <span className="font-medium text-gray-700 group-hover:text-purple-700">{label}</span>
      <span className="text-gray-400 group-hover:text-purple-500">→</span>
    </a>
  );
}
