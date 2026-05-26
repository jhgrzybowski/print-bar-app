export type PrinterApiConfig = {
  baseUrl: string;
};

export type PrinterApiErrorCode =
  | "network"
  | "http"
  | "invalid_json"
  | "unknown";

export class PrinterApiError extends Error {
  code: PrinterApiErrorCode;
  detail?: unknown;
  status?: number;

  constructor(
    message: string,
    code: PrinterApiErrorCode,
    options?: { detail?: unknown; status?: number },
  ) {
    super(message);
    this.name = "PrinterApiError";
    this.code = code;
    this.detail = options?.detail;
    this.status = options?.status;
  }
}

export type HealthResponseDto = {
  service: string;
  status: string;
};

export type CupsStatusDto = {
  available: boolean;
  error?: string | null;
};

export type PrinterStatusDto = {
  accepting_jobs?: boolean | null;
  cups: CupsStatusDto;
  device_uri?: string | null;
  enabled: boolean;
  exists: boolean;
  location?: string | null;
  message?: string;
  queue_name: string;
  reasons: string[];
  state: string;
  state_code?: number | null;
};

export type OptionBlockDto = {
  api_name: string;
  choices?: string[];
  mapping?: Record<string, string>;
  notes?: string;
  raw_option: string | null;
  raw_options?: string[];
  recommended_mapping?: Record<string, string | null>;
  supported?: boolean;
};

export type PrinterOptionsResponseDto = {
  collate?: OptionBlockDto;
  color_modes?: OptionBlockDto;
  debug?: Record<string, unknown>;
  duplex_modes?: OptionBlockDto;
  fit_to_page?: OptionBlockDto;
  media_types?: OptionBlockDto;
  orientation?: OptionBlockDto;
  paper_sizes?: OptionBlockDto;
  quality?: OptionBlockDto;
  queue?: string;
};

export type FileUploadResponseDto = {
  detected_mime: string;
  file_id: string;
  original_filename: string;
  page_count?: number | null;
  preview_available: boolean;
  size_bytes: number;
};

export type PreviewPageDto = {
  page: number;
  size_bytes: number;
  url: string;
};

export type PreviewResponseDto = {
  file_id: string;
  page_count: number | null;
  pages: PreviewPageDto[];
};

export type PrintOptionsDto = {
  collate?: boolean;
  color_mode?: "monochrome" | "color" | "auto";
  copies?: number;
  duplex?: "none" | "long-edge" | "short-edge";
  fit_to_page?: boolean;
  media_type?: string;
  orientation?: "portrait" | "landscape" | "reverse-landscape" | "reverse-portrait";
  pages?: string | null;
  paper_size?: string;
  quality?: "draft" | "normal" | "high";
};

export type PrintRequestDto = {
  file_id: string;
  options: PrintOptionsDto;
};

export type PrintResponseDto = {
  applied_options: Record<string, string>;
  job_id: number;
  queue: string;
  submitted_filename: string;
  unsupported_options: string[];
  warnings: string[];
};

export type JobInfoDto = {
  can_cancel?: boolean;
  can_forget?: boolean;
  completed_at?: number | string | null;
  created_at?: number | string | null;
  is_active?: boolean;
  is_terminal?: boolean;
  job_id: number;
  name?: string;
  printer_uri?: string;
  queue?: string;
  reasons?: string[];
  state?: string;
  state_code?: number | null;
  user?: string;
};

export type JobsResponseDto = {
  jobs: JobInfoDto[];
};

export type CancelJobResponseDto = {
  already_completed?: boolean;
  cancelled: boolean;
  job_id: number;
  message?: string;
};

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

export const getPrinterApiBaseUrl = () =>
  trimTrailingSlash(
    import.meta.env.VITE_PRINTER_API_BASE_URL || "http://localhost:8000",
  );

const isAbsoluteUrl = (value: string) => /^https?:\/\//i.test(value);

