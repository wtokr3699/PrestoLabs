---
pdf_options:
  format: A4
  margin:
    top: 20mm
    bottom: 20mm
    left: 15mm
    right: 15mm
stylesheet: https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.2.0/github-markdown.min.css
css: |
  body {
    font-family: 'Inter', 'Noto Sans KR', sans-serif;
    line-height: 1.6;
    color: #2b303a;
  }
  h1 {
    border-bottom: 3px solid #6366f1;
    padding-bottom: 12px;
    color: #4f46e5;
    font-size: 2.2em;
    margin-bottom: 20px;
  }
  h2 {
    border-bottom: 1px solid #e5e7eb;
    padding-bottom: 6px;
    color: #1f2937;
    margin-top: 35px;
    font-size: 1.6em;
  }
  h3 {
    color: #374151;
    margin-top: 25px;
    font-size: 1.25em;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 16px 0;
    font-size: 0.95em;
  }
  th, td {
    border: 1px solid #e5e7eb;
    padding: 10px 12px;
    text-align: left;
  }
  th {
    background-color: #f9fafb;
    font-weight: 600;
    color: #374151;
  }
  code {
    background-color: #f3f4f6;
    padding: 2px 6px;
    border-radius: 4px;
    font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
    font-size: 0.9em;
    color: #db2777;
  }
  pre {
    background-color: #f9fafb;
    padding: 16px;
    border-radius: 8px;
    overflow-x: auto;
    border: 1px solid #e5e7eb;
    font-size: 0.85em;
  }
  .badge {
    display: inline-block;
    padding: 4px 8px;
    font-size: 0.8em;
    font-weight: bold;
    border-radius: 4px;
    color: #fff;
    text-transform: uppercase;
    font-family: monospace;
    margin-right: 8px;
  }
  .badge-get { background-color: #10b981; }
  .badge-post { background-color: #3b82f6; }
  .badge-patch { background-color: #f59e0b; }
  .badge-delete { background-color: #ef4444; }
---

# PrestoLabs API 명세서

이 문서는 PrestoLabs 플랫폼의 모든 백엔드 엔드포인트 세부사양을 명세합니다.
모든 API는 Next.js App Router(`src/app/api/...`) 형태로 구현되어 있으며, JWT 기반 Firebase Auth 토큰 검증 시스템을 탑재하고 있습니다.

---

## 🔒 공통 사양 및 인증 안내

### 1. base URL
* `/api`

### 2. 인증 헤더 (Authentication)
* 회원 전용 기능의 경우 요청 헤더에 Firebase Auth `idToken`을 포함하여 인증을 수행합니다.
  ```http
  Authorization: Bearer <Firebase_ID_Token>
  ```
* 인증 토큰이 누락되었거나 만료되었을 경우 `401 Unauthorized` 에러를 반환합니다.

### 3. 공통 응답 구조
* **성공 응답 (Success)**
  ```json
  {
    "success": true,
    "data": { ... }
  }
  ```
* **실패 응답 (Error)**
  ```json
  {
    "success": false,
    "error": "에러 내용 요약"
  }
  ```

---

## 📂 카테고리별 엔드포인트 명세

## 1. 회원 및 프로필 관련 API

### <span class="badge badge-post">POST</span> `/auth/register` (회원 가입 및 프로필 문서 초기설정)
* **설명**: 회원가입 시 Firebase Auth 토큰 정보를 대조하여 Firestore `users` 컬렉션에 새 문서(Client 또는 Freelancer)를 안전하게 적재합니다. 이미 해당 UID의 프로필 문서가 존재할 경우 업데이트를 수행하지 않고 성공을 반환합니다.
* **인증 요구**: 없음 (요청 본문에 `idToken` 수동 포함)
* **요청 본문 (JSON)**:
  ```json
  {
    "name": "홍길동",
    "role": "freelancer",
    "idToken": "eyJhbGciOiJSUzI1NiIs..."
  }
  ```
* **응답**:
  * `201 Created` (신규 등록 성공):
    ```json
    {
      "success": true,
      "data": {
        "uid": "user_uid_12345",
        "existing": false
      }
    }
    ```
  * `200 OK` (기존 유저 존재):
    ```json
    {
      "success": true,
      "data": {
        "uid": "user_uid_12345",
        "existing": true
      }
    }
    ```

### <span class="badge badge-get">GET</span> `/auth/me` (본인 프로필 정보 조회)
* **설명**: 현재 헤더에 첨부된 토큰 소유자의 프로필 상세 정보를 조회합니다.
* **인증 요구**: 필수
* **응답 (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "uid": "user_uid_12345",
      "email": "freelancer@example.com",
      "name": "홍길동",
      "role": "freelancer",
      "avatarUrl": "https://example.com/avatar.jpg",
      "bio": "안녕하세요, 5년차 노코드/웹앱 전문가입니다.",
      "profileComplete": true,
      "skills": ["Next.js", "React", "Firebase"],
      "hourlyRate": 35000,
      "portfolioUrl": "https://my-portfolio.com",
      "avgRating": 4.8,
      "reviewCount": 12,
      "createdAt": { "_seconds": 1719130000, "_nanoseconds": 0 }
    }
  }
  ```

### <span class="badge badge-patch">PATCH</span> `/auth/me` (본인 프로필 수정)
* **설명**: 본인의 프로필 정보를 업데이트합니다. 필수 조건이 충족되면 플랫폼 활동 승인 여부(`profileComplete`)가 자동 갱신됩니다. (프리랜서는 `skills` 1개 이상 및 `bio` 입력 필수, 의뢰인은 `bio` 입력 필수)
* **인증 요구**: 필수
* **요청 본문 (JSON)**:
  ```json
  {
    "name": "홍길동 수정",
    "bio": "노코드 챗봇 및 업무자동화 특화 제작자입니다.",
    "skills": ["FlutterFlow", "Make", "Firebase"],
    "hourlyRate": 40000,
    "portfolioUrl": "https://new-portfolio.com"
  }
  ```
* **응답 (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "success": true
    }
  }
  ```

### <span class="badge badge-get">GET</span> `/users` (프리랜서 목록 조회)
* **설명**: 활성화된 프리랜서(`role === "freelancer" && profileComplete === true`)의 목록을 조회합니다.
* **쿼리 파라미터**:
  * `skill` (선택): 특정 기술스택 필터링
  * `sort` (선택): `rating` (별점순, 기본값) | `reviews` (후기순) | `newest` (신규가입순)
  * `page` (선택): 페이지 번호 (기본값: 1, 한 페이지에 12개 노출)
* **응답 (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "users": [
        {
          "uid": "freelancer_uid_12",
          "name": "김뚝딱",
          "avatarUrl": null,
          "bio": "48시간 내에 작동하는 MVP를 완성해드립니다.",
          "skills": ["React", "TailwindCSS"],
          "hourlyRate": 30000,
          "portfolioUrl": null,
          "avgRating": 5.0,
          "reviewCount": 3
        }
      ],
      "total": 1
    }
  }
  ```

### <span class="badge badge-get">GET</span> `/users/[uid]` (특정 유저 공개 프로필 상세 조회)
* **설명**: 특정 프리랜서 혹은 의뢰인의 공개 프로필을 조회합니다. 이메일 등 민감한 개인 정보는 응답에서 배제됩니다.
* **응답 (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "uid": "freelancer_uid_12",
      "name": "김뚝딱",
      "avatarUrl": null,
      "role": "freelancer",
      "bio": "48시간 내에 작동하는 MVP를 완성해드립니다.",
      "skills": ["React", "TailwindCSS"],
      "hourlyRate": 30000,
      "portfolioUrl": null,
      "avgRating": 5.0,
      "reviewCount": 3,
      "companyName": null,
      "businessField": null,
      "createdAt": { "_seconds": 1719130000, "_nanoseconds": 0 }
    }
  }
  ```

### <span class="badge badge-get">GET</span> `/users/[uid]/reviews` (해당 유저가 받은 리뷰 전체 목록 조회)
* **설명**: 특정 유저가 다른 참여자로부터 지급받은 평점 및 리뷰 전체 내역을 최신순으로 반환합니다.
* **응답 (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "reviews": [
        {
          "id": "review_doc_999",
          "projectId": "project_id_101",
          "reviewerId": "client_uid_888",
          "revieweeId": "freelancer_uid_12",
          "reviewerRole": "client",
          "rating": 5,
          "comment": "기한 내에 정확히 완성해 주셨고 소통이 원활했습니다.",
          "tags": ["친절함", "정확한 납기"],
          "createdAt": { "_seconds": 1719132500, "_nanoseconds": 0 }
        }
      ]
    }
  }
  ```

---

## 2. 프로젝트 의뢰 관련 API

### <span class="badge badge-get">GET</span> `/projects` (프로젝트 전체 목록 조회)
* **설명**: 등록된 활성 프로젝트 목록을 최신 등록순으로 페이징 및 필터하여 조회합니다. (삭제된 프로젝트 제외)
* **쿼리 파라미터**:
  * `status` (선택): 프로젝트 모집/진행 상태 필터링 (`open` | `in_review` | `matched` | `in_progress` | `submitted` | `completed` | `closed`)
  * `category` (선택): 카테고리 필터링 (`landing` | `website` | `automation` | `mvp` | `admin` | `chatbot` | `design` | `marketing` | `other`)
  * `q` (선택): 제목 및 본문 검색 키워드
  * `page` (선택): 페이지네이션 페이지 번호 (기본값: 1, Limit: 10)
  * `limit` (선택): 페이지당 항목 노출 개수 (기본값: 10)
* **응답 (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "projects": [
        {
          "id": "project_id_101",
          "clientId": "client_uid_888",
          "title": "업무 자동화 구글 시트 챗봇 연동 의뢰",
          "description": "구글 시트의 주문 내역을 Slack 봇으로 전송하는 시스템 구축",
          "category": "automation",
          "requiredSkills": ["Zapier", "Slack API"],
          "budgetMin": 500000,
          "budgetMax": 1000000,
          "startDate": { "_seconds": 1719130000 },
          "deadline": { "_seconds": 1719500000 },
          "status": "open",
          "applicationCount": 2,
          "createdAt": { "_seconds": 1719130000 }
        }
      ],
      "total": 1,
      "page": 1,
      "limit": 10
    }
  }
  ```

### <span class="badge badge-post">POST</span> `/projects` (신규 프로젝트 의뢰 등록)
* **설명**: 의뢰인 유저가 신규 MVP 의뢰 프로젝트를 등록합니다.
* **인증 요구**: 필수 (의뢰인 및 프로필 완성 유저 전용)
* **요청 본문 (JSON)**:
  ```json
  {
    "title": "업무 자동화 구글 시트 챗봇 연동 의뢰",
    "description": "구글 시트의 주문 내역을 Slack 봇으로 전송하는 시스템 구축",
    "category": "automation",
    "requiredSkills": ["Zapier", "Slack API"],
    "budgetMin": 500000,
    "budgetMax": 1000000,
    "deadline": "2026-06-30T00:00:00.000Z",
    "startDate": "2026-06-25T00:00:00.000Z"
  }
  ```
* **응답 (`201 Created`)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "project_id_101"
    }
  }
  ```

### <span class="badge badge-get">GET</span> `/projects/my` (본인이 의뢰한 프로젝트 조회)
* **설명**: 로그인한 의뢰인이 등록했던 의뢰 프로젝트의 전체 목록을 조회합니다.
* **인증 요구**: 필수
* **응답 (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "projects": [
        {
          "id": "project_id_101",
          "clientId": "client_uid_888",
          "title": "업무 자동화 구글 시트 챗봇 연동 의뢰",
          "status": "open",
          "createdAt": { "_seconds": 1719130000 }
        }
      ]
    }
  }
  ```

