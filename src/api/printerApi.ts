export type PrinterApiConfig = {
  baseUrl: string;
};

const notImplemented = async <T>(): Promise<T> => {
  throw new Error("Printer API integration is planned for milestone 2.");
};

export const createPrinterApi = (_config: PrinterApiConfig) => ({
  health: () => notImplemented<unknown>(),
  status: () => notImplemented<unknown>(),
  options: () => notImplemented<unknown>(),
  files: () => notImplemented<unknown>(),
  previewFile: (_fileId: string) => notImplemented<unknown>(),
  print: (_payload: unknown) => notImplemented<unknown>(),
  jobs: () => notImplemented<unknown>(),
  job: (_jobId: string) => notImplemented<unknown>(),
});
