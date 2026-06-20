from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List, Optional
from ..database import get_db
from ..models import Book, BorrowTransaction, Reservation, User
from ..schemas import BorrowCreate, BorrowResponse, ReservationCreate, ReservationResponse
from ..auth import get_current_user, RoleChecker

router = APIRouter(tags=["Transactions & Reservations"])

@router.post("/borrow", response_model=BorrowResponse, status_code=status.HTTP_201_CREATED)
def borrow_book(
    borrow_in: BorrowCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Determine target user_id
    target_user_id = current_user.user_id
    if borrow_in.user_id is not None:
        # Only Admin or Librarian can borrow for another user
        if current_user.role not in ["Administrator", "Librarian"]:
            raise HTTPException(
                status_code=403, 
                detail="Students can only borrow books for themselves."
            )
        target_user_id = borrow_in.user_id
        # Verify target user exists
        target_user = db.query(User).filter(User.user_id == target_user_id).first()
        if not target_user:
            raise HTTPException(status_code=404, detail="Target user not found")

    # Verify book exists
    book = db.query(Book).filter(Book.isbn == borrow_in.isbn).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    # Check if book is already borrowed (active transaction)
    active_borrow = db.query(BorrowTransaction).filter(
        BorrowTransaction.isbn == borrow_in.isbn,
        BorrowTransaction.return_date == None,
        BorrowTransaction.status == "BORROWED"
    ).first()

    if active_borrow:
        raise HTTPException(
            status_code=400, 
            detail="Book is currently unavailable. You can place a reservation instead."
        )

    # Create borrow transaction
    now = datetime.utcnow()
    due = now + timedelta(days=14)
    
    db_transaction = BorrowTransaction(
        user_id=target_user_id,
        isbn=borrow_in.isbn,
        borrow_date=now,
        due_date=due,
        status="BORROWED"
    )
    
    # If the user borrowing has a pending reservation for this book, fulfill it!
    pending_reservation = db.query(Reservation).filter(
        Reservation.isbn == borrow_in.isbn,
        Reservation.user_id == target_user_id,
        Reservation.status == "PENDING"
    ).first()
    if pending_reservation:
        pending_reservation.status = "FULFILLED"

    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)

    # Format response
    return BorrowResponse(
        transaction_id=db_transaction.transaction_id,
        user_id=db_transaction.user_id,
        isbn=db_transaction.isbn,
        borrow_date=db_transaction.borrow_date,
        due_date=db_transaction.due_date,
        return_date=db_transaction.return_date,
        status=db_transaction.status,
        book_title=book.title,
        username=db.query(User).filter(User.user_id == target_user_id).first().username
    )

from pydantic import BaseModel as PydanticBaseModel
class ReturnInput(PydanticBaseModel):
    isbn: Optional[str] = None
    transaction_id: Optional[int] = None
    user_id: Optional[int] = None

