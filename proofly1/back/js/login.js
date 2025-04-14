
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginButton = document.getElementById("loginButton");
const emailError = document.getElementById("emailError");
const passwordError = document.getElementById("passwordError");

function validate() {
    const email = emailInput.value;
    const password = passwordInput.value;
    let valid = true;

    if (!email.endsWith("@gmail.com")) {
        emailError.style.display = "block";
        valid = false;
    } else {
        emailError.style.display = "none";
    }

    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
    if (!passwordRegex.test(password)) {
        passwordError.style.display = "block";
        valid = false;
    } else {
        passwordError.style.display = "none";
    }

    loginButton.disabled = !valid;
}

emailInput.addEventListener("input", validate);
passwordInput.addEventListener("input", validate);

loginButton.addEventListener("click", () => {
    alert("Login successful!");
    window.location.href = "/front/html/home.html";
});