### <span class="badge badge-get">GET</span> `/projects/[id]` (특정 프로젝트 상세 정보 조회)
* **설명**: 지정한 단일 프로젝트의 상세 요구 조건 및 바인딩된 부가 정보(AI 단가 분석 등)를 종합 반환합니다.
* **응답 (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "project_id_101",
      "clientId": "client_uid_888",
      "title": "업무 자동화 구글 시트 챗봇 연동 의뢰",
      "description": "구글 시트의 주문 내역을 Slack 봇으로 전송하는 시스템 구축",
      "category": "automation",
      "requiredSkills": ["Zapier", "Slack API"],
      "budgetMin": 500000,
      "budgetMax": 1000000,
      "status": "open",
      "applicationCount": 2,
      "aiAnalysis": {
        "features": [
          { "name": "Slack API 웹훅 트리거", "description": "구글 시트 연동 봇 구현", "estimatedPrice": 400000 },
          { "name": "Zapier 자동화 연동", "description": "워크플로우 데이터 맵핑", "estimatedPrice": 300000 }
        ],
        "totalEstimate": 700000,
        "report": "단순 데이터 전송 수준의 자동화 작업으로 48시간 이내 무리 없이 구현 가능한 MVP입니다.",
        "analyzedAt": { "_seconds": 1719130100 }
      },
      "createdAt": { "_seconds": 1719130000 }
    }
  }
  ```

### <span class="badge badge-patch">PATCH</span> `/projects/[id]` (프로젝트 내용 수정)
* **설명**: 본인이 올린 프로젝트 공고를 수정합니다.
* **제약**: 프로젝트에 이미 지원자(`applicationCount > 0`)가 1명이라도 등록되어 있을 경우, `budgetMin`, `budgetMax`, `deadline` 값의 변경을 금지하며 수정 요청 시 `400 Bad Request` 에러를 반환합니다.
* **인증 요구**: 필수 (등록자 본인만 가능)
* **요청 본문 (JSON)**:
  ```json
  {
    "title": "구글 시트 및 Slack 봇 연동 시스템 구축 (수정)",
    "description": "변경 내용 반영...",
    "requiredSkills": ["Zapier", "Slack API", "Google Apps Script"]
  }
  ```
* **응답 (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "success": true
    }
  }
  ```

