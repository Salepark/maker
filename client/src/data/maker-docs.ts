export interface MindMapDoc {
  id: string;
  titleKo: string;
  titleEn: string;
  contentKo: string[];
  contentEn: string[];
}

export interface MindMapNode {
  id: string;
  labelKo: string;
  labelEn: string;
  color: string;
  docId?: string;
  children?: MindMapNode[];
}

export const mindMapTree: MindMapNode = {
  id: "root",
  labelKo: "Maker: Control-First AI OS",
  labelEn: "Maker: Control-First AI OS",
  color: "#6366f1",
  children: [
    {
      id: "identity",
      labelKo: "핵심 정체성 및 비전",
      labelEn: "Core Identity & Vision",
      color: "#8b5cf6",
      children: [
        { id: "identity-1", labelKo: "AI 주권 회복을 위한 통제형 OS 비전", labelEn: "Vision for a Control-First OS to Restore AI Sovereignty", color: "#8b5cf6", docId: "identity-vision" },
        { id: "identity-2", labelKo: "인간을 위한 안전한 AI 통제 시스템", labelEn: "A Safe AI Control System for Humans", color: "#8b5cf6", docId: "identity-control" },
        { id: "identity-3", labelKo: "인간 중심의 통제형 AI 운영체제", labelEn: "Human-Centered Control-First AI OS", color: "#8b5cf6", docId: "identity-os" },
      ],
    },
    {
      id: "philosophy",
      labelKo: "7대 핵심 철학",
      labelEn: "7 Core Principles",
      color: "#ec4899",
      children: [
        { id: "phil-2", labelKo: "최소 권한 설계 철학", labelEn: "Minimum Permission Design Philosophy", color: "#ec4899", docId: "phil-min-perm" },
        { id: "phil-3", labelKo: "데이터 주권과 로컬 우선", labelEn: "Data Sovereignty & Local-First", color: "#ec4899", docId: "phil-data" },
        { id: "phil-4", labelKo: "투명한 통제와 신뢰 (블랙박스 금지)", labelEn: "Transparent Control & Trust (No Black Box)", color: "#ec4899", docId: "phil-transparency" },
        { id: "phil-5", labelKo: "사용자 중심 의사결정 설계", labelEn: "User-Centered Decision Design", color: "#ec4899", docId: "phil-decision" },
        { id: "phil-6", labelKo: "교체 가능한 AI 엔진 (BYO LLM)", labelEn: "Replaceable AI Engine (BYO LLM)", color: "#ec4899", docId: "phil-byo-llm" },
        { id: "phil-7", labelKo: "대체가 아닌 보조로서의 자동화", labelEn: "Automation as Assistance, Not Replacement", color: "#ec4899", docId: "phil-assist" },
      ],
    },
    {
      id: "features",
      labelKo: "주요 기능 및 기술 구조",
      labelEn: "Key Features & Technical Architecture",
      color: "#f59e0b",
      children: [
        {
          id: "perm-engine",
          labelKo: "권한 및 정책 엔진",
          labelEn: "Permission & Policy Engine",
          color: "#f59e0b",
          children: [
            { id: "perm-1", labelKo: "3단계 승인 정책 메커니즘", labelEn: "3-Level Approval Policy Mechanism", color: "#f59e0b", docId: "perm-mechanism" },
            { id: "perm-2", labelKo: "11개 세부 권한 통제 체계", labelEn: "11-Permission Granular Control System", color: "#f59e0b", docId: "perm-11" },
            { id: "perm-3", labelKo: "데이터 유출 통제 (Egress Control)", labelEn: "Data Egress Control Architecture", color: "#f59e0b", docId: "perm-egress" },
          ],
        },
        {
          id: "pipeline",
          labelKo: "실행 프로세스 관리",
          labelEn: "Execution Process Management",
          color: "#10b981",
          children: [
            { id: "pipe-1", labelKo: "Fast-First 2단계 리포트 구조", labelEn: "Fast-First 2-Stage Report Architecture", color: "#10b981", docId: "pipe-fast" },
            { id: "pipe-2", labelKo: "타임아웃 3중 안전장치", labelEn: "Triple Timeout Safety Architecture", color: "#10b981", docId: "pipe-timeout" },
            { id: "pipe-3", labelKo: "리스크 예산 관리 시스템", labelEn: "Risk Budget Management System", color: "#10b981", docId: "pipe-risk" },
          ],
        },
        {
          id: "infra",
          labelKo: "인프라 및 인터페이스",
          labelEn: "Infrastructure & Interface",
          color: "#06b6d4",
          children: [
            { id: "infra-1", labelKo: "로컬 SQLite 기반 데스크톱 앱", labelEn: "Local SQLite-Based Desktop App", color: "#06b6d4", docId: "infra-local" },
            { id: "infra-2", labelKo: "텔레그램 기반 분산 제어", labelEn: "Telegram-Based Distributed Control", color: "#06b6d4", docId: "infra-telegram" },
            { id: "infra-3", labelKo: "다중 LLM 라우팅 인프라", labelEn: "Multi-LLM Routing Infrastructure", color: "#06b6d4", docId: "infra-llm" },
          ],
        },
      ],
    },
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
      id: "demo",
      labelKo: "데모 및 유즈케이스",
      labelEn: "Demo & Use Cases",
      color: "#14b8a6",
      children: [
        { id: "demo-1", labelKo: "통제 우선 AI OS의 전략적 증명", labelEn: "Strategic Proof of Control-First AI OS", color: "#14b8a6", docId: "demo-proof" },
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
  ],
};

export const documents: Record<string, MindMapDoc> = {
  "identity-vision": {
    id: "identity-vision",
    titleKo: "AI 주권 회복을 위한 통제형 운영체제 비전",
    titleEn: "Vision for a Control-First OS to Restore AI Sovereignty",
    contentKo: [
      "Maker의 가장 본질적인 정체성은 \"우리는 봇(Bot)을 판매하지 않고, 운영체제(OS)를 만든다\"는 선언에 있습니다. 기존의 AI 서비스들이 자율 에이전트이거나 단순한 SaaS 연결기라면, Maker는 AI를 \"일하게 만드는\" 개인 자동화 OS입니다.",
      "Maker가 자신을 OS로 규정하는 이유는 실제 운영체제의 본질적 구조를 모두 갖추고 있기 때문입니다: 11개의 세밀한 Permission Engine, 사용자 데이터 소유권을 보장하는 Local DB 기반 자원 통제, Pipeline Engine과 AI의 실행을 통제하는 정책 엔진, 무한 로딩을 방지하고 즉각적인 결과를 보장하는 Fast-first Execution.",
      "Maker의 장기적인 비전은 시장의 패러다임을 무제한 자율성(Autonomous)에서 통제 가능한 자율성(Governable)으로 바꾸는 것입니다. \"AI는 강력하다. 그렇기 때문에 더 통제되어야 한다\"고 주장합니다.",
      "궁극적으로 Maker가 그리는 진정한 '자비스(Jarvis)'는 무작정 똑똑해서 혼자 다 결정하는 AI가 아닙니다. 사용자의 권한을 이해하고, 로컬 데이터를 기반으로 작동하며, 사용자의 가치관(정책)을 반영하는 '통제된 능력을 갖춘 AI'로 진화하는 것이 Maker의 핵심 비전입니다.",
    ],
    contentEn: [
      "Maker's most fundamental identity lies in the declaration: \"We don't sell bots — we build an operating system.\" While existing AI services are either autonomous agents or simple SaaS connectors, Maker is a personal automation OS that makes AI work for you.",
      "Maker defines itself as an OS because it possesses all the essential structures of a real operating system: a granular Permission Engine with 11 permissions, Local DB-based resource control that guarantees user data ownership, a Pipeline Engine and policy engine that govern AI execution, and Fast-first Execution that prevents infinite loading.",
      "Maker's long-term vision is to shift the market paradigm from unlimited autonomy (Autonomous) to governable autonomy (Governable). It asserts: \"AI is powerful. That's exactly why it must be controlled.\"",
      "Ultimately, Maker's vision of a true 'Jarvis' is not an AI that makes all decisions on its own. It's an AI that understands the user's permissions, operates on local data, and reflects the user's values (policies) — a 'controlled capability' that evolves under human governance.",
    ],
  },
  "identity-control": {
    id: "identity-control",
    titleKo: "인간을 위한 안전한 AI 통제 시스템",
    titleEn: "A Safe AI Control System for Humans",
    contentKo: [
      "Maker가 자신을 'AI를 위한 OS'가 아닌 '사용자를 위한 AI 통제 시스템(Control-First AI OS)'으로 정의하는 이유는, AI 자체의 성능을 강화하는 것보다 AI를 다루는 인간의 '안전한 통제권 확보'를 시스템의 최우선 목적으로 삼고 있기 때문입니다.",
      "\"우리는 AI를 신뢰하지 않으며, 사용자의 통제권을 신뢰한다\"는 확고한 원칙에서 출발합니다. 최종적인 판단과 통제는 항상 인간에게 있고 AI는 철저히 조수이자 도구로만 작동하도록 설계되었습니다.",
      "최소 권한의 원칙: 파일 접근, 외부 전송, 일정 생성 등 위험한 권한은 기본적으로 꺼져 있으며, 사용자가 명시적으로 허락하기 전까지 AI는 어떤 행동도 임의로 할 수 없습니다.",
      "100% 데이터 소유권 보장 (Local First): Maker는 데스크톱 중심의 로컬 데이터 연결을 통해 파일과 데이터가 사용자의 컴퓨터를 벗어나지 않도록 보장하여 완벽한 데이터 주권을 제공합니다.",
    ],
    contentEn: [
      "Maker defines itself not as an 'OS for AI' but as a 'Control System for Users (Control-First AI OS)' because securing human control over AI takes priority over enhancing AI's capabilities.",
      "It starts from the firm principle: \"We don't trust AI — we trust the user's control.\" Final judgment and control always remain with humans, and AI is designed strictly as an assistant and tool.",
      "Minimum Permission Principle: Dangerous permissions like file access, external transmission, and calendar creation are off by default. AI cannot take any arbitrary action without explicit user approval.",
      "100% Data Ownership (Local First): Maker guarantees complete data sovereignty through desktop-centric local data connections, ensuring files and data never leave the user's computer.",
    ],
  },
  "identity-os": {
    id: "identity-os",
    titleKo: "인간 중심의 통제형 AI 운영체제",
    titleEn: "Human-Centered Control-First AI OS",
    contentKo: [
      "Maker는 강력한 AI 기술을 무분별하게 확장하는 대신, 인간이 AI를 안전하게 다루고 책임을 지는 '통제 우선(Control-First)' 철학을 바탕으로 설계된 개인용 자동화 운영체제입니다.",
      "이 시스템은 AI가 블랙박스처럼 작동하지 않도록 모든 실행 로그를 기록하고 사용자의 명시적인 승인과 정책 안에서만 움직이도록 제한하는 7대 안전 원칙을 고수합니다.",
      "로컬 데이터 처리를 우선하는 로컬 퍼스트(Local-first) 구조를 통해 사용자의 데이터 주권을 완벽히 보호하며, 기술적으로는 시장 동향이나 경쟁사 뉴스 등을 수집하여 5분 내로 요약 리포트를 제공하는 AI 파이프라인을 갖추고 있습니다.",
      "궁극적으로 Maker는 단순한 자동화 도구를 넘어 AI의 자율성을 인간의 통제권 아래에 두는 AI 시대의 개인 인프라 레이어가 되는 것을 목표로 합니다.",
    ],
    contentEn: [
      "Maker is a personal automation operating system designed on the 'Control-First' philosophy — where humans safely manage AI and take responsibility, rather than recklessly expanding AI capabilities.",
      "The system adheres to 7 safety principles that record all execution logs to prevent AI from operating as a black box, restricting it to move only within explicit user approvals and policies.",
      "Through a Local-first architecture that prioritizes local data processing, it fully protects user data sovereignty. Technically, it features an AI pipeline that collects market trends and competitor news, delivering summary reports within 5 minutes.",
      "Ultimately, Maker aims to become a personal infrastructure layer for the AI era — going beyond simple automation tools to place AI autonomy under human control.",
    ],
  },
  "phil-min-perm": {
    id: "phil-min-perm",
    titleKo: "최소 권한 설계 철학",
    titleEn: "Minimum Permission Design Philosophy",
    contentKo: [
      "Maker의 제2원칙인 '기본값은 최소 권한(Default = Minimum Permission)'은 단순한 보안 옵션이 아니라, 7대 핵심 철학을 시스템과 코드 레벨에서 강제하는 가장 중요한 아키텍처적 기반입니다.",
      "파일 접근, 외부 데이터 전송, 일정 생성, 삭제 작업과 같이 시스템에 영향을 미칠 수 있는 강력하고 위험한 권한들은 기본적으로 철저히 차단(OFF)되어 있습니다. '편의성을 위해 안전을 포기하지 않는다'는 단호한 설계 철학입니다.",
      "기본값이 최소 권한으로 설정되어 있다는 것은 곧 '통제는 항상 인간에게 있다(제1원칙)'와 '자동화는 인간을 대체하지 않는다(제7원칙)'를 물리적으로 보장하는 장치입니다.",
      "최소 권한 원칙은 '데이터는 사용자 소유다(제3원칙)'라는 철학을 실현하는 방패입니다. 로컬 파일 접근(FS_READ, FS_WRITE)과 외부 모델로의 데이터 전송(LLM_EGRESS_LEVEL) 권한을 기본적으로 닫아둡니다.",
    ],
    contentEn: [
      "Maker's 2nd principle — 'Default = Minimum Permission' — is not a simple security option but the most critical architectural foundation that enforces the 7 core principles at the system and code level.",
      "Powerful and dangerous permissions — file access, external data transmission, calendar creation, delete operations — are strictly blocked (OFF) by default. This embodies the resolute design philosophy of 'never sacrificing safety for convenience.'",
      "Having minimum permission as default physically guarantees Principle 1 ('Control always belongs to humans') and Principle 7 ('Automation does not replace humans').",
      "The minimum permission principle serves as a shield realizing Principle 3 ('Data belongs to the user'). Permissions for local file access (FS_READ, FS_WRITE) and data transmission to external models (LLM_EGRESS_LEVEL) are closed by default.",
    ],
  },
  "phil-data": {
    id: "phil-data",
    titleKo: "데이터 주권과 로컬 우선의 AI 철학",
    titleEn: "Data Sovereignty & Local-First AI Philosophy",
    contentKo: [
      "Maker의 제3원칙인 '데이터는 사용자 소유다(Data Belongs to the User)' — 로컬 우선(Local-first) 아키텍처는 Maker가 '사용자를 위한 AI 통제 시스템'으로 존재하기 위한 가장 물리적이고 구조적인 방어선입니다.",
      "현존하는 대부분의 자동화 도구나 자율 에이전트는 사용자의 데이터를 자사 서버로 흡수하여 중앙 통제하는 비즈니스 모델을 취합니다. Maker는 \"SaaS는 데이터를 모은다. Maker는 데이터를 지킨다\"는 원칙 아래 사용자의 PC 환경에서 오프라인으로도 작동합니다.",
      "데이터가 철저히 로컬에 있고 사용자의 통제 시스템(Permission Engine)을 통과해야만 움직일 수 있기 때문에, 'AI는 블랙박스가 아니다(제4원칙)'라는 철학이 성립됩니다.",
      "'데이터는 사용자 소유다(Local-first)'라는 원칙은 7대 철학 중 하나에 머무는 것이 아니라, 나머지 6개의 원칙이 실제로 작동할 수 있게 하는 핵심 인프라이자 근본적인 토대입니다.",
    ],
    contentEn: [
      "Maker's 3rd principle — 'Data Belongs to the User' via Local-first architecture — is the most physical and structural defense line for Maker to exist as an 'AI control system for users.'",
      "Most existing automation tools absorb user data into their servers under a centralized control business model. Maker operates under the principle 'SaaS collects data. Maker protects data' — working offline on the user's PC.",
      "Because data remains strictly local and can only move through the user's control system (Permission Engine), the philosophy 'AI is not a black box (Principle 4)' holds true.",
      "'Data belongs to the user (Local-first)' is not just one of 7 principles — it's the core infrastructure and foundation that enables the other 6 principles to actually work.",
    ],
  },
  "phil-transparency": {
    id: "phil-transparency",
    titleKo: "투명한 통제와 신뢰의 AI 철학",
    titleEn: "Transparent Control & Trust AI Philosophy",
    contentKo: [
      "'AI는 블랙박스가 아니다' 및 '숨기지 않는다'는 원칙은, Maker가 지향하는 '통제 우선 AI 운영체제'가 정상적으로 작동하기 위한 시각적·논리적 기반입니다.",
      "인간이 AI를 올바르게 통제하려면 AI가 무슨 일을 하고 있는지 완벽하게 파악할 수 있어야 합니다. '모든 실행은 기록된다(Nothing Runs Silently)' 원칙 아래, 사용자 모르게 백그라운드에서 숨어서 작동하는 행동을 원천 차단합니다.",
      "블랙박스 금지 철학은 단순히 에러 로그를 남기는 수준이 아닙니다. '설명 가능성 레이어(Explainability Layer)'를 구축하여, AI가 왜 특정 툴을 선택했는지, 어떤 정책이 작동했는지, 왜 실행이 차단되었는지를 사용자에게 투명하게 보고합니다.",
      "화려하고 똑똑해 보이지만 내부를 알 수 없는 AI 대신, 과정을 투명하게 관찰하고 통제할 수 있는 인프라를 제공함으로써 대체 불가능한 '신뢰 기반 자동화 플랫폼'으로 완성됩니다.",
    ],
    contentEn: [
      "'AI must never be a black box' and 'nothing runs silently' are the visual and logical foundations for Maker's Control-First AI OS to function properly.",
      "For humans to properly control AI, they must fully understand what AI is doing. Under the principle 'Nothing Runs Silently,' actions running hidden in the background without user knowledge are completely blocked.",
      "The no-black-box philosophy goes beyond simple error logging. It builds an 'Explainability Layer' that transparently reports to users why specific tools were selected, which policies were triggered, and why execution was blocked.",
      "Instead of AI that looks brilliant but whose internals are unknowable, Maker provides infrastructure where processes can be transparently observed and controlled — completing an irreplaceable 'trust-based automation platform.'",
    ],
  },
  "phil-decision": {
    id: "phil-decision",
    titleKo: "사용자 중심 의사결정 설계와 AI 통제 철학",
    titleEn: "User-Centered Decision Design & AI Control Philosophy",
    contentKo: [
      "제5원칙 '의사결정 구조를 설계할 수 있어야 한다(Users Design Decision Systems)'는 Maker를 '사용자를 위한 통제 우선 운영체제'로 기능하게 만드는 가장 실천적이고 중추적인 원칙입니다.",
      "Maker는 완성된 AI 봇을 수동적으로 소비하는 마켓플레이스가 아닙니다. 사용자는 '무엇을 수집할 것인가, 어떤 기준으로 선별할 것인가, 어떤 LLM으로 분석할 것인가, 언제 실행할 것인가, 어떤 결과를 승인할 것인가'를 명시적으로 규정해야 합니다.",
      "사용자가 의사결정의 모든 단계를 조각내어 설계하므로, 'AI는 블랙박스가 아니다(제4원칙)'가 성립됩니다. 모든 과정이 사용자가 설계한 투명한 단계를 밟기 때문에 완벽히 관찰하고 설명할 수 있습니다.",
      "'사용자가 직접 의사결정 구조를 설계한다'는 것은 AI의 폭주를 막는 가장 강력한 고삐입니다. 사용자는 자신의 가치관과 정책을 AI 실행에 강제하는 진정한 '운영체제 설계자'로 자리매김하게 됩니다.",
    ],
    contentEn: [
      "Principle 5 — 'Users Design Decision Systems' — is the most practical and central principle that makes Maker function as a 'control-first OS for users.'",
      "Maker is not a marketplace for passively consuming pre-built AI bots. Users must explicitly define what to collect, selection criteria, which LLM to analyze with, when to execute, and which results to approve.",
      "Since users design every stage of decision-making, 'AI is not a black box (Principle 4)' holds true. All processes follow transparent steps designed by the user, enabling complete observation and explanation.",
      "'Users designing their own decision-making structure' is the strongest rein to prevent AI from running wild. Users become true 'operating system designers' who enforce their values and policies on AI execution.",
    ],
  },
  "phil-byo-llm": {
    id: "phil-byo-llm",
    titleKo: "교체 가능한 AI와 인간 통제권의 아키텍처",
    titleEn: "Replaceable AI & Human Control Architecture",
    contentKo: [
      "'교체 가능한 AI 엔진 (BYO LLM, 다중 LLM 라우팅)' 구조는 7대 핵심 철학 중 제6원칙인 'AI는 교체 가능해야 한다(AI Providers Must Be Replaceable)'를 기술적으로 구현한 핵심 기능입니다.",
      "기존의 AI 툴들은 특정 AI 모델에 종속되어 있는 경우가 많습니다. Maker는 OpenAI, Anthropic, Google Gemini는 물론 오픈소스 호환 API까지 지원하여 특정 벤더에 종속되는 것을 철저히 거부합니다. LLM들은 고정된 서비스가 아니라 교체 가능한 '실행 모듈(플러그인)'에 불과합니다.",
      "사용자는 단순히 제공하는 단일 AI를 수동적으로 소비하지 않습니다. 봇 단위 또는 워크플로우 단위로 '어떤 AI를 사용할 것인가'를 직접 지정하며, 비용 대비 정확도, 분석 유형별로 LLM을 전략적으로 배치할 수 있습니다.",
      "Maker가 자체 AI 모델을 팔았다면 일반적인 AI 서비스로 분류되었을 것입니다. 그러나 '우리는 AI를 파는 게 아니라 운영 구조를 제공합니다'라고 명확히 선언합니다.",
    ],
    contentEn: [
      "The 'Replaceable AI Engine (BYO LLM, Multi-LLM Routing)' structure is the technical implementation of Principle 6: 'AI Providers Must Be Replaceable.'",
      "Many existing AI tools are locked into specific AI models. Maker supports OpenAI, Anthropic, Google Gemini, and open-source compatible APIs, firmly rejecting vendor lock-in. LLMs are not fixed services but merely replaceable 'execution modules (plugins).'",
      "Users don't passively consume a single AI. They directly specify 'which AI to use' on a per-bot or per-workflow basis, strategically deploying LLMs based on cost-effectiveness, accuracy, and analysis type.",
      "If Maker sold its own AI model, it would be classified as just another AI service. Instead, it clearly declares: 'We don't sell AI — we provide the operating structure.'",
    ],
  },
  "phil-assist": {
    id: "phil-assist",
    titleKo: "대체가 아닌 보조로서의 자동화",
    titleEn: "Automation as Assistance, Not Replacement",
    contentKo: [
      "제7원칙 '자동화는 인간을 대체하지 않는다(Automation Assists — It Does Not Replace)'는 Maker가 '통제 우선 AI 운영체제'로 자리 잡게 하는 궁극적인 목적이자 종착지입니다.",
      "현재 AI 시장의 수많은 에이전트들은 인간의 개입을 완전히 없애는 '무제한 자율성'을 목표로 합니다. Maker는 이를 단호히 거부하며, 자동화의 진정한 목적은 '구조화된 보조'를 제공하는 데 있다고 선언합니다.",
      "AI가 인간을 훌륭하게 보조하기 위해서는 인간이 AI의 결과물을 신뢰하고 올바른 판단을 내릴 수 있어야 합니다. Maker는 모든 과정을 투명한 감사 로그와 설명 가능성 레이어로 제공합니다.",
      "결국 Maker가 지향하는 바는 '상사'가 아닌 '도구'로서의 AI입니다. 인간의 의사결정을 보조하는 선에서 AI의 폭주를 막습니다.",
    ],
    contentEn: [
      "Principle 7 — 'Automation Assists, It Does Not Replace' — is the ultimate purpose and destination that establishes Maker as a Control-First AI OS.",
      "Many AI agents in the current market aim for 'unlimited autonomy' that completely eliminates human involvement. Maker firmly rejects this, declaring that the true purpose of automation is to provide 'structured assistance.'",
      "For AI to excellently assist humans, humans must be able to trust AI's outputs and make correct judgments. Maker provides all processes through transparent audit logs and an explainability layer.",
      "Ultimately, Maker aims for AI as a 'tool,' not a 'boss.' It prevents AI from running wild while staying within the bounds of assisting human decision-making.",
    ],
  },
  "perm-mechanism": {
    id: "perm-mechanism",
    titleKo: "3단계 승인 정책 메커니즘",
    titleEn: "3-Level Approval Policy Mechanism",
    contentKo: [
      "11개 세부 권한을 실제로 작동시키는 핵심 메커니즘인 '3단계 승인 정책(Auto Allowed, Approval Required, Denied)'은 AI의 무제한적 자율성을 제어하는 중추 역할을 합니다.",
      "APPROVAL_REQUIRED(실행 전 승인 필요) 상태는 '통제는 항상 인간에게 있다'와 '자동화는 인간을 대체하지 않는다'를 시스템 레벨에서 물리적으로 강제하는 장치입니다.",
      "Maker의 AI는 단순히 주어진 명령을 실행하는 블랙박스가 아니라, '정책을 인식하는 에이전트 런타임(Policy-aware agent runtime)'으로 작동합니다. AI는 '어떤 권한이 차단되었고, 어떤 권한은 승인을 받아야 하는지'를 미리 인지한 상태에서 움직입니다.",
      "이 시스템은 향후 단계별 위험 점수(Risk score)를 누적하여 위험 한도를 초과할 경우 자동으로 차단(Critical auto gating)하는 '위험 예산 시스템'으로 고도화될 기반입니다.",
    ],
    contentEn: [
      "The '3-Level Approval Policy (Auto Allowed, Approval Required, Denied)' is the core mechanism that operates the 11 granular permissions, serving as the central pillar controlling AI's unlimited autonomy.",
      "The APPROVAL_REQUIRED state physically enforces 'Control always belongs to humans' and 'Automation does not replace humans' at the system level.",
      "Maker's AI doesn't operate as a black box that simply executes commands — it functions as a 'policy-aware agent runtime.' AI moves while already knowing which permissions are blocked and which require approval.",
      "This system is the foundation for evolving into a 'Risk Budget System' that accumulates step-wise risk scores and automatically blocks (Critical auto gating) when risk limits are exceeded.",
    ],
  },
  "perm-11": {
    id: "perm-11",
    titleKo: "11개 세부 권한 통제 체계",
    titleEn: "11-Permission Granular Control System",
    contentKo: [
      "Maker의 11개 권한 시스템은 AI가 임의로 사용자의 로컬 자원이나 데이터에 접근하지 못하도록 철저히 방어하는 핵심 통제 장치입니다. 4가지 영역으로 나뉩니다:",
      "1. 웹 및 데이터 소스 제어: WEB_RSS(RSS 피드 접근), WEB_FETCH(웹페이지 스크래핑), SOURCE_WRITE(데이터 소스 추가/수정)",
      "2. AI 사용 및 데이터 전송 제어: LLM_USE(LLM API 호출 기본 권한), LLM_EGRESS_LEVEL(외부 전송 데이터 수위 — NO_EGRESS, METADATA_ONLY, FULL_CONTENT_ALLOWED 3단계)",
      "3. 로컬 파일 시스템 통제: FS_READ(파일 읽기), FS_WRITE(파일 쓰기), FS_DELETE(파일 삭제 — 가장 위험한 권한)",
      "4. 일정 및 자동화 스케줄 통제: CAL_READ(캘린더 읽기), CAL_WRITE(캘린더 생성/수정), SCHEDULE_WRITE(파이프라인 스케줄 변경)",
      "이 11개의 권한은 단순히 ON/OFF로만 작동하지 않습니다. 각 권한마다 AUTO_ALLOWED(자동 통과), APPROVAL_REQUIRED(인간의 승인 필요), AUTO_DENIED(절대 차단)의 3단계 상태를 부여할 수 있습니다.",
    ],
    contentEn: [
      "Maker's 11-permission system is the core control device that thoroughly prevents AI from arbitrarily accessing users' local resources or data. It's divided into 4 domains:",
      "1. Web & Data Source Control: WEB_RSS (RSS feed access), WEB_FETCH (webpage scraping), SOURCE_WRITE (data source add/modify)",
      "2. AI Usage & Data Transmission Control: LLM_USE (basic LLM API call permission), LLM_EGRESS_LEVEL (outbound data level — 3 tiers: NO_EGRESS, METADATA_ONLY, FULL_CONTENT_ALLOWED)",
      "3. Local File System Control: FS_READ (file read), FS_WRITE (file write), FS_DELETE (file delete — the most dangerous permission)",
      "4. Calendar & Automation Schedule Control: CAL_READ (calendar read), CAL_WRITE (calendar create/modify), SCHEDULE_WRITE (pipeline schedule change)",
      "These 11 permissions don't simply work as ON/OFF switches. Each can be assigned one of 3 states: AUTO_ALLOWED (auto-pass), APPROVAL_REQUIRED (human approval needed), AUTO_DENIED (absolute block).",
    ],
  },
  "perm-egress": {
    id: "perm-egress",
    titleKo: "데이터 유출 통제 (Egress Control) 아키텍처",
    titleEn: "Data Egress Control Architecture",
    contentKo: [
      "'데이터 유출 통제(Egress Control)'는 권한 및 정책 엔진 내에서 가장 핵심적인 물리적 방어선이자, Maker를 '통제 우선 AI 운영체제'로 완성하는 결정적 장치입니다.",
      "LLM_EGRESS_LEVEL 권한이 3단계로 전송 수위를 엄격하게 통제합니다: NO_EGRESS(외부 전송 전면 금지), METADATA_ONLY(메타데이터만 전송), FULL_CONTENT_ALLOWED(전체 본문 전송 허용).",
      "AI 프로세스(Planner)가 파이프라인을 계획할 때, 권한 엔진은 사전에 'Egress 제한이 어느 수준인지'를 정책 컨텍스트로 명시하여 AI에게 전달합니다. 해시나 마스킹 등을 통한 데이터 무결성 검증도 수행됩니다.",
      "사용자 데이터를 흡수해야 돈이 되는 일반적인 SaaS 비즈니스 모델의 특성상, 이와 같은 '데이터 Egress 통제'를 전면에 내세우기는 어렵습니다. 이것이 Maker만의 대체 불가능한 핵심 거버넌스 아키텍처입니다.",
    ],
    contentEn: [
      "'Data Egress Control' is the most critical physical defense line within the Permission & Policy Engine, and the decisive device that completes Maker as a Control-First AI OS.",
      "The LLM_EGRESS_LEVEL permission strictly controls transmission levels in 3 stages: NO_EGRESS (complete external transmission ban), METADATA_ONLY (metadata only), FULL_CONTENT_ALLOWED (full content transmission permitted).",
      "When the AI Process (Planner) plans a pipeline, the permission engine pre-specifies the current Egress restriction level as policy context to the AI. Data integrity verification through hashing or masking is also performed.",
      "Since typical SaaS business models need to absorb user data for revenue, it's difficult for them to put 'Data Egress Control' front and center. This is Maker's irreplaceable core governance architecture.",
    ],
  },
  "pipe-fast": {
    id: "pipe-fast",
    titleKo: "Fast-First 2단계 리포트 구조",
    titleEn: "Fast-First 2-Stage Report Architecture",
    contentKo: [
      "'Fast-First 2단계 리포트 구조'는 Maker가 '통제 우선 자동화 운영체제'로 기능하기 위해 필수적인 '실행 프로세스 관리'를 시스템 레벨에서 보장하는 핵심 아키텍처입니다.",
      "1단계 (Fast Report): LLM을 거치지 않고 데이터 수집 즉시 2~3초 내에 요약된 '빠른 리포트'를 먼저 생성하여 반환합니다.",
      "2단계 (Full Report): 이후 백그라운드 프로세스에서 LLM이 심층 분석을 완료하면, 기존 리포트를 '풀 리포트'로 자동 업그레이드합니다.",
      "\"결과는 반드시 보장된다\" — AI 모델의 불안정성 때문에 시스템이 중단되는 것을 원천적으로 방어하는 OS 레벨의 조치입니다. 사용자가 \"매일 아침 9시에 브리핑해 줘\"라고 스케줄을 등록할 수 있는 이유가 바로 이 아키텍처 덕분입니다.",
    ],
    contentEn: [
      "The 'Fast-First 2-Stage Report Architecture' is the core architecture that guarantees 'execution process management' at the system level — essential for Maker to function as a Control-First Automation OS.",
      "Stage 1 (Fast Report): Generates a summarized 'fast report' within 2-3 seconds immediately after data collection, without going through LLM.",
      "Stage 2 (Full Report): When the LLM completes deep analysis in the background process, it automatically upgrades the existing report to a 'full report.'",
      "'Results are always guaranteed' — This is an OS-level measure that fundamentally prevents system interruption due to AI model instability. This architecture is why users can register schedules like 'Brief me every morning at 9 AM.'",
    ],
  },
  "pipe-timeout": {
    id: "pipe-timeout",
    titleKo: "타임아웃 3중 안전장치",
    titleEn: "Triple Timeout Safety Architecture",
    contentKo: [
      "'타임아웃 3중 안전장치'는 Maker가 지향하는 '통제 우선 AI 운영체제'의 핵심인 실행 프로세스 관리를 시스템 레벨에서 보장하는 강력한 방어 아키텍처입니다.",
      "기존 AI 서비스들의 가장 큰 약점은 외부 LLM API 호출이 본질적으로 느리고 불안정하여, 실패나 지연 시 시스템 전체가 무한 대기 상태에 빠진다는 점입니다.",
      "Maker는 클라이언트 정체 감지(12초), LLM 및 서버 타임아웃(20~25초), 백그라운드 절대 타임아웃(55초)의 3중 방어선을 구축합니다.",
      "타임아웃이 발생해도 텅 빈 에러 화면 대신 미리 생성해 둔 'Fast Report' 상태를 유지하거나, 'Never Empty' 상태 리포트를 제공하여 사용자 경험의 공백을 방지합니다.",
    ],
    contentEn: [
      "The 'Triple Timeout Safety Architecture' is a powerful defense architecture that guarantees execution process management — the core of Maker's Control-First AI OS — at the system level.",
      "The biggest weakness of existing AI services is that external LLM API calls are inherently slow and unstable, causing the entire system to fall into infinite waiting state on failure or delay.",
      "Maker builds a triple defense line: client stall detection (12s), LLM and server timeout (20-25s), and background absolute timeout (55s).",
      "Even when timeouts occur, instead of showing an empty error screen, it maintains the pre-generated 'Fast Report' state or provides a 'Never Empty' status report to prevent gaps in user experience.",
    ],
  },
  "pipe-risk": {
    id: "pipe-risk",
    titleKo: "리스크 예산 관리 시스템",
    titleEn: "Risk Budget Management System",
    contentKo: [
      "'리스크 예산 관리 시스템(Risk Budget Management System)'은 AI가 파이프라인을 실행할 때 발생할 수 있는 잠재적 위험을 정량화하여 통제하는 장치입니다.",
      "7대 핵심 철학 중 '자율성은 시간, 단계, 위험 예산 안에 있어야 한다'는 원칙을 구현합니다. AI 프로세스에 사전에 허락된 '리스크 예산'이라는 명확한 한도를 부여합니다.",
      "Step별 위험 점수(Risk Score) 측정: 파이프라인 내에서 AI가 수행하는 개별 단계마다 행위의 위험도를 점수로 환산합니다. 누적된 위험이 예산을 초과하면 실행 중인 파이프라인을 즉시 강제 종료합니다.",
      "실행 프로세스가 리스크 한도 초과로 멈추면, '설명 가능성 레이어'는 사용자에게 '어떤 정책이 작동했고, 어떤 제한 때문에 이 프로세스가 멈췄는지'를 명확한 로그로 보고합니다.",
    ],
    contentEn: [
      "The 'Risk Budget Management System' is a device that quantifies and controls potential risks arising from AI pipeline execution.",
      "It implements the principle 'Autonomy must exist within time, steps, and risk budget boundaries.' AI processes are given a clear limit called a 'risk budget' that's pre-approved.",
      "Step-wise Risk Score Measurement: Each individual step AI performs within a pipeline has its risk level converted to a score. When accumulated risk exceeds the budget, the running pipeline is immediately force-terminated.",
      "When an execution process stops due to exceeding risk limits, the 'Explainability Layer' reports to users with clear logs explaining which policies were triggered and which limits caused the process to stop.",
    ],
  },
  "infra-local": {
    id: "infra-local",
    titleKo: "로컬 SQLite 기반 데스크톱 앱 아키텍처",
    titleEn: "Local SQLite-Based Desktop App Architecture",
    contentKo: [
      "'로컬 SQLite 기반 데스크톱 앱(Electron + SQLite)' 구조는 Maker가 지향하는 '통제 우선 AI 운영체제'의 인프라 전략을 물리적으로 구현한 핵심 아키텍처입니다.",
      "Maker의 인프라는 철저히 로컬 퍼스트(Local-first) 원칙을 따릅니다. 데스크톱 앱 내부에 Node.js 서버와 SQLite 데이터베이스를 내장하여, 사용자의 워크플로우와 민감한 데이터는 외부 서버가 아닌 사용자의 PC에 안전하게 저장됩니다.",
      "앱 자체가 백그라운드에서 AI 파이프라인과 스케줄러를 돌리는 '개인 실행 커널(Execution Kernel)'이자 로컬 서버로 작동합니다. 웹 대시보드나 텔레그램 봇 등 멀티 인터페이스를 통해 외부에서도 제어 가능합니다.",
      "코드는 storage factory 패턴을 통해, MAKER_DB=sqlite 환경변수 설정 시에는 SQLite로, 클라우드 환경에서는 PostgreSQL로 매끄럽게 전환되도록 설계되었습니다.",
    ],
    contentEn: [
      "The 'Local SQLite-based Desktop App (Electron + SQLite)' structure physically implements the infrastructure strategy of Maker's Control-First AI OS.",
      "Maker's infrastructure strictly follows the Local-first principle. With a Node.js server and SQLite database embedded inside the desktop app, user workflows and sensitive data are safely stored on the user's PC, not external servers.",
      "The app itself functions as a 'Personal Execution Kernel' and local server, running AI pipelines and schedulers in the background. It can be controlled externally through multi-interfaces like web dashboards or Telegram bots.",
      "The code is designed through a storage factory pattern to seamlessly switch between SQLite (when MAKER_DB=sqlite) and PostgreSQL (in cloud environments).",
    ],
  },
  "infra-telegram": {
    id: "infra-telegram",
    titleKo: "텔레그램 기반 분산 제어 아키텍처",
    titleEn: "Telegram-Based Distributed Control Architecture",
    contentKo: [
      "Maker의 텔레그램 봇 연동은 단순한 모바일 알림이나 메신저 편의 기능을 넘어섭니다. '실행 인프라'와 '제어 인터페이스'를 완벽하게 분리하고 안전하게 연결한 핵심 아키텍처입니다.",
      "사용자는 외부에서 텔레그램을 통해 '오늘 시장 리포트 실행해', '이번 분석 승인해', 'LLM을 Gemini로 변경해'와 같은 즉각적인 명령을 내릴 수 있습니다.",
      "텔레그램을 통한 외부 제어 명령은 Maker OS 인프라 내부의 '보안 릴레이(Secure Relay)'를 거칩니다. 모든 외부 명령은 반드시 정책 중재 레이어(Policy mediation layer)를 통과해야 합니다.",
      "무거운 데이터 처리와 보안은 철저한 로컬 인프라(Desktop/SQLite)에 맡겨두고, 사용자의 통제 인터페이스는 가장 가볍고 접근성이 뛰어난 메신저(Telegram)로 확장한 완벽한 '분산 제어 아키텍처'입니다.",
    ],
    contentEn: [
      "Maker's Telegram bot integration goes far beyond simple mobile notifications or messenger convenience. It's a core architecture that perfectly separates 'execution infrastructure' from 'control interface' and connects them securely.",
      "Users can issue immediate commands from outside via Telegram: 'Run today's market report,' 'Approve this analysis,' 'Switch LLM to Gemini.'",
      "External control commands via Telegram pass through a 'Secure Relay' inside Maker OS infrastructure. All external commands must pass through a policy mediation layer.",
      "Heavy data processing and security are left to the secure local infrastructure (Desktop/SQLite), while the user's control interface extends to the lightest and most accessible messenger (Telegram) — a complete 'distributed control architecture.'",
    ],
  },
  "infra-llm": {
    id: "infra-llm",
    titleKo: "다중 LLM 라우팅 인프라",
    titleEn: "Multi-LLM Routing Infrastructure",
    contentKo: [
      "'다중 LLM 라우팅(Multi-LLM Routing, BYO LLM)' 구조는 '통제 우선 AI 운영체제'의 인프라 및 인터페이스 설계 철학을 가장 명확하게 보여주는 핵심 아키텍처입니다.",
      "인프라의 중심에 특정 AI를 두는 것을 거부합니다. OpenAI, Anthropic, Google Gemini를 비롯해 호환 가능한 모든 API는 Maker 운영체제 위에서 작동하는 '교체 가능한 플러그인'으로 격하됩니다.",
      "사용자는 BYO(Bring Your Own) LLM 방식으로 자신의 API 키를 연결하며, 비용, 처리 속도, 분석의 정확도 등 자신의 전략에 맞춰 LLM을 자유롭게 라우팅할 수 있습니다.",
      "Ollama 등과 연동하여 Llama 3.2, Qwen 같은 로컬 오픈소스 LLM을 연결할 수도 있습니다. 이를 통해 외부 서버로 단 1%의 민감한 데이터도 내보내지 않는 100% 프라이버시 보호 오프라인 워크플로우를 완벽하게 자가 호스팅할 수 있습니다.",
    ],
    contentEn: [
      "The 'Multi-LLM Routing (BYO LLM)' structure most clearly demonstrates the infrastructure and interface design philosophy of the Control-First AI OS.",
      "It rejects placing any specific AI at the center of infrastructure. All compatible APIs including OpenAI, Anthropic, and Google Gemini are relegated to 'replaceable plugins' running on top of the Maker OS.",
      "Users connect their own API keys via BYO (Bring Your Own) LLM, freely routing LLMs based on their strategy — cost, processing speed, analysis accuracy, etc.",
      "Users can also connect local open-source LLMs like Llama 3.2 or Qwen via Ollama. This enables complete self-hosting of 100% privacy-protected offline workflows without sending even 1% of sensitive data to external servers.",
    ],
  },
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
  "demo-proof": {
    id: "demo-proof",
    titleKo: "통제 우선 AI 운영체제의 전략적 증명",
    titleEn: "Strategic Proof of Control-First AI OS",
    contentKo: [
      "Maker의 데모와 유즈케이스는 단순히 AI가 얼마나 똑똑한지를 보여주기 위한 기능 소개가 아닙니다. 이는 '통제 우선 AI 운영체제'라는 핵심 철학을 실제 업무 환경에서 즉각적이고 물리적으로 증명해 내는 전략적 장치입니다.",
      "5분 데모 워크플로: 회사명 하나만 입력하면 5분 내에 경쟁 분석 리포트를 즉시 뽑아주는 데모. 30초마다 진행 상황을 투명하게 보여주고, 타임아웃 방지 및 Fast-First 아키텍처를 통해 어떤 상황에서도 빈 화면을 보지 않도록 통제합니다.",
      "기업용 유즈케이스: 일일 시장 브리핑, 경쟁사 동향 모니터링, 공급망 및 원자재 가격 추적, 규제 모니터링. 정해진 시간에 수집·분석·전송하는 전 과정을 스케줄링하여 백그라운드에서 끊임없이 돌립니다.",
      "AI가 분석 결과를 알아서 게시해버리지 않습니다. 무엇을 수집하고 분석했는지 보고하며, 최종적인 승인은 인간에게 맡깁니다. '자동화는 인간을 대체하지 않는다'와 '최종 책임은 항상 인간에게 있다'는 철학의 구현입니다.",
    ],
    contentEn: [
      "Maker's demos and use cases are not just feature showcases of how smart AI is. They're strategic devices that immediately and physically prove the core philosophy of 'Control-First AI OS' in real work environments.",
      "5-Minute Demo Workflow: Enter just a company name and get a competitive analysis report within 5 minutes. Shows progress transparently every 30 seconds, with timeout prevention and Fast-First architecture ensuring no blank screens under any circumstance.",
      "Enterprise Use Cases: Daily market briefings, competitor trend monitoring, supply chain & commodity price tracking, regulatory monitoring. The entire collect-analyze-deliver process is scheduled to run continuously in the background.",
      "AI doesn't autonomously publish analysis results. It reports what was collected and analyzed, leaving final approval to humans. This implements the philosophy that 'automation doesn't replace humans' and 'final responsibility always lies with humans.'",
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

export function getAllDocIds(node: MindMapNode): string[] {
  const ids: string[] = [];
  if (node.docId) ids.push(node.docId);
  if (node.children) {
    for (const child of node.children) {
      ids.push(...getAllDocIds(child));
    }
  }
  return ids;
}
