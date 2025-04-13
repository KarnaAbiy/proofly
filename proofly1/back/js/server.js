const express = require('express');
const axios = require('axios');
const fileUpload = require('express-fileupload');
const cors = require('cors');
const FormData = require('form-data'); 

const app = express();
const PORT = 3000;

// 🔑 Пожалуйста, убедись, что токен и чат ID правильные
const BOT_TOKEN = '7219817475:AAG8BBGKjMREmWX6R1v5kl94AYE1yP9vQ0M';
const CHAT_ID = '1002343266';
const TELEGRAM_API_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;

app.use(cors());
app.use(express.json());
app.use(fileUpload());

// 📌 Маршрут для отправки текста
app.post('/send-message', async (req, res) => {
    const { description, location, department, filesCount } = req.body;

    try {
        const response = await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
            chat_id: CHAT_ID,
            text: `📢 Новая жалоба!\n\n📁 Подразделение: ${department}\n✍️ Описание: ${description}\n📍 Местоположение: ${location || "Не указано"}\n📎 Файлов: ${filesCount}`,
            parse_mode: "HTML"
        });

        if (response.data.ok) {
            res.status(200).json({ message: 'Сообщение отправлено успешно!' });
        } else {
            res.status(500).json({ message: 'Ошибка при отправке сообщения.' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message || 'Ошибка при отправке сообщения.' });
    }
});

// 📌 Маршрут для отправки файлов
app.post('/send-file', async (req, res) => {
    if (!req.files || !req.files.file) {
        return res.status(400).json({ message: 'Нет загруженных файлов.' });
    }

    const file = req.files.file;
    const formData = new FormData();
    formData.append('chat_id', CHAT_ID);
    formData.append('document', file.data, { filename: file.name });

    try {
        const response = await axios.post(`${TELEGRAM_API_URL}/sendDocument`, formData, {
            headers: formData.getHeaders()
        });

        if (response.data.ok) {
            res.status(200).json({ message: 'Файл отправлен успешно!' });
        } else {
            res.status(500).json({ message: 'Ошибка при отправке файла.' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message || 'Ошибка при отправке файла.' });
    }
});

app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});
