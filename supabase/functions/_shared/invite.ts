const INVITE_CHARSET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateInviteCode(length = 6): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let code = "";
  for (let i = 0; i < length; i += 1) {
    code += INVITE_CHARSET[bytes[i] % INVITE_CHARSET.length];
  }
  return code;
}
