// Tiny files with real signatures, for upload tests.
export const PDF_BYTES = new Uint8Array(Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n"));
export const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
export const JPEG_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46]);
// An executable renamed to .pdf must be refused.
export const FAKE_PDF_BYTES = new Uint8Array(Buffer.from("MZ\x90\x00 not really a pdf"));