### <span class="badge badge-delete">DELETE</span> `/projects/[id]` (프로젝트 소프트 삭제)
* **설명**: 프로젝트를 소프트 딜리트(`deletedAt` 타임스탬프 설정) 처리합니다.
* **인증 요구**: 필수 (등록자 본인만 가능)
* **응답 (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "success": true
    }
  }
  ```

### <span class="badge badge-patch">PATCH</span> `/projects/[id]/status` (프로젝트 진행 상태 변경)
* **설명**: 프로젝트의 모집/작업 진행 상태를 변경합니다.
* **비즈니스 흐름**:
  - `open` -> `in_review` -> `matched` -> `in_progress` -> `submitted` -> `completed` 등의 정해진 유효 상태 전이(State Machine)에 부합하지 않는 이행 시 `422 Unprocessable Entity` 에러를 반환합니다.
  - 의뢰인에 의해 프로젝트가 중도 `closed` 될 경우, 현재 대기 상태인(`status == "pending"`) 타 지원서들은 일괄 `rejected` 되며, 대상 프리랜서들에게는 채용 마감 알림이 자동 발생합니다.
* **인증 요구**: 필수 (의뢰인 본인만 가능)
* **요청 본문 (JSON)**:
  ```json
  {
    "status": "closed"
  }
  ```
* **응답 (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "success": true,
      "status": "closed"
    }
  }
  ```

