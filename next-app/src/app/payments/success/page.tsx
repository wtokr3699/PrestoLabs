"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

export default function PaymentSuccessPage() {
  return <Suspense fallback={null}><PaymentSuccessContent /></Suspense>;
}

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const paymentId = searchParams.get("paymentId");

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
