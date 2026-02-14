export interface PermissionRequestMessage {
  titleEn: string;
  titleKo: string;
  whyEn: string;
  whyKo: string;
  impactEn: string;
  impactKo: string;
  riskEn: string;
  riskKo: string;
}

export const PERMISSION_REQUEST_MESSAGES: Record<string, PermissionRequestMessage> = {
  SOURCE_WRITE: {
    titleEn: "Wants to modify sources",
    titleKo: "소스를 변경하려고 합니다",
    whyEn: "Permission is needed to add, edit, or delete sources.",
    whyKo: "소스를 추가/수정/삭제하려면 권한이 필요합니다.",
    impactEn: "The scope of information your bot collects will change.",
    impactKo: "봇이 수집하는 정보의 범위가 달라집니다.",
    riskEn: "Untrusted sources may be included.",
    riskKo: "신뢰되지 않는 소스가 포함될 수 있습니다.",
  },
  WEB_FETCH: {
    titleEn: "Wants to fetch web data",
    titleKo: "웹 데이터를 수집하려고 합니다",
    whyEn: "Needs to retrieve information from external web pages.",
    whyKo: "외부 웹 페이지에서 정보를 가져오려 합니다.",
    impactEn: "Data will be read from the internet.",
    impactKo: "인터넷을 통해 데이터를 읽습니다.",
    riskEn: "Unnecessary data collection may occur.",
    riskKo: "불필요한 데이터 수집이 발생할 수 있습니다.",
  },
  WEB_RSS: {
    titleEn: "Wants to collect RSS feeds",
    titleKo: "RSS 피드를 수집하려고 합니다",
    whyEn: "Needs to read registered RSS sources.",
    whyKo: "등록된 RSS 소스를 읽기 위해 필요합니다.",
    impactEn: "Content from RSS feeds will be collected and stored.",
    impactKo: "RSS 피드의 콘텐츠를 수집하여 저장합니다.",
    riskEn: "Feed volume may increase storage usage.",
    riskKo: "피드 양에 따라 저장 공간이 증가할 수 있습니다.",
  },
  LLM_USE: {
    titleEn: "Wants to use AI analysis",
    titleKo: "AI 분석을 사용하려고 합니다",
    whyEn: "AI provider access is needed for content analysis and reports.",
    whyKo: "콘텐츠 분석과 리포트 생성을 위해 AI 제공자 접근이 필요합니다.",
    impactEn: "Content will be sent to an external AI service for processing.",
    impactKo: "콘텐츠가 외부 AI 서비스로 전송되어 처리됩니다.",
    riskEn: "API usage costs may be incurred.",
    riskKo: "API 사용 비용이 발생할 수 있습니다.",
  },
  LLM_EGRESS_LEVEL: {
    titleEn: "Wants to send more data to AI",
    titleKo: "AI에 더 많은 데이터를 전송하려고 합니다",
    whyEn: "A higher data egress level is needed for full analysis.",
    whyKo: "전체 분석을 위해 더 높은 수준의 데이터 전송이 필요합니다.",
    impactEn: "More content (e.g., full article text) will be sent to the AI provider.",
    impactKo: "더 많은 콘텐츠(예: 기사 전문)가 AI 제공자에게 전송됩니다.",
    riskEn: "Sensitive information may be exposed to external services.",
    riskKo: "민감한 정보가 외부 서비스에 노출될 수 있습니다.",
  },
  SCHEDULE_WRITE: {
    titleEn: "Wants to modify schedules",
    titleKo: "스케줄을 변경하려고 합니다",
    whyEn: "Permission is needed to create or change run schedules.",
    whyKo: "실행 스케줄을 생성/변경하려면 권한이 필요합니다.",
    impactEn: "The bot's automated run times will change.",
    impactKo: "봇의 자동 실행 시간이 변경됩니다.",
    riskEn: "Frequent schedules may increase resource usage.",
    riskKo: "빈번한 스케줄은 리소스 사용량을 증가시킬 수 있습니다.",
  },
  FS_READ: {
    titleEn: "Wants to read local files",
    titleKo: "로컬 파일을 읽으려고 합니다",
    whyEn: "Permission is needed to read files from designated folders.",
    whyKo: "지정된 폴더에서 파일을 읽으려면 권한이 필요합니다.",
    impactEn: "The bot will access files on your local system.",
    impactKo: "봇이 로컬 시스템의 파일에 접근합니다.",
    riskEn: "Sensitive local files may be read.",
    riskKo: "민감한 로컬 파일이 읽힐 수 있습니다.",
  },
  FS_WRITE: {
    titleEn: "Wants to write local files",
    titleKo: "로컬 파일을 쓰려고 합니다",
    whyEn: "Permission is needed to create or modify files.",
    whyKo: "파일을 생성하거나 수정하려면 권한이 필요합니다.",
    impactEn: "New files will be created or existing files modified.",
    impactKo: "새 파일이 생성되거나 기존 파일이 수정됩니다.",
    riskEn: "Existing files may be overwritten.",
    riskKo: "기존 파일이 덮어쓰여질 수 있습니다.",
  },
  FS_DELETE: {
    titleEn: "Wants to delete files",
    titleKo: "파일을 삭제하려고 합니다",
    whyEn: "Permission is needed to move files to trash.",
    whyKo: "파일을 휴지통으로 이동하려면 권한이 필요합니다.",
    impactEn: "Files will be moved to the trash (not permanently deleted).",
    impactKo: "파일이 휴지통으로 이동됩니다 (영구 삭제 아님).",
    riskEn: "Important files may be accidentally removed.",
    riskKo: "중요한 파일이 실수로 삭제될 수 있습니다.",
  },
  CAL_READ: {
    titleEn: "Wants to read calendar",
    titleKo: "캘린더를 읽으려고 합니다",
    whyEn: "Calendar access is needed to include events in briefings.",
    whyKo: "브리핑에 일정을 포함하려면 캘린더 접근이 필요합니다.",
    impactEn: "Your calendar events will be visible to this bot.",
    impactKo: "캘린더 일정이 이 봇에게 보이게 됩니다.",
    riskEn: "Private schedule information may be accessed.",
    riskKo: "비공개 일정 정보에 접근할 수 있습니다.",
  },
  CAL_WRITE: {
    titleEn: "Wants to modify calendar",
    titleKo: "캘린더를 수정하려고 합니다",
    whyEn: "Permission is needed to create or update calendar events.",
    whyKo: "캘린더 일정을 생성/수정하려면 권한이 필요합니다.",
    impactEn: "New events may be added or existing ones changed.",
    impactKo: "새 일정이 추가되거나 기존 일정이 변경됩니다.",
    riskEn: "Calendar events may be unexpectedly modified.",
    riskKo: "캘린더 일정이 예상치 않게 변경될 수 있습니다.",
  },
};

export type ApprovalScope = "once" | "bot" | "global";

export interface PermissionApprovalRequest {
  permissionKey: string;
  botId?: number | null;
  action: string;
  actionPayload?: any;
}

export interface PermissionApprovalResponse {
  requiresApproval: true;
  permissionKey: string;
  reason: string;
  message: PermissionRequestMessage;
}
