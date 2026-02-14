# Maker Desktop - 설치 & 실행 가이드

---

## 설치 파일 다운로드 (가장 간단한 방법)

GitHub Releases에서 본인 OS에 맞는 파일을 받으세요:

**[https://github.com/Salepark/maker/releases](https://github.com/Salepark/maker/releases)**

| OS | 다운로드 파일 | 설치 방법 |
|----|-------------|-----------|
| Windows | `Maker.exe` (portable) 또는 `Maker-Setup.exe` (installer) | 더블클릭으로 실행 |
| Mac | `Maker.dmg` | 더블클릭 > Maker를 Applications로 드래그 |
| Linux | `Maker.AppImage` | `chmod +x Maker.AppImage` 후 실행 |

설치 파일은 코드가 업데이트될 때마다 자동으로 새 버전이 올라갑니다.

### Mac에서 "개발자를 확인할 수 없습니다" 경고가 나올 때

Maker.app 우클릭 > "열기" 를 선택하면 됩니다 (처음 한 번만).

---

## 소스에서 직접 빌드 (개발자용)

아래는 코드를 직접 받아서 개발 모드로 실행하는 방법입니다.

`clone` -> `npm install` -> `npm run dev:desktop` — 이 3단계로 끝납니다.

---

## 사전 준비

### 필수 설치 프로그램

| 항목 | 최소 버전 | 확인 명령어 |
|------|-----------|-------------|
| Node.js | 18 이상 | `node -v` |
| npm | 9 이상 | `npm -v` |
| Git | 최신 | `git --version` |

### OS별 추가 준비

**Mac:**
```bash
xcode-select --install
```

**Windows:**
- [Visual Studio Build Tools](https://visualstudio.microsoft.com/ko/visual-studio-build-tools/) 설치
- "C++ 빌드 도구" 워크로드 선택

---

## STEP 1 - 코드 다운로드 & 설치

```bash
git clone https://github.com/Salepark/maker.git
cd maker
npm install
```

`npm install` 후 `better-sqlite3` 관련 오류가 나면:
```bash
npm rebuild better-sqlite3
```

---

## STEP 2 - Dev 모드 실행

```bash
npm run dev:desktop
```

이 명령 하나로 Mac / Windows / Linux 전부 동작합니다.
(`cross-env`로 환경변수를 OS에 관계없이 통일 처리합니다)

내부적으로 실행되는 명령:
```
cross-env MAKER_DB=sqlite MAKER_DESKTOP=true NODE_ENV=development electron -r tsx/register electron/main.ts
```

### 성공하면 이렇게 됩니다

1. 터미널에 `[electron] Starting Maker desktop app...` 로그 출력
2. `[server] serving on port 5000` 로그 출력
3. Electron 창이 열림
4. **로그인 화면 없이** 바로 대시보드 진입 (로컬 자동 로그인)

### 기본 확인 사항

| 확인 항목 | 예상 결과 |
|-----------|-----------|
| Electron 창 표시 | 대시보드 화면이 보임 |
| 로그인 과정 | 없음 (자동 진입) |
| Health 체크 | 브라우저에서 `http://localhost:5000/api/health` 접속 시 `driver: "sqlite"` 표시 |

**여기까지 성공하면 80% 완료입니다.**

---

## STEP 3 - 기본 기능 테스트

### 소스 추가 & Fast Report 테스트

1. 사이드바에서 "Sources" 클릭
2. RSS 소스 추가 (예: `https://news.ycombinator.com/rss`)
3. 봇 상세 페이지에서 "Run Now" 클릭
4. 2~3초 내에 Fast Report 생성 확인

### SQLite 파일 확인

소스를 추가하면 SQLite 파일이 자동 생성됩니다:

**Mac:**
```bash
ls ~/Library/Application\ Support/Maker/maker.db
```

**Windows:**
```powershell
dir "$env:APPDATA\Maker\maker.db"
```

**Linux:**
```bash
ls ~/.config/Maker/maker.db
```

파일이 존재하면 데이터가 정상 저장되고 있는 것입니다.

---

## STEP 4 - 프로덕션 빌드 (선택사항)

실행 파일(.app, .exe)을 만들려면:

```bash
# 1. 클라이언트 + 서버 번들링
npm run build:desktop

# 2. 실행 파일 패키징
npm run pack:desktop
```

성공 시 `dist-electron/` 폴더에 생성됩니다:

| OS | 생성 파일 |
|----|-----------|
| Mac | `Maker.app`, `Maker.dmg` |
| Windows | `Maker.exe` (portable), `Maker Setup.exe` (installer) |
| Linux | `Maker.AppImage`, `maker.deb` |

---

## 자주 발생하는 문제 & 해결

### 1. Electron 창은 뜨지만 화면이 비어있음

**원인:** 서버가 아직 시작되지 않은 상태에서 페이지 로딩

**해결:**
- 터미널에서 `[server] serving on port 5000` 로그가 나오는지 확인
- Electron 창에서 `Cmd+R` (Mac) / `Ctrl+R` (Windows)로 새로고침

### 2. `better-sqlite3` 네이티브 모듈 오류

```
Error: Module did not self-register
```

**해결:**
```bash
npm rebuild better-sqlite3
```

Mac에서 계속 오류 시:
```bash
npm rebuild better-sqlite3 --build-from-source
```

### 3. `npm run dev:desktop`이 동작하지 않을 때 (수동 실행)

스크립트 없이 직접 실행하려면:

**Mac / Linux:**
```bash
MAKER_DB=sqlite MAKER_DESKTOP=true NODE_ENV=development npx electron -r tsx/register electron/main.ts
```

**Windows (PowerShell):**
```powershell
$env:MAKER_DB="sqlite"
$env:MAKER_DESKTOP="true"
$env:NODE_ENV="development"
npx electron -r tsx/register electron/main.ts
```

**Windows (CMD):**
```cmd
set MAKER_DB=sqlite
set MAKER_DESKTOP=true
set NODE_ENV=development
npx electron -r tsx/register electron/main.ts
```

### 4. Port 5000 already in use

**해결:**
```bash
# Mac/Linux
lsof -i :5000 | grep LISTEN
kill -9 <PID>

# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### 5. 패키징 시 코드 서명 경고 (Mac)

Mac에서 서명 없이 빌드하면 "개발자를 확인할 수 없습니다" 경고가 나옵니다.

**테스트용 우회:**
- `Maker.app` 우클릭 > "열기" 선택 (처음 한 번만)

**또는 빌드 시 서명 건너뛰기:**
```bash
CSC_IDENTITY_AUTO_DISCOVERY=false npm run pack:desktop
```

### 6. 앱 종료 후에도 서버 프로세스가 남아있음

```bash
# Mac/Linux
pkill -f "tsx server/index.ts"

# Windows
taskkill /F /IM node.exe
```

---

## 실행 파일 테스트 체크리스트

더블클릭으로 실행한 후 아래 항목을 점검합니다:

| 테스트 항목 | 확인 |
|-------------|------|
| 앱 실행 (더블클릭) | |
| 로그인 없이 바로 진입 | |
| RSS 소스 추가 | |
| Fast Report 생성 (2~3초) | |
| SQLite 파일 생성 확인 | |
| 앱 종료 후 재실행 시 데이터 유지 | |
| 인터넷 끊고 Fast Report 생성 | |

---

## npm 스크립트 정리

| 스크립트 | 용도 |
|----------|------|
| `npm run dev:desktop` | Dev 모드 Electron 실행 (SQLite, 자동 로그인) |
| `npm run build:desktop` | 프로덕션용 클라이언트+서버 번들링 |
| `npm run pack:desktop` | .app / .exe / .AppImage 패키징 |
| `npm run dev` | 클라우드 모드 서버 실행 (PostgreSQL) |

---

## 프로젝트 구조 (Desktop 관련)

```
maker/
├── electron/
│   ├── main.ts               # Electron 메인 프로세스 (서버 시작, 창 생성)
│   ├── preload.ts            # 브라우저에 window.maker / window.electronAPI 노출
│   └── electron-builder.yml  # 패키징 설정
├── script/
│   ├── build.ts              # 클라우드용 빌드
│   └── build-desktop.ts      # 데스크톱용 빌드 (서버+클라이언트+Electron)
├── server/
│   ├── db.ts                 # DB 드라이버 분기 (PostgreSQL / SQLite)
│   ├── init-sqlite.ts        # SQLite 테이블 초기화
│   └── storage-sqlite.ts     # SQLite 전용 스토리지 구현
├── shared/
│   ├── schema.ts             # PostgreSQL 스키마 (Drizzle)
│   └── schema.sqlite.ts      # SQLite 스키마 (Drizzle)
└── LOCAL_SETUP.md            # 이 문서
```

---

## 다음 단계 (테스트 통과 후)

1. 앱 아이콘 & 브랜딩 적용
2. 자동 업데이트 (electron-updater)
3. 코드 서명 (Apple Developer / Windows Authenticode)
4. 배포 채널 설정 (GitHub Releases)

---

## 문제가 생기면

Dev 모드 실행 시 터미널에 나오는 로그를 확인하세요:
- `[electron]` - Electron 메인 프로세스 로그
- `[server]` - Express 서버 로그
- `[server:err]` - 서버 에러 로그

로그 내용과 함께 문의하면 빠르게 해결할 수 있습니다.
