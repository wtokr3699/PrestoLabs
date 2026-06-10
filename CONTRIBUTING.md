# Contributing Guide

PrestoLabs 저장소 협업 가이드입니다. 팀원들은 아래 규칙을 기준으로 문서와 코드를 함께 수정합니다.

## 기본 원칙

- `main` 브랜치에 직접 작업하지 않습니다.
- 모든 작업은 새 브랜치에서 진행합니다.
- 작업 후 `Pull Request`를 통해 리뷰 후 병합합니다.
- 기획 문서와 랜딩 페이지는 가능한 한 같은 맥락에서 함께 업데이트합니다.

## 브랜치 전략

브랜치 이름은 아래 형식을 권장합니다.

```text
feature/작업이름
fix/수정이름
docs/문서이름
design/디자인수정
```

예시:

```bash
git checkout -b feature/update-landing-copy
git checkout -b docs/update-planning-doc
git checkout -b fix/mobile-layout
```

## 작업 시작

최신 코드를 받은 뒤 브랜치를 만듭니다.

```bash
git checkout main
git pull origin main
git checkout -b feature/your-work-name
```

## 커밋 규칙

한 커밋에는 가능한 한 하나의 목적만 담습니다.

권장 형식:

```text
feat: 새로운 기능 추가
fix: 버그 수정
docs: 문서 수정
style: 문구/스타일 수정
refactor: 구조 개선
```

예시:

```bash
git commit -m "feat: add poster-inspired hero section"
git commit -m "docs: update integrated planning document"
git commit -m "fix: improve mobile hero spacing"
```

## Pull Request 규칙

PR에는 아래 내용을 꼭 적습니다.

1. 무엇을 수정했는지
2. 왜 수정했는지
3. 확인 방법
4. 화면 변경이 있으면 스크린샷 첨부

PR 제목 예시:

```text
[feat] 랜딩 페이지 히어로 섹션 개선
[docs] 통합 기획서 수익모델 섹션 수정
[fix] 모바일 레이아웃 간격 조정
```

## 문서 수정 규칙

### 기획 문서

- 기준 문서는 `docs/통합_기획서_PrestoLabs.md`입니다.
- 주요 내용이 바뀌면 먼저 Markdown 문서를 수정합니다.
- 제출용 문서가 필요하면 이후 `docs/PrestoLabs_통합_기획서.docx`를 다시 생성합니다.

### 홈페이지 문구/디자인

- 랜딩 문구는 기획서 내용과 충돌하지 않게 수정합니다.
- 서비스 정의, 핵심 가치 제안, 사용자 여정은 임의로 바꾸지 말고 팀 합의 후 수정합니다.
- 시각 톤은 현재 포스터 기반 블루-바이올렛 분위기를 유지합니다.

## 파일별 역할

- `docs/통합_기획서_PrestoLabs.md`: 최종 기획 기준 문서
- `docs/PrestoLabs_통합_기획서.docx`: 공유/제출용 문서
- `index.html`: 랜딩 페이지 구조
- `styles.css`: 디자인 및 반응형 스타일
- `script.js`: 간단한 인터랙션
- `scripts/build_integrated_doc.py`: DOCX 재생성 스크립트
- `references/original-plans/`: 초기 팀원 원본 기획 자료

## 로컬 확인 방법

```bash
cd /Users/applw/Documents/Codex/PrestoLabs
python3 -m http.server 4173
```

브라우저에서:

```text
http://127.0.0.1:4173
```

## 머지 전 체크리스트

- `git status`가 의도한 파일만 포함하는지 확인
- 랜딩 페이지가 모바일/데스크톱에서 크게 깨지지 않는지 확인
- 문서와 홈페이지 메시지가 서로 충돌하지 않는지 확인
- 불필요한 이미지 산출물이 커밋되지 않았는지 확인

## 추천 협업 흐름

```bash
git checkout main
git pull origin main
git checkout -b feature/my-update

# 작업
git add .
git commit -m "feat: describe your change"
git push -u origin feature/my-update
```

이후 GitHub에서 Pull Request를 생성합니다.