### <span class="badge badge-post">POST</span> `/projects/[id]/ai-analysis` (AI 기획 단가 분석 시작)
* **설명**: 입력된 기획 요약본을 토대로 AI 기반 백그라운드 단가/기능 쪼개기 분석을 유도합니다. 해당 요청은 즉시 대기 응답(`202 Accepted`)을 처리하고 백그라운드 비동기로 프롬프트를 전송하여 프로젝트 하위 `aiAnalysis` 필드를 최신화합니다.
* **인증 요구**: 필수 (프로젝트 의뢰인 본인만 호출 가능)
* **응답 (`202 Accepted`)**:
  ```json
  {
    "success": true,
    "data": {
      "message": "AI 분석을 시작했습니다. 잠시 후 결과가 표시됩니다."
    }
  }
  ```

### <span class="badge badge-patch">PATCH</span> `/projects/[id]/apply-budget` (AI 예상 견적 일괄 적용)
* **설명**: AI가 분석해준 총합 예상 단가를 신뢰하여 본인의 프로젝트 예산 범위(`budgetMin`, `budgetMax`)에 단방향 일괄 업데이트 적용합니다.
* **인증 요구**: 필수 (의뢰인 전용)
* **요청 본문 (JSON)**:
  ```json
  {
    "budgetMin": 600000,
    "budgetMax": 700000
  }
  ```
