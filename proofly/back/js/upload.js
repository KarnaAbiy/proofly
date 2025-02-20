
const fileInput = document.getElementById("mediaUpload");
const browseButton = document.getElementById("browseButton");
const fileList = document.getElementById("fileList");
const dragDropBox = document.getElementById("dragDropBox");

function updateFileList(files) {
    fileList.innerHTML = "";
    Array.from(files).forEach((file, index) => {
        const listItem = document.createElement("li");
        listItem.className = "file-item";

        let fileTypeIcon = "📄";
        if (file.type.startsWith("image")) fileTypeIcon = "🖼️";
        else if (file.type.startsWith("video")) fileTypeIcon = "🎥";

        const fileNameSpan = document.createElement("span");
        fileNameSpan.innerHTML = `${fileTypeIcon} ${file.name}`;

        const removeButton = document.createElement("button");
        removeButton.className = "remove-button";
        removeButton.textContent = "❌";
        removeButton.onclick = () => {
            listItem.remove();
        };

        listItem.appendChild(fileNameSpan);
        listItem.appendChild(removeButton);
        fileList.appendChild(listItem);
    });
}

browseButton.addEventListener("click", () => {
    fileInput.click();
});

fileInput.addEventListener("change", (event) => {
    if (event.target.files.length > 0) {
        updateFileList(event.target.files);
    }
});

dragDropBox.addEventListener("dragover", (event) => {
    event.preventDefault();
    dragDropBox.classList.add("drag-over");
});

dragDropBox.addEventListener("dragleave", () => {
    dragDropBox.classList.remove("drag-over");
});

dragDropBox.addEventListener("drop", (event) => {
    event.preventDefault();
    dragDropBox.classList.remove("drag-over");

    if (event.dataTransfer.files.length > 0) {
        fileInput.files = event.dataTransfer.files;
        updateFileList(event.dataTransfer.files);
    }
});

document.getElementById("uploadButton").addEventListener("click", function() {
    alert("Файл(ы) успешно загружены!");
});
