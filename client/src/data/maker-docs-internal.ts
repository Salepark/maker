import type { MindMapNode, MindMapDoc } from "./maker-docs";

export const internalTreeNodes: MindMapNode[] = [
  {
    id: "business",
    labelKo: "비즈니스 및 제품 전략",
    labelEn: "Business & Product Strategy",
    color: "#ef4444",
    children: [
      {
        id: "deploy",
        labelKo: "단계별 배포 모델",
        labelEn: "Phased Deployment Model",
        color: "#ef4444",
        children: [
          { id: "deploy-1", labelKo: "Core: 오픈소스 (신뢰 및 확산)", labelEn: "Core: Open Source (Trust & Diffusion)", color: "#ef4444", docId: "deploy-oss" },
          { id: "deploy-2", labelKo: "Pro: 유료 데스크톱 (수익화)", labelEn: "Pro: Paid Desktop (Monetization)", color: "#ef4444", docId: "deploy-pro" },
          { id: "deploy-3", labelKo: "Enterprise: 기업용 클라우드", labelEn: "Enterprise: Cloud/On-Premise", color: "#ef4444", docId: "deploy-enterprise" },
        ],
      },
      {
        id: "roadmap",
        labelKo: "진화 로드맵",
        labelEn: "Evolution Roadmap",
        color: "#a855f7",
        children: [
          { id: "road-1", labelKo: "Phase 1: 개인용 통제 엔진 완성", labelEn: "Phase 1: Personal Control Engine", color: "#a855f7", docId: "road-phase1" },
          { id: "road-2", labelKo: "Phase 2: AI 리소스 커널", labelEn: "Phase 2: AI Resource Kernel", color: "#a855f7", docId: "road-phase2" },
          { id: "road-3", labelKo: "Phase 3: 분산형 AI 거버넌스 OS", labelEn: "Phase 3: Distributed AI Governance OS", color: "#a855f7", docId: "road-phase3" },
        ],
      },
    ],
  },
  {
    id: "overview",
    labelKo: "종합 전략 문서",
    labelEn: "Comprehensive Strategy Documents",
    color: "#64748b",
    children: [
      { id: "ov-1", labelKo: "AI 시대의 기업용 제어 인프라 구축 전략", labelEn: "Enterprise Control Infrastructure Strategy for the AI Era", color: "#64748b", docId: "ov-enterprise-strategy" },
      { id: "ov-2", labelKo: "개인 자동화 운영체제 브리핑 문서", labelEn: "Personal Automation OS Briefing Document", color: "#64748b", docId: "ov-briefing" },
      { id: "ov-3", labelKo: "권한 관리 및 리스크 통제 운영 가이드라인", labelEn: "Permission Management & Risk Control Guidelines", color: "#64748b", docId: "ov-guidelines" },
      { id: "ov-4", labelKo: "통제 우선 AI 운영체제 전략 로드맵", labelEn: "Control-First AI OS Strategic Roadmap", color: "#64748b", docId: "ov-roadmap" },
    ],
  },
];

