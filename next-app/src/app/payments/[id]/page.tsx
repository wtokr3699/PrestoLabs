"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { useAuth } from "@/contexts/AuthContext";

type Payment = {
  id: string;
  contractId: string;
  clientId: string;
  freelancerId: string;
  amount: number;
  fee?: number;
  netAmount?: number;
  pgOrderId: string;
  pgPaymentKey?: string;
  status: "pending" | "escrowed" | "released" | "failed";
  escrowedAt?: { seconds: number } | null;
  releasedAt?: { seconds: number } | null;
  createdAt: { seconds: number };
};

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending: { label: "결제 대기", color: "bg-yellow-100 text-yellow-700" },
  escrowed: { label: "에스크로 보관 중", color: "bg-blue-100 text-blue-700" },
  released: { label: "정산 완료", color: "bg-green-100 text-green-700" },
  failed: { label: "결제 실패", color: "bg-red-100 text-red-700" },
};

function tsToDate(ts?: { seconds: number } | null) {
  if (!ts) return null;
  return new Date(ts.seconds * 1000).toLocaleDateString("ko-KR");
}

export default function PaymentDetailPage() {
  const { id } = useParams() as { id: string };
  const { user } = useAuth();
  const router = useRouter();

  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const token = await user.getIdToken();
        const res = await axios.get(`/api/payments/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setPayment(res.data);
      } catch {
        router.push("/");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, user]);

  if (loading) return <div className="text-center py-20 text-gray-400">불러오는 중...</div>;
  if (!payment) return null;

  const badge = STATUS_LABEL[payment.status] ?? STATUS_LABEL.pending;
  const isClient = payment.clientId === user?.uid;

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">결제 상세</h1>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <span className={`text-xs px-3 py-1 rounded-full font-medium ${badge.color}`}>
            {badge.label}
          </span>
          <span className="text-xs text-gray-400">{tsToDate(payment.createdAt)}</span>
        </div>

        <div className="border-t border-gray-100 pt-4 space-y-3 text-sm">
          <Row label="결제 금액" value={`${payment.amount.toLocaleString()}원`} bold />
          {payment.status === "released" && (
            <>
              <Row label="수수료 (10%)" value={`${(payment.fee ?? 0).toLocaleString()}원`} />
              <Row
                label="프리랜서 수령액"
                value={`${(payment.netAmount ?? 0).toLocaleString()}원`}
                bold
              />
            </>
          )}
          <Row label="주문번호" value={payment.pgOrderId} mono />
          {payment.escrowedAt && (
            <Row label="에스크로 일시" value={tsToDate(payment.escrowedAt) ?? ""} />
          )}
          {payment.releasedAt && (
            <Row label="정산 일시" value={tsToDate(payment.releasedAt) ?? ""} />
          )}
        </div>

        {payment.status === "escrowed" && isClient && (
          <p className="text-xs text-gray-500 pt-2">
            납품 확인 후 계약서 페이지에서 완료 승인을 하면 프리랜서에게 대금이 지급됩니다.
          </p>
        )}

        <button
          onClick={() => router.push(`/contracts/${payment.contractId}`)}
          className="w-full py-3 rounded-xl border border-gray-300 text-gray-600 text-sm hover:bg-gray-50 transition"
        >
          계약서 보기
        </button>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
  mono,
}: {
  label: string;
  value: string;
  bold?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className={`${bold ? "font-semibold" : ""} ${mono ? "font-mono text-xs" : ""}`}>
        {value}
      </span>
    </div>
  );
}
