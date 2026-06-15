import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error('TELEGRAM_BOT_TOKEN not found in .env');
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: false });

async function run() {
  console.log('Testing bot with token:', token.slice(0, 5) + '...');
  try {
    const me = await bot.getMe();
    console.log('Bot is online:', me.username);
    
    // Check if we have any bindings in the data directory
    // (Assuming you have access to read files)
  } catch (err) {
    console.error('Bot test failed:', err);
  }
}

run();
