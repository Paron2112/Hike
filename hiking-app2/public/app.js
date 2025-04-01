document.addEventListener("DOMContentLoaded", () => {
    // DOM Elements
    const authContainer = document.getElementById("auth-container");
    const mainContent = document.getElementById("main-content");
    const registerForm = document.getElementById("register-form");
    const loginForm = document.getElementById("login-form");
    const messageDiv = document.getElementById("message");
    const logoutBtn = document.getElementById("logout-btn");
    
    // Tour management elements
    const addTourBtn = document.getElementById("add-tour-btn");
    const saveTourBtn = document.getElementById("save-tour-btn");
    const tourForm = document.getElementById("tour-form");
    const poiSection = document.getElementById("poi-section");
    const savedTours = document.getElementById("saved-tours");

    // Application state
    let map = null;
    let poiCounter = 1;

    // Initialize application
    initApp();

    function initApp() {
        setupEventListeners();
        checkAuthStatus();
    }

    function checkAuthStatus() {
        const token = localStorage.getItem("token");
        if (token && isValidToken(token)) {
            showMainContent();
        } else {
            showAuthForm();
        }
    }

    function isValidToken(token) {
        try {
            const decoded = jwt_decode(token);
            return decoded.exp > Date.now() / 1000;
        } catch {
            return false;
        }
    }

    function showMainContent() {
        if (authContainer) authContainer.style.display = "none";
        if (mainContent) mainContent.style.display = "flex";
        initializeMap();
        loadTours();
    }

    function showAuthForm() {
        if (authContainer) authContainer.style.display = "block";
        if (mainContent) mainContent.style.display = "none";
        clearAuthForms();
    }

    function clearAuthForms() {
        if (registerForm) registerForm.reset();
        if (loginForm) loginForm.reset();
        showMessage("", "");
    }

    function setupEventListeners() {
        // Authentication
        if (registerForm) {
            registerForm.addEventListener("submit", handleRegister);
        }
        
        if (loginForm) {
            loginForm.addEventListener("submit", handleLogin);
        }
        
        if (logoutBtn) {
            logoutBtn.addEventListener("click", handleLogout);
        }

        // Tour management
        if (addTourBtn) {
            addTourBtn.addEventListener("click", () => {
                tourForm.style.display = "block";
                addTourBtn.style.display = "none";
            });
        }

        if (saveTourBtn) {
            saveTourBtn.addEventListener("click", handleSaveTour);
        }

        document.getElementById("add-poi")?.addEventListener("click", addPoiField);
    }

    async function handleRegister(e) {
        e.preventDefault();
        const username = document.getElementById("register-username").value;
        const password = document.getElementById("register-password").value;
        const confirmPassword = document.getElementById("confirm-password")?.value;

        if (password !== confirmPassword) {
            return showMessage("A jelszavak nem egyeznek!", "red");
        }

        try {
            const response = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem("token", data.token);
                showMessage("Sikeres regisztráció! Bejelentkezés...", "green");
                setTimeout(showMainContent, 1000);
            } else {
                throw new Error(data.message || "Regisztrációs hiba");
            }
        } catch (error) {
            showMessage(error.message, "red");
            console.error("Register error:", error);
        }
    }

    async function handleLogin(e) {
        e.preventDefault();
        const username = document.getElementById("login-username").value;
        const password = document.getElementById("login-password").value;

        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem("token", data.token);
                showMessage("Sikeres bejelentkezés!", "green");
                setTimeout(showMainContent, 1000);
            } else {
                throw new Error(data.message || "Bejelentkezési hiba");
            }
        } catch (error) {
            showMessage(error.message, "red");
            console.error("Login error:", error);
        }
    }

    function handleLogout() {
        localStorage.removeItem("token");
        showAuthForm();
    }

    function showMessage(text, color) {
        if (messageDiv) {
            messageDiv.textContent = text;
            messageDiv.style.color = color;
            messageDiv.style.display = text ? "block" : "none";
        }
    }

    function initializeMap() {
        if (!map && document.getElementById("map")) {
            map = L.map("map").setView([47.4979, 19.0402], 10);
            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            }).addTo(map);
            
            setTimeout(() => map.invalidateSize(), 100);
        }
    }

    async function loadTours() {
        const token = localStorage.getItem("token");
        if (!savedTours || !token) return;

        try {
            const response = await fetch("/api/hikes", {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error("Failed to load tours");

            const tours = await response.json();
            renderTours(tours);
        } catch (error) {
            console.error("Error loading tours:", error);
            showMessage("Nem sikerült betölteni a túrákat", "red");
        }
    }

    function renderTours(tours) {
        savedTours.innerHTML = "";
        
        tours.forEach(tour => {
            const tourElement = document.createElement("div");
            tourElement.className = "tour-item";
            tourElement.innerHTML = `
                <h3>${tour.hikeName}</h3>
                <p>${tour.startLocation.name} - ${tour.endLocation.name}</p>
            `;
            tourElement.addEventListener("click", () => showTourOnMap(tour));
            savedTours.appendChild(tourElement);
        });
    }

    function showTourOnMap(tour) {
        if (!map) return;

        map.eachLayer(layer => {
            if (layer instanceof L.Marker || layer instanceof L.Polyline) {
                map.removeLayer(layer);
            }
        });

        // Add markers and route
        const startMarker = L.marker([tour.startLocation.lat, tour.startLocation.lng])
            .addTo(map)
            .bindPopup(`<b>Kezdőpont</b><br>${tour.startLocation.name}`);

        const endMarker = L.marker([tour.endLocation.lat, tour.endLocation.lng])
            .addTo(map)
            .bindPopup(`<b>Végpont</b><br>${tour.endLocation.name}`);

        // Add waypoints if they exist
        if (tour.waypoints?.length > 0) {
            const waypoints = tour.waypoints.map(wp => {
                const marker = L.marker([wp.lat, wp.lng])
                    .addTo(map)
                    .bindPopup(`<b>Megálló</b><br>${wp.name}`);
                return [wp.lat, wp.lng];
            });

            // Draw the route
            const route = [
                [tour.startLocation.lat, tour.startLocation.lng],
                ...waypoints,
                [tour.endLocation.lat, tour.endLocation.lng]
            ];
            L.polyline(route, {color: 'blue'}).addTo(map);
        }

        // Fit bounds to show entire route
        const bounds = L.latLngBounds([
            [tour.startLocation.lat, tour.startLocation.lng],
            [tour.endLocation.lat, tour.endLocation.lng]
        ]);
        map.fitBounds(bounds, {padding: [50, 50]});
    }

    function addPoiField() {
        poiCounter++;
        const poiField = document.createElement("div");
        poiField.className = "poi-field";
        poiField.innerHTML = `
            <input type="text" 
                   id="poi-location-${poiCounter}" 
                   placeholder="POI helye (pl. 47.4979,19.0402)">
            <button type="button" class="remove-poi">✕</button>
        `;
        
        poiField.querySelector(".remove-poi").addEventListener("click", () => {
            poiField.remove();
        });
        
        poiSection.appendChild(poiField);
    }

    async function handleSaveTour(e) {
        e.preventDefault();
        
        const tourName = document.getElementById("tour-name").value;
        const startLocation = document.getElementById("start-location").value;
        const endLocation = document.getElementById("destination-location").value;

        if (!tourName || !startLocation || !endLocation) {
            return showMessage("Minden mező kitöltése kötelező!", "red");
        }

        // Collect POIs
        const pois = [];
        document.querySelectorAll(".poi-field input").forEach(input => {
            if (input.value) pois.push(input.value);
        });

        try {
            const token = localStorage.getItem("token");
            const response = await fetch("/api/hikes", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    hikeName: tourName,
                    startLocation: parseLocation(startLocation),
                    endLocation: parseLocation(endLocation),
                    waypoints: pois.map(parseLocation)
                })
            });

            if (!response.ok) throw new Error("Failed to save tour");

            showMessage("Túra sikeresen mentve!", "green");
            resetTourForm();
            loadTours();
        } catch (error) {
            console.error("Error saving tour:", error);
            showMessage("Hiba történt a mentés során", "red");
        }
    }

    function parseLocation(locationStr) {
        // Try to parse coordinates (format: "47.4979,19.0402")
        const coords = locationStr.split(",").map(Number);
        if (coords.length === 2 && !coords.some(isNaN)) {
            return {
                name: locationStr,
                lat: coords[0],
                lng: coords[1]
            };
        }
        
        // Default to Budapest coordinates if not valid coordinates
        return {
            name: locationStr,
            lat: 47.4979,
            lng: 19.0402
        };
    }

    function resetTourForm() {
        document.getElementById("tour-form").reset();
        poiSection.innerHTML = "";
        poiCounter = 1;
        tourForm.style.display = "none";
        addTourBtn.style.display = "block";
    }
});