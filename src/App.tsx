import { useMemo, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Eye,
  FileSearch,
  FileText,
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
  formatFileSize,
  formatMimeType,
  formatShortDate,
  formatTime,
} from "./utils/format";

type SettingsKey = keyof PrintSettings;

const statusLabels: Record<PrinterStatus, string> = {
  ready: "Online · Ready",
  warning: "Online · Needs attention",
  error: "Error",
  offline: "Offline",
};

const flowStatusLabels: Record<PrintChat["status"], string> = {
  draft: "Draft",
  ready: "Ready",
  queued: "Queued",
  printed: "Printed",
  cancelled: "Cancelled",
  error: "Error",
};

const actionLabels: Record<PrintActionType, string> = {
  file_uploaded: "Upload",
  preview_generated: "Preview",
  settings_changed: "Settings",
  print_submitted: "Queue",
  print_completed: "Printed",
  print_cancelled: "Cancelled",
  warning: "Warning",
  error: "Error",
  assistant_message: "Assistant",
};

const makeAction = (
  type: PrintActionType,
  title: string,
  description: string,
): PrintAction => ({
  id: crypto.randomUUID(),
  type,
  title,
  description,
  createdAt: new Date().toISOString(),
});

const inferCommandSettings = (command: string, settings: PrintSettings) => {
  const nextSettings = { ...settings };
  const changes: string[] = [];
  const normalized = command.toLowerCase();
  const copiesMatch = normalized.match(/(\d+)\s*(copy|copies)/);

  if (copiesMatch?.[1]) {
    nextSettings.copies = Math.max(1, Number(copiesMatch[1]));
    changes.push(`${nextSettings.copies} copies`);
  }

  if (normalized.includes("grayscale") || normalized.includes("black and white")) {
    nextSettings.colorMode = "grayscale";
    changes.push("grayscale");
  }

  if (normalized.includes("color")) {
    nextSettings.colorMode = "color";
    changes.push("color");
  }

  if (normalized.includes("landscape")) {
    nextSettings.orientation = "landscape";
    changes.push("landscape");
  }

  if (normalized.includes("portrait")) {
    nextSettings.orientation = "portrait";
    changes.push("portrait");
  }

  if (normalized.includes("duplex") || normalized.includes("double sided")) {
    nextSettings.duplex = "long-edge";
    changes.push("duplex");
  }

  return { nextSettings, changes };
};

const getFlowMeta = (chat: PrintChat) => {
  if (!chat.file) {
    return "No file selected";
  }

  const pageText = chat.file.pageCount === 1 ? "1 page" : `${chat.file.pageCount} pages`;
  const mode = chat.settings.colorMode === "grayscale" ? "grayscale" : "color";

  if (chat.status === "cancelled") {
    return "Cancelled / wrong size";
  }

  if (chat.status === "queued") {
    return "Waiting in queue";
  }

  if (chat.status === "printed") {
    return `Printed / ${pageText} / ${mode}`;
  }

  return `${pageText} / ${mode}`;
};