* **응답 (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "success": true
    }
  }
  ```

---

## 3. 지원서 및 계약 매칭 API

### <span class="badge badge-post">POST</span> `/projects/[id]/applications` (프로젝트 지원서 제출)
* **설명**: 프리랜서가 특정 일감 공고에 제안금액과 소개서를 첨부하여 신규 지원합니다.
* **인증 요구**: 필수 (프리랜서 전용, 프로필 완성 유저 전용)
* **요청 본문 (JSON)**:
  ```json
  {
    "coverLetter": "안녕하세요, 이 분야 전문 포트폴리오를 보유하고 있으며 신속히 작업하겠습니다.",
    "proposedBudget": 700000,
    "estimatedDays": 2
  }
  ```
* **응답 (`201 Created`)**:
  * 성공 시 프로젝트의 `applicationCount`가 1 가산되며 상태가 `open`일 시 `in_review`로 자동 전환됩니다. 의뢰인에게 실시간 알림이 발송됩니다.
  ```json
  {
    "success": true,
    "data": {
      "id": "application_id_abcde"
    }
  }
  ```

### <span class="badge badge-get">GET</span> `/projects/[id]/applications` (일감에 들어온 지원서 목록 조회)
* **설명**: 특정 일감에 접수 완료된 지원서 전체 목록을 가져옵니다.
* **권한 제약**:
  - 의뢰인 본인은 전체 지원서 목록 조회 가능
  - 지원서를 제출한 프리랜서는 본인이 작성한 지원서 단 1건만 필터 조회 가능
* **인증 요구**: 필수
* **응답 (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "applications": [
        {
          "id": "application_id_abcde",
          "projectId": "project_id_101",
          "freelancerId": "freelancer_uid_12",
          "coverLetter": "안녕하세요...",
          "proposedBudget": 700000,
          "estimatedDays": 2,
          "status": "pending",
          "createdAt": { "_seconds": 1719131000 }
        }
      ]
    }
  }
  ```

### <span class="badge badge-get">GET</span> `/applications/my` (본인이 접수한 지원서 모아보기)
* **설명**: 로그인한 프리랜서 본인이 여타 프로젝트에 투고했던 지원서의 전체 이력을 최신순으로 가져옵니다. 프로젝트 한글 제목 및 계약서 생성 여부를 포함합니다.
* **인증 요구**: 필수 (프리랜서 전용)
* **응답 (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "applications": [
        {
          "id": "application_id_abcde",
          "projectId": "project_id_101",
          "projectTitle": "업무 자동화 구글 시트 챗봇 연동 의뢰",
          "freelancerId": "freelancer_uid_12",
          "proposedBudget": 700000,
          "estimatedDays": 2,
          "status": "pending",
          "contractId": null,
          "createdAt": { "_seconds": 1719131000 }
        }
      ]
    }
  }
  ```

### <span class="badge badge-patch">PATCH</span> `/applications/[id]/accept` (지원 수락 및 계약서 발행)
* **설명**: 의뢰인이 특정 지원을 최종 승인합니다. 
* **비즈니스 로직**:
  - 수락된 프리랜서 지원서 상태가 `accepted`로 업데이트됩니다.
  - 나머지 해당 프로젝트의 pending 상태 지원서들은 자동 `auto_rejected` 처리되며, 해당 거절 대상자들에게 자동 알림이 발송됩니다.
  - 프로젝트 상태는 즉시 `matched`로 승격됩니다.
  - 의뢰인-프리랜서 매칭 기준 계약 조항이 기재된 초안 계약서(`contracts` 컬렉션, `draft` 상태)가 완전 자동 생성되어 프로젝트에 자동 연결됩니다.
* **인증 요구**: 필수 (프로젝트 의뢰인 전용)
* **요청 본문 (JSON)**:
  ```json
  {
    "agreedBudget": 700000
  }
  ```
* **응답 (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "success": true,
      "contractId": "contract_id_9999"
    }
  }
  ```

