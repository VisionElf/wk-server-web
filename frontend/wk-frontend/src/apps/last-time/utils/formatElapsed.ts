/** Formats how long ago a UTC instant was (aligned with the WPF DateUtils behavior). */
export function formatElapsed(iso: string | null | undefined): string {
  if (iso == null || iso === "") {
    return "Never";
  }

  const dateValue = new Date(iso);
  if (Number.isNaN(dateValue.getTime()) || dateValue.getFullYear() < 1900) {
    return "Never";
  }

  const now = Date.now();
  const t = dateValue.getTime();
  const diffMs = now - t;
  if (diffMs < 0) {
    return "Never";
  }

  const diff = diffMs / 1000;
  const years = Math.floor(diff / (365 * 24 * 3600));
  const months = Math.floor(diff / (30 * 24 * 3600));
  const weeks = Math.floor(diff / (7 * 24 * 3600));
  const days = Math.floor(diff / (24 * 3600));
  const hours = Math.floor(diff / 3600);
  const minutes = Math.floor(diff / 60);
  const remainingHours = hours % 24;
  const remainingMinutes = minutes % 60;

  if (years > 0) {
    return `${years} ${years === 1 ? "year" : "years"} ago`;
  }
  if (months > 0) {
    return `${months} ${months === 1 ? "month" : "months"} ago`;
  }
  if (weeks > 0) {
    return `${weeks} ${weeks === 1 ? "week" : "weeks"} ago`;
  }
  if (days > 0) {
    if (remainingHours > 0) {
      return `${days} ${days === 1 ? "day" : "days"}, ${remainingHours} ${remainingHours === 1 ? "hour" : "hours"} ago`;
    }
    return `${days} ${days === 1 ? "day" : "days"} ago`;
  }
  if (hours > 0) {
    if (remainingMinutes > 0) {
      return `${hours} ${hours === 1 ? "hour" : "hours"}, ${remainingMinutes} ${remainingMinutes === 1 ? "minute" : "minutes"} ago`;
    }
    return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  }
  if (minutes > 0) {
    return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  }
  return "Just now";
}

export function formatDateLong(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
