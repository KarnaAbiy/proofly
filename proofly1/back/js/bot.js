const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

// === Настройки бота и сервера ===
const token = '7219817475:AAG8BBGKjMREmWX6R1v5kl94AYE1yP9vQ0M'; // 🔁 замените на свой токен
const bot = new TelegramBot(token, { polling: true });
const app = express();
app.use(cors());
app.use(bodyParser.json());

// === Файлы ===
const COMPLAINTS_FILE = 'complaints.json';
const SUBSCRIBERS_FILE = 'subscribers.json';

// === Работа с жалобами ===
function getComplaints() {
  try {
    const data = fs.readFileSync(COMPLAINTS_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function addComplaint(complaint) {
  const complaints = getComplaints();
  complaints.push(complaint);
  fs.writeFileSync(COMPLAINTS_FILE, JSON.stringify(complaints, null, 2));
}

// === Работа с подписчиками ===
function getSubscribers() {
  try {
    const data = fs.readFileSync(SUBSCRIBERS_FILE, 'utf8');
    return JSON.parse(data);
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

// === Кнопки в Telegram ===
const options = {
  reply_markup: {
    inline_keyboard: [
      [{ text: 'УВД', callback_data: 'УВД' }],
      [{ text: 'МВД', callback_data: 'МВД' }],
      [{ text: 'ГКНБ', callback_data: 'ГКНБ' }],
    ]
  }
};

// === Команды Telegram ===
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  addSubscriber(chatId);
  bot.sendMessage(chatId, 'Выберите ведомство для просмотра жалоб:', options);
});

bot.on('callback_query', (query) => {
  const category = query.data;
  const complaints = getComplaints();
  const filtered = complaints.filter(c => c.category === category);

  if (filtered.length === 0) {
    bot.sendMessage(query.message.chat.id, `Жалоб на ${category} пока нет.`);
  } else {
    filtered.forEach((c, i) => {
      const caption = `${i + 1}. ${c.description}\nМесто: ${c.location}`;
      if (c.imageUrl) {
        bot.sendPhoto(query.message.chat.id, c.imageUrl, { caption });
      } else {
        bot.sendMessage(query.message.chat.id, caption);
      }
    });
  }

  bot.answerCallbackQuery(query.id);
});

// === HTTP сервер ===
app.post('/complaints', (req, res) => {
  const { category, description, location, imageUrl } = req.body;

  if (!category || !description || !location) {
    return res.status(400).json({ error: 'Неверный формат жалобы' });
  }

  const newComplaint = { category, description, location, imageUrl };
  addComplaint(newComplaint);
  console.log('🆕 Жалоба добавлена:', newComplaint);

  // Рассылка всем подписчикам
  const text = `📢 Новая жалоба на ${category}:\n${description}\nМесто: ${location}`;
  const subscribers = getSubscribers();

  subscribers.forEach(chatId => {
    if (imageUrl) {
      bot.sendPhoto(chatId, imageUrl, { caption: text });
    } else {
      bot.sendMessage(chatId, text);
    }
  });

  res.json({ status: 'success', message: 'Жалоба принята и разослана' });
});

app.listen(3000, () => {
  console.log('🚀 HTTP сервер запущен на http://localhost:3000');
});
