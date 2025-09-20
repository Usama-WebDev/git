/* app.js
   Simple front-end logic using localStorage for persistence.
   Beginner-friendly and well-commented.
*/

// ========== Helpers for storage ==========
const STORAGE = {
  USERS: "ztw_users_v1",      // stores user objects {username, password, role, name}
  ORDERS: "ztw_orders_v1",    // stores order objects
  SESSION: "ztw_session_v1",  // stores logged-in username
};

function load(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch (e) {
    console.error("load error", e);
    return null;
  }
}
function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// initialize lists if not present
if (!load(STORAGE.USERS)) save(STORAGE.USERS, []);
if (!load(STORAGE.ORDERS)) save(STORAGE.ORDERS, []);

// ========== Simple UI routing ==========
const sections = {
  home: document.getElementById("home-section"),
  auth: document.getElementById("auth-section"),
  customer: document.getElementById("customer-section"),
  vendor: document.getElementById("vendor-section"),
  delivery: document.getElementById("delivery-section"),
};

function showSection(name) {
  Object.values(sections).forEach(s => s.classList.add("hidden"));
  sections[name].classList.remove("hidden");
  updateAuthArea();
  if (name === "customer") renderCustomerOrders();
  if (name === "vendor") renderVendorOrders();
  if (name === "delivery") renderDeliveryOrders();
}

// nav buttons
document.getElementById("nav-home").addEventListener("click", () => showSection("home"));
document.getElementById("nav-customer").addEventListener("click", () => showSection("auth"));
document.getElementById("nav-vendor").addEventListener("click", () => showSection("auth"));
document.getElementById("nav-delivery").addEventListener("click", () => showSection("auth"));

// ========== Authentication (toy, client-only) ==========
const authTitle = document.getElementById("auth-title");
const authForm = document.getElementById("auth-form");
const authRole = document.getElementById("auth-role");
const authUsername = document.getElementById("auth-username");
const authName = document.getElementById("auth-name");
const authPassword = document.getElementById("auth-password");
const authMessage = document.getElementById("auth-message");
const nameLabel = document.getElementById("name-label");

authRole.addEventListener("change", () => {
  nameLabel.style.display = authRole.value === "customer" ? "block" : "none";
});

document.getElementById("auth-register").addEventListener("click", () => {
  const role = authRole.value;
  const username = authUsername.value.trim();
  const password = authPassword.value;
  const name = authName.value.trim();

  if (!username || !password) {
    authMessage.textContent = "Please enter username and password.";
    return;
  }

  const users = load(STORAGE.USERS) || [];
  if (users.find(u => u.username === username)) {
    authMessage.textContent = "Username already exists. Choose another.";
    return;
  }

  const user = { username, password, role, name: name || username };
  users.push(user);
  save(STORAGE.USERS, users);
  authMessage.textContent = "Registered successfully. You can now login.";
  authMessage.style.color = "green";
});

document.getElementById("auth-login").addEventListener("click", () => {
  const role = authRole.value;
  const username = authUsername.value.trim();
  const password = authPassword.value;

  const users = load(STORAGE.USERS) || [];
  const user = users.find(u => u.username === username && u.password === password && u.role === role);
  if (!user) {
    authMessage.textContent = "Invalid credentials or role mismatch.";
    authMessage.style.color = "red";
    return;
  }

  save(STORAGE.SESSION, { username: user.username, role: user.role, name: user.name });
  authMessage.textContent = "Logged in.";
  authMessage.style.color = "green";

  // route to correct dashboard based on role
  if (user.role === "customer") showSection("customer");
  else if (user.role === "vendor") showSection("vendor");
  else if (user.role === "delivery") showSection("delivery");
  updateAuthArea();
});

// show current auth area (login/logout)
function updateAuthArea() {
  const authArea = document.getElementById("auth-area");
  const session = load(STORAGE.SESSION);
  authArea.innerHTML = "";
  if (session && session.username) {
    const span = document.createElement("span");
    span.innerHTML = `<span class="badge">${session.name} (${session.role})</span>`;
    const logout = document.createElement("button");
    logout.textContent = "Logout";
    logout.className = "nav-btn";
    logout.addEventListener("click", () => {
      localStorage.removeItem(STORAGE.SESSION);
      updateAuthArea();
      showSection("home");
    });
    authArea.appendChild(span);
    authArea.appendChild(logout);
  } else {
    const loginBtn = document.createElement("button");
    loginBtn.textContent = "Login/Register";
    loginBtn.className = "nav-btn";
    loginBtn.addEventListener("click", () => showSection("auth"));
    authArea.appendChild(loginBtn);
  }
}

