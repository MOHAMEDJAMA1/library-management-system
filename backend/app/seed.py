import os
import pandas as pd
from sqlalchemy.orm import Session
from .database import SessionLocal, engine, Base
from .models import Book, User
from .auth import get_password_hash

def seed_db():
    # 1. Create tables if they do not exist
    print("Creating tables if they don't exist...")
    Base.metadata.create_all(bind=engine)
    
    db: Session = SessionLocal()
    try:
        # 2. Seed default users
        print("Seeding default users...")
        default_users = [
            {
                "username": "admin",
                "email": "admin@library.com",
                "password": "adminpass",
                "role": "Administrator"
            },
            {
                "username": "librarian",
                "email": "librarian@library.com",
                "password": "libpass",
                "role": "Librarian"
            },
            {
                "username": "student",
                "email": "student@library.com",
                "password": "studentpass",
                "role": "Student"
            }
        ]
        
        for user_data in default_users:
            existing = db.query(User).filter(User.username == user_data["username"]).first()
            if not existing:
                db_user = User(
                    username=user_data["username"],
                    email=user_data["email"],
                    password_hash=get_password_hash(user_data["password"]),
                    role=user_data["role"]
                )
                db.add(db_user)
        db.commit()
        print("Default users check/seeding complete.")

        # 3. Seed books from CSV
        current_dir = os.path.dirname(os.path.abspath(__file__))
        csv_path = os.path.join(current_dir, "..", "data", "books.csv")
        
        book_count = db.query(Book).count()
        if book_count == 0:
            if os.path.exists(csv_path):
                print(f"Reading books from {csv_path}...")
                df = pd.read_csv(csv_path)
                # Replace NaN/NaT with None for database compatibility
                df = df.where(pd.notnull(df), None)
                
                books_data = df.to_dict(orient="records")
                print(f"Found {len(books_data)} books. Inserting in bulk...")
                
                # Bulk insert in chunks of 5000 to manage memory
                chunk_size = 5000
                for i in range(0, len(books_data), chunk_size):
                    chunk = books_data[i:i+chunk_size]
                    db.bulk_insert_mappings(Book, chunk)
                db.commit()
                print(f"Successfully seeded {len(books_data)} books into the database!")
            else:
                print(f"Warning: books CSV not found at {csv_path}. Seeding skipped.")
        else:
            print(f"Books table already populated with {book_count} items. Seeding skipped.")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
