// Library Management System - Frontend App Controller

const API_BASE_URL = "http://127.0.0.1:8000";

// App State
const state = {
  token: localStorage.getItem("token") || null,
  user: null,
  currentPage: "catalog",
  catalogPage: 1,
  catalogSearch: "",
  managementSearch: ""
};

// UI Selectors
const DOM = {
  // Navigation
  navCatalog: document.getElementById("nav-catalog"),
  navDashboard: document.getElementById("nav-dashboard"),
  navManagement: document.getElementById("nav-management"),
  navReports: document.getElementById("nav-reports"),
  themeBtn: document.getElementById("theme-btn"),
  userProfileSection: document.getElementById("user-profile-section"),
  loginBtn: document.getElementById("login-btn"),
  
  // Views
  viewCatalog: document.getElementById("view-catalog"),
  viewDashboard: document.getElementById("view-dashboard"),
  viewManagement: document.getElementById("view-management"),
  viewReports: document.getElementById("view-reports"),
  
  // Catalog
  booksGrid: document.getElementById("books-grid"),
  searchForm: document.getElementById("search-form"),
  searchInput: document.getElementById("search-input"),
  prevPage: document.getElementById("prev-page"),
  nextPage: document.getElementById("next-page"),
  pageNum: document.getElementById("page-num"),
  
  // Dashboard
  dashboardBorrowCount: document.getElementById("dashboard-borrow-count"),
  dashboardResCount: document.getElementById("dashboard-res-count"),
  dashboardOverdueCount: document.getElementById("dashboard-overdue-count"),
  borrowsTbody: document.getElementById("borrows-tbody"),
  reservationsTbody: document.getElementById("reservations-tbody"),
  
  // Management
  addBookBtn: document.getElementById("add-book-btn"),
  tabManageBooks: document.getElementById("tab-manage-books"),
  tabManageUsers: document.getElementById("tab-manage-users"),
  tabManageBorrows: document.getElementById("tab-manage-borrows"),
  contentManageBooks: document.getElementById("content-manage-books"),
  contentManageUsers: document.getElementById("content-manage-users"),
  contentManageBorrows: document.getElementById("content-manage-borrows"),
  manageBooksTbody: document.getElementById("manage-books-tbody"),
  manageUsersTbody: document.getElementById("manage-users-tbody"),
  manageSearchForm: document.getElementById("manage-search-form"),
  manageSearchInput: document.getElementById("manage-search-input"),
  issueBookForm: document.getElementById("issue-book-form"),
  manualReturnForm: document.getElementById("manual-return-form"),
  
  // Reports
  reportBorrowedCount: document.getElementById("report-borrowed-count"),
  reportOverdueCount: document.getElementById("report-overdue-count"),
  reportPopularBooks: document.getElementById("report-popular-books"),
  reportActiveUsers: document.getElementById("report-active-users"),
  reportOverdueBooksDetails: document.getElementById("report-overdue-books-details"),
  reportMonthlyStats: document.getElementById("report-monthly-stats"),

  // Modals
  authDialog: document.getElementById("auth-dialog"),
  closeAuthDialog: document.getElementById("close-auth-dialog"),
  tabLogin: document.getElementById("tab-login"),
  tabRegister: document.getElementById("tab-register"),
  loginForm: document.getElementById("login-form"),
  registerForm: document.getElementById("register-form"),
  
  bookDialog: document.getElementById("book-dialog"),
  closeBookDialog: document.getElementById("close-book-dialog"),
  bookCrudForm: document.getElementById("book-crud-form"),
  bookDialogTitle: document.getElementById("book-dialog-title"),
  saveBookBtn: document.getElementById("save-book-btn"),
  
  alertContainer: document.getElementById("alert-container")
};

// --- INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  setupEventListeners();
  checkAuthSession();
  fetchCatalog();
});

// --- THEME MANAGEMENT ---
function initTheme() {
  const savedTheme = localStorage.getItem("theme") || "light";
  document.documentElement.setAttribute("data-theme", savedTheme);
}

DOM.themeBtn.addEventListener("click", () => {
  const currentTheme = document.documentElement.getAttribute("data-theme");
  const newTheme = currentTheme === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", newTheme);
  localStorage.setItem("theme", newTheme);
});

