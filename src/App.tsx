import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import {
  AlertTriangle,
  Ban,
  Check,
  CheckCircle2,
  Clock3,
  Eye,
  FileSearch,
  FileText,
  Languages,
  Menu,
  MessageSquareText,
  Paperclip,
  Printer,
  RefreshCw,
  Save,
  Send,
  Settings2,
  SlidersHorizontal,
  Upload,
  X,
} from "lucide-react";
import {
  defaultSettings,
  mockPrintChats,
  profiles,
} from "./data/mockPrintData";
import {
  PrinterApiError,
  createPrinterApi,
  getPrinterApiBaseUrl,
} from "./api/printerApi";
import type {
  FileUploadResponseDto,
  JobInfoDto,
  OptionBlockDto,
  PreviewResponseDto,
  PrinterOptionsResponseDto,
  PrinterStatusDto,
  PrintRequestDto,
  PrintResponseDto,
} from "./api/printerApi";
import type {
  BackendConnectionState,
  PrinterCapabilities,
  PrinterOptionCapability,
  PrintAction,
  PrintActionType,
  PrintChat,
  PrintJob,
  PrinterProfile,
  PrinterStatus,
  PrinterStatusDetails,
  PrintSettings,
  UploadedFile,
} from "./types/print";
import {
  createTranslator,
  getLanguage,
  isLanguageCode,
  languages,
} from "./i18n";
import type { LanguageCode, TranslationKey, Translator } from "./i18n";
import type { TranslationValues } from "./i18n";
import {
  formatFileSize,
  formatShortDate,
  formatTime,
} from "./utils/format";

type SettingsKey = keyof PrintSettings;

const languageStorageKey = "print-bar-language";
const MAX_COPIES = 99;
const MIN_COPIES = 1;

type CountTranslationKeySet = Partial<
  Record<Intl.LDMLPluralRule, TranslationKey>
> & {
  other: TranslationKey;
};

const copyCountKeys: Record<LanguageCode, CountTranslationKeySet> = {
  en: {
    one: "count.copy.one",
    other: "count.copy.other",
  },
  pl: {
    few: "count.copy.few",
    many: "count.copy.many",
    one: "count.copy.one",
    other: "count.copy.other",
  },
};

const pageCountKeys: Record<LanguageCode, CountTranslationKeySet> = {
  en: {
    one: "count.page.one",
    other: "count.page.other",
  },
  pl: {
    few: "count.page.few",
    many: "count.page.many",
    one: "count.page.one",
    other: "count.page.other",
  },
};

const actionCountKeys: Record<LanguageCode, CountTranslationKeySet> = {
  en: {
    one: "count.action.one",
    other: "count.action.other",
  },
  pl: {
    few: "count.action.few",
    many: "count.action.many",
    one: "count.action.one",
    other: "count.action.other",
  },
};

const statusLabelKeys: Record<PrinterStatus, TranslationKey> = {
  ready: "status.ready",
  warning: "status.warning",
  error: "status.error",
  offline: "status.offline",
};

const flowStatusLabelKeys: Record<PrintChat["status"], TranslationKey> = {
  draft: "flowStatus.draft",
  ready: "flowStatus.ready",
  queued: "flowStatus.queued",
  printed: "flowStatus.printed",
  cancelled: "flowStatus.cancelled",
  error: "flowStatus.error",
};

const actionLabelKeys: Record<PrintActionType, TranslationKey> = {
  file_uploaded: "action.upload",
  preview_generated: "action.preview",
  settings_changed: "action.settings",
  print_submitted: "action.queue",
  print_completed: "action.printed",
  print_cancelled: "action.cancelled",
  warning: "action.warning",
  error: "action.error",
  assistant_message: "action.assistant",
};

const actionCopyKeys: Partial<
  Record<PrintAction["id"], { title: TranslationKey; description?: TranslationKey }>
> = {
  "act-contract-settings": {
    title: "timeline.contract.settings.title",
    description: "timeline.contract.settings.description",
  },
  "act-contract-submitted": {
    title: "timeline.contract.submitted.title",
    description: "timeline.contract.submitted.description",
  },
  "act-contract-uploaded": {
    title: "timeline.contract.uploaded.title",
    description: "timeline.contract.uploaded.description",
  },
  "act-invoice-complete": {
    title: "timeline.invoice.complete.title",
    description: "timeline.invoice.complete.description",
  },
  "act-invoice-guidance": {
    title: "timeline.invoice.guidance.title",
    description: "timeline.invoice.guidance.description",
  },
  "act-invoice-preview": {
    title: "timeline.invoice.preview.title",
    description: "timeline.invoice.preview.description",
  },
  "act-invoice-submitted": {
    title: "timeline.invoice.submitted.title",
    description: "timeline.invoice.submitted.description",
  },
  "act-invoice-uploaded": {
    title: "timeline.invoice.uploaded.title",
    description: "timeline.invoice.uploaded.description",
  },
  "act-label-complete": {
    title: "timeline.label.complete.title",
    description: "timeline.label.complete.description",
  },
  "act-label-settings": {
    title: "timeline.label.settings.title",
    description: "timeline.label.settings.description",
  },
  "act-label-uploaded": {
    title: "timeline.label.uploaded.title",
    description: "timeline.label.uploaded.description",
  },
  "act-notes-guidance": {
    title: "timeline.notes.guidance.title",
    description: "timeline.notes.guidance.description",
  },
  "act-recipe-cancelled": {
    title: "timeline.recipe.cancelled.title",
    description: "timeline.recipe.cancelled.description",
  },
  "act-recipe-uploaded": {
    title: "timeline.recipe.uploaded.title",
    description: "timeline.recipe.uploaded.description",
  },
  "act-recipe-warning": {
    title: "timeline.recipe.warning.title",
    description: "timeline.recipe.warning.description",
  },
};

// Validation helpers for print settings and state
const isValidCopies = (copies: number): boolean =>
  Number.isInteger(copies) && copies >= MIN_COPIES && copies <= MAX_COPIES;

const isEditableChat = (chat: PrintChat): boolean =>
  chat.status === "draft" || chat.status === "ready";

const isValidPageRange = (pageRange: string): boolean => {
  if (pageRange === "all") return true;
  // Allow formats: "1", "1-5", "1,3,5", "1-5,7,9-10"
  return /^(\d+(-\d+)?)(,\d+(-\d+)?)*$/.test(pageRange);
};

const sanitizePageRangeInput = (value: string): string =>
  value
    .replace(/\s+/g, "")
    .replace(/[^\d,-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/,{2,}/g, ",")
    .replace(/,-|-,/g, (match) => match[0]);

// UUID generator with fallback for non-secure contexts (HTTP on LAN)
const generateId = (): string => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch {
      // Fallback if randomUUID fails despite being available
    }
  }

  // Fallback using getRandomValues for HTTP contexts
  const template = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";
  return template.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const makeAction = (
  type: PrintActionType,
  title: string,
  description: string,
  metadata?: PrintAction["metadata"],
): PrintAction => ({
  id: generateId(),
  type,
  title,
  description,
  createdAt: new Date().toISOString(),
  metadata,
});

const makeTranslatedAction = (
  type: PrintActionType,
  titleKey: TranslationKey,
  descriptionKey: TranslationKey,
  t: Translator,
  values?: TranslationValues,
) =>
  makeAction(type, t(titleKey, values), t(descriptionKey, values), {
    i18n: {
      descriptionKey,
      titleKey,
      values,
    },
  });

const getInitialLanguage = (): LanguageCode => {
  if (typeof window === "undefined") {
    return "en";
  }

  try {
    const storedLanguage = window.localStorage.getItem(languageStorageKey);

    if (storedLanguage && isLanguageCode(storedLanguage)) {
      return storedLanguage;
    }
  } catch {
    // Storage can be unavailable in private or embedded browser contexts.
  }

  const browserLanguage = window.navigator.language.split("-")[0];

  return isLanguageCode(browserLanguage) ? browserLanguage : "en";
};

const getStatusLabel = (status: PrinterStatus, t: Translator) =>
  t(statusLabelKeys[status]);

const getFlowStatusLabel = (status: PrintChat["status"], t: Translator) =>
  t(flowStatusLabelKeys[status]);

const getActionLabel = (type: PrintActionType, t: Translator) =>
  t(actionLabelKeys[type]);

const getActionCopy = (action: PrintAction, t: Translator) => {
  const i18n = action.metadata?.i18n as
    | {
        descriptionKey?: TranslationKey;
        titleKey?: TranslationKey;
        values?: TranslationValues;
      }
    | undefined;

  if (i18n?.titleKey) {
    return {
      description: i18n.descriptionKey
        ? t(i18n.descriptionKey, i18n.values)
        : action.description,
      title: t(i18n.titleKey, i18n.values),
    };
  }

  const keys = actionCopyKeys[action.id];

  return {
    description: keys?.description ? t(keys.description) : action.description,
    title: keys ? t(keys.title) : action.title,
  };
};

