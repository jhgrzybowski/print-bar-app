export const formatFileSize = (bytes: number) => {
  if (bytes < 1_000_000) {
    return `${Math.round(bytes / 1_000)} KB`;
  }

  return `${(bytes / 1_000_000).toFixed(1)} MB`;
};

export const formatMimeType = (mimeType: string) => {
  if (mimeType === "application/pdf") {
    return "PDF document";
  }

  if (mimeType.startsWith("image/")) {
    return `${mimeType.split("/")[1]?.toUpperCase() ?? "Image"} image`;
  }

  if (mimeType === "text/plain") {
    return "Text document";
  }

  return mimeType;
};

export const formatTime = (isoDate: string) =>
  new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(isoDate));

export const formatShortDate = (isoDate: string) =>
  new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(isoDate));
