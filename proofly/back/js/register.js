import { auth } from "/front/js/firebase-config.js";
import { createUserWithEmailAndPassword } from "firebase/auth";

const registerForm = document.getElementById("register-form");

registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const fullName = document.getElementById("full-name").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const phone = document.getElementById("phone").value;

  if (!email.endsWith("@gmail.com")) {
    alert("Используйте только Gmail!");
    return;
  }

  if (password.length < 7 || !/\d/.test(password) || !/[a-zA-Z]/.test(password)) {
    alert("Пароль должен содержать буквы и цифры и быть длиной более 7 символов!");
    return;
  }

  try {
    await createUserWithEmailAndPassword(auth, email, password);
    alert("Регистрация успешна!");
    window.location.href = "home.html";
  } catch (error) {
    alert("Ошибка: " + error.message);
  }
});
