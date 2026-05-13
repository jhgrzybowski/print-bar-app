export const formatFileSize = (bytes: number) => {
  if (bytes < 1_000_000) {
    return `${Math.round(bytes / 1_000)} KB`;
  }

  return `${(bytes / 1_000_000).toFixed(1)} MB`;
};

export const formatTime = (isoDate: string, locale = "en-US") =>
  new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(isoDate));

export const formatShortDate = (isoDate: string, locale = "en-US") =>
  new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(isoDate));
