document.addEventListener("DOMContentLoaded", async () => {
    const registerForm = document.getElementById("register-form");
    const loginForm = document.getElementById("login-form");
    const mapContainer = document.getElementById("map-container");

    let map; // Ide kerül a térkép

    // 🚀 Térkép inicializálása függvény
    function initializeMap() {
        if (!map) {
            map = L.map("map").setView([47.4979, 19.0402], 10); // Budapest középponttal
            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);
        }
        setTimeout(() => {
            map.invalidateSize(); // 📌 Fontos: így biztosan betölt a térkép
        }, 500);
    }

    // 🚀 Regisztráció kezelése
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
                localStorage.setItem("token", (await response.json()).token);
                document.getElementById("auth-container").style.display = "none";
                document.getElementById("main-content").style.display = "flex";
                initializeMap(); // 📌 Betöltjük a térképet
                loadTours();
            } else {
                document.getElementById("message").textContent = "A felhasználónév már foglalt!";
                document.getElementById("message").style.color = "red";
            }
        } catch (error) {
            console.error("Hiba történt:", error);
        }
    });

    // 🚀 Bejelentkezés kezelése
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
                localStorage.setItem("token", (await response.json()).token);
                document.getElementById("auth-container").style.display = "none";
                document.getElementById("main-content").style.display = "flex";
                initializeMap(); // 📌 Betöltjük a térképet
                loadTours();
            } else {
                document.getElementById("message").textContent = "Hibás bejelentkezési adatok.";
                document.getElementById("message").style.color = "red";
            }
        } catch (error) {
            console.error("Hiba történt:", error);
        }
    });

    // 🚀 Ellenőrizzük, hogy be van-e jelentkezve a felhasználó
    if (localStorage.getItem("token")) {
        document.getElementById("auth-container").style.display = "none";
        document.getElementById("main-content").style.display = "flex";
        initializeMap();
        loadTours();
    } else {
        document.getElementById("auth-container").style.display = "block";
        document.getElementById("main-content").style.display = "none";
    }
});

// 🚀 Túrák betöltése
async function loadTours() {
    const token = localStorage.getItem("token");
    const tourList = document.getElementById("tour-list");
    const savedTours = document.getElementById("saved-tours");

    tourList.innerHTML = ""; // Ürítjük a listát
    savedTours.innerHTML = ""; // Jobb sáv listáját is

    try {
        const response = await fetch("/api/tours", {
            method: "GET",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }
        });

        if (!response.ok) throw new Error("Hiba a túrák betöltésekor!");

        const tours = await response.json();

        tours.forEach(tour => {
            const li = document.createElement("li");
            li.textContent = tour.name;
            savedTours.appendChild(li);

            // Ha rákattintanak egy túrára, jelenjen meg a térképen
            li.addEventListener("click", () => {
                console.log("Túra kiválasztva:", tour);
                showTourOnMap(tour);
            });
        });

    } catch (error) {
        console.error("Hiba történt a túrák betöltésekor:", error);
    }
}

// 🚀 Túra megjelenítése a térképen
function showTourOnMap(tour) {
    if (!map) return;
    map.setView([tour.startLat, tour.startLng], 12);

    // Kitöröljük a régi rétegeket
    map.eachLayer(layer => {
        if (layer instanceof L.Marker || layer instanceof L.Polyline) {
            map.removeLayer(layer);
        }
    });

    // Kezdő és végpont jelölése
    L.marker([tour.startLat, tour.startLng]).addTo(map)
        .bindPopup("Kezdőpont").openPopup();
    L.marker([tour.endLat, tour.endLng]).addTo(map)
        .bindPopup("Végpont");

    // Ha vannak köztes pontok, vonallal összekötjük őket
    if (tour.waypoints && tour.waypoints.length > 0) {
        const route = [
            [tour.startLat, tour.startLng],
            ...tour.waypoints.map(p => [p.lat, p.lng]),
            [tour.endLat, tour.endLng]
        ];
        L.polyline(route, { color: "red" }).addTo(map);
    }
}
