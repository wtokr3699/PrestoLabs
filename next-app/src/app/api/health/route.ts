// 간단한 헬스 체크.
// 내부 구성(환경변수 존재 여부), 오류 상세, DB 쿼리는 노출하지 않는다.
// (인증 없이 인프라 정보를 노출하고 매 호출마다 과금성 Firestore 읽기를 유발하던 문제 제거)
export async function GET() {
  return Response.json({ ok: true });
}
