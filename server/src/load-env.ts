/**
 * Nạp `server/.env` theo đường dẫn tuyệt đối từ file này — không phụ thuộc
 * `process.cwd()`. Nếu chỉ dùng `import 'dotenv/config'`, khi chạy server từ
 * thư mục gốc repo (Cursor Task, `node dist/index.js` từ root, v.v.) sẽ không
 * đọc được `server/.env` → thiếu biến Google Sheets.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '..', '.env');
dotenv.config({ path: envPath });