// --- ALERT SYSTEM ---
function showAlert(message, type = "success") {
  const alert = document.createElement("div");
  alert.className = `alert alert-${type} glass`;
  
  alert.innerHTML = `
    <span>${message}</span>
    <button type="button" class="close-dialog-btn" style="font-size: 1.25rem; margin-left: 16px;" onclick="this.parentElement.remove()">&times;</button>
  `;
  
  DOM.alertContainer.appendChild(alert);
  
  // Automatically clear alert after 5 seconds
  setTimeout(() => {
    alert.remove();
  }, 5000);
}

// --- DIALOG FALLBACKS (LIGHT DISMISS FOR SAFARI) ---
function registerDialogFallback(dialogEl) {
  if (!('closedBy' in HTMLDialogElement.prototype)) {
    dialogEl.addEventListener('click', (event) => {
      if (event.target !== dialogEl) return;
      const rect = dialogEl.getBoundingClientRect();
      const isDialogContent = (
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width
      );
      if (!isDialogContent) {
        dialogEl.close();
      }
    });
  }
}
registerDialogFallback(DOM.authDialog);
registerDialogFallback(DOM.bookDialog);

// --- NAVIGATION / VIEW ROUTING ---
function navigateTo(viewId) {
  state.currentPage = viewId;
  
  // Toggle nav buttons active state
  [DOM.navCatalog, DOM.navDashboard, DOM.navManagement, DOM.navReports].forEach(btn => {
    btn.classList.remove("active");
  });
  
  // Toggle section visibility
  [DOM.viewCatalog, DOM.viewDashboard, DOM.viewManagement, DOM.viewReports].forEach(section => {
    section.classList.remove("active");
  });

  if (viewId === "catalog") {
    DOM.navCatalog.classList.add("active");
    DOM.viewCatalog.classList.add("active");
    fetchCatalog();
  } else if (viewId === "dashboard") {
    DOM.navDashboard.classList.add("active");
    DOM.viewDashboard.classList.add("active");
    fetchDashboardData();
  } else if (viewId === "management") {
    DOM.navManagement.classList.add("active");
    DOM.viewManagement.classList.add("active");
    loadManagementTab("books");
  } else if (viewId === "reports") {
    DOM.navReports.classList.add("active");
    DOM.viewReports.classList.add("active");
    fetchReports();
  }
}

// --- EVENT LISTENERS ---
function setupEventListeners() {
  // Navigation Links
  DOM.navCatalog.addEventListener("click", () => navigateTo("catalog"));
  DOM.navDashboard.addEventListener("click", () => navigateTo("dashboard"));
  DOM.navManagement.addEventListener("click", () => navigateTo("management"));
  DOM.navReports.addEventListener("click", () => navigateTo("reports"));
  
  // Auth Trigger
  DOM.loginBtn.addEventListener("click", () => {
    DOM.authDialog.showModal();
    toggleAuthTab("login");
  });
  
  DOM.closeAuthDialog.addEventListener("click", () => DOM.authDialog.close());
  DOM.closeBookDialog.addEventListener("click", () => DOM.bookDialog.close());

  // Modal Auth tabs
  DOM.tabLogin.addEventListener("click", () => toggleAuthTab("login"));
  DOM.tabRegister.addEventListener("click", () => toggleAuthTab("register"));
  
  // Forms Submit
  DOM.loginForm.addEventListener("submit", handleLogin);
  DOM.registerForm.addEventListener("submit", handleRegister);
  DOM.searchForm.addEventListener("submit", handleSearch);
  DOM.bookCrudForm.addEventListener("submit", handleBookSave);
  
  // Pagination
  DOM.prevPage.addEventListener("click", () => {
    if (state.catalogPage > 1) {
      state.catalogPage--;
      fetchCatalog();
    }
  });
  DOM.nextPage.addEventListener("click", () => {
    state.catalogPage++;
    fetchCatalog();
  });

  // Management controls
  DOM.addBookBtn.addEventListener("click", openAddBookModal);
  DOM.tabManageBooks.addEventListener("click", () => loadManagementTab("books"));
  DOM.tabManageUsers.addEventListener("click", () => loadManagementTab("users"));
  DOM.tabManageBorrows.addEventListener("click", () => loadManagementTab("borrows"));

  DOM.manageSearchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    state.managementSearch = document.getElementById("manage-search-input").value;
    fetchManagementBooks();
  });

  DOM.issueBookForm.addEventListener("submit", handleIssueBook);
  DOM.manualReturnForm.addEventListener("submit", handleManualReturn);
}

