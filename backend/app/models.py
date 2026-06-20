from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base

class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True)
    username = Column(String(150), unique=True, index=True, nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False)  # Administrator, Librarian, Student

    transactions = relationship("BorrowTransaction", back_populates="user")
    reservations = relationship("Reservation", back_populates="user")


class Book(Base):
    __tablename__ = "books"

    isbn = Column(String(20), primary_key=True, index=True)
    title = Column(String(500), index=True, nullable=False)
    author = Column(String(255), index=True, nullable=False)
    publisher = Column(String(255), nullable=False)
    publication_year = Column(Integer, nullable=False)
    image_url = Column(String(500), nullable=True)

    transactions = relationship("BorrowTransaction", back_populates="book")
    reservations = relationship("Reservation", back_populates="book")


class BorrowTransaction(Base):
    __tablename__ = "borrow_transactions"

    transaction_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    isbn = Column(String(20), ForeignKey("books.isbn", ondelete="CASCADE"), nullable=False)
    borrow_date = Column(DateTime, nullable=False)
    due_date = Column(DateTime, nullable=False)
    return_date = Column(DateTime, nullable=True)
    status = Column(String(50), nullable=False)  # BORROWED, RETURNED, OVERDUE

    user = relationship("User", back_populates="transactions")
    book = relationship("Book", back_populates="transactions")


class Reservation(Base):
    __tablename__ = "reservations"

    reservation_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    isbn = Column(String(20), ForeignKey("books.isbn", ondelete="CASCADE"), nullable=False)
    reservation_date = Column(DateTime, nullable=False)
    status = Column(String(50), nullable=False)  # PENDING, FULFILLED, CANCELLED

    user = relationship("User", back_populates="reservations")
    book = relationship("Book", back_populates="reservations")