### <span class="badge badge-patch">PATCH</span> `/applications/[id]/reject` (개별 지원 거절)
* **설명**: 의뢰인이 특정 프리랜서의 매칭 제안을 거절합니다.
* **인증 요구**: 필수 (의뢰인 전용)
* **응답 (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "success": true
    }
  }
  ```

### <span class="badge badge-get">GET</span> `/contracts/[id]` (계약 상세 정보 확인)
* **설명**: 계약 당사자(의뢰인 또는 프리랜서)가 체결 계약서 전문 및 조항 합의 금액을 조회합니다.
* **인증 요구**: 필수 (계약 당사자 본인 한정)
* **응답 (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "contract_id_9999",
      "projectId": "project_id_101",
      "clientId": "client_uid_888",
      "freelancerId": "freelancer_uid_12",
      "applicationId": "application_id_abcde",
      "terms": "[WorkBridge 프로젝트 계약서] ... 합의 금액: 700,000원 ...",
      "agreedBudget": 700000,
      "clientSigned": false,
      "freelancerSigned": false,
      "status": "draft",
      "createdAt": { "_seconds": 1719131500 }
    }
  }
  ```

### <span class="badge badge-patch">PATCH</span> `/contracts/[id]/sign` (전자 계약서 상호 서명)
* **설명**: 계약 조항에 동의하여 전자 서명을 날인합니다. 본인이 의뢰인인 경우 `clientSigned`를 활성화하고 프리랜서이면 `freelancerSigned`를 활성화합니다.
* **비즈니스 규칙**:
  - 양 당사자의 서명이 모두 충족 완료되면(bothSigned) 최종적으로 계약서 상태가 `active`로 업데이트되어 정식 진행 계약으로 갱신됩니다.
* **인증 요구**: 필수 (계약 참여 유저 전용)
* **응답 (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "success": true,
      "bothSigned": true
    }
  }
  ```

### <span class="badge badge-patch">PATCH</span> `/contracts/[id]/complete` (작업 완수 결과물 제출)
* **설명**: 프리랜서가 의뢰에 대한 구현 작업을 완료하고 최종 결과물을 제출(납품 요청)합니다.
* **비즈니스 규칙**:
  - `contracts`에 납품 신청 일시(`deliveryRequestedAt`)가 각인됩니다.
  - 프로젝트 상태는 즉시 `"submitted"` (검수 대기) 상태로 승격됩니다.
* **인증 요구**: 필수 (계약 수임 프리랜서 전용)
* **응답 (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "success": true
    }
  }
  ```

### <span class="badge badge-patch">PATCH</span> `/contracts/[id]/approve` (결과물 최종 승인 및 대금정산)
* **설명**: 의뢰인이 제출된 결과물을 공식 검수 완료하고 대금 방출을 최종 컨펌합니다.
* **비즈니스 트랜잭션 (일괄 처리)**:
  - 계약서 상태가 `completed`로 변경됩니다.
  - 기존 에스크로 예치되어 보관 중인 결제 데이터의 상태가 `released` (정산 완료)로 변경되며 정산 시각 및 플랫폼 중개 수수료 수수 내역(10%, `fee`)과 프리랜서 실수령금(90%, `netAmount`) 정보가 영구 기입됩니다.
  - 프로젝트 최종 상태가 `completed`로 업데이트됩니다.