// --- AUTHENTICATION ACTIONS ---
function checkAuthSession() {
  if (!state.token) {
    updateUIForGuest();
    return;
  }
  
  fetch(`${API_BASE_URL}/users/me`, {
    headers: { "Authorization": `Bearer ${state.token}` }
  })
  .then(res => {
    if (res.status === 401) {
      // Token expired or invalid
      logout();
      throw new Error("Session expired");
    }
    return res.json();
  })
  .then(user => {
    state.user = user;
    updateUIForUser(user);
  })
  .catch(err => {
    console.warn("Auth check failed:", err.message);
  });
}

function updateUIForGuest() {
  DOM.loginBtn.style.display = "block";
  DOM.userProfileSection.innerHTML = `
    <button type="button" class="btn btn-primary btn-auth" id="login-btn">Sign In</button>
  `;
  document.getElementById("login-btn").addEventListener("click", () => {
    DOM.authDialog.showModal();
    toggleAuthTab("login");
  });

  // Hide nav controls restricted to logged-in roles
  document.querySelectorAll(".auth-only").forEach(el => el.style.display = "none");
  DOM.navDashboard.parentElement.style.display = "none";
  DOM.navManagement.parentElement.style.display = "none";
  DOM.navReports.parentElement.style.display = "none";
  
  navigateTo("catalog");
}

function updateUIForUser(user) {
  // Show navigation links based on role
  DOM.navDashboard.parentElement.style.display = "none";
  DOM.navManagement.parentElement.style.display = "none";
  DOM.navReports.parentElement.style.display = "none";

  if (user.role === "Student") {
    DOM.navDashboard.parentElement.style.display = "block";
  } else if (user.role === "Librarian" || user.role === "Administrator") {
    DOM.navManagement.parentElement.style.display = "block";
    DOM.navReports.parentElement.style.display = "block";
  }

  // Set Profile header section
  DOM.userProfileSection.innerHTML = `
    <div class="user-profile-badge glass">
      <span class="user-name">${user.username} <span class="user-role">${user.role}</span></span>
      <button type="button" class="btn btn-secondary btn-auth" id="logout-btn" style="padding: 6px 12px; font-size: 0.8rem; margin-left: 8px;">Sign Out</button>
    </div>
  `;
  document.getElementById("logout-btn").addEventListener("click", logout);
}

function logout() {
  state.token = null;
  state.user = null;
  localStorage.removeItem("token");
  updateUIForGuest();
  showAlert("Signed out successfully.", "success");
}

function toggleAuthTab(tab) {
  if (tab === "login") {
    DOM.tabLogin.classList.add("active");
    DOM.tabRegister.classList.remove("active");
    DOM.loginForm.classList.add("active");
    DOM.registerForm.classList.remove("active");
  } else {
    DOM.tabLogin.classList.remove("active");
    DOM.tabRegister.classList.add("active");
    DOM.loginForm.classList.remove("active");
    DOM.registerForm.classList.add("active");
  }
}

function handleLogin(e) {
  e.preventDefault();
  const email_or_username = document.getElementById("login-user").value;
  const password = document.getElementById("login-pass").value;

  fetch(`${API_BASE_URL}/users/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email_or_username, password })
  })
  .then(res => {
    if (!res.ok) throw new Error("Invalid username/email or password");
    return res.json();
  })
  .then(data => {
    state.token = data.access_token;
    state.user = data.user;
    localStorage.setItem("token", data.access_token);
    
    updateUIForUser(data.user);
    DOM.authDialog.close();
    DOM.loginForm.reset();
    
    showAlert(`Welcome back, ${data.user.username}!`, "success");
    navigateTo("catalog");
  })
  .catch(err => {
    showAlert(err.message, "danger");
  });
}

function handleRegister(e) {
  e.preventDefault();
  const username = document.getElementById("reg-user").value;
  const email = document.getElementById("reg-email").value;
  const password = document.getElementById("reg-pass").value;
  const role = document.getElementById("reg-role").value;

  fetch(`${API_BASE_URL}/users/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password, role })
  })
  .then(res => {
    if (!res.ok) return res.json().then(e => { throw new Error(e.detail || "Registration failed") });
    return res.json();
  })
  .then(user => {
    showAlert("Registration successful! You can now log in.", "success");
    toggleAuthTab("login");
    // Pre-fill username
    document.getElementById("login-user").value = user.username;
    document.getElementById("login-pass").focus();
    DOM.registerForm.reset();
  })
  .catch(err => {
    showAlert(err.message, "danger");
  });
}

