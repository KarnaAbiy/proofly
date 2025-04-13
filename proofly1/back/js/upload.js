// Полный улучшенный код с обработкой ошибок
const fileInput = document.getElementById("mediaUpload");
const browseButton = document.getElementById("browseButton");
const fileList = document.getElementById("fileList");
const dragDropBox = document.getElementById("dragDropBox");
const complaintForm = document.getElementById("complaintForm");

// Конфигурация бота (замените на свои значения)
const BOT_TOKEN = "7219817475:AAG8BBGKjMREmWX6R1v5kl94AYE1yP9vQ0M";
const CHAT_ID = "1002343266";

// Функция для показа уведомлений
function showAlert(message, isSuccess = false) {
  const alertBox = document.createElement("div");
  alertBox.style.position = "fixed";
  alertBox.style.top = "20px";
  alertBox.style.right = "20px";
  alertBox.style.padding = "15px";
  alertBox.style.background = isSuccess ? "#4CAF50" : "#F44336";
  alertBox.style.color = "white";
  alertBox.style.borderRadius = "5px";
  alertBox.style.zIndex = "1000";
  alertBox.style.boxShadow = "0 2px 10px rgba(0,0,0,0.2)";
  alertBox.textContent = message;
  
  document.body.appendChild(alertBox);
  
  setTimeout(() => {
    alertBox.style.opacity = "0";
    setTimeout(() => alertBox.remove(), 500);
  }, 3000);
}

// Обработка файлов (ваш существующий код)
function updateFileList(files) {
  fileList.innerHTML = "";
  Array.from(files).forEach((file, index) => {
    const listItem = document.createElement("li");
    listItem.className = "file-item";
    const fileTypeIcon = file.type.startsWith("image") ? "🖼️" : file.type.startsWith("video") ? "🎥" : "📄";
    listItem.innerHTML = `
      <span>${fileTypeIcon} ${file.name}</span>
      <button class="remove-button">❌</button>
    `;
    listItem.querySelector(".remove-button").onclick = () => {
      const newFiles = Array.from(fileInput.files).filter((_, i) => i !== index);
      const dataTransfer = new DataTransfer();
      newFiles.forEach(f => dataTransfer.items.add(f));
      fileInput.files = dataTransfer.files;
      updateFileList(dataTransfer.files);
    };
    fileList.appendChild(listItem);
  });
}

// Обработчики событий для файлов
browseButton.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", (e) => updateFileList(e.target.files));
dragDropBox.addEventListener("dragover", (e) => {
  e.preventDefault();
  dragDropBox.classList.add("drag-over");
});
dragDropBox.addEventListener("dragleave", () => dragDropBox.classList.remove("drag-over"));
dragDropBox.addEventListener("drop", (e) => {
  e.preventDefault();
  dragDropBox.classList.remove("drag-over");
  if (e.dataTransfer.files.length) {
    fileInput.files = e.dataTransfer.files;
    updateFileList(e.dataTransfer.files);
  }
});

// Улучшенная отправка формы
complaintForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const description = document.getElementById("description").value.trim();
  const location = document.getElementById("location").value.trim();
  const files = fileInput.files;
  
  if (!description) {
    showAlert("Пожалуйста, опишите ситуацию!");
    return;
  }

  try {
    // 1. Отправка текста
    const textResponse = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text: `📢 Новая жалоба!\n\n✍️ Описание: ${description}\n📍 Местоположение: ${location || "Не указано"}\n📎 Файлов: ${files.length}`,
          parse_mode: "HTML"
        })
      }
    );

    if (!textResponse.ok) {
      const error = await textResponse.json();
      throw new Error(error.description || "Ошибка при отправке текста");
    }

    // 2. Отправка файлов (если есть)
    if (files.length > 0) {
      for (const file of files) {
        const formData = new FormData();
        formData.append("chat_id", CHAT_ID);
        formData.append("document", file);
        
        const fileResponse = await fetch(
          `https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`,
          { method: "POST", body: formData }
        );
        
        if (!fileResponse.ok) {
          const error = await fileResponse.json();
          console.warn(`Ошибка при отправке файла ${file.name}:`, error.description);
        }
      }
    }

    // Успех
    showAlert("Жалоба успешно отправлена!", true);
    complaintForm.reset();
    fileList.innerHTML = "";

  } catch (error) {
    console.error("Ошибка отправки:", error);
    showAlert(`Ошибка: ${error.message}`);
  }
});