@router.post("/return", response_model=BorrowResponse)
def return_book(
    return_in: ReturnInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(BorrowTransaction).filter(
        BorrowTransaction.return_date == None,
        BorrowTransaction.status == "BORROWED"
    )

    if return_in.transaction_id is not None:
        query = query.filter(BorrowTransaction.transaction_id == return_in.transaction_id)
    elif return_in.isbn is not None:
        query = query.filter(BorrowTransaction.isbn == return_in.isbn)
        if current_user.role == "Student" or return_in.user_id is not None:
            uid = return_in.user_id if return_in.user_id is not None else current_user.user_id
            query = query.filter(BorrowTransaction.user_id == uid)
    else:
        raise HTTPException(status_code=400, detail="Must provide isbn or transaction_id")

    transaction = query.first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Active borrow transaction not found")

    # Only Admin, Librarian, or the student who borrowed the book can return it
    if current_user.role == "Student" and transaction.user_id != current_user.user_id:
        raise HTTPException(
            status_code=403, 
            detail="You cannot return a book borrowed by another user."
        )

    # Return the book
    transaction.return_date = datetime.utcnow()
    transaction.status = "RETURNED"

    # Check if there are pending reservations for this book, and transition status to notify
    # (just marking as 'READY' so they can borrow it next, or we can check this during borrow)
    # The requirement is just: track reservation status, prevent duplicate reservations.
    
    db.commit()
    db.refresh(transaction)

    book = db.query(Book).filter(Book.isbn == transaction.isbn).first()
    borrower = db.query(User).filter(User.user_id == transaction.user_id).first()

    return BorrowResponse(
        transaction_id=transaction.transaction_id,
        user_id=transaction.user_id,
        isbn=transaction.isbn,
        borrow_date=transaction.borrow_date,
        due_date=transaction.due_date,
        return_date=transaction.return_date,
        status=transaction.status,
        book_title=book.title,
        username=borrower.username
    )

@router.post("/reserve", response_model=ReservationResponse, status_code=status.HTTP_201_CREATED)
def reserve_book(
    reserve_in: ReservationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    target_user_id = current_user.user_id
    if reserve_in.user_id is not None:
        if current_user.role not in ["Administrator", "Librarian"]:
            raise HTTPException(
                status_code=403,
                detail="Students can only create reservations for themselves."
            )
        target_user_id = reserve_in.user_id
        # Verify target user exists
        target_user = db.query(User).filter(User.user_id == target_user_id).first()
        if not target_user:
            raise HTTPException(status_code=404, detail="Target user not found")

    # Verify book exists
    book = db.query(Book).filter(Book.isbn == reserve_in.isbn).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    # Check if book is currently borrowed. If not borrowed, why reserve?
    # Requirement: "If a book is unavailable, users should be able to create a reservation."
    is_borrowed = db.query(BorrowTransaction).filter(
        BorrowTransaction.isbn == reserve_in.isbn,
        BorrowTransaction.return_date == None,
        BorrowTransaction.status == "BORROWED"
    ).first() is not None

    if not is_borrowed:
        raise HTTPException(
            status_code=400,
            detail="Book is currently available for borrowing. There is no need to reserve it."
        )

    # Prevent unnecessary duplicate reservations
    # Requirement: "Prevent unnecessary duplicate reservations"
    existing_reservation = db.query(Reservation).filter(
        Reservation.isbn == reserve_in.isbn,
        Reservation.user_id == target_user_id,
        Reservation.status == "PENDING"
    ).first()

    if existing_reservation:
        raise HTTPException(
            status_code=400,
            detail="You already have a pending reservation for this book."
        )

    db_reservation = Reservation(
        user_id=target_user_id,
        isbn=reserve_in.isbn,
        reservation_date=datetime.utcnow(),
        status="PENDING"
    )
    db.add(db_reservation)
    db.commit()
    db.refresh(db_reservation)

    return ReservationResponse(
        reservation_id=db_reservation.reservation_id,
        user_id=db_reservation.user_id,
        isbn=db_reservation.isbn,
        reservation_date=db_reservation.reservation_date,
        status=db_reservation.status,
        book_title=book.title,
        username=db.query(User).filter(User.user_id == target_user_id).first().username
    )

@router.get("/transactions/history", response_model=List[BorrowResponse])
def get_transaction_history(
    user_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(BorrowTransaction)

    if current_user.role == "Student":
        # Students can only see their own history
        query = query.filter(BorrowTransaction.user_id == current_user.user_id)
    else:
        # Librarians and Admins can view all, or filter by user_id
        if user_id is not None:
            query = query.filter(BorrowTransaction.user_id == user_id)

    transactions = query.order_by(BorrowTransaction.borrow_date.desc()).all()
    
    response = []
    for t in transactions:
        book = db.query(Book).filter(Book.isbn == t.isbn).first()
        borrower = db.query(User).filter(User.user_id == t.user_id).first()
        response.append(
            BorrowResponse(
                transaction_id=t.transaction_id,
                user_id=t.user_id,
                isbn=t.isbn,
                borrow_date=t.borrow_date,
                due_date=t.due_date,
                return_date=t.return_date,
                status=t.status,
                book_title=book.title if book else "Unknown Book",
                username=borrower.username if borrower else "Unknown User"
            )
        )
    return response

@router.get("/reservations/history", response_model=List[ReservationResponse])
def get_reservation_history(
    user_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Reservation)

    if current_user.role == "Student":
        query = query.filter(Reservation.user_id == current_user.user_id)
    else:
        if user_id is not None:
            query = query.filter(Reservation.user_id == user_id)

    reservations = query.order_by(Reservation.reservation_date.desc()).all()
    
    response = []
    for r in reservations:
        book = db.query(Book).filter(Book.isbn == r.isbn).first()
        borrower = db.query(User).filter(User.user_id == r.user_id).first()
        response.append(
            ReservationResponse(
                reservation_id=r.reservation_id,
                user_id=r.user_id,
                isbn=r.isbn,
                reservation_date=r.reservation_date,
                status=r.status,
                book_title=book.title if book else "Unknown Book",
                username=borrower.username if borrower else "Unknown User"
            )
        )
    return response

@router.post("/reservations/{reservation_id}/cancel", response_model=ReservationResponse)
def cancel_reservation(
    reservation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    res = db.query(Reservation).filter(Reservation.reservation_id == reservation_id).first()
    if not res:
        raise HTTPException(status_code=404, detail="Reservation not found")

    if current_user.role == "Student" and res.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="You cannot cancel another user's reservation.")

    res.status = "CANCELLED"
    db.commit()
    db.refresh(res)

    book = db.query(Book).filter(Book.isbn == res.isbn).first()
    borrower = db.query(User).filter(User.user_id == res.user_id).first()

    return ReservationResponse(
        reservation_id=res.reservation_id,
        user_id=res.user_id,
        isbn=res.isbn,
        reservation_date=res.reservation_date,
        status=res.status,
        book_title=book.title if book else "Unknown Book",
        username=borrower.username if borrower else "Unknown User"
    )