// --- CATALOG MANAGEMENT ACTIONS ---
function handleSearch(e) {
  e.preventDefault();
  state.catalogSearch = DOM.searchInput.value;
  state.catalogPage = 1;
  fetchCatalog();
}

function fetchCatalog() {
  DOM.booksGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 48px; color: var(--text-secondary);">Loading catalog...</div>`;
  
  let url = `${API_BASE_URL}/books?page=${state.catalogPage}&limit=28`;
  if (state.catalogSearch) {
    url += `&q=${encodeURIComponent(state.catalogSearch)}`;
  }
  
  fetch(url)
  .then(res => res.json())
  .then(books => {
    DOM.pageNum.textContent = `Page ${state.catalogPage}`;
    DOM.prevPage.disabled = state.catalogPage === 1;
    DOM.nextPage.disabled = books.length < 28;

    if (books.length === 0) {
      DOM.booksGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 48px; color: var(--text-secondary);">No books found matching search terms.</div>`;
      return;
    }
    
    renderCatalogGrid(books);
  })
  .catch(err => {
    console.error("Error fetching catalog:", err);
    DOM.booksGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 48px; color: var(--danger);">Failed to load books catalog.</div>`;
  });
}

function renderCatalogGrid(books) {
  DOM.booksGrid.innerHTML = "";
  
  books.forEach(b => {
    const card = document.createElement("article");
    card.className = "card glass";
    
    // Status Badge
    const statusText = b.is_available ? "Available" : "Unavailable";
    const statusClass = b.is_available ? "available" : "unavailable";
    
    // Handle image covers (showing a fallback if URL is empty or dead)
    let coverHtml = `
      <div class="card-image-fallback" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/>
        </svg>
        <span style="font-size: 0.75rem;">No Image Available</span>
      </div>
    `;
    
    if (b.image_url && b.image_url.trim() !== "" && !b.image_url.includes("images.amazon.com/images/P/")) {
      // filter out generic broken Amazon URLs
      coverHtml = `<img class="card-image" src="${b.image_url}" alt="Book cover of ${b.title}" onerror="this.outerHTML=this.dataset.fallback" data-fallback='${coverHtml.replace(/'/g, "&apos;")}' loading="lazy">`;
    } else if (b.image_url) {
      // Sometimes raw http amazon URLs are blocked or dead, but let's try displaying them
      coverHtml = `<img class="card-image" src="${b.image_url}" alt="Book cover of ${b.title}" onerror="this.parentElement.innerHTML=\`<div class=&quot;card-image-fallback&quot;><svg viewBox=&quot;0 0 24 24&quot; width=&quot;48&quot; height=&quot;48&quot; fill=&quot;none&quot; stroke=&quot;currentColor&quot; stroke-width=&quot;1.5&quot; stroke-linecap=&quot;round&quot; stroke-linejoin=&quot;round&quot;><path d=&quot;M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z&quot;/></svg><span style=&quot;font-size: 0.75rem;&quot;>No Image</span></div>\`" loading="lazy">`;
    }

    // Action buttons depending on state and user
    let actionBtnHtml = "";
    if (state.user && state.user.role === "Student") {
      if (b.is_available) {
        actionBtnHtml = `<button type="button" class="btn btn-primary" onclick="borrowBook('${b.isbn}')">Borrow</button>`;
      } else {
        actionBtnHtml = `<button type="button" class="btn btn-secondary" onclick="reserveBook('${b.isbn}')">Reserve</button>`;
      }
    } else if (!state.user) {
      actionBtnHtml = `<button type="button" class="btn btn-secondary" onclick="DOM.authDialog.showModal()">Login to Borrow</button>`;
    }
    
    card.innerHTML = `
      <div class="card-image-container">
        ${coverHtml}
        <span class="card-tag ${statusClass}">${statusText}</span>
      </div>
      <div class="card-content">
        <h2 class="card-title" title="${b.title}">${b.title}</h2>
        <p class="card-author">By ${b.author}</p>
        <div class="card-meta">
          <span>ISBN: ${b.isbn}</span>
          <span>${b.publication_year !== 0 ? b.publication_year : "N/A"}</span>
        </div>
        ${actionBtnHtml ? `<div class="card-actions">${actionBtnHtml}</div>` : ""}
      </div>
    `;
    DOM.booksGrid.appendChild(card);
  });
}

