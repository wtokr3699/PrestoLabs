import Link from "next/link";

const categories = [
  { icon: "🚀", label: "랜딩페이지", value: "landing" },
  { icon: "🌐", label: "웹사이트", value: "website" },
  { icon: "⚙️", label: "업무 자동화", value: "automation" },
  { icon: "🛠️", label: "MVP 개발", value: "mvp" },
  { icon: "📊", label: "관리자 페이지", value: "admin" },
  { icon: "🤖", label: "챗봇", value: "chatbot" },
  { icon: "🎨", label: "디자인", value: "design" },
  { icon: "📢", label: "마케팅", value: "marketing" },
];

export default function Home() {
  return (
    <div>
      {/* Hero */}
      <section className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6 text-gray-900">
          아이디어만 있으면<br />
          <span className="text-[#7c3aed]">48시간</span> 안에 결과물로
        </h1>
        <p className="text-lg text-gray-500 mb-8 max-w-xl mx-auto">
          AI가 요구사항을 정리하고, 검증된 프리랜서와 연결합니다.<br />
          에스크로 결제로 안전하게, 빠르게.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/projects/new"
            className="px-6 py-3 rounded-xl bg-[#7c3aed] text-white font-medium hover:bg-purple-700 transition"
          >
            프로젝트 등록하기
          </Link>
          <Link
            href="/projects"
            className="px-6 py-3 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition"
          >
            프로젝트 탐색
          </Link>
        </div>
      </section>

      {/* 카테고리 */}
      <section className="max-w-4xl mx-auto px-4 pb-16">
        <h2 className="text-lg font-semibold mb-4 text-gray-700">카테고리별 탐색</h2>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
          {categories.map((cat) => (
            <Link
              key={cat.value}
              href={`/projects?category=${cat.value}`}
              className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-gray-200 hover:border-[#7c3aed] hover:shadow-sm transition text-center"
            >
              <span className="text-2xl">{cat.icon}</span>
              <span className="text-xs text-gray-600">{cat.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* 프로세스 */}
      <section className="bg-white py-16">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl font-bold mb-10 text-center">어떻게 진행되나요?</h2>
          <div className="grid md:grid-cols-5 gap-4 text-center">
            {[
              { step: "1", title: "프로젝트 등록", desc: "AI가 단가 분석을 도와드려요" },
              { step: "2", title: "지원 검토", desc: "프리랜서들의 지원서를 검토해요" },
              { step: "3", title: "계약 체결", desc: "전자 서명으로 안전하게" },
              { step: "4", title: "에스크로 결제", desc: "선결제 후 작업이 시작돼요" },
              { step: "5", title: "완료 & 정산", desc: "납품 확인 후 즉시 정산" },
            ].map((p) => (
              <div key={p.step} className="p-4">
                <div className="w-10 h-10 rounded-full bg-[#7c3aed] text-white font-bold flex items-center justify-center mx-auto mb-3 text-sm">
                  {p.step}
                </div>
                <p className="font-semibold text-sm mb-1">{p.title}</p>
                <p className="text-xs text-gray-500">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
