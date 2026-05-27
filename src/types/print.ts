export type PrinterStatus = "ready" | "warning" | "error" | "offline";

export type PrintSettings = {
  copies: number;
  pageRange: "all" | string;
  colorMode: "color" | "grayscale";
  paperSize: "A4" | "A5" | "Letter" | string;
  orientation: "portrait" | "landscape";
  duplex: "none" | "long-edge" | "short-edge";
  quality: "draft" | "normal" | "high";
  fitToPage: boolean;
  collate?: boolean;
  mediaType?: string;
};

export type PrinterProfile = {
  id: string;
  name: string;
  avatarLabel: string;
  accentColor: string;
  accentSoftColor: string;
  accentBgColor: string;
  accentTextColor?: string;
  appBgColor?: string;
  ambientGlowColor?: string;
  fieldBgColor?: string;
  mainBgColor?: string;
  panelBgColor?: string;
  panelSolidColor?: string;
  paperBgColor?: string;
  surfaceRaisedColor?: string;
  surfaceSoftColor?: string;
  surfaceSunkenColor?: string;
  toolbarBgColor?: string;
  workspaceGlowColor?: string;
  workspaceHeaderBgColor?: string;
  defaultSettings?: Partial<PrintSettings>;
};

export type UploadedFile = {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  pageCount?: number;
  previewAvailable?: boolean;
  previewUrl?: string;
};

export type PreviewPage = {
  page: number;
  sizeBytes: number;
  url: string;
};

export type PreviewState = {
  currentPage: number;
  error?: string;
  isLoading: boolean;
  pageCount?: number;
  pages: PreviewPage[];
};

export type PrintActionType =
  | "file_uploaded"
  | "preview_generated"
  | "settings_changed"
  | "print_submitted"
  | "print_completed"
  | "print_cancelled"
  | "warning"
  | "error"
  | "assistant_message";

export type PrintAction = {
  id: string;
  type: PrintActionType;
  title: string;
  description?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
};

export type PrintChat = {
  id: string;
  title: string;
  status: "draft" | "ready" | "queued" | "printed" | "cancelled" | "error";
  file?: UploadedFile;
  jobId?: number;
  preview?: PreviewState;
  settings: PrintSettings;
  actions: PrintAction[];
  updatedAt: string;
};

export type BackendConnectionState = {
  baseUrl: string;
  error?: string;
  isLoading: boolean;
  lastCheckedAt?: string;
  reachable: boolean;
  service?: string;
};

export type PrinterStatusDetails = {
  acceptingJobs?: boolean | null;
  cupsAvailable?: boolean;
  cupsError?: string | null;
  enabled?: boolean;
  exists?: boolean;
  location?: string | null;
  message?: string;
  networkChecked?: boolean;
  networkHost?: string | null;
  networkPort?: number | null;
  networkReachable?: boolean | null;
  queueName?: string;
  reasons: string[];
  state?: string;
};

export type PrinterOptionCapability = {
  choices: string[];
  mapping: Record<string, string>;
  notes?: string;
  recommendedMapping: Record<string, string | null>;
  supported: boolean;
};

export type PrinterCapabilities = {
  collate: PrinterOptionCapability;
  colorModes: PrinterOptionCapability;
  duplexModes: PrinterOptionCapability;
  fitToPage: PrinterOptionCapability;
  mediaTypes: PrinterOptionCapability;
  orientation: PrinterOptionCapability;
  paperSizes: PrinterOptionCapability;
  quality: PrinterOptionCapability;
  queue?: string;
};

export type PrintJob = {
  canCancel?: boolean;
  canForget?: boolean;
  completedAt?: string;
  createdAt?: string;
  id: number;
  isActive?: boolean;
  isTerminal?: boolean;
  name?: string;
  queue?: string;
  reasons: string[];
  state?: string;
  stateCode?: number | null;
  user?: string;
};