// --- BORROW & RESERVATION INTERACTIONS ---
window.borrowBook = function(isbn) {
  if (!state.token) return;
  
  fetch(`${API_BASE_URL}/borrow`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${state.token}`
    },
    body: JSON.stringify({ isbn })
  })
  .then(res => {
    if (!res.ok) return res.json().then(e => { throw new Error(e.detail || "Borrow request failed") });
    return res.json();
  })
  .then(data => {
    showAlert(`Successfully borrowed: "${data.book_title}". Due back in 14 days!`, "success");
    fetchCatalog();
  })
  .catch(err => {
    showAlert(err.message, "danger");
  });
};

window.reserveBook = function(isbn) {
  if (!state.token) return;

  fetch(`${API_BASE_URL}/reserve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${state.token}`
    },
    body: JSON.stringify({ isbn })
  })
  .then(res => {
    if (!res.ok) return res.json().then(e => { throw new Error(e.detail || "Reservation request failed") });
    return res.json();
  })
  .then(data => {
    showAlert(`Successfully reserved: "${data.book_title}". You will be notified when it becomes available!`, "success");
    fetchCatalog();
  })
  .catch(err => {
    showAlert(err.message, "danger");
  });
};

// --- STUDENT DASHBOARD DATA ---
function fetchDashboardData() {
  if (!state.token) return;

  // Active Borrows History
  fetch(`${API_BASE_URL}/transactions/history`, {
    headers: { "Authorization": `Bearer ${state.token}` }
  })
  .then(res => res.json())
  .then(borrows => {
    // Filter active borrows (where return_date is null)
    const activeBorrows = borrows.filter(tx => tx.return_date === null);
    DOM.dashboardBorrowCount.textContent = activeBorrows.length;
    
    // Check overdue
    const overdueCount = activeBorrows.filter(tx => tx.status === "OVERDUE").length;
    DOM.dashboardOverdueCount.textContent = overdueCount;

    // Render Borrows
    DOM.borrowsTbody.innerHTML = "";
    if (activeBorrows.length === 0) {
      DOM.borrowsTbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-secondary);">You have no active borrowings.</td></tr>`;
    } else {
      activeBorrows.forEach(tx => {
        const tr = document.createElement("tr");
        const statusClass = tx.status.toLowerCase();
        
        tr.innerHTML = `
          <td><strong>${tx.book_title}</strong></td>
          <td>${tx.isbn}</td>
          <td>${new Date(tx.borrow_date).toLocaleDateString()}</td>
          <td>${new Date(tx.due_date).toLocaleDateString()}</td>
          <td><span class="status-pill ${statusClass}">${tx.status}</span></td>
          <td>
            <button type="button" class="btn btn-secondary" style="padding: 6px 12px; font-size: 0.8rem;" onclick="returnBook('${tx.transaction_id}')">Return Book</button>
          </td>
        `;
        DOM.borrowsTbody.appendChild(tr);
      });
    }
  })
  .catch(err => console.error("Error dashboard borrows:", err));

  // Active Reservations
  fetch(`${API_BASE_URL}/reservations/history`, {
    headers: { "Authorization": `Bearer ${state.token}` }
  })
  .then(res => res.json())
  .then(reservations => {
    const activeRes = reservations.filter(r => r.status === "PENDING");
    DOM.dashboardResCount.textContent = activeRes.length;

    DOM.reservationsTbody.innerHTML = "";
    if (activeRes.length === 0) {
      DOM.reservationsTbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-secondary);">You have no active reservations.</td></tr>`;
    } else {
      activeRes.forEach(r => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><strong>${r.book_title}</strong></td>
          <td>${r.isbn}</td>
          <td>${new Date(r.reservation_date).toLocaleDateString()}</td>
          <td><span class="status-pill pending">${r.status}</span></td>
          <td>
            <button type="button" class="btn btn-danger" style="padding: 6px 12px; font-size: 0.8rem;" onclick="cancelReservation(${r.reservation_id})">Cancel</button>
          </td>
        `;
        DOM.reservationsTbody.appendChild(tr);
      });
    }
  })
  .catch(err => console.error("Error dashboard reservations:", err));
}

window.returnBook = function(transaction_id) {
  fetch(`${API_BASE_URL}/return`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${state.token}`
    },
    body: JSON.stringify({ transaction_id: parseInt(transaction_id) })
  })
  .then(res => {
    if (!res.ok) return res.json().then(e => { throw new Error(e.detail || "Return failed") });
    return res.json();
  })
  .then(data => {
    showAlert(`Successfully returned: "${data.book_title}". Thank you!`, "success");
    fetchDashboardData();
  })
  .catch(err => {
    showAlert(err.message, "danger");
  });
};