* **인증 요구**: 필수 (발주 의뢰인 전용)
* **응답 (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "success": true,
      "fee": 70000,
      "netAmount": 630000
    }
  }
  ```

---

## 4. 결제 관련 API

### <span class="badge badge-post">POST</span> `/payments/initiate` (결제 프로세스 초기화)
* **설명**: 서명이 끝난 합의 상태의 계약 대금을 에스크로 예치하기 위해 Toss Payments 결제 위젯을 호출하기 전, 고유한 Toss 주문번호(`pgOrderId`)와 요청 금액을 바인딩한 pending 결제 데이터를 데이터베이스에 안착시킵니다.
* **인증 요구**: 필수 (결제 주체인 의뢰인 전용)
* **요청 본문 (JSON)**:
  ```json
  {
    "contractId": "contract_id_9999"
  }
  ```
* **응답 (`200 OK`)**:
  * 이미 해당 계약 건에 활성화된 결제 트랙이 있을 경우 중복 생성을 막고 기존 pending 정보를 그대로 제공합니다.
  ```json
  {
    "success": true,
    "data": {
      "paymentId": "payment_doc_777",
      "orderId": "wb_1719131600_contrac",
      "amount": 700000
    }
  }
  ```

### <span class="badge badge-post">POST</span> `/payments/confirm` (PG 결제 승인 통보 및 완료)
* **설명**: 사용자 브라우저상에서 Toss Payments 카드/페이 인증이 완료된 후, 백엔드 서버에서 Toss 승인 API(`https://api.tosspayments.com/v1/payments/confirm`)를 직접 원격 호출하여 결제 무결성을 최종 검증하고 에스크로 예치를 완료시킵니다.
* **비즈니스 트랜잭션**:
  - Toss PG사 원격 응답 통과 시, 결제 도큐먼트 상태를 `"escrowed"` (예치 완료)로 변경합니다.
  - 프로젝트 최종 상태가 `"in_progress"` (작동 개발중) 상태로 갱신됩니다.
  - 계약서 상태 또한 정식 효력이 발휘되는 `"active"`로 최종 이행됩니다.
* **인증 요구**: 필수
* **요청 본문 (JSON)**:
  ```json
  {
    "paymentKey": "toss_payment_key_xyz",
    "orderId": "wb_1719131600_contrac",
    "amount": 700000
  }
  ```
* **응답 (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "success": true,
      "paymentId": "payment_doc_777"
    }
  }
  ```

### <span class="badge badge-get">GET</span> `/payments/[id]` (결제 내역 조회)
* **설명**: 특정 결제 원장에 기록된 충전금, 에스크로 예치 일시, 상태, 정산 대금 수수료 세역을 조회합니다.
* **인증 요구**: 필수 (해당 거래의 소유자(Client) 또는 수혜자(Freelancer) 한정)
* **응답 (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "payment_doc_777",
      "contractId": "contract_id_9999",
      "projectId": "project_id_101",
      "clientId": "client_uid_888",
      "freelancerId": "freelancer_uid_12",
      "amount": 700000,
      "fee": 70000,
      "netAmount": 630000,
      "pgOrderId": "wb_1719131600_contrac",
      "pgPaymentKey": "toss_payment_key_xyz",
      "status": "escrowed",
      "escrowedAt": { "_seconds": 1719131620 },
      "releasedAt": null,
      "createdAt": { "_seconds": 1719131600 }
    }
  }
  ```

---

## 5. 보조 유틸리티 API

### <span class="badge badge-post">POST</span> `/bookmarks/toggle` (관심 프로젝트 찜 설정/해제)
* **설명**: 구체적인 관심 일감에 대한 즐겨찾기를 켜고 끕니다. 소프트 삭제 모델을 응용하여 기존 북마크 정보가 존재한다면 `deletedAt` 날짜값 유무를 토글링하여 효율적으로 갱신합니다.
* **인증 요구**: 필수
* **요청 본문 (JSON)**:
  ```json
  {
    "projectId": "project_id_101"
  }
  ```