// ========== Orders: create / read / update ==========
function createOrder({ customerUsername, customerName, quantity, address }) {
  const orders = load(STORAGE.ORDERS) || [];
  const id = Date.now(); // simple unique id
  const order = {
    id,
    customerUsername,
    customerName,
    quantity: Number(quantity),
    address,
    status: "Pending", // Pending, Assigned, Out for Delivery, Delivered, Cancelled
    assignedTo: null, // delivery username
    createdAt: new Date().toISOString(),
  };
  orders.push(order);
  save(STORAGE.ORDERS, orders);
  return order;
}

function updateOrder(id, changes) {
  const orders = load(STORAGE.ORDERS) || [];
  const idx = orders.findIndex(o => o.id === id);
  if (idx === -1) return null;
  orders[idx] = { ...orders[idx], ...changes };
  save(STORAGE.ORDERS, orders);
  return orders[idx];
}

// ========== Customer: place order & view own orders ==========
const orderForm = document.getElementById("order-form");
orderForm.addEventListener("submit", function (e) {
  e.preventDefault();
  const session = load(STORAGE.SESSION);
  if (!session || session.role !== "customer") {
    document.getElementById("order-message").textContent = "You must be logged in as a customer.";
    return;
  }
  const quantity = document.getElementById("order-quantity").value;
  const address = document.getElementById("order-address").value.trim();
  if (!quantity || !address) {
    document.getElementById("order-message").textContent = "Please provide quantity and address.";
    return;
  }
  createOrder({
    customerUsername: session.username,
    customerName: session.name,
    quantity,
    address,
  });
  document.getElementById("order-message").textContent = "Order placed successfully!";
  document.getElementById("order-form").reset();
  renderCustomerOrders();
});

// render customer's orders
function renderCustomerOrders() {
  const list = document.getElementById("customer-orders-list");
  list.innerHTML = "";
  const session = load(STORAGE.SESSION);
  if (!session || session.role !== "customer") {
    list.innerHTML = "<p class='muted'>Login as a customer to view your orders.</p>";
    return;
  }
  const orders = load(STORAGE.ORDERS) || [];
  const mine = orders.filter(o => o.customerUsername === session.username).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  if (mine.length === 0) {
    list.innerHTML = "<p class='muted'>No orders yet.</p>";
    return;
  }
  mine.forEach(o => {
    const div = document.createElement("div");
    div.className = "order-item";
    div.innerHTML = `
      <div class="order-main">
        <strong>Order #${o.id}</strong> <span class="small">(${new Date(o.createdAt).toLocaleString()})</span>
        <div class="small">Qty: ${o.quantity} — Address: ${o.address}</div>
        <div class="small">Status: <strong>${o.status}</strong> ${o.assignedTo ? `— Delivery: ${o.assignedTo}` : ''}</div>
      </div>
      <div class="order-actions">
        ${o.status === "Pending" ? `<button class="secondary" data-cancel="${o.id}">Cancel</button>` : ''}
      </div>
    `;
    list.appendChild(div);
  });

  // cancel buttons
  list.querySelectorAll("[data-cancel]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = Number(btn.getAttribute("data-cancel"));
      updateOrder(id, { status: "Cancelled" });
      renderCustomerOrders();
      renderVendorOrders();
    });
  });
}

