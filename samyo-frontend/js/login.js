// Login form -> POST /api/auth/login
(function () {
  // If this file is opened straight from disk, talk to the local API on port 3000.
  var API = location.protocol === "file:" ? "http://localhost:3000" : "";
  var form = document.getElementById("login-form");
  var msg = document.getElementById("login-message");
  var btn = form.querySelector("button");

  function show(text, kind) {
    msg.textContent = text;
    msg.className = "form-message" + (kind ? " form-message--" + kind : "");
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    show("");
    var email = form.email.value.trim();
    var password = form.password.value;
    if (!email || !password) { show("Enter your email and password.", "error"); return; }

    btn.disabled = true;
    btn.textContent = "Logging in…";
    try {
      var res = await fetch(API + "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email, password: password })
      });
      var data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed.");
      // Learning setup: token kept in localStorage. In production prefer an httpOnly cookie.
      localStorage.setItem("samyo_token", data.token);
      localStorage.setItem("samyo_user", JSON.stringify(data.user));
      show("Welcome, " + data.user.name + "! Redirecting…", "ok");
      setTimeout(function () { location.href = "shop.html"; }, 800);
    } catch (err) {
      show(err.message === "Failed to fetch" ? "Can’t reach the server. Is it running?" : err.message, "error");
    } finally {
      btn.disabled = false;
      btn.textContent = "Log in";
    }
  });
})();
