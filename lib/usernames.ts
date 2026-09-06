export const RESERVED_USERNAMES = [
  "admin",
  "login",
  "play",
  "profile",
  "leaderboard",
  "api",
  "auth",
] as const;

export const USERNAME_PATTERN = /^[A-Za-z0-9_-]{3,20}$/;

export function isValidUsernameFormat(username: string): boolean {
  return USERNAME_PATTERN.test(username);
}

export function isReservedUsername(username: string): boolean {
  return (RESERVED_USERNAMES as readonly string[]).includes(username.toLowerCase());
}

export function usernameValidationError(username: string): string | null {
  if (!isValidUsernameFormat(username)) {
    return "Username must be 3–20 characters: letters, numbers, underscore, or hyphen.";
  }
  if (isReservedUsername(username)) {
    return "That username is reserved.";
  }
  return null;
}