// ========== Vendor/Admin: view all orders, assign delivery, update status ==========
function renderVendorOrders() {
  const list = document.getElementById("vendor-orders-list");
  const session = load(STORAGE.SESSION);
  if (!session || session.role !== "vendor") {
    list.innerHTML = "<p class='muted'>Login as vendor/admin to manage orders.</p>";
    return;
  }
  const orders = load(STORAGE.ORDERS) || [];
  if (orders.length === 0) {
    list.innerHTML = "<p class='muted'>No orders yet.</p>";
    return;
  }
  // order by newest first
  orders.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  list.innerHTML = "";
  orders.forEach(o => {
    const div = document.createElement("div");
    div.className = "order-item";
    div.innerHTML = `
      <div class="order-main">
        <strong>Order #${o.id}</strong> <span class="small">(${new Date(o.createdAt).toLocaleString()})</span>
        <div class="small">Customer: ${o.customerName} (${o.customerUsername})</div>
        <div class="small">Qty: ${o.quantity} — Address: ${o.address}</div>
        <div class="small">Status: <strong>${o.status}</strong> ${o.assignedTo ? `— Delivery: ${o.assignedTo}` : ''}</div>
      </div>
      <div class="order-actions">
        <select class="assign-select">
          <option value="">Assign Delivery</option>
        </select>
        <button class="btn-assign">Assign</button>
        <button class="btn-update">Next Status</button>
      </div>
    `;
    list.appendChild(div);

    // fill assign select with registered delivery users
    const users = load(STORAGE.USERS) || [];
    const deliveryUsers = users.filter(u => u.role === "delivery");
    const select = div.querySelector(".assign-select");
    deliveryUsers.forEach(d => {
      const opt = document.createElement("option");
      opt.value = d.username;
      opt.textContent = d.name + " (" + d.username + ")";
      select.appendChild(opt);
    });

    // events
    div.querySelector(".btn-assign").addEventListener("click", () => {
      const username = select.value;
      if (!username) {
        alert("Choose delivery username from the dropdown first.");
        return;
      }
      updateOrder(o.id, { assignedTo: username, status: "Assigned" });
      renderVendorOrders();
      renderDeliveryOrders();
    });

    div.querySelector(".btn-update").addEventListener("click", () => {
      // cycle status
      const order = load(STORAGE.ORDERS).find(x => x.id === o.id);
      if (!order) return;
      const seq = ["Pending", "Assigned", "Out for Delivery", "Delivered"];
      let idx = seq.indexOf(order.status);
      if (idx === -1) idx = 0;
      idx = Math.min(idx + 1, seq.length - 1);
      updateOrder(o.id, { status: seq[idx] });
      renderVendorOrders();
      renderDeliveryOrders();
    });
  });
}

// ========== Delivery view: see assigned orders and mark delivered ==========
function renderDeliveryOrders() {
  const list = document.getElementById("delivery-orders-list");
  const session = load(STORAGE.SESSION);
  if (!session || session.role !== "delivery") {
    list.innerHTML = "<p class='muted'>Login as a delivery user to view assigned orders.</p>";
    return;
  }
  const orders = load(STORAGE.ORDERS) || [];
  const mine = orders.filter(o => o.assignedTo === session.username).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  if (mine.length === 0) {
    list.innerHTML = "<p class='muted'>No assigned orders.</p>";
    return;
  }
  list.innerHTML = "";
  mine.forEach(o => {
    const div = document.createElement("div");
    div.className = "order-item";
    div.innerHTML = `
      <div class="order-main">
        <strong>Order #${o.id}</strong> <span class="small">(${new Date(o.createdAt).toLocaleString()})</span>
        <div class="small">Customer: ${o.customerName} — Address: ${o.address}</div>
        <div class="small">Qty: ${o.quantity} — Status: <strong>${o.status}</strong></div>
      </div>
      <div class="order-actions">
        ${o.status !== 'Delivered' ? `<button class="btn-deliver">Mark Delivered</button>` : `<span class="small">Completed</span>`}
      </div>
    `;
    list.appendChild(div);

    const btn = div.querySelector(".btn-deliver");
    if (btn) {
      btn.addEventListener("click", () => {
        updateOrder(o.id, { status: "Delivered" });
        renderDeliveryOrders();
        renderVendorOrders();
      });
    }
  });
}

// ========== initialize UI ==========
updateAuthArea();
showSection("home");

// Optional: seed demo users for easier testing if no users exist
(function seedDemo() {
  const users = load(STORAGE.USERS) || [];
  if (users.length === 0) {
    users.push({ username: "alice", password: "alice123", role: "customer", name: "Alice" });
    users.push({ username: "vendor", password: "vendor123", role: "vendor", name: "ZAR Admin" });
    users.push({ username: "baba", password: "baba123", role: "delivery", name: "Baba Delivery" });
    save(STORAGE.USERS, users);
    console.log("Demo users created: alice/vendor/baba (passwords identical)");
  }
})();