const getLocale = (language: LanguageCode) => getLanguage(language).locale;

const formatCount = (
  count: number,
  language: LanguageCode,
  t: Translator,
  keys: Record<LanguageCode, CountTranslationKeySet>,
) => {
  const pluralRule = new Intl.PluralRules(getLocale(language)).select(count);
  const key = keys[language][pluralRule] ?? keys[language].other;

  return t(key, { count });
};

const formatCopyCount = (
  count: number,
  language: LanguageCode,
  t: Translator,
) => formatCount(count, language, t, copyCountKeys);

const formatPageCount = (
  count: number,
  language: LanguageCode,
  t: Translator,
) => formatCount(count, language, t, pageCountKeys);

const formatActionCount = (
  count: number,
  language: LanguageCode,
  t: Translator,
) => formatCount(count, language, t, actionCountKeys);

const formatPageCountValue = (
  count: number | undefined,
  language: LanguageCode,
  t: Translator,
) => (count ? formatPageCount(count, language, t) : t("unknownPages"));

const formatMimeType = (mimeType: string, t: Translator) => {
  if (mimeType === "application/pdf") {
    return t("mime.pdf");
  }

  if (mimeType === "text/plain") {
    return t("mime.text");
  }

  if (mimeType.startsWith("image/")) {
    return t("mime.image", {
      type: mimeType.split("/")[1]?.toUpperCase() ?? "Image",
    });
  }

  return mimeType;
};

const formatPageRange = (pageRange: PrintSettings["pageRange"], t: Translator) =>
  pageRange === "all" ? t("allPages") : pageRange;

const formatPageRangeInput = (
  pageRange: PrintSettings["pageRange"],
) => (pageRange === "all" ? "" : pageRange);

const parsePageRangeInput = (value: string): PrintSettings["pageRange"] => {
  const trimmed = sanitizePageRangeInput(value);
  const normalized = trimmed.toLowerCase();

  // Empty input or explicit "all" variants → default to "all"
  if (
    !trimmed ||
    normalized === "all" ||
    normalized === "wszystkie" ||
    normalized === "calosc" ||
    normalized === "całość"
  ) {
    return "all";
  }

  return trimmed;
};

const inferCommandSettings = (
  command: string,
  settings: PrintSettings,
  language: LanguageCode,
  t: Translator,
) => {
  const nextSettings = { ...settings };
  const changes: string[] = [];
  const normalized = command.toLowerCase();
  const copiesMatch = normalized.match(
    /(\d+)\s*(copy|copies|kopia|kopie|kopii|egzemplarz|egzemplarze|egzemplarzy)/,
  );

  if (copiesMatch?.[1]) {
    nextSettings.copies = Math.max(1, Number(copiesMatch[1]));
    changes.push(formatCopyCount(nextSettings.copies, language, t));
  }

  if (
    normalized.includes("grayscale") ||
    normalized.includes("black and white") ||
    normalized.includes("skala szarości") ||
    normalized.includes("szarości") ||
    normalized.includes("czarno-bia")
  ) {
    nextSettings.colorMode = "grayscale";
    changes.push(t("colorMode.grayscale"));
  }

  if (normalized.includes("color") || normalized.includes("kolor")) {
    nextSettings.colorMode = "color";
    changes.push(t("colorMode.color"));
  }

  if (normalized.includes("landscape") || normalized.includes("poziom")) {
    nextSettings.orientation = "landscape";
    changes.push(t("option.landscape"));
  }

  if (normalized.includes("portrait") || normalized.includes("pionow")) {
    nextSettings.orientation = "portrait";
    changes.push(t("option.portrait"));
  }

  if (
    normalized.includes("duplex") ||
    normalized.includes("double sided") ||
    normalized.includes("dwustron")
  ) {
    nextSettings.duplex = "long-edge";
    changes.push(t("duplex.longEdge"));
  }

  return { nextSettings, changes };
};

const getFlowMeta = (
  chat: PrintChat,
  language: LanguageCode,
  t: Translator,
) => {
  if (!chat.file) {
    return t("meta.noFile");
  }

  const pageText = formatPageCountValue(chat.file.pageCount, language, t);
  const mode = t(
    chat.settings.colorMode === "grayscale"
      ? "colorMode.grayscale"
      : "colorMode.color",
  );

  if (chat.status === "cancelled") {
    return t("meta.cancelledWrongSize");
  }

  if (chat.status === "queued") {
    return t("meta.queued");
  }

  if (chat.status === "printed") {
    return t("meta.printed", { mode, pages: pageText });
  }

  return `${pageText} / ${mode}`;
};

const getSettingChangeDescription = (
  key: SettingsKey,
  value: PrintSettings[SettingsKey],
  t: Translator,
): { title: string; description: string } => {
  const baseTitle = t("action.settings");

  if (key === "copies") {
    return {
      title: baseTitle,
      description: `${t("copies")}: ${value}`,
    };
  }

  if (key === "pageRange") {
    const displayValue = value === "all" ? t("allPages") : value;
    return {
      title: baseTitle,
      description: `${t("pageRange")}: ${displayValue}`,
    };
  }

  if (key === "colorMode") {
    const displayValue = value === "grayscale" ? t("colorMode.grayscale") : t("colorMode.color");
    return {
      title: baseTitle,
      description: `${t("color")}: ${displayValue}`,
    };
  }

  if (key === "paperSize") {
    return {
      title: baseTitle,
      description: `${t("paper")}: ${value}`,
    };
  }

  if (key === "orientation") {
    const displayValue = value === "landscape" ? t("option.landscape") : t("option.portrait");
    return {
      title: baseTitle,
      description: `${t("orientation")}: ${displayValue}`,
    };
  }

  if (key === "duplex") {
    const displayValue =
      value === "none"
        ? t("duplex.none")
        : value === "long-edge"
          ? t("duplex.longEdge")
          : t("duplex.shortEdge");
    return {
      title: baseTitle,
      description: `${t("duplex")}: ${displayValue}`,
    };
  }

  if (key === "quality") {
    // Quality values don't have translation keys, display as-is
    return {
      title: baseTitle,
      description: `${t("quality")}: ${String(value).charAt(0).toUpperCase() + String(value).slice(1)}`,
    };
  }

  if (key === "fitToPage") {
    const displayValue = value ? "On" : "Off";
    return {
      title: baseTitle,
      description: `${t("fitToPage")}: ${displayValue}`,
    };
  }

  if (key === "collate") {
    return {
      title: baseTitle,
      description: `${t("collate")}: ${value ? "On" : "Off"}`,
    };
  }

  if (key === "mediaType") {
    return {
      title: baseTitle,
      description: `${t("mediaType")}: ${String(value)}`,
    };
  }

  return {
    title: baseTitle,
    description: "",
  };
};

const getDisabledReason = (
  chat: PrintChat,
  status: PrinterStatus,
  backendReachable: boolean,
  t: Translator,
) => {
  if (!chat.file) {
    return t("disabled.noFile");
  }

  if (!backendReachable) {
    return t("disabled.backendUnavailable");
  }

  if (status !== "ready") {
    return t("disabled.printerNotReady");
  }

  if (!isEditableChat(chat)) {
    return t("disabled.historyLocked");
  }

  if (!isValidPageRange(chat.settings.pageRange)) {
    return t("disabled.invalidPageRange");
  }

  return "";
};

const getLatestGuidance = (chat: PrintChat) =>
  [...chat.actions]
    .reverse()
    .find((action) =>
      ["assistant_message", "warning", "error"].includes(action.type),
    );

const createDraftChat = (): PrintChat => ({
  id: generateId(),
  title: "New print flow",
  status: "draft",
  settings: defaultSettings,
  actions: [
    makeAction(
      "assistant_message",
      "Waiting for a file",
      "Upload a PDF, image, or text file to start a real print flow.",
    ),
  ],
  updatedAt: new Date().toISOString(),
});

const fallbackCapability = (
  choices: string[],
  notes = "Using safe defaults until printer options load.",
): PrinterOptionCapability => ({
  choices,
  mapping: {},
  notes,
  recommendedMapping: {},
  supported: true,
});

const fallbackCapabilities: PrinterCapabilities = {
  collate: fallbackCapability(["true", "false"]),
  colorModes: fallbackCapability(["color", "monochrome"]),
  duplexModes: fallbackCapability(["none", "long-edge", "short-edge"]),
  fitToPage: fallbackCapability(["true", "false"]),
  mediaTypes: fallbackCapability(["plain"]),
  orientation: fallbackCapability(["portrait", "landscape"]),
  paperSizes: fallbackCapability(["A4", "A5", "Letter"]),
  quality: fallbackCapability(["draft", "normal", "high"]),
};

