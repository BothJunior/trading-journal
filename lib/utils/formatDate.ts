/**
 * Utility functions to handle browser local user time and timezone formatting.
 */

/**
 * Returns a string formatted for HTML <input type="datetime-local">
 * using the user's local timezone (e.g. 2026-08-13T11:28).
 */
export function toLocalDatetimeInput(dateInput?: Date | string): string {
  const date = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(date.getTime())) return "";

  const pad = (n: number) => n.toString().padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Formats a Date or ISO string into a local user date & time string.
 * Example: "8/13/2026, 11:28 AM"
 */
export function formatLocalDateTime(dateInput: Date | string): string {
  if (!dateInput) return "-";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "-";

  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

/**
 * Formats a Date or ISO string into local time only.
 * Example: "11:28:45 AM"
 */
export function formatLocalTime(dateInput: Date | string): string {
  if (!dateInput) return "-";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "-";

  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

/**
 * Formats a Date or ISO string into local date only.
 * Example: "8/13/2026"
 */
export function formatLocalDate(dateInput: Date | string): string {
  if (!dateInput) return "-";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "-";

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
}