const detailToMessage = (detail: unknown) => {
  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    return detail
      .map((item) =>
        typeof item === "object" && item && "msg" in item
          ? String(item.msg)
          : JSON.stringify(item),
      )
      .join("; ");
  }

  if (typeof detail === "object" && detail) {
    if ("message" in detail && typeof detail.message === "string") {
      return detail.message;
    }

    if ("error" in detail && typeof detail.error === "string") {
      return detail.error;
    }

    return JSON.stringify(detail);
  }

  return "Backend request failed.";
};

const normalizeUnknownError = (error: unknown): PrinterApiError => {
  if (error instanceof PrinterApiError) {
    return error;
  }

  if (error instanceof TypeError) {
    return new PrinterApiError(
      "Backend unreachable or blocked by CORS. Check that local_printer_api is running and allows this origin.",
      "network",
    );
  }

  if (error instanceof Error) {
    return new PrinterApiError(error.message, "unknown");
  }

  return new PrinterApiError("Unknown printer API error.", "unknown");
};

export const createPrinterApi = (config: PrinterApiConfig) => {
  const baseUrl = trimTrailingSlash(config.baseUrl);

  const buildUrl = (path: string) => {
    if (isAbsoluteUrl(path)) {
      return path;
    }

    const normalizedPath = path.startsWith("/") ? path : `/${path}`;

    if (!baseUrl) {
      return normalizedPath;
    }

    return `${baseUrl}${normalizedPath}`;
  };

  const requestJson = async <ResponseBody>(
    path: string,
    init?: RequestInit,
  ): Promise<ResponseBody> => {
    try {
      const response = await fetch(buildUrl(path), {
        ...init,
        headers: {
          ...(init?.body instanceof FormData
            ? {}
            : { "Content-Type": "application/json" }),
          ...init?.headers,
        },
      });

      const text = await response.text();
      let body: unknown = null;

      if (text) {
        try {
          body = JSON.parse(text);
        } catch {
          throw new PrinterApiError(
            "Backend returned invalid JSON.",
            "invalid_json",
            { status: response.status },
          );
        }
      }

      if (!response.ok) {
        const detail =
          typeof body === "object" && body && "detail" in body
            ? (body as { detail?: unknown }).detail
            : body;

        throw new PrinterApiError(detailToMessage(detail), "http", {
          detail,
          status: response.status,
        });
      }

      return body as ResponseBody;
    } catch (error) {
      throw normalizeUnknownError(error);
    }
  };

  return {
    baseUrl,
    cancelJob: (jobId: number | string) =>
      requestJson<CancelJobResponseDto>(`/jobs/${jobId}`, {
        method: "DELETE",
      }),
    forgetJob: (jobId: number | string) =>
      requestJson<CancelJobResponseDto>(`/jobs/${jobId}/forget`, {
        method: "POST",
      }),
    health: () => requestJson<HealthResponseDto>("/health"),
    job: (jobId: number | string) =>
      requestJson<JobInfoDto>(`/jobs/${jobId}`),
    jobs: (scope: "active" | "completed" | "all" = "active") =>
      requestJson<JobsResponseDto>(
        `/jobs?${new URLSearchParams({ scope }).toString()}`,
      ),
    options: () => requestJson<PrinterOptionsResponseDto>("/options"),
    previewFile: (fileId: string) =>
      requestJson<PreviewResponseDto>(`/files/${fileId}/preview`),
    previewPageUrl: (fileId: string, page: number) =>
      buildUrl(`/files/${fileId}/preview/${page}`),
    print: (payload: PrintRequestDto) =>
      requestJson<PrintResponseDto>("/print", {
        body: JSON.stringify(payload),
        method: "POST",
      }),
    resolveUrl: buildUrl,
    status: () => requestJson<PrinterStatusDto>("/status"),
    uploadFile: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      return requestJson<FileUploadResponseDto>("/files", {
        body: formData,
        method: "POST",
      });
    },
  };
};