export const internalDocuments: Record<string, MindMapDoc> = {
  "deploy-oss": {
    id: "deploy-oss",
    titleKo: "Core: 오픈소스 — 신뢰와 확산의 3단계 설계도",
    titleEn: "Core: Open Source — 3-Phase Blueprint for Trust & Diffusion",
    contentKo: [
      "'Core 오픈소스' 전략은 단순히 무료 소프트웨어를 배포하는 것을 넘어, 신뢰 기반 자동화 플랫폼을 완성하기 위한 가장 결정적인 기초 공사이자 전략적 지렛대입니다.",
      "데스크톱 기반의 자동화 엔진, 11개 권한 시스템, 로컬 DB(SQLite), Fast-first 리포트 등 운영체제의 가장 핵심적인 뼈대를 오픈소스로 공개합니다. 이는 '모든 데이터를 로컬에서 처리하며 백도어가 없다'는 점을 코드 레벨에서 투명하게 증명합니다.",
      "Core를 오픈소스로 풀면 가장 빠른 속도로 사용자를 확산시키고 개발자 커뮤니티를 유입시킬 수 있습니다. 외부 개발자들의 기여를 통해 플러그인, 데이터 소스 커넥터, 자동화 레시피 생태계가 자발적으로 확장됩니다.",
      "기능을 팔아 단기 수익을 내는 대신, '데이터 주권과 통제권'이라는 철학을 널리 이식하여 타 SaaS 기업들이 침범할 수 없는 '대체 불가능한 신뢰 인프라'를 선점하는 행위입니다.",
    ],
    contentEn: [
      "The 'Core Open Source' strategy goes beyond distributing free software — it's the most critical groundwork and strategic lever for completing a trust-based automation platform.",
      "The most essential skeleton of the OS — desktop-based automation engine, 11-permission system, local DB (SQLite), Fast-first reports — is released as open source. This transparently proves at the code level that 'all data is processed locally with no backdoors.'",
      "Releasing Core as open source enables the fastest user diffusion and developer community influx. Through external developer contributions, plugin, data source connector, and automation recipe ecosystems expand organically.",
      "Instead of selling features for short-term revenue, this is the act of broadly planting the philosophy of 'data sovereignty and control,' pre-empting 'irreplaceable trust infrastructure' that other SaaS companies cannot invade.",
    ],
  },
  "deploy-pro": {
    id: "deploy-pro",
    titleKo: "Pro: 유료 데스크톱 — 신뢰 기반 수익화",
    titleEn: "Pro: Paid Desktop — Trust-Based Monetization",
    contentKo: [
      "'Pro: 유료 데스크톱'은 신뢰 확보를 위한 오픈소스와 대규모 거버넌스를 위한 기업용 확장 사이에 위치하는 전략적 수익화 계층입니다.",
      "자동화 엔진과 11개 권한 시스템 같은 핵심 뼈대는 무료(Core)로 풀어 신뢰를 먼저 얻고, 이후 생태계에 정착한 파워 유저들을 대상으로 Pro 버전을 통해 직접적인 수익을 창출합니다.",
      "Pro 모델의 독점 기능: 고급 자비스 모드 및 장기 메모리, 고급 LLM 오케스트레이션 및 다중 에이전트 협업, 조직 동기화/자동 업그레이드/클라우드 동기화, 고급 감사 로그 및 암호화 백업.",
      "Pro 버전은 기업용 인증 같은 무거운 인프라 없이도 '공유 리스크 대시보드'나 '공유 봇' 정도의 기능으로 소규모 팀의 지갑을 열게 만들어 리스크 없이 사업을 확장하는 단계입니다.",
    ],
    contentEn: [
      "'Pro: Paid Desktop' is a strategic monetization layer positioned between open source for trust-building and enterprise expansion for large-scale governance.",
      "Core features like the automation engine and 11-permission system are released free to earn trust first, then Pro version generates direct revenue from power users who've settled into the ecosystem.",
      "Pro exclusive features: Advanced Jarvis mode & long-term memory, advanced LLM orchestration & multi-agent collaboration, org sync/auto-upgrade/cloud sync, advanced audit logs & encrypted backup.",
      "The Pro version opens small team wallets with features like 'shared risk dashboards' and 'shared bots' without heavy enterprise infrastructure, enabling risk-free business expansion.",
    ],
  },
  "deploy-enterprise": {
    id: "deploy-enterprise",
    titleKo: "Enterprise: 기업용 클라우드/온프레미스",
    titleEn: "Enterprise: Cloud/On-Premise for Organizations",
    contentKo: [
      "'Enterprise: 클라우드/온프레미스'은 Maker가 궁극적으로 도달하고자 하는 최종 종착지(Phase 3)이자, 개인용 도구에서 '조직 단위의 거버넌스 인프라'로 진화하는 로드맵의 완성입니다.",
      "수익성이 가장 높은 기업용 시장 진출을 의도적으로 3년 차(Phase 3)로 미룹니다. 초기부터 무거운 기업용 인증(SSO)이나 규제 준수 기능을 개발하면 코드 복잡도는 2~3배, 정책 복잡도는 5배, 법적 책임은 100배로 늘어납니다.",
      "Enterprise 버전은 Kubernetes 등을 통한 On-premise/VPC 내부망 배포를 지원하며 PostgreSQL을 사용합니다. 기업은 사내 구축형 LLM과 연결하거나 ERP/CRM 및 데이터 레이크와 AI를 안전하게 결합할 수 있습니다.",
      "1, 2단계에서 증명된 '통제 중심, 데이터 보호' 철학이 기업 고객에게 강력한 세일즈 포인트가 되며, 고액의 연간 라이선스 및 유지보수 계약의 기반이 됩니다.",
    ],
    contentEn: [
      "'Enterprise: Cloud/On-Premise' is the ultimate destination (Phase 3) Maker aims to reach — the completion of the roadmap evolving from a personal tool to organizational governance infrastructure.",
      "Entry into the highest-revenue enterprise market is deliberately delayed to Year 3 (Phase 3). Building heavy enterprise authentication (SSO) or compliance features from the start would increase code complexity 2-3x, policy complexity 5x, and legal liability 100x.",
      "The Enterprise version supports On-premise/VPC deployment via Kubernetes and uses PostgreSQL. Enterprises can connect internal LLMs or safely combine ERP/CRM and data lakes with AI.",
      "The 'control-centric, data protection' philosophy proven in Phases 1-2 becomes a powerful sales point for enterprise clients, forming the basis for high-value annual licenses and maintenance contracts.",
    ],
  },
  "road-phase1": {
    id: "road-phase1",
    titleKo: "Phase 1: 개인용 통제 엔진 완성",
    titleEn: "Phase 1: Personal Control Engine Completion",
    contentKo: [
      "진화 로드맵의 '1단계: 개인용 통제 엔진 완성(Personal Maker OS / Governable Autonomy)'은 단순한 초기 버전 앱의 출시가 아닙니다. 이는 '통제권'을 개인의 로컬 환경에서 완벽하게 증명해 내는 가장 중요한 기초 공사입니다.",
      "로드맵에서 가장 특징적인 부분은 수익성이 높은 기업용 기능의 도입을 초기에 철저히 배제한다는 점입니다. 오직 '가장 안전한 개인 AI 운영체제'를 만드는 데만 포커스를 맞춥니다.",
      "1단계 기술적 목표: 리스크 예산 시스템(Risk Budget System), AI가 왜 특정 행동을 했는지 투명하게 보여주는 '설명 가능성 레이어(Explainability Layer)' 구축.",
      "사용자의 PC 환경에서 데이터를 완벽히 통제하는 '개인용 데스크톱 앱'을 오픈소스로 먼저 제공함으로써, '내 컴퓨터에서 돌아가는 나만의 자동화 비서'라는 가치를 직관적으로 증명합니다.",
    ],
    contentEn: [
      "Phase 1 'Personal Control Engine Completion (Personal Maker OS / Governable Autonomy)' is not simply releasing an early version app. It's the most important groundwork to perfectly prove 'control' in individual local environments.",
      "The most distinctive aspect of the roadmap is that it thoroughly excludes introduction of profitable enterprise features early on. Focus is solely on creating 'the safest personal AI operating system.'",
      "Phase 1 technical goals: Risk Budget System, building an 'Explainability Layer' that transparently shows why AI took specific actions.",
      "By first providing the 'personal desktop app' as open source — perfectly controlling data in the user's PC environment — it intuitively proves the value of 'my own automation assistant running on my computer.'",
    ],
  },
  "road-phase2": {
    id: "road-phase2",
    titleKo: "Phase 2: AI 리소스 커널",
    titleEn: "Phase 2: AI Resource Kernel",
    contentKo: [
      "'2단계: AI 리소스 커널(PHASE 2 — AI Resource Kernel)'은 Maker가 단순한 자동화 툴을 넘어 진정한 의미의 '운영체제(OS)'로 전환되는 가장 결정적인 기술적 기점입니다.",
      "각 AI의 실행은 단순한 스크립트가 아니라 하나의 독립된 'AI 프로세스(AIP)'와 'AI 스레드(Thread)'로 취급됩니다. Ready(대기), Running(실행), Blocked(정책), Suspended(일시중지), Terminated(종료)의 5가지 상태를 가집니다.",
      "프로세스 간의 우선순위를 설정하고, 동시 실행을 제한하며, 사용자별로 LLM 호출 쿼터(Quota)를 배분합니다. 일일 LLM 호출 예산, 토큰 예산, 각 LLM 모델별 비용 가중치까지 설정할 수 있습니다.",
      "각 AI 봇은 자신의 'Capability Box(샌드박스)' 안에서만 실행되도록 철저히 격리됩니다. 가상의 파일 시스템, 가상의 네트워크 환경, 가상의 텔레그램 스코프 등 제한된 환경만을 봇에게 제공합니다.",
    ],
    contentEn: [
      "Phase 2 'AI Resource Kernel' is the most decisive technical turning point where Maker transitions from a simple automation tool to a true 'Operating System (OS).'",
      "Each AI execution is treated not as a simple script but as an independent 'AI Process (AIP)' and 'AI Thread.' They have 5 states: Ready, Running, Blocked (Policy), Suspended, and Terminated.",
      "It sets priorities between processes, limits concurrent execution, and allocates per-user LLM call quotas. Daily LLM call budgets, token budgets, and per-model cost weights can all be configured.",
      "Each AI bot is thoroughly isolated to run only within its 'Capability Box (Sandbox).' Bots receive only limited environments: virtual file systems, virtual network environments, virtual Telegram scopes.",
    ],
  },
  "road-phase3": {
    id: "road-phase3",
    titleKo: "Phase 3: 분산형 AI 거버넌스 OS",
    titleEn: "Phase 3: Distributed AI Governance OS",
    contentKo: [
      "'3단계: 분산형 AI 운영체제 구축(Distributed AI OS / Governance Layer)'은 3년에 걸친 장기 비전의 최종 목적지이자 완성본입니다.",
      "1단계가 '개인용 통제 엔진'을, 2단계가 'AI 자원 커널'을 구축했다면, 3단계는 수많은 사용자가 존재하는 조직 환경으로 통제 인프라를 확장합니다. '내가 내 AI를 통제한다'에서 '조직이 조직의 AI를 통제한다'로 철학이 도약합니다.",
      "데스크톱을 통제 커널(Kernel)로 삼고 클라우드를 실행 워커(Worker)로 사용하는 하이브리드 구조를 도입합니다. Air-gapped 완전 오프라인 환경까지 지원합니다.",
      "7대 철학이 시스템 내부의 'AI 헌법(AI Constitution)'으로서 코드 레벨에서 물리적으로 강제됩니다. 정책 버전 관리(Policy Versioning) 기능으로 정책 변경을 기록하고 롤백할 수 있습니다.",
    ],
    contentEn: [
      "Phase 3 'Distributed AI OS (Governance Layer)' is the final destination and completion of the 3-year long-term vision.",
      "Phase 1 built the 'personal control engine,' Phase 2 built the 'AI resource kernel,' and Phase 3 expands the control infrastructure to organizational environments with many users. Philosophy leaps from 'I control my AI' to 'The organization controls its AI.'",
      "A hybrid structure is introduced where the desktop serves as the control kernel and the cloud serves as execution workers. It even supports air-gapped fully offline environments.",
      "The 7 principles are physically enforced at the code level as an 'AI Constitution' within the system. Policy Versioning enables recording and rolling back policy changes.",
    ],
  },
  "ov-enterprise-strategy": {
    id: "ov-enterprise-strategy",
    titleKo: "AI 시대의 기업용 제어 인프라 구축 전략",
    titleEn: "Enterprise Control Infrastructure Strategy for the AI Era",
    contentKo: [
      "기존 AI 서비스의 전략적 한계점: 운영 가시성 결여(Black Box Logic), 데이터 통제권 상실, 실행 보장성 부재(무한 로딩 현상), 법적 책임 및 준거성 위반.",
      "Maker는 단순한 자동화 툴이 아닌, 기업의 데이터 자산과 AI 실행 프로세스를 관리하는 'AI 제어 운영체제(OS)'입니다. AI를 커널 레벨에서 제어되는 하나의 '프로세스'로 취급하여 권한과 리소스를 엄격히 배분합니다.",
      "로컬 퍼스트 아키텍처를 통해 물리적 데이터 점유, 법적 책임 경감, 감사 가능성을 확보합니다. 11개 세부 권한과 리스크 티어, 정량적 리스크 예산 시스템으로 AI의 자율성에 정량화된 경계를 설정합니다.",
      "5단계 로드맵: Governable Autonomy → AI Resource Kernel(AIP 도입) → Human Governance(AI 헌법) → Distributed Control → Standard. Core 오픈소스 + Pro/Enterprise 유료 수익 모델.",
    ],
    contentEn: [
      "Strategic limitations of existing AI services: Lack of operational visibility (Black Box Logic), loss of data control, absence of execution guarantees (infinite loading), legal liability and compliance violations.",
      "Maker is not a simple automation tool but an 'AI Control Operating System (OS)' that manages enterprise data assets and AI execution processes. It treats AI as a 'process' controlled at the kernel level, strictly allocating permissions and resources.",
      "Through Local-first architecture, it secures physical data possession, legal liability reduction, and auditability. The 11 granular permissions, risk tiers, and quantitative risk budget system set quantified boundaries on AI autonomy.",
      "5-Phase Roadmap: Governable Autonomy → AI Resource Kernel (AIP) → Human Governance (AI Constitution) → Distributed Control → Standard. Core open source + Pro/Enterprise paid revenue model.",
    ],
  },
  "ov-briefing": {
    id: "ov-briefing",
    titleKo: "개인 자동화 운영체제 브리핑 문서",
    titleEn: "Personal Automation OS Briefing Document",
    contentKo: [
      "Maker는 AI 실행의 통제권과 데이터 소유권을 사용자에게 돌려주기 위해 설계된 'Control-First AI Operating System'입니다. AI를 '통제 가능한 시스템'으로 만드는 실행 인프라를 지향합니다.",
      "7대 절대 원칙: 통제는 항상 인간에게, 기본값은 최소 권한, 데이터는 사용자 소유, AI는 블랙박스가 아님, 의사결정 구조 설계, AI 제공자 교체 가능(BYO LLM), 자동화는 보조 수단.",
      "시장 포지셔닝: 자동화 빌더(Make, n8n), SaaS 연결기(Zapier), 자율 에이전트(몰트봇)와 차별화. 핵심 문구: '우리는 봇을 판매하지 않습니다. 우리는 운영체제를 만듭니다.'",
      "주요 기능: 11개 세부 권한의 정책 기반 권한 엔진, Fast-first 리포트 시스템, 로컬 우선 아키텍처(Electron + SQLite). 사업 구조: Core 오픈소스 + Pro 유료 3단계 전략.",
    ],
    contentEn: [
      "Maker is a 'Control-First AI Operating System' designed to return AI execution control and data ownership to users. It aims to build execution infrastructure that makes AI a 'controllable system.'",
      "7 Absolute Principles: Control always with humans, default minimum permission, user data ownership, AI is not a black box, decision structure design, replaceable AI providers (BYO LLM), automation as assistance.",
      "Market Positioning: Differentiated from automation builders (Make, n8n), SaaS connectors (Zapier), and autonomous agents. Core message: 'We don't sell bots. We build an operating system.'",
      "Key Features: Policy-based permission engine with 11 granular permissions, Fast-first report system, Local-first architecture (Electron + SQLite). Business structure: Core open source + Pro paid 3-phase strategy.",
    ],
  },
  "ov-guidelines": {
    id: "ov-guidelines",
    titleKo: "권한 관리 및 리스크 통제 운영 가이드라인",
    titleEn: "Permission Management & Risk Control Operating Guidelines",
    contentKo: [
      "AI를 '신뢰의 대상'이 아닌 '통제의 대상'으로 정의합니다. 커널 수준의 권한 설계와 거버넌스 프레임워크의 운영 표준입니다.",
      "권한 체계 거버넌스 매트릭스: 웹 수집(WEB_RSS, WEB_FETCH), LLM 활용(LLM_USE, LLM_EGRESS_LEVEL), 파일 시스템(FS_READ, FS_WRITE, FS_DELETE), 일정 및 실행(CAL_READ, CAL_WRITE, SCHEDULE_WRITE, SOURCE_WRITE).",
      "동적 권한 관리: 60초 TTL 시스템. 고위험 권한에 대해 60초 유효 기간의 '1회 승인' 시스템을 적용합니다. 승인된 권한은 단일 태스크 완료 후 자동 폐기됩니다.",
      "3중 하드 타임아웃: 클라이언트 정체 감지(12초), 서버 하드 타임아웃(25초), 절대 타임아웃(30초). 어떤 프로세스도 위 시간을 초과하여 자원을 점유할 수 없습니다.",
      "계획 무결성 보호(Integrity Protection): AI가 수립한 실행 계획에 대해 인간이 승인하는 순간 해시값을 생성합니다. 실행 엔진은 매 단계마다 해시를 대조하며, AI가 승인 이후에 계획을 변경하려 할 경우 무결성 위반으로 즉시 차단합니다.",
    ],
    contentEn: [
      "Defines AI not as an 'object of trust' but as an 'object of control.' This is the operational standard for kernel-level permission design and governance frameworks.",
      "Permission Governance Matrix: Web collection (WEB_RSS, WEB_FETCH), LLM usage (LLM_USE, LLM_EGRESS_LEVEL), File system (FS_READ, FS_WRITE, FS_DELETE), Schedule & execution (CAL_READ, CAL_WRITE, SCHEDULE_WRITE, SOURCE_WRITE).",
      "Dynamic Permission Management: 60-second TTL system. High-risk permissions have a '1-time approval' system with 60-second validity. Approved permissions are automatically revoked after single task completion.",
      "Triple Hard Timeouts: Client stall detection (12s), server hard timeout (25s), absolute timeout (30s). No process can occupy resources beyond these times.",
      "Plan Integrity Protection: When humans approve an AI-generated execution plan, a hash value is created. The execution engine verifies hashes at each step — if AI tries to modify the plan after approval, it's immediately blocked as an integrity violation.",
    ],
  },
  "ov-roadmap": {
    id: "ov-roadmap",
    titleKo: "통제 우선 AI 운영체제 전략 로드맵",
    titleEn: "Control-First AI OS Strategic Roadmap",
    contentKo: [
      "Maker의 비즈니스 전략은 '사용자의 데이터를 자사 서버로 수집해야 돈이 되는' 기존 SaaS 비즈니스 모델에 대한 전면적인 거부에서 출발합니다.",
      "제품의 기능과 속도는 타 경쟁사도 쉽게 복제할 수 있지만, '통제 중심 AI OS' 포지션은 데이터 수집 기반의 기존 SaaS 기업들이 감히 흉내 낼 수 없는 강력한 해자입니다.",
      "수익화 3단계: Core(오픈소스 데스크톱 앱) → Pro(유료 데스크톱 — 고급 자비스 모드, 장기 메모리, 다중 에이전트 협업) → Enterprise/Web(클라우드/온프레미스 — SSO, 규제 준수).",
      "제품 로드맵: '개인용 Maker OS를 완벽히 굳히기 전까지 기업용으로 확장하지 않는다'는 단호한 원칙. UX 전략은 '체험이 곧 설명'이 되는 5분 데모와 Fast-First 실행 보장에 집중합니다.",
    ],
    contentEn: [
      "Maker's business strategy starts from a complete rejection of the existing SaaS business model where 'collecting user data onto your own servers is how you make money.'",
      "While product features and speed can be easily replicated by competitors, the 'control-centric AI OS' position is a powerful moat that data-collection-based SaaS companies cannot imitate.",
      "3-Phase Monetization: Core (open source desktop app) → Pro (paid desktop — advanced Jarvis mode, long-term memory, multi-agent collaboration) → Enterprise/Web (cloud/on-premise — SSO, compliance).",
      "Product Roadmap: The firm principle of 'not expanding to enterprise until the personal Maker OS is perfectly solidified.' UX strategy focuses on 5-minute demos where 'experience is the explanation' and Fast-First execution guarantees.",
    ],
  },
};