const mapOptionBlock = (
  block: OptionBlockDto,
  fallbackChoices: string[],
): PrinterOptionCapability => ({
  choices: block.choices.length > 0 ? block.choices : fallbackChoices,
  mapping: block.mapping ?? {},
  notes: block.notes,
  recommendedMapping: block.recommended_mapping ?? {},
  supported: block.supported,
});

const mapCapabilities = (options: PrinterOptionsResponseDto): PrinterCapabilities => ({
  collate: mapOptionBlock(options.collate, ["true", "false"]),
  colorModes: mapOptionBlock(options.color_modes, ["color", "monochrome"]),
  duplexModes: mapOptionBlock(options.duplex_modes, [
    "none",
    "long-edge",
    "short-edge",
  ]),
  fitToPage: mapOptionBlock(options.fit_to_page, ["true", "false"]),
  mediaTypes: mapOptionBlock(options.media_types, ["plain"]),
  orientation: mapOptionBlock(options.orientation, ["portrait", "landscape"]),
  paperSizes: mapOptionBlock(options.paper_sizes, ["A4", "A5", "Letter"]),
  quality: mapOptionBlock(options.quality, ["draft", "normal", "high"]),
  queue: options.queue,
});

const mapUploadedFile = (file: FileUploadResponseDto): UploadedFile => ({
  id: file.file_id,
  mimeType: file.detected_mime,
  name: file.original_filename,
  pageCount: file.page_count ?? undefined,
  previewAvailable: file.preview_available,
  sizeBytes: file.size_bytes,
});

const mapBackendStatus = (status?: PrinterStatusDto): PrinterStatus => {
  if (!status) {
    return "offline";
  }

  if (!status.cups.available || !status.exists) {
    return "offline";
  }

  if (!status.enabled || status.state === "stopped" || status.state === "missing") {
    return "error";
  }

  const blockingReasons = status.reasons.filter(
    (reason) => reason.trim().toLowerCase() !== "none",
  );

  if (status.accepting_jobs === false || blockingReasons.length > 0) {
    return "warning";
  }

  return "ready";
};

const mapJob = (job: JobInfoDto): PrintJob => ({
  completedAt: job.completed_at === undefined || job.completed_at === null
    ? undefined
    : String(job.completed_at),
  createdAt: job.created_at === undefined || job.created_at === null
    ? undefined
    : String(job.created_at),
  id: job.job_id,
  name: job.name,
  queue: job.queue,
  reasons: job.reasons ?? [],
  state: job.state,
  user: job.user,
});

