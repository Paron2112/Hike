// DOM Elements
const loginContainer = document.getElementById('login-container');
const appContainer = document.getElementById('app-container');
const loginForm = document.getElementById('login-form');
const logoutBtn = document.getElementById('logout-btn');
const userGreeting = document.getElementById('user-greeting');
const routesListEl = document.getElementById('routes-list');
const routeNameEl = document.getElementById('route-name');
const createRouteBtn = document.getElementById('create-route');
const registerForm = document.getElementById('register-form');
const regUsername = document.getElementById('reg-username');
const regPassword = document.getElementById('reg-password');

// Application State
let routes = [];
let activeRouteId = null;
let currentUserId = null;
let routeMarkers = null;
let routeLines = null;
let map = null;

// API URL konfiguráció
const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:5000/api' 
  : '/api';

// Helper function for API requests
async function makeRequest(url, method, body = null, headers = {}) {
  try {
    const defaultHeaders = {
      'Content-Type': 'application/json',
    };
    
    if (currentUserId) {
      defaultHeaders['user-id'] = currentUserId;
    }

    const response = await fetch(url, {
      method,
      headers: { ...defaultHeaders, ...headers },
      body: body ? JSON.stringify(body) : null,
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(errorData || `HTTP error! status: ${response.status}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    return await response.text();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

// Event Listener for Registration
registerForm.addEventListener('submit', async function(e) {
  e.preventDefault();
  const username = regUsername.value.trim();
  const password = regPassword.value.trim();

  if (!username || !password) {
    alert('Please fill in all fields');
    return;
  }

  try {
    const data = await makeRequest(`${API_URL}/register`, 'POST', { username, password });
    
    if (data.userId) {
      currentUserId = data.userId;
      localStorage.setItem('userId', currentUserId);
      showApp();
      alert('Registration successful!');
    } else {
      alert(data.message || 'Registration failed');
    }
  } catch (err) {
    console.error('Register error:', err);
    alert(err.message || 'Registration failed');
  }
  
  regUsername.value = '';
  regPassword.value = '';
});

// Initialize Map (after login)
function initMap() {
  map = L.map('map').setView([49.8153, 6.1296], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  routeMarkers = L.layerGroup().addTo(map);
  routeLines = L.layerGroup().addTo(map);

  map.on('click', function(e) {
    addPointToRoute(e.latlng);
  });
}

// Login Functionality
function checkAuth() {
  const userId = localStorage.getItem('userId');
  if (userId) {
    currentUserId = userId;
    showApp();
  }
}

function showApp() {
  loginContainer.style.display = 'none';
  appContainer.style.display = 'flex';
  userGreeting.textContent = `Hello, User!`;
  initMap();
  loadRoutes();
}

function hideApp() {
  loginContainer.style.display = 'block';
  appContainer.style.display = 'none';
  currentUserId = null;
  if (map) {
    map.remove();
    map = null;
  }
}

// Route Management
async function createNewRoute() {
  const routeName = routeNameEl.value.trim();
  if (!routeName) {
    alert('Please enter a route name');
    return;
  }

  try {
    const newRoute = await makeRequest(`${API_URL}/routes`, 'POST', { name: routeName });
    routes.unshift(newRoute);
    activeRouteId = newRoute._id;
    renderRoutesList();
    routeNameEl.value = '';
    clearMap();
  } catch (err) {
    console.error('Error creating route:', err);
    alert(err.message || 'Failed to create route');
  }
}

async function addPointToRoute(latlng) {
  if (!activeRouteId) {
    alert('First create or select a route');
    routeNameEl.focus();
    return;
  }

  const route = routes.find(r => r._id === activeRouteId);
  if (route) {
    const pointName = prompt('Enter point name:', `Point ${route.points.length + 1}`);
    if (pointName === null) return;

    const newPoint = {
      name: pointName || `Point ${route.points.length + 1}`,
      latlng: [latlng.lat, latlng.lng],
    };

    try {
      const updatedRoute = await makeRequest(
        `${API_URL}/routes/${activeRouteId}/point`, 
        'PUT', 
        { point: newPoint }
      );
      
      const routeIndex = routes.findIndex(r => r._id === activeRouteId);
      routes[routeIndex] = updatedRoute;
      renderRoutesList();
      drawRouteOnMap(updatedRoute);
    } catch (err) {
      console.error('Error adding point:', err);
      alert(err.message || 'Failed to add point');
    }
  }
}

function drawRouteOnMap(route) {
  routeMarkers.clearLayers();
  routeLines.clearLayers();
  
  if (route.points.length > 0) {
    const latlngs = route.points.map(p => p.latlng);
    const polyline = L.polyline(latlngs, { color: 'blue' }).addTo(routeLines);
    
    route.points.forEach(point => {
      L.marker(point.latlng, {
        draggable: true,
        title: point.name
      })
      .bindPopup(`<b>${point.name}</b><br>${point.latlng[0].toFixed(4)}, ${point.latlng[1].toFixed(4)}`)
      .addTo(routeMarkers)
      .on('dragend', async function(e) {
        const marker = e.target;
        const newPosition = marker.getLatLng();
        const pointIndex = route.points.findIndex(p => 
          p.latlng[0] === point.latlng[0] && p.latlng[1] === point.latlng[1]
        );
        if (pointIndex !== -1) {
          route.points[pointIndex].latlng = [newPosition.lat, newPosition.lng];
          try {
            await makeRequest(
              `${API_URL}/routes/${activeRouteId}/point`, 
              'PUT', 
              { point: route.points[pointIndex] }
            );
            drawRouteOnMap(route);
          } catch (err) {
            console.error('Error updating point:', err);
            marker.setLatLng(point.latlng); // Revert position on error
          }
        }
      });
    });
    
    const bounds = L.latLngBounds(route.points.map(p => p.latlng));
    map.fitBounds(bounds, { padding: [50, 50] });
  }
}

function clearMap() {
  if (routeMarkers) routeMarkers.clearLayers();
  if (routeLines) routeLines.clearLayers();
}

function renderRoutesList() {
  routesListEl.innerHTML = '';

  routes.forEach(route => {
    const routeEl = document.createElement('div');
    routeEl.className = `route ${route._id === activeRouteId ? 'active-route' : ''}`;
    routeEl.innerHTML = `
      <h3>${route.name}</h3>
      <p>${route.points.length} points</p>
      <div class="points-list" id="points-${route._id}"></div>
      <div class="route-actions">
        <button class="select-route" data-id="${route._id}">Select</button>
        <button class="delete-route" data-id="${route._id}">Delete</button>
      </div>
    `;

    const pointsListEl = routeEl.querySelector(`.points-list`);
    route.points.forEach(point => {
      const pointEl = document.createElement('div');
      pointEl.className = 'point-item';
      pointEl.innerHTML = `
        ${point.name}: ${point.latlng[0].toFixed(4)}, ${point.latlng[1].toFixed(4)}
        <button class="edit-point" data-route-id="${route._id}" data-point-id="${point._id}"><i class="fas fa-edit"></i></button>
        <button class="delete-point" data-route-id="${route._id}" data-point-id="${point._id}"><i class="fas fa-trash"></i></button>`; 
      pointsListEl.appendChild(pointEl);
    });
    routesListEl.appendChild(routeEl);

    routeEl.querySelector('.select-route').addEventListener('click', () => {
      activeRouteId = route._id;
      if (route.points.length > 0) {
        const bounds = L.latLngBounds(route.points.map(p => p.latlng));
        map.fitBounds(bounds, { padding: [50, 50] });
      } else {
        map.setView([49.8153, 6.1296], 13);
      } 
      renderRoutesList();
      drawRouteOnMap(route);
    });

    routeEl.querySelector('.delete-route').addEventListener('click', async () => {
      if (confirm(`Delete route "${route.name}"?`)) {
        try {
          await makeRequest(`${API_URL}/routes/${route._id}`, 'DELETE');
          routes = routes.filter(r => r._id !== route._id);
          if (activeRouteId === route._id) {
            activeRouteId = null;
            clearMap();
          }
          renderRoutesList();
        } catch (err) {
          console.error('Error deleting route:', err);
          alert(err.message || 'Failed to delete route');
        }
      }
    });

    routeEl.querySelectorAll('.delete-point').forEach(button => {
      button.addEventListener('click', async () => {
        const routeId = button.getAttribute('data-route-id');
        const pointId = button.getAttribute('data-point-id');
        const pointName = route.points.find(p => p._id === pointId)?.name || 'this point';
        
        if (confirm(`Delete point "${pointName}"?`)) {
          try {
            await makeRequest(`${API_URL}/routes/${routeId}/point/${pointId}`, 'DELETE');
            const updatedRoute = await makeRequest(`${API_URL}/routes/${routeId}`, 'GET');
            
            const routeIndex = routes.findIndex(r => r._id === routeId);
            routes[routeIndex] = updatedRoute;
            renderRoutesList();
            
            if (activeRouteId === routeId) {
              drawRouteOnMap(updatedRoute);
              if (updatedRoute.points.length > 0) {
                const bounds = L.latLngBounds(updatedRoute.points.map(p => p.latlng));
                map.fitBounds(bounds, { padding: [50, 50] });
              } else {
                map.setView([49.8153, 6.1296], 13);
              }
            }
          } catch (err) {
            console.error('Error deleting point:', err);
            alert(err.message || 'Failed to delete point');
          }
        }
      });
    });

    routeEl.querySelectorAll('.edit-point').forEach(button => {
      button.addEventListener('click', async () => {
        const routeId = button.getAttribute('data-route-id');
        const pointId = button.getAttribute('data-point-id');
        const currentPoint = route.points.find(p => p._id === pointId);
        const newName = prompt(`Enter new name for "${currentPoint.name}":`, currentPoint.name);
        
        if (newName !== null && newName.trim() !== '') {
          try {
            await makeRequest(
              `${API_URL}/routes/${routeId}/point/${pointId}`, 
              'PUT', 
              { name: newName.trim() }
            );
            
            const updatedRoute = await makeRequest(`${API_URL}/routes/${routeId}`, 'GET');
            const routeIndex = routes.findIndex(r => r._id === routeId);
            routes[routeIndex] = updatedRoute;
            renderRoutesList();
            
            if (activeRouteId === routeId) {
              drawRouteOnMap(updatedRoute);
              if (updatedRoute.points.length > 0) {
                const bounds = L.latLngBounds(updatedRoute.points.map(p => p.latlng));
                map.fitBounds(bounds, { padding: [50, 50] });
              }
            }
          } catch (err) {
            console.error('Error updating point name:', err);
            alert(err.message || 'Failed to update point name');
          }
        }
      });
    });
  });
}

// Load Routes from Backend
async function loadRoutes() {
  try {
    routes = await makeRequest(`${API_URL}/routes`, 'GET');
    renderRoutesList();
  } catch (err) {
    console.error('Error loading routes:', err);
    alert(err.message || 'Failed to load routes');
  }
}

// Event Listeners
loginForm.addEventListener('submit', async function(e) {
  e.preventDefault();

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();

  if (!username || !password) {
    alert('Please fill in all fields');
    return;
  }

  try {
    const data = await makeRequest(`${API_URL}/login`, 'POST', { username, password });
    
    if (data.userId) {
      currentUserId = data.userId;
      localStorage.setItem('userId', currentUserId);
      showApp();
    } else {
      alert(data.message || 'Invalid username or password');
    }
  } catch (err) {
    console.error('Login error:', err);
    alert(err.message || 'Login failed');
  }
});

logoutBtn.addEventListener('click', function() {
  localStorage.removeItem('userId');
  hideApp();
  document.getElementById('username').value = '';
  document.getElementById('password').value = '';
});

createRouteBtn.addEventListener('click', createNewRoute);

// Initialize app
checkAuth();