* **응답 (`200 OK` 또는 `201 Created`)**:
  ```json
  {
    "success": true,
    "data": {
      "bookmarked": true
    }
  }
  ```

### <span class="badge badge-get">GET</span> `/bookmarks` (찜한 프로젝트 목록 조회)
* **설명**: 로그인한 유저가 북마크해 둔 전체 프로젝트 목록을 관련 원본 데이터와 함께 해싱 및 동반 조회하여 출력합니다.
* **인증 요구**: 필수
* **응답 (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "bookmarks": [
        {
          "bookmarkId": "bookmark_doc_111",
          "id": "project_id_101",
          "title": "업무 자동화 구글 시트 챗봇 연동 의뢰",
          "status": "open",
          "budgetMin": 500000,
          "budgetMax": 1000000
        }
      ]
    }
  }
  ```

### <span class="badge badge-get">GET</span> `/notifications` (수신 알림 내역 조회)
* **설명**: 본인에게 온 중요 소식 및 채용 상태 알림 목록을 최신순 최대 50건 조회합니다.
* **인증 요구**: 필수
* **응답 (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "notifications": [
        {
          "id": "noti_id_001",
          "userId": "client_uid_888",
          "type": "application_received",
          "projectId": "project_id_101",
          "applicationId": "application_id_abcde",
          "read": false,
          "createdAt": { "_seconds": 1719131000 }
        }
      ]
    }
  }
  ```

### <span class="badge badge-patch">PATCH</span> `/notifications/[id]/read` (개별 알림 읽음 처리)
* **설명**: 지정된 고유 알림을 읽음(`read = true`)으로 전환합니다.
* **인증 요구**: 필수 (해당 알림의 주인만 가능)
* **응답 (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "success": true
    }
  }
  ```

### <span class="badge badge-patch">PATCH</span> `/notifications/read-all` (미독 알림 전체 읽음 처리)
* **설명**: 자신이 수신한 모든 미독 알림(`read == false`)을 Firestore Batch 기능을 사용해 한 번에 읽음 완료 처리합니다.
* **인증 요구**: 필수
* **응답 (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "updated": 1
    }
  }
  ```

### <span class="badge badge-get">GET</span> `/admin/stats` (어드민 대시보드 메트릭 산출)
* **설명**: 어드민 계정 권한 확인 후 전체 누적 유저 수, 직무별 유저 분류, 활성/완료 프로젝트 추이, 성사된 계약률 및 플랫폼의 실 수수료 누적 순매출액(`totalRevenue`) 메트릭을 집계하여 제공합니다.
* **인증 요구**: 필수 (어드민 역할 계정만 접근 가능)
* **응답 (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "totalUsers": 240,
      "clients": 90,
      "freelancers": 150,
      "totalProjects": 85,
      "openProjects": 12,
      "completedProjects": 60,
      "totalApplications": 310,
      "totalContracts": 72,
      "totalRevenue": 4820000
    }
  }
  ```

### <span class="badge badge-get">GET</span> `/cron/deadline` (기한 과료 일감 자동 정리 크론)
* **설명**: 모집 마감일이 현재 시간보다 과료된 활성 프로젝트들을 일괄 마감(`status: "closed"`)하고, 미지정 상태의 타 지원서들을 모두 일괄 취소 및 마감 알림을 전송하는 스케줄러 트리거입니다.
* **보안 요구**: 요청 헤더에 크론 비밀키가 인증되어야 합니다.
  ```http
  Authorization: Bearer <CRON_SECRET>
  ```
* **응답 (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "closed": 3
    }
  }
  ```

### <span class="badge badge-get">GET</span> `/health` (서비스 상태 헬스체크)
* **설명**: 무인프라 로드밸런싱 상태 체크에 활용 가능한 무인증 서비스 상태 응답기입니다.
* **응답 (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "status": "ok",
      "timestamp": "2026-06-24T00:05:00.000Z"
    }
  }
  ```