window.cancelReservation = function(reservation_id) {
  fetch(`${API_BASE_URL}/reservations/${reservation_id}/cancel`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${state.token}` }
  })
  .then(res => {
    if (!res.ok) throw new Error("Cancellation failed");
    return res.json();
  })
  .then(data => {
    showAlert(`Reservation for "${data.book_title}" has been cancelled.`, "success");
    fetchDashboardData();
  })
  .catch(err => {
    showAlert(err.message, "danger");
  });
};

// --- MANAGEMENT PANEL FUNCTIONS ---
function loadManagementTab(tabName) {
  // Tabs active header
  [DOM.tabManageBooks, DOM.tabManageUsers, DOM.tabManageBorrows].forEach(h => h.classList.remove("active"));
  // Tabs active content
  [DOM.contentManageBooks, DOM.contentManageUsers, DOM.contentManageBorrows].forEach(c => c.classList.remove("active"));

  if (tabName === "books") {
    DOM.tabManageBooks.classList.add("active");
    DOM.contentManageBooks.classList.add("active");
    fetchManagementBooks();
  } else if (tabName === "users") {
    DOM.tabManageUsers.classList.add("active");
    DOM.contentManageUsers.classList.add("active");
    fetchManagementUsers();
  } else if (tabName === "borrows") {
    DOM.tabManageBorrows.classList.add("active");
    DOM.contentManageBorrows.classList.add("active");
  }
}

function fetchManagementBooks() {
  DOM.manageBooksTbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-secondary);">Loading inventory...</td></tr>`;
  
  let url = `${API_BASE_URL}/books?page=1&limit=30`;
  if (state.managementSearch) {
    url += `&q=${encodeURIComponent(state.managementSearch)}`;
  }

  fetch(url)
  .then(res => res.json())
  .then(books => {
    DOM.manageBooksTbody.innerHTML = "";
    if (books.length === 0) {
      DOM.manageBooksTbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-secondary);">No records found.</td></tr>`;
      return;
    }
    
    books.forEach(b => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${b.title}</strong></td>
        <td>${b.author}</td>
        <td><code>${b.isbn}</code></td>
        <td>${b.publisher}</td>
        <td>${b.publication_year !== 0 ? b.publication_year : "N/A"}</td>
        <td style="white-space: nowrap;">
          <button type="button" class="btn btn-secondary" style="padding: 6px 12px; font-size: 0.8rem; margin-right: 4px;" onclick="openEditBookModal('${b.isbn}')">Edit</button>
          <button type="button" class="btn btn-danger" style="padding: 6px 12px; font-size: 0.8rem;" onclick="deleteBook('${b.isbn}')">Delete</button>
        </td>
      `;
      DOM.manageBooksTbody.appendChild(tr);
    });
  })
  .catch(err => {
    console.error("Error manage books:", err);
    DOM.manageBooksTbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--danger);">Failed to load inventory.</td></tr>`;
  });
}

function fetchManagementUsers() {
  DOM.manageUsersTbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-secondary);">Loading accounts...</td></tr>`;

  fetch(`${API_BASE_URL}/users`, {
    headers: { "Authorization": `Bearer ${state.token}` }
  })
  .then(res => res.json())
  .then(users => {
    DOM.manageUsersTbody.innerHTML = "";
    users.forEach(u => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${u.user_id}</td>
        <td><strong>${u.username}</strong></td>
        <td>${u.email}</td>
        <td><span class="status-pill borrowed">${u.role}</span></td>
      `;
      DOM.manageUsersTbody.appendChild(tr);
    });
  })
  .catch(err => {
    console.error("Error manage users:", err);
    DOM.manageUsersTbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--danger);">Failed to load accounts.</td></tr>`;
  });
}

// --- BOOK CRUD ACTIONS ---
let editingIsbn = null;

function openAddBookModal() {
  editingIsbn = null;
  DOM.bookDialogTitle.textContent = "Add New Book to Inventory";
  DOM.saveBookBtn.textContent = "Add Book";
  DOM.bookCrudForm.reset();
  document.getElementById("book-isbn").disabled = false;
  DOM.bookDialog.showModal();
}

window.openEditBookModal = function(isbn) {
  editingIsbn = isbn;
  DOM.bookDialogTitle.textContent = "Edit Book Details";
  DOM.saveBookBtn.textContent = "Save Changes";
  DOM.bookCrudForm.reset();
  document.getElementById("book-isbn").disabled = true;

  fetch(`${API_BASE_URL}/books/${isbn}`)
  .then(res => res.json())
  .then(b => {
    document.getElementById("book-isbn").value = b.isbn;
    document.getElementById("book-title").value = b.title;
    document.getElementById("book-author").value = b.author;
    document.getElementById("book-publisher").value = b.publisher;
    document.getElementById("book-year").value = b.publication_year;
    document.getElementById("book-image").value = b.image_url || "";
    
    DOM.bookDialog.showModal();
  })
  .catch(err => {
    showAlert("Failed to retrieve book details.", "danger");
  });
};

function handleBookSave(e) {
  e.preventDefault();
  const isbn = document.getElementById("book-isbn").value;
  const title = document.getElementById("book-title").value;
  const author = document.getElementById("book-author").value;
  const publisher = document.getElementById("book-publisher").value;
  const publication_year = parseInt(document.getElementById("book-year").value);
  const image_url = document.getElementById("book-image").value;

  const payload = { title, author, publisher, publication_year, image_url };

  let url = `${API_BASE_URL}/books`;
  let method = "POST";

  if (editingIsbn) {
    url = `${API_BASE_URL}/books/${editingIsbn}`;
    method = "PUT";
  } else {
    payload.isbn = isbn; // Include ISBN for new book creation
  }

  fetch(url, {
    method: method,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${state.token}`
    },
    body: JSON.stringify(payload)
  })
  .then(res => {
    if (!res.ok) return res.json().then(e => { throw new Error(e.detail || "Save failed") });
    return res.json();
  })
  .then(data => {
    showAlert(editingIsbn ? "Book updated successfully." : "Book added successfully.", "success");
    DOM.bookDialog.close();
    fetchManagementBooks();
  })
  .catch(err => {
    showAlert(err.message, "danger");
  });
}

window.deleteBook = function(isbn) {
  if (!confirm("Are you sure you want to permanently delete this book from the catalog?")) return;

  fetch(`${API_BASE_URL}/books/${isbn}`, {
    method: "DELETE",
    headers: { "Authorization": `Bearer ${state.token}` }
  })
  .then(res => {
    if (res.status === 204) {
      showAlert("Book deleted successfully.", "success");
      fetchManagementBooks();
    } else {
      throw new Error("Deletion failed");
    }
  })
  .catch(err => {
    showAlert(err.message, "danger");
  });
};

// --- ISSUE & RETURN MANAGEMENT ACTIONS ---
function handleIssueBook(e) {
  e.preventDefault();
  const isbn = document.getElementById("issue-isbn").value;
  const user_id = parseInt(document.getElementById("issue-userid").value);

  fetch(`${API_BASE_URL}/borrow`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${state.token}`
    },
    body: JSON.stringify({ isbn, user_id })
  })
  .then(res => {
    if (!res.ok) return res.json().then(e => { throw new Error(e.detail || "Failed to issue book") });
    return res.json();
  })
  .then(data => {
    showAlert(`Book successfully issued to user ID ${data.user_id}!`, "success");
    DOM.issueBookForm.reset();
  })
  .catch(err => {
    showAlert(err.message, "danger");
  });
}

