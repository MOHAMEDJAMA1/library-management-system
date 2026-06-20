from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, text
from datetime import datetime
from typing import List
from ..database import get_db
from ..models import Book, BorrowTransaction, User, Reservation
from ..schemas import LibraryReports, PopularBookReport, ActiveUserReport, OverdueBookReport, MonthlyBorrowReport
from ..auth import RoleChecker, get_current_user

router = APIRouter(prefix="/reports", tags=["Reports & Analytics"])

@router.get("", response_model=LibraryReports)
def get_reports(
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["Administrator", "Librarian"]))
):
    now = datetime.utcnow()

    # 1. Most Borrowed Books (Top 10)
    popular_books_query = db.query(
        Book.isbn,
        Book.title,
        Book.author,
        func.count(BorrowTransaction.transaction_id).label("borrow_count")
    ).join(
        BorrowTransaction, Book.isbn == BorrowTransaction.isbn
    ).group_by(
        Book.isbn, Book.title, Book.author
    ).order_by(
        desc("borrow_count")
    ).limit(10).all()

    popular_books = [
        PopularBookReport(
            isbn=r[0],
            title=r[1],
            author=r[2],
            borrow_count=r[3]
        ) for r in popular_books_query
    ]

    # 2. Active Users (Top 10)
    active_users_query = db.query(
        User.user_id,
        User.username,
        User.email,
        func.count(BorrowTransaction.transaction_id).label("borrow_count")
    ).join(
        BorrowTransaction, User.user_id == BorrowTransaction.user_id
    ).group_by(
        User.user_id, User.username, User.email
    ).order_by(
        desc("borrow_count")
    ).limit(10).all()

    active_users = [
        ActiveUserReport(
            user_id=r[0],
            username=r[1],
            email=r[2],
            borrow_count=r[3]
        ) for r in active_users_query
    ]

    # 3. Borrowed Books count (currently borrowed)
    borrowed_books_count = db.query(BorrowTransaction).filter(
        BorrowTransaction.return_date == None,
        BorrowTransaction.status == "BORROWED"
    ).count()

    # 4. Overdue Books
    # Update overdue status in db for transactions past due date
    overdue_txs = db.query(BorrowTransaction).filter(
        BorrowTransaction.return_date == None,
        BorrowTransaction.due_date < now
    ).all()
    for tx in overdue_txs:
        tx.status = "OVERDUE"
    if overdue_txs:
        db.commit()

    overdue_query = db.query(
        BorrowTransaction.transaction_id,
        BorrowTransaction.isbn,
        Book.title,
        User.username,
        BorrowTransaction.due_date
    ).join(
        Book, BorrowTransaction.isbn == Book.isbn
    ).join(
        User, BorrowTransaction.user_id == User.user_id
    ).filter(
        BorrowTransaction.status == "OVERDUE",
        BorrowTransaction.return_date == None
    ).all()

    overdue_books = []
    for r in overdue_query:
        due = r[4]
        days = (now - due).days
        overdue_books.append(
            OverdueBookReport(
                transaction_id=r[0],
                isbn=r[1],
                title=r[2],
                username=r[3],
                due_date=due,
                days_overdue=max(0, days)
            )
        )

    # 5. Monthly Borrowing Statistics
    # Check database dialect to group by month properly
    dialect = db.bind.dialect.name
    if dialect == "sqlite":
        month_expr = func.strftime("%Y-%m", BorrowTransaction.borrow_date)
    else:  # postgresql
        month_expr = func.to_char(BorrowTransaction.borrow_date, "YYYY-MM")

    monthly_stats_query = db.query(
        month_expr.label("month"),
        func.count(BorrowTransaction.transaction_id).label("borrow_count")
    ).group_by(
        text("month")
    ).order_by(
        text("month")
    ).all()

    monthly_stats = [
        MonthlyBorrowReport(
            month=r[0] if r[0] else "Unknown",
            borrow_count=r[1]
        ) for r in monthly_stats_query
    ]

    return LibraryReports(
        most_borrowed_books=popular_books,
        active_users=active_users,
        borrowed_books_count=borrowed_books_count,
        overdue_books=overdue_books,
        monthly_borrowing_statistics=monthly_stats
    )
