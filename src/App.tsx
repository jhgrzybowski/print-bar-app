import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import {
  AlertTriangle,
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
  mockUploadFile,
  printerStatus,
  profiles,
} from "./data/mockPrintData";
import type {
  PrintAction,
  PrintActionType,
  PrintChat,
  PrinterProfile,
  PrinterStatus,
  PrintSettings,
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

  return {
    title: baseTitle,
    description: "",
  };
};

const getDisabledReason = (
  chat: PrintChat,
  status: PrinterStatus,
  t: Translator,
) => {
  if (!chat.file) {
    return t("disabled.noFile");
  }

  if (status !== "ready") {
    return t("disabled.printerNotReady");
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

function App() {
  const [printChats, setPrintChats] = useState<PrintChat[]>(mockPrintChats);
  const [selectedChatId, setSelectedChatId] = useState(mockPrintChats[0].id);
  const [selectedProfileId, setSelectedProfileId] = useState(profiles[0].id);
  const [language, setLanguage] = useState<LanguageCode>(getInitialLanguage);
  const [command, setCommand] = useState("");
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const [profileSettingsOpen, setProfileSettingsOpen] = useState(false);
  const [lastChangedSettingKey, setLastChangedSettingKey] = useState<SettingsKey | null>(null);

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
  } as CSSProperties;

  const canPrint = Boolean(
    selectedChat.file &&
      printerStatus === "ready" &&
      (selectedChat.status === "draft" || selectedChat.status === "ready") &&
      isValidCopies(selectedChat.settings.copies) &&
      isValidPageRange(
        selectedChat.settings.pageRange === "all"
          ? "all"
          : selectedChat.settings.pageRange,
      )
  );
  const disabledReason = getDisabledReason(selectedChat, printerStatus, t);

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

  useEffect(() => {
    // Reset setting tracker when chat changes
    setLastChangedSettingKey(null);
  }, [selectedChatId]);

  const updateSelectedChat = (updater: (chat: PrintChat) => PrintChat) => {
    setPrintChats((currentChats) =>
      currentChats.map((chat) =>
        chat.id === selectedChatId ? updater(chat) : chat,
      ),
    );
  };

  const updateSetting = <Key extends SettingsKey>(
    key: Key,
    value: PrintSettings[Key],
  ) => {
    // Only add action if switching to a different setting or first time
    const shouldAddAction = lastChangedSettingKey !== key;

    if (shouldAddAction) {
      setLastChangedSettingKey(key);
    }

    updateSelectedChat((chat) => {
      let actions = chat.actions;

      if (shouldAddAction) {
        // New setting: add a fresh action
        actions = [
          ...chat.actions,
          makeAction(
            "settings_changed",
            getSettingChangeDescription(key, value, t).title,
            getSettingChangeDescription(key, value, t).description,
          ),
        ];
      } else {
        // Same setting: update the last action's description dynamically
        const lastAction = actions[actions.length - 1];
        if (lastAction && lastAction.type === "settings_changed") {
          const description = getSettingChangeDescription(key, value, t);
          actions = [
            ...actions.slice(0, -1),
            {
              ...lastAction,
              description: description.description,
            },
          ];
        }
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
    if (
      !profile?.defaultSettings ||
      (selectedChat.status !== "draft" && selectedChat.status !== "ready")
    ) {
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

  const handleMockUpload = () => {
    setLastChangedSettingKey(null);
    updateSelectedChat((chat) => ({
      ...chat,
      title: mockUploadFile.name,
      status: "ready",
      file: mockUploadFile,
      settings: {
        ...defaultSettings,
        ...chat.settings,
      },
      actions: [
        ...chat.actions,
        makeTranslatedAction(
          "file_uploaded",
          "chat.upload.file.title",
          "chat.upload.file.description",
          t,
        ),
        makeTranslatedAction(
          "preview_generated",
          "chat.upload.preview.title",
          "chat.upload.preview.description",
          t,
        ),
        makeTranslatedAction(
          "assistant_message",
          "chat.upload.assistant.title",
          "chat.upload.assistant.description",
          t,
        ),
      ],
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleAttach = () => {
    if (!selectedChat.file) {
      handleMockUpload();
      return;
    }

    addTranslatedActionToSelectedChat(
      "assistant_message",
      "chat.fileAlreadySelected.title",
      "chat.fileAlreadySelected.description",
    );
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
    addTranslatedActionToSelectedChat(
      "preview_generated",
      "chat.previewRefreshed.title",
      selectedChat.file
        ? "chat.previewRefreshed.withFile"
        : "chat.previewRefreshed.noFile",
    );
  };

  const handleSavePreset = () => {
    addTranslatedActionToSelectedChat(
      "assistant_message",
      "chat.presetNoted.title",
      "chat.presetNoted.description",
    );
  };

  const handlePrint = () => {
    if (!canPrint) {
      return;
    }

    updateSelectedChat((chat) => ({
      ...chat,
      status: "queued",
      settings: {
        ...chat.settings,
        // Clamp copies to valid range before submission
        copies: Math.max(MIN_COPIES, Math.min(MAX_COPIES, chat.settings.copies)),
      },
      actions: [
        ...chat.actions,
        makeTranslatedAction(
          "print_submitted",
          "chat.printSubmitted.title",
          "chat.printSubmitted.description",
          t,
          {
            copies: formatCopyCount(
              Math.max(MIN_COPIES, Math.min(MAX_COPIES, chat.settings.copies)),
              language,
              t,
            ),
            fileName: chat.file?.name ?? "",
          },
        ),
        makeTranslatedAction(
          "assistant_message",
          "chat.printQueued.title",
          "chat.printQueued.description",
          t,
        ),
      ],
      updatedAt: new Date().toISOString(),
    }));
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
          chats={printChats}
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
        />
        <MainWorkspace
          chat={selectedChat}
          command={command}
          language={language}
          t={t}
          onCommandChange={setCommand}
          onCommandSubmit={handleCommandSubmit}
          onMockUpload={handleMockUpload}
          onAttach={handleAttach}
          onOpenFlows={() => setLeftOpen(true)}
          onOpenSettings={() => setRightOpen(true)}
        />
        <PreferencesPanel
          chat={selectedChat}
          status={printerStatus}
          profiles={profiles}
          selectedProfileId={selectedProfile.id}
          language={language}
          t={t}
          canPrint={canPrint}
          disabledReason={disabledReason}
          isOpen={rightOpen}
          onClose={() => setRightOpen(false)}
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
  chats: PrintChat[];
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
};

function PrinterSidebar({
  chats,
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
}: PrinterSidebarProps) {
  const queuedCount = chats.filter((chat) => chat.status === "queued").length;
  const selectedLanguage = getLanguage(language);

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
          <h2>Canon MG5350</h2>
          <div className="statusLine">
            <span className={`statusDot statusDot-${status}`} aria-hidden="true" />
            <span>{getStatusLabel(status, t)}</span>
          </div>
        </div>
      </div>

      <dl className="printerMeta" aria-label={t("printerMetadata")}>
        <div>
          <dt>{t("queue")}</dt>
          <dd>
            {queuedCount === 0
              ? t("queueClear")
              : t("queueWaiting", { count: queuedCount })}
          </dd>
        </div>
        <div>
          <dt>{t("paper")}</dt>
          <dd>{t("paperLoaded", { paperSize: "A4" })}</dd>
        </div>
        <div>
          <dt>{t("ink")}</dt>
          <dd>{t("inkGood")}</dd>
        </div>
        <div>
          <dt>{t("lastSeen")}</dt>
          <dd>{t("lastSeenValue")}</dd>
        </div>
      </dl>

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
  language: LanguageCode;
  t: Translator;
  onCommandChange: (command: string) => void;
  onCommandSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onMockUpload: () => void;
  onAttach: () => void;
  onOpenFlows: () => void;
  onOpenSettings: () => void;
};

function MainWorkspace({
  chat,
  command,
  language,
  t,
  onCommandChange,
  onCommandSubmit,
  onMockUpload,
  onAttach,
  onOpenFlows,
  onOpenSettings,
}: MainWorkspaceProps) {
  const latestGuidance = getLatestGuidance(chat);
  const latestGuidanceCopy = latestGuidance
    ? getActionCopy(latestGuidance, t)
    : undefined;

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
          <FilePreview chat={chat} language={language} t={t} />
        ) : (
          <button className="uploadZone" type="button" onClick={onMockUpload}>
            <Upload size={22} />
            <span className="uploadTitle">{t("uploadTitle")}</span>
            <span className="uploadMeta">{t("uploadMeta")}</span>
          </button>
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
      />
    </main>
  );
}

function FilePreview({
  chat,
  language,
  t,
}: {
  chat: PrintChat;
  language: LanguageCode;
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
          <div className="previewScaleNote">
            {chat.settings.paperSize} / {orientationLabel} /{" "}
            {formatCopyCount(chat.settings.copies, language, t)} /{" "}
            {pageRange}
          </div>
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
};

function CommandBar({
  command,
  t,
  onCommandChange,
  onCommandSubmit,
  onAttach,
}: CommandBarProps) {
  return (
    <form className="commandBar" onSubmit={onCommandSubmit}>
      <button
        className="iconButton"
        type="button"
        onClick={onAttach}
        aria-label={t("attachMockedFile")}
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
  chat: PrintChat;
  status: PrinterStatus;
  profiles: PrinterProfile[];
  selectedProfileId: string;
  language: LanguageCode;
  t: Translator;
  canPrint: boolean;
  disabledReason: string;
  isOpen: boolean;
  onClose: () => void;
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
  chat,
  status,
  profiles,
  selectedProfileId,
  language,
  t,
  canPrint,
  disabledReason,
  isOpen,
  onClose,
  onSettingChange,
  onProfileChange,
  onPreview,
  onSavePreset,
  onPrint,
}: PreferencesPanelProps) {
  const settings = chat.settings;

  return (
    <aside className={`preferencesPanel ${isOpen ? "isOpen" : ""}`}>
      <div className="mobilePanelHeader">
        <button className="iconButton" type="button" onClick={onClose} aria-label={t("closeSettings")}>
          <X size={17} />
        </button>
      </div>

      <div className="preferencesHeader">
        <h2>{t("settingsTitle")}</h2>
        <p>
          {chat.file
            ? formatShortDate(chat.updatedAt, getLocale(language))
            : t("waitingForUpload")}
        </p>
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
              onClick={() => onSettingChange("colorMode", "color")}
            >
              {t("color")}
            </button>
            <button
              type="button"
              className={settings.colorMode === "grayscale" ? "isSelected" : ""}
              aria-pressed={settings.colorMode === "grayscale"}
              onClick={() => onSettingChange("colorMode", "grayscale")}
            >
              {t("grayscale")}
            </button>
          </div>
        </section>

        <section className="settingsGroup">
          <h3>{t("layout")}</h3>
          <label className="field">
            <span>{t("paperSize")}</span>
            <select
              value={settings.paperSize}
              onChange={(event) => onSettingChange("paperSize", event.target.value)}
            >
              <option>A4</option>
              <option>A5</option>
              <option>Letter</option>
            </select>
          </label>
          <label className="field">
            <span>{t("orientation")}</span>
            <select
              value={settings.orientation}
              onChange={(event) =>
                onSettingChange(
                  "orientation",
                  event.target.value as PrintSettings["orientation"],
                )
              }
            >
              <option value="portrait">{t("option.portrait")}</option>
              <option value="landscape">{t("option.landscape")}</option>
            </select>
          </label>
          <label className="field">
            <span>{t("duplex")}</span>
            <select
              value={settings.duplex}
              onChange={(event) =>
                onSettingChange(
                  "duplex",
                  event.target.value as PrintSettings["duplex"],
                )
              }
            >
              <option value="none">{t("duplex.none")}</option>
              <option value="long-edge">{t("duplex.longEdge")}</option>
              <option value="short-edge">{t("duplex.shortEdge")}</option>
            </select>
          </label>
          <label className="checkboxField">
            <input
              type="checkbox"
              checked={settings.fitToPage}
              onChange={(event) => onSettingChange("fitToPage", event.target.checked)}
            />
            <span>{t("fitToPage")}</span>
          </label>
        </section>

        <section className="settingsGroup">
          <h3>{t("quality")}</h3>
          <label className="field">
            <span>{t("outputQuality")}</span>
            <select
              value={settings.quality}
              onChange={(event) =>
                onSettingChange("quality", event.target.value as PrintSettings["quality"])
              }
            >
              <option value="draft">{t("option.draft")}</option>
              <option value="normal">{t("option.normal")}</option>
              <option value="high">{t("option.high")}</option>
            </select>
          </label>
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
          {canPrint ? t("print") : disabledReason}
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
    </aside>
  );
}

export default App;
