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
};

export type PrinterProfile = {
  id: string;
  name: string;
  avatarLabel: string;
  accentColor: string;
  accentSoftColor: string;
  accentBgColor: string;
  defaultSettings?: Partial<PrintSettings>;
};

export type UploadedFile = {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  pageCount?: number;
  previewUrl?: string;
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
  settings: PrintSettings;
  actions: PrintAction[];
  updatedAt: string;
};
