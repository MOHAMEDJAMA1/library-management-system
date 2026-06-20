from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, exists
from typing import List, Optional
from ..database import get_db
from ..models import Book, BorrowTransaction
from ..schemas import BookCreate, BookUpdate, BookResponse
from ..auth import RoleChecker, get_current_user, User

router = APIRouter(prefix="/books", tags=["Books"])

@router.get("", response_model=List[BookResponse])
def get_books(
    q: Optional[str] = Query(None, description="Search term for title, author, publisher, or ISBN"),
    page: int = Query(1, ge=1),
    limit: int = Query(30, ge=1, le=100),
    db: Session = Depends(get_db)
):
    offset = (page - 1) * limit
    
    # Subquery to check if there is an active borrow transaction
    # (where return_date is NULL and status is 'BORROWED')
    active_borrow_exists = exists().where(
        and_(
            BorrowTransaction.isbn == Book.isbn,
            BorrowTransaction.return_date == None,
            BorrowTransaction.status == "BORROWED"
        )
    )

    query = db.query(Book)

    if q:
        search_filter = f"%{q}%"
        query = query.filter(
            or_(
                Book.title.ilike(search_filter),
                Book.author.ilike(search_filter),
                Book.publisher.ilike(search_filter),
                Book.isbn.ilike(search_filter)
            )
        )

    # Let's execute query and format response
    books = query.offset(offset).limit(limit).all()
    
    # We will map whether each book is available
    response = []
    for b in books:
        # Check active borrows
        is_borrowed = db.query(active_borrow_exists).scalar()
        # Wait, the scalar checks if any exists in general. We want it specifically for b.isbn:
        borrowed = db.query(BorrowTransaction).filter(
            BorrowTransaction.isbn == b.isbn,
            BorrowTransaction.return_date == None,
            BorrowTransaction.status == "BORROWED"
        ).first() is not None
        
        response.append(
            BookResponse(
                isbn=b.isbn,
                title=b.title,
                author=b.author,
                publisher=b.publisher,
                publication_year=b.publication_year,
                image_url=b.image_url,
                is_available=not borrowed
            )
        )
    return response

@router.get("/{isbn}", response_model=BookResponse)
def get_book(isbn: str, db: Session = Depends(get_db)):
    book = db.query(Book).filter(Book.isbn == isbn).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
        
    borrowed = db.query(BorrowTransaction).filter(
        BorrowTransaction.isbn == isbn,
        BorrowTransaction.return_date == None,
        BorrowTransaction.status == "BORROWED"
    ).first() is not None
    
    return BookResponse(
        isbn=book.isbn,
        title=book.title,
        author=book.author,
        publisher=book.publisher,
        publication_year=book.publication_year,
        image_url=book.image_url,
        is_available=not borrowed
    )

@router.post("", response_model=BookResponse, status_code=status.HTTP_201_CREATED)
def create_book(
    book_in: BookCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["Administrator", "Librarian"]))
):
    if db.query(Book).filter(Book.isbn == book_in.isbn).first():
        raise HTTPException(status_code=400, detail="Book with this ISBN already exists")
        
    db_book = Book(
        isbn=book_in.isbn,
        title=book_in.title,
        author=book_in.author,
        publisher=book_in.publisher,
        publication_year=book_in.publication_year,
        image_url=book_in.image_url
    )
    db.add(db_book)
    db.commit()
    db.refresh(db_book)
    
    return BookResponse(
        isbn=db_book.isbn,
        title=db_book.title,
        author=db_book.author,
        publisher=db_book.publisher,
        publication_year=db_book.publication_year,
        image_url=db_book.image_url,
        is_available=True
    )

@router.put("/{isbn}", response_model=BookResponse)
def update_book(
    isbn: str,
    book_in: BookUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["Administrator", "Librarian"]))
):
    db_book = db.query(Book).filter(Book.isbn == isbn).first()
    if not db_book:
        raise HTTPException(status_code=404, detail="Book not found")
        
    update_data = book_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_book, key, value)
        
    db.commit()
    db.refresh(db_book)
    
    borrowed = db.query(BorrowTransaction).filter(
        BorrowTransaction.isbn == isbn,
        BorrowTransaction.return_date == None,
        BorrowTransaction.status == "BORROWED"
    ).first() is not None

    return BookResponse(
        isbn=db_book.isbn,
        title=db_book.title,
        author=db_book.author,
        publisher=db_book.publisher,
        publication_year=db_book.publication_year,
        image_url=db_book.image_url,
        is_available=not borrowed
    )

@router.delete("/{isbn}", status_code=status.HTTP_204_NO_CONTENT)
def delete_book(
    isbn: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["Administrator", "Librarian"]))
):
    db_book = db.query(Book).filter(Book.isbn == isbn).first()
    if not db_book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    db.delete(db_book)
    db.commit()
    return None
