from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from .routes import books, users, transactions, reports
from .seed import seed_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Run database tables initialization and seeding on startup
    print("Starting app... Running database seeding...")
    seed_db()
    yield
    print("Shutting down app...")

app = FastAPI(
    title="Library Management System REST API",
    description="A comprehensive REST API to manage library books, users, borrows, reservations, and reports.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(users.router)
app.include_router(books.router)
# Transactions router has paths like /borrow, /return which are in root
app.include_router(transactions.router)
app.include_router(reports.router)

@app.get("/")
def read_root():
    return {
        "message": "Welcome to the Library Management System API",
        "documentation": "/docs"
    }