function handleManualReturn(e) {
  e.preventDefault();
  const isbn = document.getElementById("return-isbn").value;
  const transaction_id_raw = document.getElementById("return-txid").value;
  
  const payload = {};
  if (transaction_id_raw) {
    payload.transaction_id = parseInt(transaction_id_raw);
  } else if (isbn) {
    payload.isbn = isbn;
  } else {
    showAlert("Please specify either Book ISBN or Transaction ID.", "danger");
    return;
  }

  fetch(`${API_BASE_URL}/return`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${state.token}`
    },
    body: JSON.stringify(payload)
  })
  .then(res => {
    if (!res.ok) return res.json().then(e => { throw new Error(e.detail || "Failed to process return") });
    return res.json();
  })
  .then(data => {
    showAlert(`Book successfully returned! Transaction status marked as: "${data.status}".`, "success");
    DOM.manualReturnForm.reset();
  })
  .catch(err => {
    showAlert(err.message, "danger");
  });
}

// --- REPORTS & STATISTICS ---
function fetchReports() {
  if (!state.token) return;

  fetch(`${API_BASE_URL}/reports`, {
    headers: { "Authorization": `Bearer ${state.token}` }
  })
  .then(res => res.json())
  .then(data => {
    // Main Stats
    DOM.reportBorrowedCount.textContent = data.borrowed_books_count;
    DOM.reportOverdueCount.textContent = data.overdue_books.length;

    // 1. Popular Books
    DOM.reportPopularBooks.innerHTML = "";
    if (data.most_borrowed_books.length === 0) {
      DOM.reportPopularBooks.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-secondary);">No borrowings registered yet.</td></tr>`;
    } else {
      data.most_borrowed_books.forEach(b => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><code>${b.isbn}</code></td>
          <td><strong>${b.title}</strong></td>
          <td>${b.author}</td>
          <td><span class="status-pill fulfilled" style="padding: 4px 8px;">${b.borrow_count} borrows</span></td>
        `;
        DOM.reportPopularBooks.appendChild(tr);
      });
    }

    // 2. Active Users
    DOM.reportActiveUsers.innerHTML = "";
    if (data.active_users.length === 0) {
      DOM.reportActiveUsers.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-secondary);">No active users registered.</td></tr>`;
    } else {
      data.active_users.forEach(u => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${u.user_id}</td>
          <td><strong>${u.username}</strong></td>
          <td>${u.email}</td>
          <td><span class="status-pill borrowed" style="padding: 4px 8px;">${u.borrow_count} times</span></td>
        `;
        DOM.reportActiveUsers.appendChild(tr);
      });
    }

    // 3. Overdue Details
    DOM.reportOverdueBooksDetails.innerHTML = "";
    if (data.overdue_books.length === 0) {
      DOM.reportOverdueBooksDetails.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--success);">Hooray! No overdue books currently.</td></tr>`;
    } else {
      data.overdue_books.forEach(ob => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${ob.transaction_id}</td>
          <td><code>${ob.isbn}</code></td>
          <td><strong>${ob.title}</strong></td>
          <td>${ob.username}</td>
          <td>${new Date(ob.due_date).toLocaleDateString()}</td>
          <td><span class="status-pill overdue">${ob.days_overdue} days</span></td>
        `;
        DOM.reportOverdueBooksDetails.appendChild(tr);
      });
    }

    // 4. Monthly Stats
    DOM.reportMonthlyStats.innerHTML = "";
    if (data.monthly_borrowing_statistics.length === 0) {
      DOM.reportMonthlyStats.innerHTML = `<tr><td colspan="2" style="text-align: center; color: var(--text-secondary);">No monthly data yet.</td></tr>`;
    } else {
      data.monthly_borrowing_statistics.forEach(m => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><strong>${m.month}</strong></td>
          <td>${m.borrow_count} borrows</td>
        `;
        DOM.reportMonthlyStats.appendChild(tr);
      });
    }
  })
  .catch(err => {
    console.error("Error loading reports:", err);
    showAlert("Failed to load library analytics reports.", "danger");
  });
}
