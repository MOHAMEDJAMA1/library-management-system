# Aether Library Management System

A complete, full-stack Library Management System (LMS) developed as a university project for **WEX 328 – Work Experience Spring Term**. 

The system allows librarians, administrators, and students to manage books, borrowing transactions, reservations, and user accounts through an interactive, glassmorphic web application. It integrates the canonical Kaggle/Freiburg Book-Crossing dataset as its initial library inventory.

---

## 🚀 Quick Start & Installation

You can run the application in two ways: **Option A (Locally with SQLite)** or **Option B (Docker Containers)**.

### Option A: Local Run (SQLite + Python Virtual Environment)

#### 1. Backend Setup:
Navigate to the `backend` directory, create a virtual environment, and install dependencies:
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Initialize and seed the database (this will download, clean, and bulk-load 50,000 books from the Kaggle dataset, and register default demo accounts):
```bash
python -m app.seed
```

Start the FastAPI backend server:
```bash
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
*The interactive API Swagger docs will be available at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).*

#### 2. Frontend Setup:
Serve the static frontend folder:
```bash
cd ../frontend
python3 -m http.server 8080
```
Open your browser and navigate to **[http://localhost:8080](http://localhost:8080)**.

---

### Option B: Docker Container Run (PostgreSQL + Nginx + FastAPI)

Make sure you have Docker and Docker Compose installed, then run the following in the project root directory:
```bash
docker-compose up -d --build
```
This automatically boots:
1. **`db`**: A PostgreSQL 16 database.
2. **`backend`**: The FastAPI REST API (listening on port `8000`).
3. **`frontend`**: An Nginx container serving the web application (listening on port `80`).

Access the web interface at **[http://localhost](http://localhost)**.

---

## 🔑 Demo Login Accounts

Use these pre-configured user accounts to log in and test different authorization levels:

| Role | Username | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin` | `adminpass` | Full CRUD, user management, and reporting analytics |
| **Librarian** | `librarian` | `libpass` | Book CRUD, issuing borrows, processing returns, and analytics |
| **Student** | `student` | `studentpass` | Browsing catalog, borrowing books, and creating reservations |

---

## 📊 Database Design & Tables

The database consists of 4 core tables:

1. **`books`**:
   - `isbn` (VARCHAR, Primary Key) - Book identifier.
   - `title` (VARCHAR) - Book Title.
   - `author` (VARCHAR) - Author Name.
   - `publisher` (VARCHAR) - Publisher Name.
   - `publication_year` (INTEGER) - Year of Publication.
   - `image_url` (VARCHAR) - Cover image link.

2. **`users`**:
   - `user_id` (INTEGER, Primary Key) - Auto-incrementing identifier.
   - `username` (VARCHAR, Unique) - Username.
   - `email` (VARCHAR, Unique) - Email address.
   - `password_hash` (VARCHAR) - Secure hashed password using standard `bcrypt`.
   - `role` (VARCHAR) - System role (`Administrator`, `Librarian`, `Student`).

3. **`borrow_transactions`**:
   - `transaction_id` (INTEGER, Primary Key) - Auto-incrementing transaction log.
   - `user_id` (INTEGER, Foreign Key -> `users`) - Borrower.
   - `isbn` (VARCHAR, Foreign Key -> `books`) - Borrowed book.
   - `borrow_date` (DATETIME) - Borrow timestamp.
   - `due_date` (DATETIME) - Expected return date (default 14 days).
   - `return_date` (DATETIME, Nullable) - Return timestamp.
   - `status` (VARCHAR) - Status (`BORROWED`, `RETURNED`, `OVERDUE`).

4. **`reservations`**:
   - `reservation_id` (INTEGER, Primary Key) - Auto-incrementing reservation identifier.
   - `user_id` (INTEGER, Foreign Key -> `users`) - Reserving student.
   - `isbn` (VARCHAR, Foreign Key -> `books`) - Reserved book.
   - `reservation_date` (DATETIME) - Reservation timestamp.
   - `status` (VARCHAR) - Status (`PENDING`, `FULFILLED`, `CANCELLED`).

---

## 💡 Key Functionalities Implemented

- **Authentication & Security:** Register/Login/Logout interfaces with secure passwords hashed via native `bcrypt`. Role-based access control enforces menu view options.
- **Dynamic Book Catalog:** Sourced from the real Kaggle/Freiburg Book-Crossing dataset. Offers real-time pagination, instant search filtering, and live cover renders.
- **Borrow & Return System:** Tracks due dates, flags overdue books automatically, and allows students to borrow/return books or librarians to manually issue/return books.
- **Reservation Engine:** Prevents duplicate reservations and lets students queue for unavailable books, transitioning status once the book is returned.
- **Reporting & Analytics Dashboard:** Accessible to Librarians and Admins, presenting statistics on:
  - Top 10 most borrowed books.
  - Top 10 most active users.
  - Live count of currently borrowed books.
  - Interactive table of all overdue books (with calculated days-overdue).
  - Monthly borrowing bar statistics.
- **Accessible Aesthetics:** Built with a premium, glassmorphic interface, dark/light theme switching using CSS variables, an 8px layout grid, and `@media (prefers-reduced-motion)` safety limits.
