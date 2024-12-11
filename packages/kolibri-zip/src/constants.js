// ZIP End of Central Directory Record signature
export const EOCD_SIGNATURE = 0x06054b50;
export const EOCD_SIZE = 22; // Minimum size of end of central directory record
export const MAX_COMMENT_SIZE = 65535; // Maximum ZIP comment size
export const LARGE_FILE_THRESHOLD = 500 * 1024; // 500KB
export const LOCAL_FILE_HEADER_SIGNATURE = 0x04034b50;
export const LOCAL_FILE_HEADER_FIXED_SIZE = 30;
