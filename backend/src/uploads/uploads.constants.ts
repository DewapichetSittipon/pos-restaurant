// ชนิดรูปที่อนุญาต + ขนาดสูงสุด
export const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2MB

export const MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

// รูปไฟล์ที่ multer (memory storage) ส่งมา — นิยามเองเพื่อไม่ต้องลง @types/multer
export interface UploadedImageFile {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname: string;
}
