export type ApprovalMode = "AUTO_ALLOWED" | "APPROVAL_REQUIRED" | "AUTO_DENIED";
export type EgressLevel = "NO_EGRESS" | "METADATA_ONLY" | "FULL_CONTENT_ALLOWED";

export interface PermissionValue {
  enabled: boolean;
  approvalMode: ApprovalMode;
  resourceScope?: Record<string, any>;
}

export interface PermissionCheckResult {
  allowed: boolean;
  requiresApproval: boolean;
  reason: string;
  effectivePolicy: PermissionValue | null;
}

export interface EgressCheckResult {
  allowed: boolean;
  reason: string;
  effectiveLevel: EgressLevel;
}

export interface PolicyContext {
  userId: string;
  botId?: number | null;
  threadId?: string | null;
  action?: string;
}

export const PERMISSION_KEYS = [
  "WEB_RSS",
  "WEB_FETCH",
  "SOURCE_WRITE",
  "LLM_USE",
  "LLM_EGRESS_LEVEL",
  "FS_READ",
  "FS_WRITE",
  "FS_DELETE",
  "CAL_READ",
  "CAL_WRITE",
  "SCHEDULE_WRITE",
  "MEMORY_WRITE",
  "DATA_RETENTION",
] as const;

export type PermissionKey = typeof PERMISSION_KEYS[number];

export interface PermissionGroupDef {
  group: string;
  groupLabelEn: string;
  groupLabelKo: string;
  keys: {
    key: PermissionKey;
    labelEn: string;
    labelKo: string;
    descEn: string;
    descKo: string;
    risk: "LOW" | "MED" | "HIGH";
    defaultValue: PermissionValue;
    egressLevel?: EgressLevel;
  }[];
}

