"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { loadTossPayments, ANONYMOUS } from "@tosspayments/tosspayments-sdk";
import { useAuth } from "@/contexts/AuthContext";
import { Contract } from "@/types";
import { Timestamp } from "firebase/firestore";

export default function ContractDetailPage() {
  const { id } = useParams() as { id: string };
  const { user, profile } = useAuth();
  const router = useRouter();

  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [signed, setSigned] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  const [approveLoading, setApproveLoading] = useState(false);

  useEffect(() => { fetchContract(); }, [id]);

  async function fetchContract() {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await axios.get(`/api/contracts/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setContract(res.data);
    } catch {
      router.push("/");
    } finally {
      setLoading(false);
    }
  }

  async function handleSign() {
    if (!user || !signed) return;
    try {
      const token = await user.getIdToken();
      const res = await axios.patch(`/api/contracts/${id}/sign`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("서명 완료!");
      if (res.data.bothSigned) {
        alert("양측 서명이 완료됐습니다. 이제 결제를 진행해주세요.");
      }
      fetchContract();
    } catch {
      alert("서명에 실패했습니다.");
    }
  }

  async function handlePay() {
    if (!user || !contract) return;
    setPayLoading(true);
    try {
      const token = await user.getIdToken();
      // 서버에서 주문 ID + 결제 레코드 생성
      const res = await axios.post("/api/payments/initiate", { contractId: id }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Toss SDK로 결제창 호출
      const tossPayments = await loadTossPayments(
        process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!
      );
      const payment = tossPayments.payment({ customerKey: ANONYMOUS });
      await payment.requestPayment({
        method: "CARD",
        amount: { value: res.data.amount, currency: "KRW" },
        orderId: res.data.orderId,
        orderName: "WorkBridge 에스크로 결제",
        successUrl: `${window.location.origin}/payments/success?paymentId=${res.data.paymentId}`,
        failUrl: `${window.location.origin}/payments/fail`,
      });
    } catch {
      alert("결제 초기화에 실패했습니다.");
    } finally {
      setPayLoading(false);
    }
  }

  async function handleDelivery() {
    if (!user) return;
    setDeliveryLoading(true);
    try {
      const token = await user.getIdToken();
      await axios.patch(`/api/contracts/${id}/complete`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("납품 요청이 완료됐습니다. 의뢰인의 승인을 기다려주세요.");
      fetchContract();
    } catch {
      alert("납품 요청에 실패했습니다.");
    } finally {
      setDeliveryLoading(false);
    }
  }

  async function handleApprove() {
    if (!user || !confirm("납품을 승인하고 정산을 진행하시겠습니까?")) return;
    setApproveLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await axios.patch(`/api/contracts/${id}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert(`완료! 프리랜서에게 ${res.data.netAmount.toLocaleString()}원이 지급됩니다. (수수료 ${res.data.fee.toLocaleString()}원)`);
      router.push(`/projects/${contract?.projectId}`);
    } catch {
      alert("승인에 실패했습니다.");
    } finally {
      setApproveLoading(false);
    }
  }

  if (loading) return <div className="text-center py-20 text-gray-400">불러오는 중...</div>;
  if (!contract) return null;

  const isClient = profile?.role === "client" && contract.clientId === user?.uid;
  const isFreelancer = profile?.role === "freelancer" && contract.freelancerId === user?.uid;

  const mySignedKey = isClient ? "clientSigned" : "freelancerSigned";
  const alreadySigned = contract[mySignedKey as keyof Contract] as boolean;
  const bothSigned = contract.clientSigned && contract.freelancerSigned;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">계약서</h1>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
            contract.status === "draft" ? "bg-yellow-100 text-yellow-700" :
            contract.status === "active" ? "bg-green-100 text-green-700" :
            "bg-gray-100 text-gray-600"
          }`}>
            {contract.status === "draft" ? "서명 대기" : contract.status === "active" ? "진행 중" : "완료"}
          </span>
          <span className="text-sm text-gray-500">
            {(contract.createdAt as unknown as Timestamp)?.toDate?.()?.toLocaleDateString("ko-KR")}
          </span>
        </div>

        <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 rounded-xl p-4 font-sans">
          {contract.terms}
        </pre>

        <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-500">합의 금액</span>
            <p className="font-semibold">{contract.agreedBudget?.toLocaleString()}원</p>
          </div>
          <div>
            <span className="text-gray-500">서명 현황</span>
            <p className="font-semibold">
              의뢰인 {contract.clientSigned ? "✓" : "○"} / 프리랜서 {contract.freelancerSigned ? "✓" : "○"}
            </p>
          </div>
        </div>
      </div>

      {/* 서명 */}
      {!alreadySigned && contract.status === "draft" && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-4">
          <h2 className="font-semibold mb-3">전자 서명</h2>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={signed}
              onChange={(e) => setSigned(e.target.checked)}
              className="mt-1 w-4 h-4 accent-[#7c3aed]"
            />
            <span className="text-sm text-gray-700">
              위 계약 내용을 확인하였으며, 모든 조건에 동의합니다.
            </span>
          </label>
          <button
            onClick={handleSign}
            disabled={!signed}
            className="mt-4 w-full py-3 rounded-xl bg-[#7c3aed] text-white font-medium text-sm hover:bg-purple-700 transition disabled:opacity-40"
          >
            서명하기
          </button>
        </div>
      )}

      {/* 결제 (의뢰인, 양측 서명 완료, 아직 in_progress 아닐 때) */}
      {isClient && bothSigned && contract.status === "active" && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-4">
          <h2 className="font-semibold mb-2">에스크로 결제</h2>
          <p className="text-sm text-gray-500 mb-4">
            합의 금액 <strong>{contract.agreedBudget?.toLocaleString()}원</strong>을 에스크로로 결제합니다.
            납품 확인 후 수수료(10%)를 제외하고 프리랜서에게 지급됩니다.
          </p>
          <button
            onClick={handlePay}
            disabled={payLoading}
            className="w-full py-3 rounded-xl bg-green-600 text-white font-medium text-sm hover:bg-green-700 transition disabled:opacity-50"
          >
            {payLoading ? "처리 중..." : `${contract.agreedBudget?.toLocaleString()}원 결제하기`}
          </button>
        </div>
      )}

      {/* 납품 요청 (프리랜서) */}
      {isFreelancer && contract.status === "active" && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-4">
          <button
            onClick={handleDelivery}
            disabled={deliveryLoading}
            className="w-full py-3 rounded-xl bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 transition disabled:opacity-50"
          >
            {deliveryLoading ? "처리 중..." : "납품 완료 요청"}
          </button>
        </div>
      )}

      {/* 완료 승인 (의뢰인) */}
      {isClient && contract.status === "active" && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="font-semibold mb-2">납품 승인</h2>
          <p className="text-sm text-gray-500 mb-4">납품물을 검토하고 완료를 승인하면 프리랜서에게 대금이 지급됩니다.</p>
          <button
            onClick={handleApprove}
            disabled={approveLoading}
            className="w-full py-3 rounded-xl bg-[#7c3aed] text-white font-medium text-sm hover:bg-purple-700 transition disabled:opacity-50"
          >
            {approveLoading ? "처리 중..." : "완료 승인 및 정산"}
          </button>
        </div>
      )}
    </div>
  );
}
