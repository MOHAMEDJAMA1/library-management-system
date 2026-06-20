from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List

# User Schemas
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: str  # Administrator, Librarian, Student

class UserLogin(BaseModel):
    email_or_username: str
    password: str

class UserResponse(BaseModel):
    user_id: int
    username: str
    email: str
    role: str

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


# Book Schemas
class BookCreate(BaseModel):
    isbn: str
    title: str
    author: str
    publisher: str
    publication_year: int
    image_url: Optional[str] = None

class BookUpdate(BaseModel):
    title: Optional[str] = None
    author: Optional[str] = None
    publisher: Optional[str] = None
    publication_year: Optional[int] = None
    image_url: Optional[str] = None

class BookResponse(BaseModel):
    isbn: str
    title: str
    author: str
    publisher: str
    publication_year: int
    image_url: Optional[str] = None
    is_available: bool = True

    class Config:
        from_attributes = True


# Borrow Schemas
class BorrowCreate(BaseModel):
    isbn: str
    user_id: Optional[int] = None  # Admin/Librarian can specify user_id, Student defaults to self

class BorrowResponse(BaseModel):
    transaction_id: int
    user_id: int
    isbn: str
    borrow_date: datetime
    due_date: datetime
    return_date: Optional[datetime] = None
    status: str
    book_title: Optional[str] = None
    username: Optional[str] = None

    class Config:
        from_attributes = True


# Reservation Schemas
class ReservationCreate(BaseModel):
    isbn: str
    user_id: Optional[int] = None  # Optional, can be specified by admin/librarian

class ReservationResponse(BaseModel):
    reservation_id: int
    user_id: int
    isbn: str
    reservation_date: datetime
    status: str
    book_title: Optional[str] = None
    username: Optional[str] = None

    class Config:
        from_attributes = True


# Report Schemas
class PopularBookReport(BaseModel):
    isbn: str
    title: str
    author: str
    borrow_count: int

class ActiveUserReport(BaseModel):
    user_id: int
    username: str
    email: str
    borrow_count: int

class OverdueBookReport(BaseModel):
    transaction_id: int
    isbn: str
    title: str
    username: str
    due_date: datetime
    days_overdue: int

class MonthlyBorrowReport(BaseModel):
    month: str  # YYYY-MM
    borrow_count: int

class LibraryReports(BaseModel):
    most_borrowed_books: List[PopularBookReport]
    active_users: List[ActiveUserReport]
    borrowed_books_count: int
    overdue_books: List[OverdueBookReport]
    monthly_borrowing_statistics: List[MonthlyBorrowReport]
