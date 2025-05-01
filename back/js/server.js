require('dotenv').config();
const express = require('express');
const axios = require('axios');
const fileUpload = require('express-fileupload');
const cors = require('cors');
const FormData = require('form-data');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Конфигурация
const BOT_TOKEN = process.env.BOT_TOKEN || 'ВАШ_ТОКЕН';
const TELEGRAM_API_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const USERS_DB_PATH = path.join(__dirname, 'users.json');

// Инициализация
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);
if (!fs.existsSync(USERS_DB_PATH)) fs.writeFileSync(USERS_DB_PATH, '[]');

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(fileUpload({
  limits: { fileSize: MAX_FILE_SIZE },
  abortOnLimit: true
}));

// Функции работы с пользователями
const addUser = (chatId) => {
  const users = getUsers();
  if (!users.includes(chatId)) {
    users.push(chatId);
    fs.writeFileSync(USERS_DB_PATH, JSON.stringify(users));
  }
};

const getUsers = () => JSON.parse(fs.readFileSync(USERS_DB_PATH));

// Webhook обработчик
app.post('/webhook', (req, res) => {
  const { message } = req.body;
  
  if (message?.text === '/start') {
    const chatId = message.chat.id;
    addUser(chatId);
    console.log(`Новый пользователь: ${chatId}`);
    
    axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
      chat_id: chatId,
      text: '✅ Вы подписаны на уведомления!'
    }).catch(console.error);
  }
  
  res.status(200).end();
});

// Отправка жалобы
app.post('/send-complaint', async (req, res) => {
  try {
    const { description, location, department } = req.body;
    const files = req.files?.file ? [req.files.file] : [];
    const users = getUsers();

    if (!description) return res.status(400).json({ error: 'Требуется описание' });

    const messageText = `
<b>📢 Новая жалоба!</b>

<b>📁 Подразделение:</b> ${department || 'Не указано'}
<b>✍️ Описание:</b> ${description}
<b>📍 Местоположение:</b> ${location || 'Не указано'}
<b>📎 Файлов:</b> ${files.length}
    `;

    // Отправка текста всем пользователям
    await Promise.all(users.map(chatId => 
      axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
        chat_id: chatId,
        text: messageText,
        parse_mode: 'HTML'
      }).catch(e => console.error(`Ошибка для ${chatId}:`, e.message))
    );

    // Отправка файла (если есть)
    if (files.length > 0 && users.length > 0) {
      const file = files[0];
      const filePath = path.join(UPLOAD_DIR, file.name);
      await file.mv(filePath);
      
      const formData = new FormData();
      formData.append('chat_id', users[0]);
      formData.append('document', fs.createReadStream(filePath));
      formData.append('caption', messageText);
      
      await axios.post(`${TELEGRAM_API_URL}/sendDocument`, formData, {
        headers: formData.getHeaders()
      });
      
      fs.unlinkSync(filePath);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Ошибка:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/set-webhook', async (req, res) => {
    try {
      const WEBHOOK_URL = req.query.url || 'http://localhost:3000/set-webhook'; // URL из параметра или дефолтный
      
      const response = await axios.post(`${TELEGRAM_API_URL}/setWebhook`, {
        url: WEBHOOK_URL,
        max_connections: 40,
        allowed_updates: ['message', 'callback_query']
      });
  
      res.json(response.data);
    } catch (error) {
      console.error('Ошибка настройки webhook:', error.response?.data || error.message);
      res.status(500).json({ 
        error: 'Ошибка настройки webhook',
        details: error.response?.data || error.message 
      });
    }
  });