const fileInput = document.getElementById("mediaUpload");
const browseButton = document.getElementById("browseButton");
const fileList = document.getElementById("fileList");
const dragDropBox = document.getElementById("dragDropBox");
const complaintForm = document.getElementById("complaintForm");

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'video/mp4', 'video/quicktime'];

browseButton.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", (e) => updateFileList(e.target.files));

dragDropBox.addEventListener("dragover", (e) => {
  e.preventDefault();
  dragDropBox.classList.add("drag-over");
});

dragDropBox.addEventListener("dragleave", () => {
  dragDropBox.classList.remove("drag-over");
});

dragDropBox.addEventListener("drop", (e) => {
  e.preventDefault();
  dragDropBox.classList.remove("drag-over");
  if (e.dataTransfer.files.length) {
    updateFileList(e.dataTransfer.files);
  }
});

complaintForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const description = document.getElementById("description").value.trim();
  const location = document.getElementById("location").value.trim();
  const department = document.getElementById("department").value;
  const files = fileInput.files;

  if (!description) {
    showAlert("Пожалуйста, опишите ситуацию!");
    return;
  }

  if (!validateDescription(description)) {
    return;
  }

  const formData = new FormData();
  formData.append("category", department);
  formData.append("description", description);
  formData.append("location", location);
  Array.from(files).forEach(file => formData.append("mediaUpload", file));

  try {
    const response = await fetch("/complaints", {
      method: "POST",
      body: formData,
    });

    const result = await response.json();

    if (response.status === 429 && result.error) {
      showAlert(`⏳ ${result.error}`); // Покажем сообщение от сервера
    } else if (result.status === "success") {
      showAlert("Жалоба успешно отправлена и сохранена!", true);
      complaintForm.reset();
      fileList.innerHTML = "";
    } else {
      showAlert("Ошибка сохранения жалобы на сервере");
    }

  } catch (error) {
    showAlert(`Ошибка отправки: ${error.message}`);
  }
});

function updateFileList(files) {
  fileList.innerHTML = "";
  const validFiles = Array.from(files).filter(validateFile);

  const dataTransfer = new DataTransfer();
  validFiles.forEach(f => dataTransfer.items.add(f));
  fileInput.files = dataTransfer.files;

  if (validFiles.length === 0) return;

  validFiles.forEach((file, index) => {
    const listItem = document.createElement("li");
    listItem.className = "file-item";

    const fileTypeIcon = file.type.startsWith("image") ? "🖼️" :
      file.type.startsWith("video") ? "🎥" : "📄";

    const fileSize = (file.size / (1024 * 1024)).toFixed(2);

    listItem.innerHTML = `
      <div class="file-info">
        <span class="file-icon">${fileTypeIcon}</span>
        <div>
          <span class="file-name">${file.name}</span>
          <span class="file-size">${fileSize} MB</span>
        </div>
      </div>
      <button class="remove-button" aria-label="Удалить файл">❌</button>
    `;

    listItem.querySelector(".remove-button").onclick = (e) => {
      e.stopPropagation();
      const newFiles = Array.from(fileInput.files).filter((_, i) => i !== index);
      const newDataTransfer = new DataTransfer();
      newFiles.forEach(f => newDataTransfer.items.add(f));
      fileInput.files = newDataTransfer.files;
      updateFileList(newDataTransfer.files);
    };

    fileList.appendChild(listItem);
  });
}

function validateFile(file) {
  if (file.size > MAX_FILE_SIZE) {
    showAlert(`Файл ${file.name} слишком большой (макс. 5MB)`);
    return false;
  }
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    showAlert(`Неподдерживаемый формат файла: ${file.name}`);
    return false;
  }
  return true;
}

function validateDescription(text) {
  const lowerText = text.toLowerCase();
  const badWords = ["блять", "сука", "хуй", "пизда", "ебать", "fuck", "shit", "bitch", "nigger", "faggot"];
  const noVowels = !/[аеёиоуыэюяaeiou]/i.test(text);
  const noSpaces = !text.includes(' ');
  const repeatedChars = /(.)\1{4,}/.test(text);
  const tooShort = text.length < 10;

  if (badWords.some(word => lowerText.includes(word))) {
    showAlert("Пожалуйста, уберите нецензурные выражения!");
    return false;
  }

  if (noVowels || noSpaces || repeatedChars || tooShort) {
    showAlert("Пожалуйста, введите осмысленное описание!");
    return false;
  }

  return true;
}

function showAlert(message, isSuccess = false) {
  const alertBox = document.createElement("div");
  alertBox.className = isSuccess ? "alert success" : "alert error";
  alertBox.textContent = message;

  document.body.appendChild(alertBox);

  setTimeout(() => {
    alertBox.classList.add("fade-out");
    setTimeout(() => alertBox.remove(), 500);
  }, 3000);
}

const style = document.createElement("style");
style.textContent = `
  .alert {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    color: white;
    border-radius: 5px;
    z-index: 1000;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    opacity: 1;
    transition: opacity 0.5s;
  }
  
  .alert.success { background-color: #4CAF50; }
  .alert.error { background-color: #F44336; }
  .fade-out { opacity: 0 !important; }

  .file-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px;
    margin-bottom: 8px;
    background: #f5f5f5;
    border-radius: 4px;
  }

  .file-info {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .file-name {
    display: block;
    font-weight: 500;
  }

  .file-size {
    font-size: 0.8em;
    color: #666;
  }

  .remove-button {
    background: none;
    border: none;
    cursor: pointer;
    padding: 5px;
  }
`;
document.head.appendChild(style);