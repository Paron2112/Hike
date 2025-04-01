document.addEventListener("DOMContentLoaded", async () => {
    const registerForm = document.getElementById("register-form");
    const loginForm = document.getElementById("login-form");

    // Regisztráció kezelése
    registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const username = document.getElementById("register-username").value;
        const password = document.getElementById("register-password").value;

        try {
            const response = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password })
            });

            if (response.ok) {
                const data = await response.json();
                console.log("Sikeres regisztráció:", data);
                localStorage.setItem("token", data.token);

                const messageDiv = document.getElementById("message");
                messageDiv.textContent = "Sikeres regisztráció!";
                messageDiv.style.color = "green";  

                setTimeout(() => {
                    window.location.href = "/";  // Átirányítás főoldalra
                }, 1000); 
            } else if (response.status === 409) {
                const errorData = await response.json();
                console.error("Hiba történt:", errorData);
                const messageDiv = document.getElementById("message");
                messageDiv.textContent = "A felhasználónév már foglalt!";
                messageDiv.style.color = "red";  
            } else {
                const errorData = await response.json();
                console.error("Hiba történt:", errorData);
                const messageDiv = document.getElementById("message");
                messageDiv.textContent = "Hiba történt a regisztráció során.";
                messageDiv.style.color = "red";  
            }
        } catch (error) {
            console.error("Hiba történt:", error);
            const messageDiv = document.getElementById("message");
            messageDiv.textContent = "Hiba történt a regisztráció során.";
            messageDiv.style.color = "red";  
        }
    });

    // Bejelentkezés kezelése
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const username = document.getElementById("login-username").value;
        const password = document.getElementById("login-password").value;

        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password })
            });

            if (response.ok) {
                const data = await response.json();
                console.log("Sikeres bejelentkezés:", data);
                localStorage.setItem("token", data.token);

                const messageDiv = document.getElementById("message");
                messageDiv.textContent = "Sikeres bejelentkezés!";
                messageDiv.style.color = "green";  

                setTimeout(() => {
                    window.location.href = "/";  
                }, 1000); 
            } else {
                const errorData = await response.json();
                console.error("Hiba történt:", errorData);
                const messageDiv = document.getElementById("message");
                messageDiv.textContent = "Hiba történt a bejelentkezés során.";
                messageDiv.style.color = "red";  
            }
        } catch (error) {
            console.error("Hiba történt:", error);
            const messageDiv = document.getElementById("message");
            messageDiv.textContent = "Hiba történt a bejelentkezés során.";
            messageDiv.style.color = "red";  
        }
    });

    // Ellenőrizzük, hogy a felhasználó be van-e jelentkezve
    const token = localStorage.getItem("token");

    if (token) {
        // Ha van token, akkor próbáljuk betölteni a túrákat
        const welcomeMessage = document.getElementById("welcome-message");
        welcomeMessage.textContent = "Sikeresen bejelentkeztél!";

        document.getElementById("auth-container").style.display = "none"; 
        document.getElementById("main-content").style.display = "block";  

        // A túrák betöltése
        const tourList = document.getElementById("tour-list");
        try {
            const response = await fetch("/api/tours", {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`  // Az Authorization fejléc
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    // Ha a válasz 401, akkor valószínűleg a token lejárt vagy hibás
                    const messageDiv = document.getElementById("message");
                    messageDiv.textContent = "Nem érvényes a bejelentkezésed. Kérlek jelentkezz be újra.";
                    messageDiv.style.color = "red";  
                    localStorage.removeItem("token");  // Token törlés
                    window.location.href = "/login";  // Átirányítás bejelentkezéshez
                } else {
                    throw new Error("Hiba történt a túrák betöltésekor: " + response.statusText);
                }
            }
            const tours = await response.json();

            tours.forEach(tour => {
                const li = document.createElement("li");
                li.textContent = tour.name;
                tourList.appendChild(li);
            });
        } catch (error) {
            console.error("Hiba történt a túrák betöltésekor:", error);
            const messageDiv = document.getElementById("message");
            messageDiv.textContent = "Hiba történt a túrák betöltésekor.";
            messageDiv.style.color = "red";  
        }
    } else {
        // Ha nincs token, akkor megjelenítjük az auth űrlapokat
        document.getElementById("auth-container").style.display = "block";
        document.getElementById("main-content").style.display = "none";
    }
});