export const PERMISSION_GROUPS: PermissionGroupDef[] = [
  {
    group: "web_sources",
    groupLabelEn: "Web & Sources",
    groupLabelKo: "웹 & 소스",
    keys: [
      {
        key: "WEB_RSS",
        labelEn: "RSS Feed Collection",
        labelKo: "RSS 피드 수집",
        descEn: "Allow collecting content from RSS/Atom feeds",
        descKo: "RSS/Atom 피드에서 콘텐츠를 수집하도록 허용",
        risk: "LOW",
        defaultValue: { enabled: true, approvalMode: "AUTO_ALLOWED" },
      },
      {
        key: "WEB_FETCH",
        labelEn: "Web Page Fetching",
        labelKo: "웹 페이지 가져오기",
        descEn: "Allow fetching public web pages (including scraping/extraction)",
        descKo: "공개 웹 페이지 가져오기 허용 (스크래핑/본문 추출 포함)",
        risk: "MED",
        defaultValue: { enabled: false, approvalMode: "APPROVAL_REQUIRED" },
      },
      {
        key: "SOURCE_WRITE",
        labelEn: "Manage Sources",
        labelKo: "소스 관리",
        descEn: "Allow adding, editing, and deleting bot sources",
        descKo: "봇의 소스 추가/수정/삭제 허용",
        risk: "LOW",
        defaultValue: { enabled: true, approvalMode: "APPROVAL_REQUIRED" },
      },
    ],
  },
  {
    group: "ai_data",
    groupLabelEn: "AI & Data",
    groupLabelKo: "AI & 데이터",
    keys: [
      {
        key: "LLM_USE",
        labelEn: "AI Provider Usage",
        labelKo: "AI 제공자 사용",
        descEn: "Allow using external AI/LLM APIs for analysis and reports",
        descKo: "분석과 리포트를 위한 외부 AI/LLM API 사용 허용",
        risk: "MED",
        defaultValue: { enabled: true, approvalMode: "APPROVAL_REQUIRED" },
      },
      {
        key: "LLM_EGRESS_LEVEL",
        labelEn: "Data Sent to AI",
        labelKo: "AI로 전송되는 데이터",
        descEn: "Control what content is sent to external AI providers",
        descKo: "외부 AI 제공자에게 전송되는 콘텐츠 범위를 제어",
        risk: "HIGH",
        defaultValue: { enabled: true, approvalMode: "AUTO_ALLOWED" },
        egressLevel: "METADATA_ONLY",
      },
    ],
  },
  {
    group: "files",
    groupLabelEn: "Files",
    groupLabelKo: "파일",
    keys: [
      {
        key: "FS_READ",
        labelEn: "Read Local Files",
        labelKo: "로컬 파일 읽기",
        descEn: "Allow reading files from selected folders",
        descKo: "선택한 폴더에서 파일 읽기 허용",
        risk: "MED",
        defaultValue: { enabled: false, approvalMode: "APPROVAL_REQUIRED" },
      },
      {
        key: "FS_WRITE",
        labelEn: "Write Local Files",
        labelKo: "로컬 파일 쓰기",
        descEn: "Allow creating and modifying files in designated folders",
        descKo: "지정된 폴더에서 파일 생성/수정 허용",
        risk: "MED",
        defaultValue: { enabled: false, approvalMode: "APPROVAL_REQUIRED" },
      },
      {
        key: "FS_DELETE",
        labelEn: "Delete Files (Trash Only)",
        labelKo: "파일 삭제 (휴지통만)",
        descEn: "Allow moving files to trash (permanent deletion is never allowed)",
        descKo: "파일을 휴지통으로 이동 허용 (영구 삭제는 불가)",
        risk: "HIGH",
        defaultValue: { enabled: false, approvalMode: "AUTO_DENIED" },
      },
    ],
  },
  {
    group: "calendar",
    groupLabelEn: "Calendar",
    groupLabelKo: "캘린더",
    keys: [
      {
        key: "CAL_READ",
        labelEn: "Read Calendar",
        labelKo: "캘린더 읽기",
        descEn: "Allow reading calendar events for briefings",
        descKo: "브리핑을 위한 캘린더 이벤트 읽기 허용",
        risk: "LOW",
        defaultValue: { enabled: false, approvalMode: "APPROVAL_REQUIRED" },
      },
      {
        key: "CAL_WRITE",
        labelEn: "Create/Update Events",
        labelKo: "일정 생성/수정",
        descEn: "Allow creating and modifying calendar events",
        descKo: "캘린더 이벤트 생성/수정 허용",
        risk: "MED",
        defaultValue: { enabled: false, approvalMode: "APPROVAL_REQUIRED" },
      },
    ],
  },
  {
    group: "scheduling",
    groupLabelEn: "Scheduling",
    groupLabelKo: "스케줄링",
    keys: [
      {
        key: "SCHEDULE_WRITE",
        labelEn: "Modify Schedules",
        labelKo: "스케줄 변경",
        descEn: "Allow changing bot run schedules",
        descKo: "봇 실행 스케줄 변경 허용",
        risk: "LOW",
        defaultValue: { enabled: true, approvalMode: "APPROVAL_REQUIRED" },
      },
    ],
  },
  {
    group: "memory",
    groupLabelEn: "Memory",
    groupLabelKo: "메모리",
    keys: [
      {
        key: "MEMORY_WRITE",
        labelEn: "Save Rules & Preferences",
        labelKo: "규칙/선호 저장",
        descEn: "Allow saving and modifying user rules and preferences to long-term memory",
        descKo: "사용자 규칙과 선호를 장기 메모리에 저장/수정 허용",
        risk: "LOW",
        defaultValue: { enabled: true, approvalMode: "AUTO_ALLOWED" },
      },
      {
        key: "DATA_RETENTION",
        labelEn: "Data Retention Policy",
        labelKo: "데이터 보존 정책",
        descEn: "Control how long collected data and memory are retained",
        descKo: "수집된 데이터와 메모리의 보존 기간 관리",
        risk: "MED",
        defaultValue: { enabled: true, approvalMode: "APPROVAL_REQUIRED" },
      },
    ],
  },
];

export function getDefaultPermissionValue(key: PermissionKey): PermissionValue {
  for (const group of PERMISSION_GROUPS) {
    const def = group.keys.find(k => k.key === key);
    if (def) return { ...def.defaultValue };
  }
  return { enabled: false, approvalMode: "AUTO_DENIED" };
}

export function getDefaultEgressLevel(key: PermissionKey): EgressLevel {
  for (const group of PERMISSION_GROUPS) {
    const def = group.keys.find(k => k.key === key);
    if (def?.egressLevel) return def.egressLevel;
  }
  return "NO_EGRESS";
}