const getDisabledReason = (chat: PrintChat, status: PrinterStatus) => {
  if (!chat.file) {
    return "Select a file to print";
  }

  if (status !== "ready") {
    return "Printer is not ready";
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
  const [command, setCommand] = useState("");
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);

  const selectedProfile =
    profiles.find((profile) => profile.id === selectedProfileId) ?? profiles[0];

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

  const canPrint = Boolean(selectedChat.file && printerStatus === "ready");
  const disabledReason = getDisabledReason(selectedChat, printerStatus);

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
    updateSelectedChat((chat) => ({
      ...chat,
      settings: {
        ...chat.settings,
        [key]: value,
      },
      updatedAt: new Date().toISOString(),
    }));
  };

  const addActionToSelectedChat = (
    type: PrintActionType,
    title: string,
    description: string,
  ) => {
    updateSelectedChat((chat) => ({
      ...chat,
      actions: [...chat.actions, makeAction(type, title, description)],
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleSelectProfile = (profileId: string) => {
    const profile = profiles.find((item) => item.id === profileId);
    setSelectedProfileId(profileId);

    if (!profile?.defaultSettings) {
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
        makeAction(
          "settings_changed",
          `${profile.name} profile applied`,
          "Default settings updated for this print flow.",
        ),
      ],
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleMockUpload = () => {
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
        makeAction(
          "file_uploaded",
          "File uploaded",
          "Text document detected, 1 page.",
        ),
        makeAction(
          "preview_generated",
          "Preview generated",
          "Plain text layout checked against A4.",
        ),
        makeAction(
          "assistant_message",
          "Ready to print",
          "Draft quality and grayscale are a good match for this file.",
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

    addActionToSelectedChat(
      "assistant_message",
      "File already selected",
      "This flow has a file attached. Start another flow to mock a different upload.",
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
      );
      const hasSettingChanges = changes.length > 0;

      return {
        ...chat,
        settings: nextSettings,
        actions: [
          ...chat.actions,
          makeAction(
            hasSettingChanges ? "settings_changed" : "assistant_message",
            hasSettingChanges ? "Instruction applied" : "Instruction noted",
            hasSettingChanges
              ? `${changes.join(", ")} applied. Review the right panel before printing.`
              : `I noted "${trimmedCommand}". The print plan is unchanged.`,
          ),
        ],
        updatedAt: new Date().toISOString(),
      };
    });

    setCommand("");
  };

  const handlePreview = () => {
    addActionToSelectedChat(
      "preview_generated",
      "Preview refreshed",
      selectedChat.file
        ? "Current settings were checked against the selected file."
        : "Upload a file before generating a preview.",
    );
  };

  const handleSavePreset = () => {
    addActionToSelectedChat(
      "assistant_message",
      "Preset noted",
      "Preset saving is mocked in this milestone.",
    );
  };

  const handlePrint = () => {
    if (!canPrint) {
      return;
    }

    updateSelectedChat((chat) => ({
      ...chat,
      status: "queued",
      actions: [
        ...chat.actions,
        makeAction(
          "print_submitted",
          "Print submitted",
          `${chat.file?.name} queued with ${chat.settings.copies} copy${
            chat.settings.copies === 1 ? "" : "ies"
          }.`,
        ),
        makeAction(
          "assistant_message",
          "Queued",
          "Keep this flow open to review the submitted settings.",
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
          isOpen={leftOpen}
          onClose={() => setLeftOpen(false)}
          onSelectChat={(chatId) => {
            setSelectedChatId(chatId);
            setLeftOpen(false);
          }}
          onSelectProfile={handleSelectProfile}
        />
        <MainWorkspace
          chat={selectedChat}
          command={command}
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
  isOpen: boolean;
  onClose: () => void;
  onSelectChat: (chatId: string) => void;
  onSelectProfile: (profileId: string) => void;
};

function PrinterSidebar({
  chats,
  selectedChatId,
  status,
  selectedProfile,
  profiles,
  isOpen,
  onClose,
  onSelectChat,
  onSelectProfile,
}: PrinterSidebarProps) {
  const queuedCount = chats.filter((chat) => chat.status === "queued").length;

  return (
    <aside className={`printerSidebar ${isOpen ? "isOpen" : ""}`}>
      <div className="mobilePanelHeader">
        <button className="iconButton" type="button" onClick={onClose} aria-label="Close print flows">
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
            <span>{statusLabels[status]}</span>
          </div>
        </div>
      </div>

      <dl className="printerMeta" aria-label="Printer metadata">
        <div>
          <dt>Queue</dt>
          <dd>{queuedCount === 0 ? "Clear" : `${queuedCount} waiting`}</dd>
        </div>
        <div>
          <dt>Paper</dt>
          <dd>A4 loaded</dd>
        </div>
        <div>
          <dt>Ink</dt>
          <dd>Good</dd>
        </div>
        <div>
          <dt>Last seen</dt>
          <dd>20 sec ago</dd>
        </div>
      </dl>

      <nav className="flowList" aria-label="Latest print flows">
        <h2>Latest prints</h2>
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
                {flowStatusLabels[chat.status]}
              </span>
            </span>
            <span className="flowMeta">{getFlowMeta(chat)}</span>
          </button>
        ))}
      </nav>

      <div className="profileArea">
        <label htmlFor="profile-select">Profile</label>
        <div className="profileControl">
          <div className="profileAvatar" aria-hidden="true">
            {selectedProfile.avatarLabel}
          </div>
          <select
            id="profile-select"
            value={selectedProfile.id}
            onChange={(event) => onSelectProfile(event.target.value)}
          >
            {profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </aside>
  );
}

type MainWorkspaceProps = {
  chat: PrintChat;
  command: string;
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
  onCommandChange,
  onCommandSubmit,
  onMockUpload,
  onAttach,
  onOpenFlows,
  onOpenSettings,
}: MainWorkspaceProps) {
  const latestGuidance = getLatestGuidance(chat);

  return (
    <main className="mainWorkspace">
      <div className="mobileTopbar">
        <button type="button" className="textIconButton" onClick={onOpenFlows}>
          <Menu size={16} />
          Flows
        </button>
        <button type="button" className="textIconButton" onClick={onOpenSettings}>
          <Settings2 size={16} />
          Settings
        </button>
      </div>

      <header className="workspaceHeader">
        <div className="workspaceTitle">
          <h1>{chat.title}</h1>
          <p>
            {chat.file
              ? `${formatMimeType(chat.file.mimeType)} / ${chat.settings.paperSize} / ${chat.settings.colorMode}`
              : "No file selected yet"}
          </p>
        </div>
        <div className="workspaceStatus" aria-label={`Flow status: ${flowStatusLabels[chat.status]}`}>
          <span className={`statusDot flowStatusDot-${chat.status}`} aria-hidden="true" />
          {flowStatusLabels[chat.status]}
        </div>
      </header>

      <section className="workspaceBody" aria-label="Selected file workspace">
        {chat.file ? (
          <FilePreview chat={chat} />
        ) : (
          <button className="uploadZone" type="button" onClick={onMockUpload}>
            <Upload size={22} />
            <span className="uploadTitle">Drop a file here</span>
            <span className="uploadMeta">PDF, image or text document</span>
          </button>
        )}

        {latestGuidance ? (
          <div className={`assistantMessage assistantMessage-${latestGuidance.type}`}>
            <MessageSquareText size={17} aria-hidden="true" />
            <div>
              <h2>{latestGuidance.title}</h2>
              {latestGuidance.description ? <p>{latestGuidance.description}</p> : null}
            </div>
          </div>
        ) : null}

        <Timeline actions={chat.actions} />
      </section>

      <CommandBar
        command={command}
        onCommandChange={onCommandChange}
        onCommandSubmit={onCommandSubmit}
        onAttach={onAttach}
      />
    </main>
  );
}

function FilePreview({ chat }: { chat: PrintChat }) {
  const file = chat.file;

  if (!file) {
    return null;
  }

  return (
    <section className="filePreview" aria-label="Selected file preview">
      <div className="fileSummary">
        <div className="fileIcon" aria-hidden="true">
          <FileText size={20} />
        </div>
        <div className="fileCopy">
          <h2 title={file.name}>{file.name}</h2>
          <p>
            {formatMimeType(file.mimeType)} / {formatFileSize(file.sizeBytes)} /{" "}
            {file.pageCount ?? "Unknown"} {file.pageCount === 1 ? "page" : "pages"}
          </p>
        </div>
      </div>

      <div className="previewStage">
        <div className={`paperPreview paperPreview-${chat.settings.orientation}`}>
          <div className="paperHeader">
            <span>{file.mimeType === "application/pdf" ? "PDF" : "File"}</span>
            <span>{chat.settings.paperSize}</span>
          </div>
          <div className="paperLines" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
          <div className="paperFooter">
            {chat.settings.copies} copy{chat.settings.copies === 1 ? "" : "ies"} /{" "}
            {chat.settings.pageRange === "all"
              ? "all pages"
              : `pages ${chat.settings.pageRange}`}
          </div>
        </div>
      </div>
    </section>
  );
}

function Timeline({ actions }: { actions: PrintAction[] }) {
  return (
    <section className="timeline" aria-label="Print flow timeline">
      <div className="sectionHeader">
        <h2>Flow</h2>
        <p>{actions.length} actions</p>
      </div>
      <ol>
        {actions.map((action) => (
          <li key={action.id} className={`timelineItem timelineItem-${action.type}`}>
            <div className="timelineIcon" aria-hidden="true">
              <ActionIcon type={action.type} />
            </div>
            <div className="timelineContent">
              <div className="timelineTopline">
                <h3>{action.title}</h3>
                <time dateTime={action.createdAt}>{formatTime(action.createdAt)}</time>
              </div>
              {action.description ? <p>{action.description}</p> : null}
              <span>{actionLabels[action.type]}</span>
            </div>
          </li>
        ))}
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
  onCommandChange: (command: string) => void;
  onCommandSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onAttach: () => void;
};

function CommandBar({
  command,
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
        aria-label="Attach mocked file"
      >
        <Paperclip size={17} />
      </button>
      <input
        value={command}
        onChange={(event) => onCommandChange(event.target.value)}
        placeholder="Type print instruction..."
        aria-label="Print instruction"
      />
      <button className="sendButton" type="submit" aria-label="Send print instruction">
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
        <button className="iconButton" type="button" onClick={onClose} aria-label="Close settings">
          <X size={17} />
        </button>
      </div>

      <div className="preferencesHeader">
        <h2>Print settings</h2>
        <p>{chat.file ? formatShortDate(chat.updatedAt) : "Waiting for upload"}</p>
      </div>

      <section className="settingsGroup">
        <h3>Pages</h3>
        <label className="field">
          <span>Copies</span>
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
          <span>Page range</span>
          <input
            value={settings.pageRange}
            onChange={(event) =>
              onSettingChange("pageRange", event.target.value || "all")
            }
            placeholder="all or 1-3"
          />
        </label>
      </section>

      <section className="settingsGroup">
        <h3>Color</h3>
        <div className="segmentedControl" aria-label="Color mode">
          <button
            type="button"
            className={settings.colorMode === "color" ? "isSelected" : ""}
            aria-pressed={settings.colorMode === "color"}
            onClick={() => onSettingChange("colorMode", "color")}
          >
            Color
          </button>
          <button
            type="button"
            className={settings.colorMode === "grayscale" ? "isSelected" : ""}
            aria-pressed={settings.colorMode === "grayscale"}
            onClick={() => onSettingChange("colorMode", "grayscale")}
          >
            Grayscale
          </button>
        </div>
      </section>

      <section className="settingsGroup">
        <h3>Layout</h3>
        <label className="field">
          <span>Paper size</span>
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
          <span>Orientation</span>
          <select
            value={settings.orientation}
            onChange={(event) =>
              onSettingChange(
                "orientation",
                event.target.value as PrintSettings["orientation"],
              )
            }
          >
            <option value="portrait">Portrait</option>
            <option value="landscape">Landscape</option>
          </select>
        </label>
        <label className="field">
          <span>Duplex</span>
          <select
            value={settings.duplex}
            onChange={(event) =>
              onSettingChange(
                "duplex",
                event.target.value as PrintSettings["duplex"],
              )
            }
          >
            <option value="none">None</option>
            <option value="long-edge">Long edge</option>
            <option value="short-edge">Short edge</option>
          </select>
        </label>
        <label className="checkboxField">
          <input
            type="checkbox"
            checked={settings.fitToPage}
            onChange={(event) => onSettingChange("fitToPage", event.target.checked)}
          />
          <span>Fit to page</span>
        </label>
      </section>

      <section className="settingsGroup">
        <h3>Quality</h3>
        <label className="field">
          <span>Output quality</span>
          <select
            value={settings.quality}
            onChange={(event) =>
              onSettingChange("quality", event.target.value as PrintSettings["quality"])
            }
          >
            <option value="draft">Draft</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
          </select>
        </label>
      </section>

      <section className="settingsGroup">
        <h3>Advanced</h3>
        <label className="field">
          <span>Printer profile</span>
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
          <p>Current plan</p>
          <strong>
            {settings.copies} copy{settings.copies === 1 ? "" : "ies"},{" "}
            {settings.pageRange === "all"
              ? "all pages"
              : `pages ${settings.pageRange}`}
          </strong>
          <span>
            {settings.paperSize}, {settings.orientation}, {settings.colorMode}
          </span>
        </div>
      </section>

      <div className="preferenceActions">
        <button className="primaryPrintButton" type="button" disabled={!canPrint} onClick={onPrint}>
          <Printer size={17} />
          {canPrint ? "Print" : disabledReason}
        </button>
        <div className="secondaryActions">
          <button type="button" onClick={onPreview}>
            <Eye size={15} />
            Preview
          </button>
          <button type="button" onClick={onSavePreset}>
            <Save size={15} />
            Save preset
          </button>
        </div>
        <p className={`printerReadyNote printerReadyNote-${status}`}>
          Printer status: {statusLabels[status]}
        </p>
      </div>
    </aside>
  );
}

export default App;
