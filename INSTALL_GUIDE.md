# Maker Desktop App - Installation & Troubleshooting Guide
# Maker 데스크톱 앱 - 설치 및 에러 대응 가이드

---

## Download / 다운로드

**[GitHub Releases](https://github.com/Salepark/maker/releases)** 에서 OS에 맞는 파일을 받으세요.

| OS | File / 파일 | Size / 크기 |
|----|------------|-------------|
| Windows | `Maker-Setup.exe` (installer) 또는 `Maker.exe` (portable) | ~280 MB |
| Mac | `Maker.dmg` | ~280 MB |
| Linux | `Maker.AppImage` 또는 `maker.deb` | ~280 MB |

---

## Windows Installation / 윈도우 설치

### Install / 설치

1. `Maker-Setup.exe` 다운로드
2. 더블클릭하여 실행
3. 설치 경로 선택 (기본값 추천)
4. 설치 완료 후 바탕화면 또는 시작 메뉴에서 **Maker** 실행

### Portable Version / 포터블 버전

설치 없이 사용하려면 `Maker.exe`를 다운로드하여 바로 실행하세요.

### Windows Troubleshooting / 윈도우 에러 대응

#### "Windows의 PC 보호" 경고 (SmartScreen)

> Windows Defender SmartScreen이 인식할 수 없는 앱의 시작을 방지했습니다.

**해결:**
1. "추가 정보" 클릭
2. "실행" 버튼 클릭

이 경고는 코드 서명이 없는 앱에서 나타나며, 처음 한 번만 허용하면 됩니다.

#### 빈 화면 (White Screen)

**해결:**
1. 앱을 완전히 종료 (작업 표시줄에서 우클릭 > 닫기)
2. 10초 기다린 후 다시 실행
3. 그래도 안 되면 명령 프롬프트(cmd)에서 실행하여 에러 확인:
```cmd
"C:\Users\[사용자이름]\AppData\Local\Programs\Maker\Maker.exe"
```

#### Port 5000 충돌

> Error: listen EADDRINUSE: address already in use 127.0.0.1:5000

이전 실행이 완전히 종료되지 않았을 때 발생합니다.

**해결 (명령 프롬프트):**
```cmd
netstat -ano | findstr :5000
taskkill /PID [표시된PID번호] /F
```

**또는 작업 관리자에서:**
1. `Ctrl+Shift+Esc`로 작업 관리자 열기
2. "Maker" 또는 "Node.js" 프로세스 찾기
3. "작업 끝내기" 클릭
4. Maker 다시 실행

---

## Mac Installation / 맥 설치

### Install / 설치

1. `Maker.dmg` 다운로드
2. 더블클릭하여 DMG 열기
3. Maker 아이콘을 **Applications** 폴더로 드래그
4. DMG 꺼내기 (디스크 아이콘 우클릭 > 추출)

### Mac Troubleshooting / 맥 에러 대응

#### "개발자를 확인할 수 없습니다" / "악성 코드가 없음을 확인할 수 없습니다"

> 'Maker'은(는) 알 수 없는 개발자가 만든 앱이므로 열 수 없습니다.

코드 서명이 없는 앱에서 나타나는 macOS 보안 경고입니다.

**해결 (방법 1 - 터미널):**
```bash
sudo xattr -cr /Applications/Maker.app
```
비밀번호 입력 후 Maker 실행

**해결 (방법 2 - Finder):**
1. Finder에서 Applications 폴더 열기
2. Maker.app을 **Control + 클릭** (또는 트랙패드 두 손가락 클릭)
3. 메뉴에서 **"열기"** 선택
4. 경고 대화상자에서 **"열기"** 버튼 클릭

이 과정은 처음 한 번만 하면 됩니다.

#### 앱이 바로 종료됨 (시작되자마자 사라짐)

**원인 확인 - 터미널에서 실행:**
```bash
/Applications/Maker.app/Contents/MacOS/Maker
```
에러 메시지가 터미널에 표시됩니다.

#### 빈 화면 (White Screen)

서버가 시작되었지만 화면이 비어 있는 경우:

**해결 1 - 새로고침:**
- `Cmd + R`로 페이지 새로고침

**해결 2 - 포트 충돌 확인:**
```bash
lsof -ti:5000 | xargs kill -9
```
이후 Maker 다시 실행

**해결 3 - 터미널에서 서버 상태 확인:**
```bash
curl http://127.0.0.1:5000/api/health
```
응답이 오면 서버는 정상입니다. `Cmd + R`로 새로고침하세요.

#### Port 5000 충돌

> Error: listen EADDRINUSE: address already in use 127.0.0.1:5000

이전 실행이 완전히 종료되지 않았을 때 발생합니다.

**해결:**
```bash
lsof -ti:5000 | xargs kill -9
```
이후 Maker 다시 실행

#### 앱 종료 방법

앱을 완전히 종료하려면:
- 창의 **빨간 X 버튼** 클릭, 또는
- **Cmd + Q** 누르기

이렇게 하면 서버도 함께 종료됩니다.

---

## Linux Installation / 리눅스 설치

### AppImage (추천)

```bash
# 1. 다운로드한 파일에 실행 권한 부여
chmod +x Maker.AppImage

# 2. 실행
./Maker.AppImage
```

### Debian/Ubuntu (.deb)

```bash
# 1. 설치
sudo dpkg -i maker_amd64.deb

# 2. 의존성 문제 시
sudo apt-get install -f

# 3. 실행
maker
```

### Linux Troubleshooting / 리눅스 에러 대응

#### AppImage 실행 안 됨

```bash
# 실행 권한 확인
chmod +x Maker.AppImage

# FUSE가 필요할 수 있음
sudo apt-get install fuse libfuse2
```

#### 빈 화면

```bash
# 포트 확인
ss -tlnp | grep 5000

# 포트 사용 중이면 종료
kill $(lsof -ti:5000)

# 다시 실행
./Maker.AppImage
```

#### Sandbox 에러

> FATAL:setuid_sandbox_host.cc - The SUID sandbox helper binary was found...

```bash
# --no-sandbox 옵션으로 실행
./Maker.AppImage --no-sandbox
```

---

## Common Issues / 공통 문제

### 데이터 저장 위치

Maker는 로컬에 SQLite 데이터베이스를 저장합니다:

| OS | 경로 |
|----|------|
| Windows | `%AppData%\maker\maker.db` |
| Mac | `~/Library/Application Support/maker/maker.db` |
| Linux | `~/.config/maker/maker.db` |

### 데이터 초기화 (리셋)

모든 데이터를 삭제하고 처음부터 시작하려면 위 경로의 `maker.db` 파일을 삭제하세요.

**Mac 예시:**
```bash
rm ~/Library/Application\ Support/maker/maker.db
```

**Windows 예시 (PowerShell):**
```powershell
Remove-Item "$env:APPDATA\maker\maker.db"
```

### 서버 로그 확인

문제가 계속될 때 터미널에서 실행하면 상세 로그를 볼 수 있습니다:

| OS | 명령어 |
|----|--------|
| Windows | `"C:\Users\[사용자]\AppData\Local\Programs\Maker\Maker.exe"` |
| Mac | `/Applications/Maker.app/Contents/MacOS/Maker` |
| Linux | `./Maker.AppImage` (터미널에서) |

로그에서 확인할 키워드:
- `[server] serving on port 5000` - 서버 정상 시작
- `[server:err]` - 서버 에러
- `EADDRINUSE` - 포트 충돌
- `ENOTSUP` - 네트워크 에러

### LLM API 키 설정

AI 분석 기능을 사용하려면 앱 내 Settings에서 LLM Provider를 설정하세요:
1. Maker 앱 실행
2. 좌측 메뉴에서 **Settings** 클릭
3. **LLM Providers** 섹션에서 API 키 입력
4. 지원 서비스: OpenAI, Anthropic, Google AI 등

---

## Version Info / 버전 정보

- Node.js: v20+ (내장)
- Electron: v33+
- SQLite: better-sqlite3 (내장)

---

## Need Help? / 도움이 필요하면

GitHub Issues에 에러 메시지와 함께 보고해 주세요:
**[https://github.com/Salepark/maker/issues](https://github.com/Salepark/maker/issues)**

보고 시 포함하면 좋은 정보:
1. OS 종류 및 버전 (예: macOS 15.3, Windows 11)
2. 에러 메시지 전문 (터미널에서 실행하여 확인)
3. 스크린샷 (가능하면)