const getErrorMessage = (error: unknown) => {
  if (error instanceof PrinterApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unexpected printer backend error.";
};

const mapSettingsToPrintRequest = (
  fileId: string,
  settings: PrintSettings,
): PrintRequestDto => ({
  file_id: fileId,
  options: {
    collate: settings.collate,
    color_mode: settings.colorMode === "grayscale" ? "monochrome" : "color",
    copies: Math.max(MIN_COPIES, Math.min(MAX_COPIES, settings.copies)),
    duplex: settings.duplex,
    fit_to_page: settings.fitToPage,
    media_type: settings.mediaType,
    orientation: settings.orientation,
    pages: settings.pageRange === "all" ? null : settings.pageRange,
    paper_size: settings.paperSize,
    quality: settings.quality,
  },
});

const formatAppliedOptions = (response: PrintResponseDto) => {
  const count = Object.keys(response.applied_options).length;
  const unsupported = response.unsupported_options.length;
  const warnings = response.warnings.length;
  const details = [`${count} backend option${count === 1 ? "" : "s"} applied`];

  if (unsupported) {
    details.push(`${unsupported} unsupported`);
  }

  if (warnings) {
    details.push(`${warnings} warning${warnings === 1 ? "" : "s"}`);
  }

  return details.join(", ");
};

function App() {
  const api = useMemo(
    () => createPrinterApi({ baseUrl: getPrinterApiBaseUrl() }),
    [],
  );
  const [printChats, setPrintChats] = useState<PrintChat[]>(() => [
    createDraftChat(),
    ...mockPrintChats,
  ]);
  const [selectedChatId, setSelectedChatId] = useState(() => printChats[0].id);
  const [selectedProfileId, setSelectedProfileId] = useState(profiles[0].id);
  const [language, setLanguage] = useState<LanguageCode>(getInitialLanguage);
  const [command, setCommand] = useState("");
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const [profileSettingsOpen, setProfileSettingsOpen] = useState(false);
  const [backendConnection, setBackendConnection] =
    useState<BackendConnectionState>({
      baseUrl: api.baseUrl,
      isLoading: true,
      reachable: false,
    });
  const [printerStatus, setPrinterStatus] = useState<PrinterStatus>("offline");
  const [printerDetails, setPrinterDetails] =
    useState<PrinterStatusDetails>({
      reasons: [],
    });
  const [capabilities, setCapabilities] =
    useState<PrinterCapabilities>(fallbackCapabilities);
  const [optionsError, setOptionsError] = useState("");
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [jobsError, setJobsError] = useState("");
  const [jobsLoading, setJobsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const selectedProfile =
    profiles.find((profile) => profile.id === selectedProfileId) ?? profiles[0];

  const t = useMemo(() => createTranslator(language), [language]);

  const selectedChat = useMemo(
    () =>
      printChats.find((chat) => chat.id === selectedChatId) ?? printChats[0],
    [printChats, selectedChatId],
  );

  const themeStyle = {
    "--accent": selectedProfile.accentColor,
    "--accent-soft": selectedProfile.accentSoftColor,
    "--accent-bg": selectedProfile.accentBgColor,
    "--accent-text": selectedProfile.accentTextColor,
    "--app-bg": selectedProfile.appBgColor,
    "--ambient-glow": selectedProfile.ambientGlowColor,
    "--field-bg": selectedProfile.fieldBgColor,
    "--main-bg": selectedProfile.mainBgColor,
    "--panel-bg": selectedProfile.panelBgColor,
    "--panel-solid": selectedProfile.panelSolidColor,
    "--paper-bg": selectedProfile.paperBgColor,
    "--surface-raised": selectedProfile.surfaceRaisedColor,
    "--surface-soft": selectedProfile.surfaceSoftColor,
    "--surface-sunken": selectedProfile.surfaceSunkenColor,
    "--toolbar-bg": selectedProfile.toolbarBgColor,
    "--workspace-glow": selectedProfile.workspaceGlowColor,
    "--workspace-header-bg": selectedProfile.workspaceHeaderBgColor,
  } as CSSProperties;

  const canPrint = Boolean(
    selectedChat.file &&
      backendConnection.reachable &&
      printerStatus === "ready" &&
      isEditableChat(selectedChat) &&
      !isPrinting &&
      isValidCopies(selectedChat.settings.copies) &&
      isValidPageRange(
        selectedChat.settings.pageRange === "all"
          ? "all"
          : selectedChat.settings.pageRange,
      )
  );
  const disabledReason = getDisabledReason(
    selectedChat,
    printerStatus,
    backendConnection.reachable,
    t,
  );

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = language;
    }

    try {
      window.localStorage.setItem(languageStorageKey, language);
    } catch {
      // Language switching still works when persistence is blocked.
    }
  }, [language]);

  const updateChatById = (
    chatId: string,
    updater: (chat: PrintChat) => PrintChat,
  ) => {
    setPrintChats((currentChats) =>
      currentChats.map((chat) =>
        chat.id === chatId ? updater(chat) : chat,
      ),
    );
  };

  const updateSelectedChat = (updater: (chat: PrintChat) => PrintChat) => {
    updateChatById(selectedChatId, updater);
  };

  const refreshJobs = useCallback(async () => {
    setJobsLoading(true);
    setJobsError("");

    try {
      const response = await api.jobs();
      setJobs(response.jobs.map(mapJob));
    } catch (error) {
      setJobsError(getErrorMessage(error));
      setJobs([]);
    } finally {
      setJobsLoading(false);
    }
  }, [api]);

  const refreshBackendState = useCallback(async () => {
    const checkedAt = new Date().toISOString();
    setBackendConnection((current) => ({
      ...current,
      error: undefined,
      isLoading: true,
    }));

    try {
      const health = await api.health();
      setBackendConnection({
        baseUrl: api.baseUrl,
        isLoading: false,
        lastCheckedAt: checkedAt,
        reachable: true,
        service: health.service,
      });
    } catch (error) {
      const message = getErrorMessage(error);
      setBackendConnection({
        baseUrl: api.baseUrl,
        error: message,
        isLoading: false,
        lastCheckedAt: checkedAt,
        reachable: false,
      });
      setPrinterStatus("offline");
      setPrinterDetails({
        cupsAvailable: false,
        cupsError: message,
        reasons: [],
      });
      setOptionsError("Printer options are using safe defaults until the backend is reachable.");
      setJobs([]);
      setJobsError(message);
      return;
    }

    try {
      const status = await api.status();
      setPrinterStatus(mapBackendStatus(status));
      setPrinterDetails({
        acceptingJobs: status.accepting_jobs,
        cupsAvailable: status.cups.available,
        cupsError: status.cups.error,
        enabled: status.enabled,
        exists: status.exists,
        location: status.location,
        message: status.message,
        queueName: status.queue_name,
        reasons: status.reasons,
        state: status.state,
      });
    } catch (error) {
      setPrinterStatus("error");
      setPrinterDetails({
        cupsAvailable: false,
        cupsError: getErrorMessage(error),
        reasons: [],
      });
    }

    try {
      const options = await api.options();
      setCapabilities(mapCapabilities(options));
      setOptionsError("");
    } catch (error) {
      setCapabilities(fallbackCapabilities);
      setOptionsError(getErrorMessage(error));
    }

    await refreshJobs();
  }, [api, refreshJobs]);

  useEffect(() => {
    void refreshBackendState();
  }, [refreshBackendState]);

  const updateSetting = <Key extends SettingsKey>(
    key: Key,
    value: PrintSettings[Key],
  ) => {
    updateSelectedChat((chat) => {
      if (!isEditableChat(chat)) {
        return chat;
      }

      let actions = chat.actions;
      const description = getSettingChangeDescription(key, value, t);
      const lastAction = actions[actions.length - 1];
      const lastSettingKey = lastAction?.metadata?.settingKey;

      if (
        lastAction?.type === "settings_changed" &&
        lastSettingKey === key
      ) {
        actions = [
          ...actions.slice(0, -1),
          {
            ...lastAction,
            description: description.description,
            metadata: {
              ...lastAction.metadata,
              settingKey: key,
            },
          },
        ];
      } else {
        actions = [
          ...chat.actions,
          makeAction(
            "settings_changed",
            description.title,
            description.description,
            { settingKey: key },
          ),
        ];
      }

      return {
        ...chat,
        settings: {
          ...chat.settings,
          [key]: value,
        },
        actions,
        updatedAt: new Date().toISOString(),
      };
    });
  };

  const addTranslatedActionToSelectedChat = (
    type: PrintActionType,
    titleKey: TranslationKey,
    descriptionKey: TranslationKey,
    values?: TranslationValues,
  ) => {
    updateSelectedChat((chat) => ({
      ...chat,
      actions: [
        ...chat.actions,
        makeTranslatedAction(type, titleKey, descriptionKey, t, values),
      ],
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleSelectProfile = (profileId: string) => {
    const profile = profiles.find((item) => item.id === profileId);
    setSelectedProfileId(profileId);

    // Only apply default settings to draft or ready flows; don't mutate historical prints
    if (!profile?.defaultSettings || !isEditableChat(selectedChat)) {
      return;
    }

    updateSelectedChat((chat) => ({
      ...chat,
      settings: {
        ...chat.settings,
        ...profile.defaultSettings,
      },
      actions: [
        ...chat.actions,
        makeTranslatedAction(
          "settings_changed",
          "profileApplied.title",
          "profileApplied.description",
          t,
          { profileName: profile.name },
        ),
      ],
      updatedAt: new Date().toISOString(),
    }));
  };

  const loadPreviewForChat = async (chatId: string, file: UploadedFile) => {
    if (!file.previewAvailable) {
      updateChatById(chatId, (chat) => ({
        ...chat,
        actions: [
          ...chat.actions,
          makeAction(
            "assistant_message",
            "Preview unavailable",
            "The backend accepted this file, but no preview image is available.",
          ),
        ],
        preview: {
          currentPage: 1,
          isLoading: false,
          pageCount: file.pageCount,
          pages: [],
        },
        updatedAt: new Date().toISOString(),
      }));
      return;
    }

    updateChatById(chatId, (chat) => ({
      ...chat,
      preview: {
        currentPage: 1,
        isLoading: true,
        pageCount: file.pageCount,
        pages: [],
      },
      updatedAt: new Date().toISOString(),
    }));

    try {
      const preview: PreviewResponseDto = await api.previewFile(file.id);
      const pages = preview.pages.map((page) => ({
        page: page.page,
        sizeBytes: page.size_bytes,
        url: api.resolveUrl(page.url),
      }));
      const firstPageUrl =
        pages[0]?.url ?? api.previewPageUrl(file.id, pages[0]?.page ?? 1);

      updateChatById(chatId, (chat) => ({
        ...chat,
        actions: [
          ...chat.actions,
          makeAction(
            "preview_generated",
            "Preview generated",
            `${preview.page_count ?? (pages.length || file.pageCount) ?? "Unknown"} page preview ready.`,
          ),
        ],
        file: {
          ...file,
          pageCount: preview.page_count ?? file.pageCount,
          previewUrl: firstPageUrl,
        },
        preview: {
          currentPage: pages[0]?.page ?? 1,
          isLoading: false,
          pageCount: preview.page_count ?? file.pageCount,
          pages,
        },
        updatedAt: new Date().toISOString(),
      }));
    } catch (error) {
      const message = getErrorMessage(error);
      updateChatById(chatId, (chat) => ({
        ...chat,
        actions: [
          ...chat.actions,
          makeAction("error", "Preview failed", message),
        ],
        preview: {
          currentPage: 1,
          error: message,
          isLoading: false,
          pageCount: file.pageCount,
          pages: [],
        },
        updatedAt: new Date().toISOString(),
      }));
    }
  };

  const handleFileUpload = async (file: File) => {
    const targetChat = isEditableChat(selectedChat) ? selectedChat : createDraftChat();
    const targetChatId = targetChat.id;

    if (targetChat.id !== selectedChat.id) {
      setPrintChats((currentChats) => [targetChat, ...currentChats]);
      setSelectedChatId(targetChat.id);
    }

    setIsUploading(true);

    try {
      const response = await api.uploadFile(file);
      const uploadedFile = mapUploadedFile(response);

      updateChatById(targetChatId, (chat) => ({
        ...chat,
        actions: [
          ...chat.actions,
          makeAction(
            "file_uploaded",
            "File uploaded",
            `${formatMimeType(uploadedFile.mimeType, t)} detected, ${formatFileSize(uploadedFile.sizeBytes)}.`,
          ),
        ],
        file: uploadedFile,
        preview: {
          currentPage: 1,
          isLoading: Boolean(uploadedFile.previewAvailable),
          pageCount: uploadedFile.pageCount,
          pages: [],
        },
        settings: {
          ...defaultSettings,
          ...chat.settings,
        },
        status: "ready",
        title: uploadedFile.name,
        updatedAt: new Date().toISOString(),
      }));

      await loadPreviewForChat(targetChatId, uploadedFile);
    } catch (error) {
      updateChatById(targetChatId, (chat) => ({
        ...chat,
        actions: [
          ...chat.actions,
          makeAction("error", "Upload failed", getErrorMessage(error)),
        ],
        status: "error",
        updatedAt: new Date().toISOString(),
      }));
    } finally {
      setIsUploading(false);
    }
  };

  const handleAttach = () => {
    if (selectedChat.file) {
      addTranslatedActionToSelectedChat(
        "assistant_message",
        "chat.fileAlreadySelected.title",
        "chat.fileAlreadySelected.description",
      );
    }
  };

  const handleCommandSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedCommand = command.trim();

    if (!trimmedCommand) {
      return;
    }

    updateSelectedChat((chat) => {
      const { nextSettings, changes } = inferCommandSettings(
        trimmedCommand,
        chat.settings,
        language,
        t,
      );
      const hasSettingChanges = changes.length > 0;

      if (hasSettingChanges && !isEditableChat(chat)) {
        return chat;
      }

      return {
        ...chat,
        settings: nextSettings,
        actions: [
          ...chat.actions,
          makeTranslatedAction(
            hasSettingChanges ? "settings_changed" : "assistant_message",
            hasSettingChanges
              ? "chat.instructionApplied.title"
              : "chat.instructionNoted.title",
            hasSettingChanges
              ? "chat.instructionApplied.description"
              : "chat.instructionNoted.description",
            t,
            hasSettingChanges
              ? { changes: changes.join(", ") }
              : { command: trimmedCommand },
          ),
        ],
        updatedAt: new Date().toISOString(),
      };
    });

    setCommand("");
  };

  const handlePreview = () => {
    if (!selectedChat.file) {
      addTranslatedActionToSelectedChat(
        "error",
        "chat.previewRefreshed.title",
        "chat.previewRefreshed.noFile",
      );
      return;
    }

    void loadPreviewForChat(selectedChat.id, selectedChat.file);
  };

  const handlePreviewPageChange = (page: number) => {
    if (!selectedChat.file || !selectedChat.preview) {
      return;
    }

    const nextPage = selectedChat.preview.pages.find(
      (previewPage) => previewPage.page === page,
    );

    updateSelectedChat((chat) => ({
      ...chat,
      file: chat.file
        ? {
            ...chat.file,
            previewUrl: nextPage?.url ?? api.previewPageUrl(chat.file.id, page),
          }
        : chat.file,
      preview: chat.preview
        ? {
            ...chat.preview,
            currentPage: page,
          }
        : chat.preview,
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleSavePreset = () => {
    addTranslatedActionToSelectedChat(
      "assistant_message",
      "chat.presetNoted.title",
      "chat.presetNoted.description",
    );
  };

  const handlePrint = async () => {
    if (!canPrint) {
      return;
    }

    const chatId = selectedChat.id;
    const file = selectedChat.file;

    if (!file) {
      return;
    }

    setIsPrinting(true);

    try {
      const response = await api.print(
        mapSettingsToPrintRequest(file.id, selectedChat.settings),
      );

      updateChatById(chatId, (chat) => ({
        ...chat,
        actions: [
          ...chat.actions,
          makeAction(
            "print_submitted",
            "Print submitted",
            `${response.submitted_filename} sent to ${response.queue} as job #${response.job_id}. ${formatAppliedOptions(response)}.`,
            {
              appliedOptions: response.applied_options,
              unsupportedOptions: response.unsupported_options,
              warnings: response.warnings,
            },
          ),
          ...(response.unsupported_options.length || response.warnings.length
            ? [
                makeAction(
                  "warning",
                  "Backend guidance",
                  [
                    ...response.warnings,
                    ...response.unsupported_options.map(
                      (option) => `${option} is not supported by this printer.`,
                    ),
                  ].join(" "),
                ),
              ]
            : []),
        ],
        jobId: response.job_id,
        status: "queued",
        updatedAt: new Date().toISOString(),
      }));

      await refreshJobs();
    } catch (error) {
      updateChatById(chatId, (chat) => ({
        ...chat,
        actions: [
          ...chat.actions,
          makeAction("error", "Print failed", getErrorMessage(error)),
        ],
        status: "error",
        updatedAt: new Date().toISOString(),
      }));
    } finally {
      setIsPrinting(false);
    }
  };

  const handleCancelJob = async (jobId: number) => {
    try {
      const response = await api.cancelJob(jobId);
      const message =
        response.message ??
        (response.cancelled
          ? "Job cancelled."
          : "No active job was available to cancel.");
      let matched = false;

      setPrintChats((currentChats) =>
        currentChats.map((chat) => {
          if (chat.jobId !== jobId) {
            return chat;
          }

          matched = true;
          return {
            ...chat,
            actions: [
              ...chat.actions,
              makeAction("print_cancelled", "Job cancelled", message),
            ],
            status: response.cancelled ? "cancelled" : chat.status,
            updatedAt: new Date().toISOString(),
          };
        }),
      );

      if (!matched) {
        updateSelectedChat((chat) => ({
          ...chat,
          actions: [
            ...chat.actions,
            makeAction("print_cancelled", `Job #${jobId} cancelled`, message),
          ],
          updatedAt: new Date().toISOString(),
        }));
      }

      await refreshJobs();
    } catch (error) {
      updateSelectedChat((chat) => ({
        ...chat,
        actions: [
          ...chat.actions,
          makeAction("error", `Could not cancel job #${jobId}`, getErrorMessage(error)),
        ],
        updatedAt: new Date().toISOString(),
      }));
    }
  };

  return (
    <div className="appFrame" style={themeStyle}>
      <div
        className={`drawerOverlay ${leftOpen || rightOpen ? "isVisible" : ""}`}
        onClick={() => {
          setLeftOpen(false);
          setRightOpen(false);
        }}
      />
      <div className="appShell">
        <PrinterSidebar
          backend={backendConnection}
          chats={printChats}
          details={printerDetails}
          selectedChatId={selectedChat.id}
          status={printerStatus}
          selectedProfile={selectedProfile}
          profiles={profiles}
          language={language}
          t={t}
          isOpen={leftOpen}
          isSettingsOpen={profileSettingsOpen}
          onClose={() => setLeftOpen(false)}
          onSelectChat={(chatId) => {
            setSelectedChatId(chatId);
            setLeftOpen(false);
          }}
          onSelectProfile={handleSelectProfile}
          onSelectLanguage={setLanguage}
          onToggleSettings={() => setProfileSettingsOpen((current) => !current)}
          onCloseSettings={() => setProfileSettingsOpen(false)}
          onRefresh={refreshBackendState}
        />
        <MainWorkspace
          chat={selectedChat}
          command={command}
          isUploading={isUploading}
          language={language}
          t={t}
          onCommandChange={setCommand}
          onCommandSubmit={handleCommandSubmit}
          onAttach={handleAttach}
          onPreviewPageChange={handlePreviewPageChange}
          onUploadFile={handleFileUpload}
          onOpenFlows={() => setLeftOpen(true)}
          onOpenSettings={() => setRightOpen(true)}
        />
        <PreferencesPanel
          backend={backendConnection}
          capabilities={capabilities}
          chat={selectedChat}
          jobs={jobs}
          jobsError={jobsError}
          jobsLoading={jobsLoading}
          optionsError={optionsError}
          status={printerStatus}
          profiles={profiles}
          selectedProfileId={selectedProfile.id}
          language={language}
          t={t}
          canPrint={canPrint}
          disabledReason={disabledReason}
          canEditSettings={isEditableChat(selectedChat)}
          isPrinting={isPrinting}
          isOpen={rightOpen}
          onClose={() => setRightOpen(false)}
          onCancelJob={handleCancelJob}
          onRefreshBackend={refreshBackendState}
          onRefreshJobs={refreshJobs}
          onSettingChange={updateSetting}
          onProfileChange={handleSelectProfile}
          onPreview={handlePreview}
          onSavePreset={handleSavePreset}
          onPrint={handlePrint}
        />
      </div>
    </div>
  );
}

type PrinterSidebarProps = {
  backend: BackendConnectionState;
  chats: PrintChat[];
  details: PrinterStatusDetails;
  selectedChatId: string;
  status: PrinterStatus;
  selectedProfile: PrinterProfile;
  profiles: PrinterProfile[];
  language: LanguageCode;
  t: Translator;
  isOpen: boolean;
  isSettingsOpen: boolean;
  onClose: () => void;
  onSelectChat: (chatId: string) => void;
  onSelectLanguage: (language: LanguageCode) => void;
  onSelectProfile: (profileId: string) => void;
  onToggleSettings: () => void;
  onCloseSettings: () => void;
  onRefresh: () => void;
};

function PrinterSidebar({
  backend,
  chats,
  details,
  selectedChatId,
  status,
  selectedProfile,
  profiles,
  language,
  t,
  isOpen,
  isSettingsOpen,
  onClose,
  onSelectChat,
  onSelectLanguage,
  onSelectProfile,
  onToggleSettings,
  onCloseSettings,
  onRefresh,
}: PrinterSidebarProps) {
  const queuedCount = chats.filter((chat) => chat.status === "queued").length;
  const selectedLanguage = getLanguage(language);
  const queueName = details.queueName ?? "Canon MG5350";

  return (
    <aside className={`printerSidebar ${isOpen ? "isOpen" : ""}`}>
      <div className="mobilePanelHeader">
        <button className="iconButton" type="button" onClick={onClose} aria-label={t("closePrintFlows")}>
          <X size={17} />
        </button>
      </div>
      <div className="printerIdentity">
        <div className="printerIcon" aria-hidden="true">
          <Printer size={18} />
        </div>
        <div className="printerCopy">
          <h2>{queueName}</h2>
          <div className="statusLine">
            <span className={`statusDot statusDot-${status}`} aria-hidden="true" />
            <span>{getStatusLabel(status, t)}</span>
          </div>
        </div>
        <button
          className="iconButton sidebarRefreshButton"
          type="button"
          onClick={onRefresh}
          aria-label={t("refreshStatus")}
          disabled={backend.isLoading}
        >
          <RefreshCw size={15} />
        </button>
      </div>

      <dl className="printerMeta" aria-label={t("printerMetadata")}>
        <div>
          <dt>{t("queue")}</dt>
          <dd>{queuedCount === 0 ? t("queueClear") : t("queueWaiting", { count: queuedCount })}</dd>
        </div>
        <div>
          <dt>{t("backend")}</dt>
          <dd>{backend.reachable ? t("connected") : t("unreachable")}</dd>
        </div>
        <div>
          <dt>{t("printerState")}</dt>
          <dd>{details.state ?? t("unknown")}</dd>
        </div>
        <div>
          <dt>{t("lastSeen")}</dt>
          <dd>
            {backend.lastCheckedAt
              ? formatTime(backend.lastCheckedAt, getLocale(language))
              : t("unknown")}
          </dd>
        </div>
      </dl>
      {backend.error || details.message || details.cupsError ? (
        <div className={`sidebarNotice sidebarNotice-${status}`}>
          <AlertTriangle size={14} aria-hidden="true" />
          <p>{backend.error ?? details.cupsError ?? details.message}</p>
        </div>
      ) : null}

      <nav className="flowList" aria-label={t("latestPrints")}>
        <h2>{t("latestPrints")}</h2>
        {chats.map((chat) => (
          <button
            className={`flowItem ${chat.id === selectedChatId ? "isActive" : ""}`}
            type="button"
            key={chat.id}
            onClick={() => onSelectChat(chat.id)}
            title={chat.title}
          >
            <span className="flowTopline">
              <span className="flowName">{chat.title}</span>
              <span className={`flowState flowState-${chat.status}`}>
                {getFlowStatusLabel(chat.status, t)}
              </span>
            </span>
            <span className="flowMeta">{getFlowMeta(chat, language, t)}</span>
          </button>
        ))}
      </nav>

      <div className="profileArea">
        {isSettingsOpen ? (
          <div className="profileSettingsPanel" role="dialog" aria-label={t("appSettings")}>
            <div className="profileSettingsHeader">
              <div>
                <h2>{t("appSettings")}</h2>
                <p>{t("languageHelp")}</p>
              </div>
              <button
                className="iconButton"
                type="button"
                onClick={onCloseSettings}
                aria-label={t("closeSettings")}
              >
                <X size={16} />
              </button>
            </div>

            <section className="profileSettingsSection" aria-labelledby="language-settings-title">
              <div className="settingsSectionTitle">
                <Languages size={15} aria-hidden="true" />
                <h3 id="language-settings-title">{t("language")}</h3>
              </div>
              <div className="languageOptions" role="list" aria-label={t("selectLanguage")}>
                {languages.map((option) => (
                  <button
                    className={`languageOption ${option.code === language ? "isSelected" : ""}`}
                    type="button"
                    key={option.code}
                    onClick={() => onSelectLanguage(option.code)}
                    aria-pressed={option.code === language}
                  >
                    <span>{option.nativeLabel}</span>
                    <span>{option.shortLabel}</span>
                    {option.code === language ? <Check size={15} aria-hidden="true" /> : null}
                  </button>
                ))}
              </div>
            </section>

            <section className="profileSettingsSection" aria-labelledby="profile-settings-title">
              <div className="settingsSectionTitle">
                <Printer size={15} aria-hidden="true" />
                <h3 id="profile-settings-title">{t("profileTheme")}</h3>
              </div>
              <div className="profileOptions" role="list" aria-label={t("selectProfile")}>
                {profiles.map((profile) => (
                  <button
                    className={`profileOption ${profile.id === selectedProfile.id ? "isSelected" : ""}`}
                    type="button"
                    key={profile.id}
                    onClick={() => onSelectProfile(profile.id)}
                    aria-pressed={profile.id === selectedProfile.id}
                  >
                    <span className="profileSwatch" aria-hidden="true">
                      {profile.avatarLabel}
                    </span>
                    <span>{profile.name}</span>
                    {profile.id === selectedProfile.id ? <Check size={15} aria-hidden="true" /> : null}
                  </button>
                ))}
              </div>
            </section>
          </div>
        ) : null}

        <div className="profileControl">
          <div className="profileAvatar" aria-hidden="true">
            {selectedProfile.avatarLabel}
          </div>
          <div className="profileSummary">
            <span>{selectedProfile.name}</span>
            <span>{t("currentLanguage")}: {selectedLanguage.nativeLabel}</span>
          </div>
          <button
            className="profileSettingsButton"
            type="button"
            onClick={onToggleSettings}
            aria-expanded={isSettingsOpen}
            aria-label={t("appSettings")}
          >
            <Settings2 size={17} />
          </button>
        </div>
      </div>
    </aside>
  );
}

type MainWorkspaceProps = {
  chat: PrintChat;
  command: string;
  isUploading: boolean;
  language: LanguageCode;
  t: Translator;
  onCommandChange: (command: string) => void;
  onCommandSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onAttach: () => void;
  onPreviewPageChange: (page: number) => void;
  onUploadFile: (file: File) => void;
  onOpenFlows: () => void;
  onOpenSettings: () => void;
};

function MainWorkspace({
  chat,
  command,
  isUploading,
  language,
  t,
  onCommandChange,
  onCommandSubmit,
  onAttach,
  onPreviewPageChange,
  onUploadFile,
  onOpenFlows,
  onOpenSettings,
}: MainWorkspaceProps) {
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const latestGuidance = getLatestGuidance(chat);
  const latestGuidanceCopy = latestGuidance
    ? getActionCopy(latestGuidance, t)
    : undefined;
  const submitSelectedFile = (files: FileList | null) => {
    const file = files?.[0];

    if (file) {
      onUploadFile(file);
    }
  };

  return (
    <main className="mainWorkspace">
      <div className="mobileTopbar">
        <button type="button" className="textIconButton" onClick={onOpenFlows}>
          <Menu size={16} />
          {t("flows")}
        </button>
        <button type="button" className="textIconButton" onClick={onOpenSettings}>
          <Settings2 size={16} />
          {t("mobile.settings")}
        </button>
      </div>

      <header className="workspaceHeader">
        <div className="workspaceTitle">
          <h1>{chat.title}</h1>
          <p>
            {chat.file
              ? `${formatMimeType(chat.file.mimeType, t)} / ${
                  chat.settings.paperSize
                } / ${t(
                  chat.settings.colorMode === "grayscale"
                    ? "colorMode.grayscale"
                    : "colorMode.color",
                )}`
              : t("noFileSelectedYet")}
          </p>
        </div>
        <div
          className="workspaceStatus"
          aria-label={`${t("flow")}: ${getFlowStatusLabel(chat.status, t)}`}
        >
          <span className={`statusDot flowStatusDot-${chat.status}`} aria-hidden="true" />
          {getFlowStatusLabel(chat.status, t)}
        </div>
      </header>

      <section className="workspaceBody" aria-label={t("selectedFileWorkspace")}>
        {chat.file ? (
          <FilePreview
            chat={chat}
            language={language}
            t={t}
            onPreviewPageChange={onPreviewPageChange}
          />
        ) : (
          <>
            <input
              ref={uploadInputRef}
              className="visuallyHidden"
              type="file"
              accept="application/pdf,image/png,image/jpeg,text/plain"
              onChange={(event) => submitSelectedFile(event.currentTarget.files)}
            />
            <button
              className="uploadZone"
              type="button"
              onClick={() => uploadInputRef.current?.click()}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                submitSelectedFile(event.dataTransfer.files);
              }}
              disabled={isUploading}
            >
              <Upload size={22} />
              <span className="uploadTitle">
                {isUploading ? t("uploading") : t("uploadTitle")}
              </span>
              <span className="uploadMeta">{t("uploadMeta")}</span>
            </button>
          </>
        )}

        {latestGuidance ? (
          <div className={`assistantMessage assistantMessage-${latestGuidance.type}`}>
            <MessageSquareText size={17} aria-hidden="true" />
            <div>
              <h2>{latestGuidanceCopy?.title}</h2>
              {latestGuidanceCopy?.description ? (
                <p>{latestGuidanceCopy.description}</p>
              ) : null}
            </div>
          </div>
        ) : null}

        <Timeline actions={chat.actions} language={language} t={t} />
      </section>

      <CommandBar
        command={command}
        t={t}
        onCommandChange={onCommandChange}
        onCommandSubmit={onCommandSubmit}
        onAttach={onAttach}
        onUploadFile={onUploadFile}
      />
    </main>
  );
}

function FilePreview({
  chat,
  language,
  onPreviewPageChange,
  t,
}: {
  chat: PrintChat;
  language: LanguageCode;
  onPreviewPageChange: (page: number) => void;
  t: Translator;
}) {
  const file = chat.file;

  if (!file) {
    return null;
  }

  const pageRange =
    chat.settings.pageRange === "all"
      ? t("allPages")
      : chat.settings.pageRange;
  const orientationLabel = t(
    chat.settings.orientation === "portrait"
      ? "option.portrait"
      : "option.landscape",
  );
  const previewLabel = t("previewLabel", {
    orientation: orientationLabel,
    pageRange,
    paperSize: chat.settings.paperSize,
  });
  const preview = chat.preview;
  const currentPage = preview?.currentPage ?? 1;
  const pageCount = preview?.pageCount ?? file.pageCount;
  const currentImageUrl =
    preview?.pages.find((page) => page.page === currentPage)?.url ??
    file.previewUrl;

  return (
    <section className="filePreview" aria-label={t("selectedFilePreview")}>
      <div className="fileSummary">
        <div className="fileIcon" aria-hidden="true">
          <FileText size={20} />
        </div>
        <div className="fileCopy">
          <h2 title={file.name}>{file.name}</h2>
          <p>
            {formatMimeType(file.mimeType, t)} / {formatFileSize(file.sizeBytes)} /{" "}
            {formatPageCountValue(file.pageCount, language, t)}
          </p>
        </div>
      </div>

      <div className="previewStage">
        <div className="previewCanvas">
          {preview?.isLoading ? (
            <div className="previewState">
              <FileSearch size={22} aria-hidden="true" />
              <p>{t("previewLoading")}</p>
            </div>
          ) : preview?.error ? (
            <div className="previewState previewState-error">
              <AlertTriangle size={22} aria-hidden="true" />
              <p>{preview.error}</p>
            </div>
          ) : currentImageUrl ? (
            <img className="previewImage" src={currentImageUrl} alt={previewLabel} />
          ) : (
            <div
              className={`paperPreview paperPreview-${chat.settings.orientation}`}
              role="img"
              aria-label={previewLabel}
            >
              <div className="paperContent" aria-hidden="true">
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
              </div>
            </div>
          )}
          <div className="previewScaleNote">
            {chat.settings.paperSize} / {orientationLabel} /{" "}
            {formatCopyCount(chat.settings.copies, language, t)} /{" "}
            {pageRange}
          </div>
          {preview?.pages.length ? (
            <div className="previewPager" aria-label={t("previewPages")}>
              <button
                type="button"
                onClick={() => onPreviewPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage <= 1}
              >
                {t("previous")}
              </button>
              <span>
                {t("pageOf", {
                  count: pageCount ?? preview.pages.length,
                  page: currentPage,
                })}
              </span>
              <button
                type="button"
                onClick={() =>
                  onPreviewPageChange(
                    Math.min(pageCount ?? preview.pages.length, currentPage + 1),
                  )
                }
                disabled={currentPage >= (pageCount ?? preview.pages.length)}
              >
                {t("next")}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function Timeline({
  actions,
  language,
  t,
}: {
  actions: PrintAction[];
  language: LanguageCode;
  t: Translator;
}) {
  return (
    <section className="timeline" aria-label={t("printFlowTimeline")}>
      <div className="sectionHeader">
        <h2>{t("flow")}</h2>
        <p>{formatActionCount(actions.length, language, t)}</p>
      </div>
      <ol>
        {actions.map((action) => {
          const actionCopy = getActionCopy(action, t);

          return (
            <li key={action.id} className={`timelineItem timelineItem-${action.type}`}>
              <div className="timelineIcon" aria-hidden="true">
                <ActionIcon type={action.type} />
              </div>
              <div className="timelineContent">
                <div className="timelineTopline">
                  <h3>{actionCopy.title}</h3>
                  <time dateTime={action.createdAt}>
                    {formatTime(action.createdAt, getLocale(language))}
                  </time>
                </div>
                {actionCopy.description ? <p>{actionCopy.description}</p> : null}
                <span>{getActionLabel(action.type, t)}</span>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function ActionIcon({ type }: { type: PrintActionType }) {
  if (type === "file_uploaded") {
    return <FileText size={15} />;
  }

  if (type === "preview_generated") {
    return <FileSearch size={15} />;
  }

  if (type === "settings_changed") {
    return <SlidersHorizontal size={15} />;
  }

  if (type === "print_submitted") {
    return <Clock3 size={15} />;
  }

  if (type === "print_completed") {
    return <CheckCircle2 size={15} />;
  }

  if (type === "print_cancelled" || type === "warning" || type === "error") {
    return <AlertTriangle size={15} />;
  }

  return <MessageSquareText size={15} />;
}

type CommandBarProps = {
  command: string;
  t: Translator;
  onCommandChange: (command: string) => void;
  onCommandSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onAttach: () => void;
  onUploadFile: (file: File) => void;
};

function CommandBar({
  command,
  t,
  onCommandChange,
  onCommandSubmit,
  onAttach,
  onUploadFile,
}: CommandBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const submitSelectedFile = (files: FileList | null) => {
    const file = files?.[0];

    if (file) {
      onUploadFile(file);
    }
  };

  return (
    <form className="commandBar" onSubmit={onCommandSubmit}>
      <input
        ref={inputRef}
        className="visuallyHidden"
        type="file"
        accept="application/pdf,image/png,image/jpeg,text/plain"
        onChange={(event) => submitSelectedFile(event.currentTarget.files)}
      />
      <button
        className="iconButton"
        type="button"
        onClick={() => {
          onAttach();
          inputRef.current?.click();
        }}
        aria-label={t("attachFile")}
      >
        <Paperclip size={17} />
      </button>
      <input
        value={command}
        onChange={(event) => onCommandChange(event.target.value)}
        placeholder={t("commandPlaceholder")}
        aria-label={t("printInstruction")}
      />
      <button className="sendButton" type="submit" aria-label={t("sendPrintInstruction")}>
        <Send size={17} />
      </button>
    </form>
  );
}

type PreferencesPanelProps = {
  backend: BackendConnectionState;
  capabilities: PrinterCapabilities;
  chat: PrintChat;
  jobs: PrintJob[];
  jobsError: string;
  jobsLoading: boolean;
  optionsError: string;
  status: PrinterStatus;
  profiles: PrinterProfile[];
  selectedProfileId: string;
  language: LanguageCode;
  t: Translator;
  canPrint: boolean;
  disabledReason: string;
  canEditSettings: boolean;
  isPrinting: boolean;
  isOpen: boolean;
  onClose: () => void;
  onCancelJob: (jobId: number) => void;
  onRefreshBackend: () => void;
  onRefreshJobs: () => void;
  onSettingChange: <Key extends SettingsKey>(
    key: Key,
    value: PrintSettings[Key],
  ) => void;
  onProfileChange: (profileId: string) => void;
  onPreview: () => void;
  onSavePreset: () => void;
  onPrint: () => void;
};

function PreferencesPanel({
  backend,
  capabilities,
  chat,
  jobs,
  jobsError,
  jobsLoading,
  optionsError,
  status,
  profiles,
  selectedProfileId,
  language,
  t,
  canPrint,
  disabledReason,
  canEditSettings,
  isPrinting,
  isOpen,
  onClose,
  onCancelJob,
  onRefreshBackend,
  onRefreshJobs,
  onSettingChange,
  onProfileChange,
  onPreview,
  onSavePreset,
  onPrint,
}: PreferencesPanelProps) {
  const settings = chat.settings;
  const canEditPaper = canEditSettings && capabilities.paperSizes.supported;
  const canEditOrientation = canEditSettings && capabilities.orientation.supported;
  const canEditDuplex = canEditSettings && capabilities.duplexModes.supported;
  const canEditQuality = canEditSettings && capabilities.quality.supported;
  const canEditColor = canEditSettings && capabilities.colorModes.supported;
  const canEditFit = canEditSettings && capabilities.fitToPage.supported;
  const canEditCollate = canEditSettings && capabilities.collate.supported;
  const canEditMedia = canEditSettings && capabilities.mediaTypes.supported;
  const paperChoices = Array.from(
    new Set([settings.paperSize, ...capabilities.paperSizes.choices]),
  ).filter(Boolean);
  const orientationChoices = Array.from(
    new Set([settings.orientation, ...capabilities.orientation.choices]),
  ).filter(
    (choice): choice is PrintSettings["orientation"] =>
      choice === "portrait" || choice === "landscape",
  );
  const duplexChoices = Array.from(
    new Set([settings.duplex, ...capabilities.duplexModes.choices]),
  ).filter(
    (choice): choice is PrintSettings["duplex"] =>
      choice === "none" || choice === "long-edge" || choice === "short-edge",
  );
  const qualityChoices = Array.from(
    new Set([settings.quality, ...capabilities.quality.choices]),
  ).filter(
    (choice): choice is PrintSettings["quality"] =>
      choice === "draft" || choice === "normal" || choice === "high",
  );
  const mediaChoices = Array.from(
    new Set([settings.mediaType ?? "plain", ...capabilities.mediaTypes.choices]),
  ).filter(Boolean);
  const canUseColor =
    canEditColor &&
    (capabilities.colorModes.choices.length === 0 ||
      capabilities.colorModes.choices.includes("color"));
  const canUseGrayscale =
    canEditColor &&
    (capabilities.colorModes.choices.length === 0 ||
      capabilities.colorModes.choices.includes("monochrome"));

  return (
    <aside className={`preferencesPanel ${isOpen ? "isOpen" : ""}`}>
      <div className="mobilePanelHeader">
        <button className="iconButton" type="button" onClick={onClose} aria-label={t("closeSettings")}>
          <X size={17} />
        </button>
      </div>

      <div className="preferencesHeader">
        <div>
          <h2>{t("settingsTitle")}</h2>
          <p>
            {chat.file
              ? formatShortDate(chat.updatedAt, getLocale(language))
              : t("waitingForUpload")}
          </p>
        </div>
        <button
          className="iconButton"
          type="button"
          onClick={onRefreshBackend}
          aria-label={t("refreshStatus")}
          disabled={backend.isLoading}
        >
          <RefreshCw size={15} />
        </button>
      </div>

      <div className="settingsStack">
        <section className="settingsGroup">
          <h3>{t("pages")}</h3>
          <label className="field">
            <span>{t("copies")}</span>
            <input
              min={1}
              max={99}
              type="number"
              value={settings.copies}
              disabled={!canEditSettings}
              onChange={(event) =>
                onSettingChange(
                  "copies",
                  Math.max(1, Number(event.target.value) || 1),
                )
              }
            />
          </label>
          <label className="field">
            <span>{t("pageRange")}</span>
            <input
              value={formatPageRangeInput(settings.pageRange)}
              disabled={!canEditSettings}
              onChange={(event) =>
                onSettingChange("pageRange", parsePageRangeInput(event.target.value))
              }
              placeholder={t("pageRangePlaceholder")}
            />
          </label>
        </section>

        <section className="settingsGroup">
          <h3>{t("color")}</h3>
          <div className="segmentedControl" aria-label={t("color")}>
            <button
              type="button"
              className={settings.colorMode === "color" ? "isSelected" : ""}
              aria-pressed={settings.colorMode === "color"}
              disabled={!canUseColor}
              onClick={() => onSettingChange("colorMode", "color")}
            >
              {t("color")}
            </button>
            <button
              type="button"
              className={settings.colorMode === "grayscale" ? "isSelected" : ""}
              aria-pressed={settings.colorMode === "grayscale"}
              disabled={!canUseGrayscale}
              onClick={() => onSettingChange("colorMode", "grayscale")}
            >
              {t("grayscale")}
            </button>
          </div>
          {!capabilities.colorModes.supported ? (
            <p className="settingHint">{capabilities.colorModes.notes ?? t("unsupportedOption")}</p>
          ) : null}
        </section>

        <section className="settingsGroup">
          <h3>{t("layout")}</h3>
          <label className="field">
            <span>{t("paperSize")}</span>
            <select
              value={settings.paperSize}
              disabled={!canEditPaper}
              onChange={(event) => onSettingChange("paperSize", event.target.value)}
            >
              {paperChoices.map((choice) => (
                <option key={choice} value={choice}>
                  {choice}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{t("orientation")}</span>
            <select
              value={settings.orientation}
              disabled={!canEditOrientation}
              onChange={(event) =>
                onSettingChange(
                  "orientation",
                  event.target.value as PrintSettings["orientation"],
                )
              }
            >
              {orientationChoices.map((choice) => (
                <option key={choice} value={choice}>
                  {choice === "portrait" ? t("option.portrait") : t("option.landscape")}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{t("duplex")}</span>
            <select
              value={settings.duplex}
              disabled={!canEditDuplex}
              onChange={(event) =>
                onSettingChange(
                  "duplex",
                  event.target.value as PrintSettings["duplex"],
                )
              }
            >
              {duplexChoices.map((choice) => (
                <option key={choice} value={choice}>
                  {choice === "none"
                    ? t("duplex.none")
                    : choice === "long-edge"
                      ? t("duplex.longEdge")
                      : t("duplex.shortEdge")}
                </option>
              ))}
            </select>
          </label>
          <label className="checkboxField">
            <input
              type="checkbox"
              checked={settings.fitToPage}
              disabled={!canEditFit}
              onChange={(event) => onSettingChange("fitToPage", event.target.checked)}
            />
            <span>{t("fitToPage")}</span>
          </label>
          {[capabilities.paperSizes, capabilities.orientation, capabilities.duplexModes, capabilities.fitToPage].some((capability) => !capability.supported) ? (
            <p className="settingHint">{t("unsupportedOption")}</p>
          ) : null}
        </section>

        <section className="settingsGroup">
          <h3>{t("quality")}</h3>
          <label className="field">
            <span>{t("outputQuality")}</span>
            <select
              value={settings.quality}
              disabled={!canEditQuality}
              onChange={(event) =>
                onSettingChange("quality", event.target.value as PrintSettings["quality"])
              }
            >
              {qualityChoices.map((choice) => (
                <option key={choice} value={choice}>
                  {choice === "draft"
                    ? t("option.draft")
                    : choice === "normal"
                      ? t("option.normal")
                      : t("option.high")}
                </option>
              ))}
            </select>
          </label>
          {!capabilities.quality.supported ? (
            <p className="settingHint">{capabilities.quality.notes ?? t("unsupportedOption")}</p>
          ) : null}
        </section>

        <section className="settingsGroup settingsGroup-last">
          <h3>{t("advanced")}</h3>
          <label className="field">
            <span>{t("printerProfile")}</span>
            <select
              value={selectedProfileId}
              onChange={(event) => onProfileChange(event.target.value)}
            >
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{t("mediaType")}</span>
            <select
              value={settings.mediaType ?? "plain"}
              disabled={!canEditMedia}
              onChange={(event) => onSettingChange("mediaType", event.target.value)}
            >
              {mediaChoices.map((choice) => (
                <option key={choice} value={choice}>
                  {choice}
                </option>
              ))}
            </select>
          </label>
          <label className="checkboxField">
            <input
              type="checkbox"
              checked={settings.collate ?? true}
              disabled={!canEditCollate}
              onChange={(event) => onSettingChange("collate", event.target.checked)}
            />
            <span>{t("collate")}</span>
          </label>
          {optionsError ? <p className="settingHint">{optionsError}</p> : null}
          <div className="printPlan">
            <p>{t("currentPlan")}</p>
            <strong>
              {formatCopyCount(settings.copies, language, t)},{" "}
              {formatPageRange(settings.pageRange, t)}
            </strong>
            <span>
              {settings.paperSize}, {t(
                settings.orientation === "portrait"
                  ? "option.portrait"
                  : "option.landscape",
              )}, {t(
                settings.colorMode === "grayscale"
                  ? "colorMode.grayscale"
                  : "colorMode.color",
              )}
            </span>
          </div>
        </section>
      </div>

      <div className="preferenceActions">
        <button className="primaryPrintButton" type="button" disabled={!canPrint} onClick={onPrint}>
          <Printer size={17} />
          {isPrinting ? t("printing") : canPrint ? t("print") : disabledReason}
        </button>
        <div className="secondaryActions">
          <button type="button" onClick={onPreview}>
            <Eye size={15} />
            {t("action.preview")}
          </button>
          <button type="button" onClick={onSavePreset}>
            <Save size={15} />
            {t("savePreset")}
          </button>
        </div>
        <p className={`printerReadyNote printerReadyNote-${status}`}>
          {t("printerStatus", { status: getStatusLabel(status, t) })}
        </p>
      </div>
      <section className="jobsPanel" aria-label={t("jobs")}>
        <div className="jobsHeader">
          <h3>{t("jobs")}</h3>
          <button
            className="iconButton"
            type="button"
            onClick={onRefreshJobs}
            disabled={jobsLoading}
            aria-label={t("refreshJobs")}
          >
            <RefreshCw size={14} />
          </button>
        </div>
        {jobsError ? <p className="settingHint">{jobsError}</p> : null}
        {!jobsError && jobs.length === 0 ? <p className="settingHint">{t("noJobs")}</p> : null}
        {jobs.length ? (
          <ol className="jobsList">
            {jobs.slice(0, 5).map((job) => (
              <li key={job.id}>
                <div>
                  <strong>{job.name ?? `Job #${job.id}`}</strong>
                  <span>{job.state ?? t("unknown")}</span>
                </div>
                <button
                  className="iconButton"
                  type="button"
                  onClick={() => onCancelJob(job.id)}
                  aria-label={t("cancelJob", { jobId: job.id })}
                  disabled={job.state === "completed" || job.state === "canceled"}
                >
                  <Ban size={14} />
                </button>
              </li>
            ))}
          </ol>
        ) : null}
      </section>
    </aside>
  );
}

export default App;
