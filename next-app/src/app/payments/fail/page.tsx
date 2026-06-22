"use client";

import Link from "next/link";

export default function PaymentFailPage() {
  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <div className="text-5xl mb-4">❌</div>
      <h1 className="text-2xl font-bold mb-2">결제 실패</h1>
      <p className="text-gray-500 mb-6">결제 처리 중 오류가 발생했습니다. 다시 시도해주세요.</p>
      <Link href="/" className="inline-block px-6 py-3 rounded-xl bg-gray-800 text-white font-medium">
        홈으로
      </Link>
    </div>
  );
}
