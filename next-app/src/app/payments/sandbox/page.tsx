"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import axios from "axios";

// Sandbox 테스트 결제 페이지 (Toss 실제 키 없을 때 사용)
export default function PaymentSandboxPage() {
  return <Suspense fallback={null}><PaymentSandboxContent /></Suspense>;
}

function PaymentSandboxContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  const orderId = searchParams.get("orderId") ?? "";
  const amount = parseInt(searchParams.get("amount") ?? "0");
  const paymentId = searchParams.get("paymentId") ?? "";

  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      // sandbox에서는 paymentKey를 mock으로 생성
      await axios.post("/api/payments/confirm", {
        paymentKey: `sandbox_pk_${Date.now()}`,
        orderId,
        amount,
      }, { headers: { Authorization: `Bearer ${token}` } });

      router.push(`/payments/success?paymentId=${paymentId}`);
    } catch {
      router.push("/payments/fail");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <div className="bg-white rounded-2xl border border-gray-200 p-8">
        <div className="text-4xl mb-4">🧪</div>
        <h1 className="text-xl font-bold mb-2">Sandbox 테스트 결제</h1>
        <p className="text-gray-500 text-sm mb-6">실제 결제가 발생하지 않습니다.</p>
        <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-500">주문번호</span>
            <span className="font-mono text-xs">{orderId}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">결제 금액</span>
            <span className="font-semibold">{amount.toLocaleString()}원</span>
          </div>
        </div>
        <button
          onClick={handleConfirm}
          disabled={loading}
          className="w-full py-3 rounded-xl bg-[#7c3aed] text-white font-medium hover:bg-purple-700 transition disabled:opacity-50"
        >
          {loading ? "처리 중..." : "결제 완료 (테스트)"}
        </button>
        <button
          onClick={() => router.back()}
          className="w-full py-3 mt-2 rounded-xl border border-gray-300 text-gray-600 text-sm hover:bg-gray-50 transition"
        >
          취소
        </button>
      </div>
    </div>
  );
}
