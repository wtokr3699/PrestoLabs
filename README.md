# PrestoLabs

PrestoLabs 팀의 통합 기획서와 랜딩 페이지 초안이 들어 있는 협업용 저장소입니다.

## 포함 내용

- 통합 기획서 마크다운: [docs/통합_기획서_PrestoLabs.md](./docs/통합_기획서_PrestoLabs.md)
- 통합 기획서 문서본: [docs/PrestoLabs_통합_기획서.docx](./docs/PrestoLabs_통합_기획서.docx)
- 홈페이지 초안: [index.html](./index.html), [styles.css](./styles.css), [script.js](./script.js)
- 통합 문서 생성 스크립트: [scripts/build_integrated_doc.py](./scripts/build_integrated_doc.py)
- 디자인 참고 포스터: `assets/poster-prestolabs.png`
- 초기 팀원 원본 기획 자료: `references/original-plans/`

## 프로젝트 구조

```text
PrestoLabs/
├─ assets/
│  └─ poster-prestolabs.png
├─ docs/
│  ├─ 통합_기획서_PrestoLabs.md
│  └─ PrestoLabs_통합_기획서.docx
├─ references/
│  └─ original-plans/
├─ scripts/
│  └─ build_integrated_doc.py
├─ qa/
│  └─ preview screenshots
├─ index.html
├─ styles.css
├─ script.js
├─ README.md
└─ CONTRIBUTING.md
```

## 로컬에서 홈페이지 보기

이 폴더에서 간단한 정적 서버를 실행하면 됩니다.

```bash
cd /Users/applw/Documents/Codex/PrestoLabs
python3 -m http.server 4173
```

브라우저에서 아래 주소로 접속합니다.

```text
http://127.0.0.1:4173
```

## GitHub에 올리는 방법

### 1. 로컬 저장소 초기화

```bash
cd /Users/applw/Documents/Codex/PrestoLabs
git init
git add .
git commit -m "Initial PrestoLabs planning and landing page"
```

### 2. GitHub 저장소 연결

GitHub에서 새 repository를 만든 뒤 아래처럼 연결합니다.

```bash
git branch -M main
git remote add origin https://github.com/YOUR-ID/YOUR-REPO.git
git push -u origin main
```

## 팀 협업 추천 방식

- `main` 브랜치에는 바로 수정하지 않고, 각자 브랜치를 만들어 작업합니다.
- 작업 후 `Pull Request`로 검토하고 합칩니다.
- 기획 수정은 우선 `통합_기획서_PrestoLabs.md`를 기준으로 반영하고, 필요하면 DOCX를 다시 생성합니다.

예시:

```bash
git checkout -b feature/update-copy
```

## 문서 재생성

DOCX를 다시 만들고 싶으면 아래 명령을 실행합니다.

```bash
cd /Users/applw/Documents/Codex/PrestoLabs
python3 scripts/build_integrated_doc.py
```

## 참고

- 검수용 스크린샷 파일은 `.gitignore`에 포함되어 있어 기본적으로 커밋되지 않습니다.
- 초기 원본 기획 문서들은 `references/original-plans/`에 모아두었습니다.
