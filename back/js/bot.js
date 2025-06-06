const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const axios = require('axios');

const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

const app = express();
app.use(cors());
app.use(express.json());

const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR);
}

// Раздача статических файлов по URL: http://{host}/uploads/filename
app.use('/uploads', express.static(UPLOAD_DIR));

// Настройка multer для сохранения файлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, filename);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.mp4', '.mov', '.avi', '.mkv'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Неподдерживаемый формат файла'), false);
  }
});

const COMPLAINTS_FILE = 'complaints.json';
const SUBSCRIBERS_FILE = 'subscribers.json';

function getComplaints() {
  try {
    return JSON.parse(fs.readFileSync(COMPLAINTS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function addComplaint(complaint) {
  const complaints = getComplaints();
  complaints.push(complaint);
  fs.writeFileSync(COMPLAINTS_FILE, JSON.stringify(complaints, null, 2));
}

function getSubscribers() {
  try {
    return JSON.parse(fs.readFileSync(SUBSCRIBERS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function addSubscriber(chatId) {
  const subscribers = getSubscribers();
  if (!subscribers.includes(chatId)) {
    subscribers.push(chatId);
    fs.writeFileSync(SUBSCRIBERS_FILE, JSON.stringify(subscribers, null, 2));
    console.log(`➕ Новый подписчик: ${chatId}`);
  }
}

const options = {
  reply_markup: {
    inline_keyboard: [
      [{ text: 'УВД', callback_data: 'УВД' }],
      [{ text: 'МВД', callback_data: 'МВД' }],
      [{ text: 'ГКНБ', callback_data: 'ГКНБ' }],
    ]
  }
};

bot.onText(/\/start/, (msg) => {
  addSubscriber(msg.chat.id);
  bot.sendMessage(msg.chat.id, 'Выберите ведомство для просмотра жалоб:', options);
});

bot.on('callback_query', async (query) => {
  const category = query.data;
  const complaints = getComplaints();
  const filtered = complaints.filter(c => c.category === category);

  if (filtered.length === 0) {
    bot.sendMessage(query.message.chat.id, `Жалоб на ${category} пока нет.`);
  } else {
    for (const c of filtered) {
      const caption = `${filtered.indexOf(c) + 1}. ${c.description}\nМесто: ${c.location}`;
      if (c.fileUrl) {
        try {
          const ext = path.extname(c.fileUrl).toLowerCase();

          if (['.jpg', '.jpeg', '.png', '.gif'].includes(ext)) {
            await bot.sendPhoto(query.message.chat.id, c.fileUrl, { caption });
          } else if (['.mp4', '.mov', '.avi', '.mkv'].includes(ext)) {
            await bot.sendVideo(query.message.chat.id, c.fileUrl, { caption });
          } else {
            await bot.sendDocument(query.message.chat.id, c.fileUrl, {}, { caption });
          }
        } catch (err) {
          console.error('Ошибка отправки файла:', err.message);
          bot.sendMessage(query.message.chat.id, `Не удалось отправить файл: ${caption}`);
        }
      } else {
        bot.sendMessage(query.message.chat.id, caption);
      }
    }
  }

  bot.answerCallbackQuery(query.id);
});

// POST /complaints - принимает жалобу с файлом
app.post('/complaints', upload.array('mediaUpload', 6), async (req, res) => {
  console.log('Получено файлов:', req.files);

  const { category, description, location } = req.body;
  if (!category || !description || !location) {
    return res.status(400).json({ error: 'Не переданы все обязательные поля' });
  }

  // req.files — массив файлов
  const files = req.files || [];

  // Для примера сформируем массив URL загруженных файлов
  const host = process.env.HOST || `http://localhost:3000`;
  const fileUrls = files.map(file => `${host}/uploads/${file.filename}`);

  const newComplaint = { category, description, location, fileUrls };
  addComplaint(newComplaint);

  console.log('🆕 Жалоба добавлена:', newComplaint);

  const text = `📢 Новая жалоба!\n\n🏢 Адресовано: ${category}\n✍️ Описание: ${description}\n📍 Местоположение: ${location}`;

  const subscribers = getSubscribers();

  for (const chatId of subscribers) {
    try {
      if (fileUrls.length) {
        for (const fileUrl of fileUrls) {
          const ext = path.extname(fileUrl).toLowerCase();

          if (['.jpg', '.jpeg', '.png', '.gif'].includes(ext)) {
            await bot.sendPhoto(chatId, fileUrl, { caption: text });
          } else if (['.mp4', '.mov', '.avi', '.mkv'].includes(ext)) {
            await bot.sendVideo(chatId, fileUrl, { caption: text });
          } else {
            await bot.sendDocument(chatId, fileUrl, {}, { caption: text });
          }
        }
      } else {
        await bot.sendMessage(chatId, text);
      }
    } catch (err) {
      console.error(`Ошибка отправки для chatId ${chatId}:`, err.message);
    }
  }

  res.json({ status: 'success', message: 'Жалоба принята и разослана' });
});

const HOST = '0.0.0.0';
const PORT = process.env.PORT || 3000;

app.listen(PORT, HOST, () => {
  console.log(`🚀 Сервер запущен на http://${HOST}:${PORT}`);
});


if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

// Разрешаем CORS
app.use(cors());

// Обработка POST запроса
app.post('/upload-multiple', upload.array('mediaUpload', 6), (req, res) => {
  console.log(req.files); // массив файлов
  res.json({ status: 'success', files: req.files });
});

// // Для /complaints (если нужно)
// app.use(express.json());
// app.post('/complaints', (req, res) => {
//   const { category, description, location } = req.body;
//   console.log('Получена жалоба:', { category, description, location });
//   res.json({ status: 'success' });
// });

