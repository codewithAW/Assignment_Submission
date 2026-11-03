export interface PDFValidationResult {
  valid: boolean;
  error?: string;
  details?: {
    sizeBytes: number;
    mimeType: string;
    hasPdfMagicBytes: boolean;
    header?: string;
  };
}

export const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB
export const MIN_FILE_SIZE_BYTES = 100; // 100 bytes

/**
 * Validates a PDF file on the client before upload, and identical logic runs in the Supabase Edge Function:
 * 1. File extension (.pdf)
 * 2. MIME type (application/pdf)
 * 3. File size (min 100 B, max 15 MB)
 * 4. Binary signature: first bytes must contain %PDF- (0x25 0x50 0x44 0x46 0x2D)
 */
export async function validatePDFFile(file: File): Promise<PDFValidationResult> {
  // 1. Check file existence
  if (!file) {
    return { valid: false, error: 'No file was provided.' };
  }

  // 2. Check file extension
  const fileName = file.name.toLowerCase();
  if (!fileName.endsWith('.pdf')) {
    return {
      valid: false,
      error: 'Invalid file extension. Only genuine PDF documents (.pdf) are permitted.',
    };
  }

  // 3. Check MIME type
  const mimeType = file.type.toLowerCase();
  const allowedMimeTypes = ['application/pdf', 'application/x-pdf', 'application/acrobat'];
  if (mimeType && !allowedMimeTypes.includes(mimeType)) {
    return {
      valid: false,
      error: `Invalid MIME type (${file.type}). Only PDF documents are accepted.`,
    };
  }

  // 4. Check File Size
  if (file.size < MIN_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: 'The provided file is empty or too small to be a valid PDF document.',
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    const maxMb = (MAX_FILE_SIZE_BYTES / (1024 * 1024)).toFixed(0);
    return {
      valid: false,
      error: `File size exceeds the maximum limit of ${maxMb}MB. Please compress your PDF.`,
    };
  }

  // 5. Binary magic bytes inspection
  try {
    const slice = file.slice(0, 1024);
    const arrayBuffer = await slice.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // Look for %PDF- (0x25 0x50 0x44 0x46 0x2D)
    // In standard PDFs, it begins at byte 0. Some generators include UTF-8 BOM or leading comments.
    const signature = [0x25, 0x50, 0x44, 0x46, 0x2D]; // %PDF-
    let foundIndex = -1;

    for (let i = 0; i < Math.min(bytes.length - 4, 256); i++) {
      if (
        bytes[i] === signature[0] &&
        bytes[i + 1] === signature[1] &&
        bytes[i + 2] === signature[2] &&
        bytes[i + 3] === signature[3] &&
        bytes[i + 4] === signature[4]
      ) {
        foundIndex = i;
        break;
      }
    }

    if (foundIndex === -1) {
      return {
        valid: false,
        error: 'Binary validation failed: The file does not have a valid %PDF- file signature. Renaming an image or document to .pdf is not accepted.',
      };
    }

    // Read header string e.g. "%PDF-1.7"
    const headerBytes = bytes.slice(foundIndex, foundIndex + 8);
    const headerStr = new TextDecoder('ascii').decode(headerBytes);

    return {
      valid: true,
      details: {
        sizeBytes: file.size,
        mimeType: file.type || 'application/pdf',
        hasPdfMagicBytes: true,
        header: headerStr,
      },
    };
  } catch (err: any) {
    return {
      valid: false,
      error: `Could not verify file binary structure: ${err?.message || 'Unknown error'}`,
    };
  }
}
