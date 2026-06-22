"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import axios from "axios";

export default function PaymentSuccessPage() {
  return <Suspense fallback={<div className="text-center py-20 text-gray-400">처리 중...</div>}><PaymentSuccessContent /></Suspense>;
}

function PaymentSuccessContent() {
  const searchParams = useSearchParams();

  // Toss가 붙여주는 파라미터
  const paymentKey = searchParams.get("paymentKey");
  const orderId = searchParams.get("orderId");
  const amount = searchParams.get("amount");
  // 우리가 successUrl에 넣은 파라미터
  const paymentId = searchParams.get("paymentId");

  const [status, setStatus] = useState<"loading" | "done" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!paymentKey || !orderId || !amount) {
      // sandbox 경유: paymentId만 있는 경우 (이미 confirm 완료)
      setStatus("done");
      return;
    }
    confirmPayment();
  }, []);

  async function confirmPayment() {
    try {
      await axios.post("/api/payments/confirm", {
        paymentKey,
        orderId,
        amount: Number(amount),
      });
      setStatus("done");
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.error
        : "결제 확인에 실패했습니다.";
      setErrorMsg(msg ?? "결제 확인에 실패했습니다.");
      setStatus("error");
    }
  }

  if (status === "loading") {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="text-4xl mb-4 animate-pulse">⏳</div>
        <p className="text-gray-500">결제를 확인하는 중입니다...</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">❌</div>
        <h1 className="text-xl font-bold mb-2">결제 확인 실패</h1>
        <p className="text-gray-500 mb-6">{errorMsg}</p>
        <Link href="/" className="inline-block px-6 py-3 rounded-xl bg-gray-800 text-white font-medium">
          홈으로
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <div className="text-5xl mb-4">✅</div>
      <h1 className="text-2xl font-bold mb-2">결제 완료!</h1>
      <p className="text-gray-500 mb-6">에스크로 결제가 완료됐습니다. 프리랜서가 작업을 시작합니다.</p>
      {paymentId && (
        <Link href={`/payments/${paymentId}`} className="block mb-3 text-sm text-[#7c3aed] hover:underline">
          결제 내역 보기
        </Link>
      )}
      <Link href="/my-projects" className="inline-block px-6 py-3 rounded-xl bg-[#7c3aed] text-white font-medium">
        내 프로젝트 보기
      </Link>
    </div>
  );
}
