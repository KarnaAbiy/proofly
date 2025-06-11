// Импорты и базовая настройка
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

const HOST = '0.0.0.0';
const PORT = process.env.PORT || 3000;

const app = express();

app.use(cors());
app.use(express.json());

const FRONT_DIR = path.join(__dirname, '../../public');
const UPLOAD_DIR = path.join(__dirname, '../uploads');

app.use(express.static(FRONT_DIR));
app.use('/uploads', express.static(UPLOAD_DIR));

app.get('/upload', (req, res) => {
  res.sendFile(path.join(FRONT_DIR, 'upload.html'));
});

app.get('/index', (req, res) => {
  res.sendFile(path.join(FRONT_DIR, 'index.html'));
});

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR);
}

// Настройка multer
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

const BANNED_FILE = 'banned.json';

function getBannedList() {
  try {
    return JSON.parse(fs.readFileSync(BANNED_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function isBanned(chatId) {
  return getBannedList().includes(chatId);
}


function addSubscriber(chatId) {
  const subscribers = getSubscribers();
  if (!subscribers.includes(chatId)) {
    subscribers.push(chatId);
    fs.writeFileSync(SUBSCRIBERS_FILE, JSON.stringify(subscribers, null, 2));
    console.log(`➕ Новый подписчик: ${chatId}`);
  }
}

// Кнопки выбора ведомства
const options = {
  reply_markup: {
    inline_keyboard: [
      [{ text: 'УВД', callback_data: 'УВД' }],
      [{ text: 'МВД', callback_data: 'МВД' }],
      [{ text: 'ГКНБ', callback_data: 'ГКНБ' }],
    ]
  }
};

// Telegram логика
bot.onText(/\/start/, (msg) => {
  if (isBanned(msg.chat.id)) {
    bot.sendMessage(msg.chat.id, "⛔️ Вы заблокированы от использования бота.");
    return;
  }

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
    for (const [index, c] of filtered.entries()) {
      const caption = `${index + 1}. ${c.description}\nМесто: ${c.location}`;
      if (c.fileUrls && c.fileUrls.length) {
        for (const fileUrl of c.fileUrls) {
          try {
            const ext = path.extname(fileUrl).toLowerCase();
            if (['.jpg', '.jpeg', '.png', '.gif'].includes(ext)) {
              await bot.sendPhoto(query.message.chat.id, fileUrl, { caption });
            } else if (['.mp4', '.mov', '.avi', '.mkv'].includes(ext)) {
              await bot.sendVideo(query.message.chat.id, fileUrl, { caption });
            } else {
              await bot.sendDocument(query.message.chat.id, fileUrl, {}, { caption });
            }
          } catch (err) {
            console.error('Ошибка отправки файла:', err.message);
            bot.sendMessage(query.message.chat.id, `Не удалось отправить файл: ${caption}`);
          }
        }
      } else {
        bot.sendMessage(query.message.chat.id, caption);
      }
    }
  }
  bot.answerCallbackQuery(query.id);
});

// Обработка POST жалоб с отправкой в телеграм всем подписчикам
app.post('/complaints', upload.array('mediaUpload', 6), async (req, res) => {
  const { category, description, location } = req.body;
  if (!category || !description || !location) {
    return res.status(400).json({ error: 'Не переданы все обязательные поля' });
  }

  const files = req.files || [];
  const host = process.env.HOST || `https://proofly.onrender.com`;
  const fileUrls = files.map(file => `${host}/uploads/${file.filename}`);

  const newComplaint = { category, description, location, fileUrls };
  addComplaint(newComplaint);

  const text = `📢 <b>Новая жалоба!</b>\n\n🏢 <b>Адресовано:</b> ${category}\n📝 <b>Описание:</b> ${description}\n📍 <b>Местоположение:</b> ${location}`;

  const subscribers = getSubscribers().filter(chatId => !isBanned(chatId));


  for (const chatId of subscribers) {
    try {
      const images = fileUrls.filter(f => /\.(jpg|jpeg|png|gif)$/i.test(f));
      const videos = fileUrls.filter(f => /\.(mp4|mov|avi|mkv)$/i.test(f));
      const documents = fileUrls.filter(f => ![...images, ...videos].includes(f));

      // Фото — одной группой
      if (images.length) {
        const mediaGroup = images.map((url, i) => ({
          type: 'photo',
          media: url,
          ...(i === 0 && { caption: text, parse_mode: 'HTML' })
        }));
        await bot.sendMediaGroup(chatId, mediaGroup);
      }

      // Видео — по одному (Telegram не всегда стабильно шлёт видео группой)
      for (const [i, url] of videos.entries()) {
        await bot.sendVideo(chatId, url, {
          caption: !images.length && i === 0 ? text : undefined,
          parse_mode: 'HTML'
        });
      }

      // Документы
      for (const url of documents) {
        await bot.sendDocument(chatId, url, {
          caption: !images.length && !videos.length ? text : undefined,
          parse_mode: 'HTML'
        });
      }

      // Если вообще нет файлов
      if (!fileUrls.length) {
        await bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
      }

    } catch (err) {
      console.error(`Ошибка отправки для chatId ${chatId}:`, err.message);
    }
  }

  res.json({ status: 'success', message: 'Жалоба принята и разослана' });
});

// Отдельная загрузка (если нужно)
app.post('/upload-multiple', upload.array('mediaUpload', 6), (req, res) => {
  console.log(req.files);
  res.json({ status: 'success', files: req.files });
});

app.listen(PORT, HOST, () => {
  console.log(`🚀 Сервер запущен на http://${HOST}:${PORT}`);
});