// ════════════════════════════════════════════════════════════════════════════
// fileValidation.ts — client-side guard for document uploads. The backend MUST
// still validate (this is UX, not security), but it stops obvious mistakes
// (20 MB photos, .exe files) before they hit the network.
// ════════════════════════════════════════════════════════════════════════════

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

export const ALLOWED_UPLOAD_EXT = [
  'pdf', 'jpg', 'jpeg', 'png', 'webp', 'heic',
  'doc', 'docx', 'xls', 'xlsx',
] as const;

const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg', 'image/png', 'image/webp', 'image/heic',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

export interface FileValidationResult {
  ok: boolean;
  error?: string;
}

export function validateUpload(file: File | null | undefined): FileValidationResult {
  if (!file) return { ok: false, error: 'No file selected.' };

  if (file.size === 0) return { ok: false, error: 'File is empty.' };

  if (file.size > MAX_UPLOAD_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    return { ok: false, error: `File is ${mb} MB — maximum is ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB.` };
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const extOk = (ALLOWED_UPLOAD_EXT as readonly string[]).includes(ext);
  const mimeOk = !file.type || ALLOWED_MIME.has(file.type);

  if (!extOk || !mimeOk) {
    return {
      ok: false,
      error: `Unsupported file type ".${ext}". Allowed: ${ALLOWED_UPLOAD_EXT.join(', ')}.`,
    };
  }

  return { ok: true };
}

/** Convenience for <input accept="…"> attributes. */
export const UPLOAD_ACCEPT = ALLOWED_UPLOAD_EXT.map((e) => `.${e}`).join(',');
