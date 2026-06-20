import os
import urllib.request
import zipfile
import io
import csv

URL = "https://github.com/dhairavc/DATA612-RecommenderSystems/raw/master/Final%20Project/BX-CSV-Dump.zip"
ZIP_PATH = "BX-CSV-Dump.zip"
CSV_NAME = "BX-Books.csv"
OUTPUT_DIR = os.path.join("backend", "data")
OUTPUT_PATH = os.path.join(OUTPUT_DIR, "books.csv")

def download_and_extract():
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

    print(f"Downloading dataset from {URL}...")
    try:
        # Set User-Agent to prevent block by GitHub raw or other sites
        req = urllib.request.Request(
            URL, 
            headers={'User-Agent': 'Mozilla/5.0'}
        )
        with urllib.request.urlopen(req) as response, open(ZIP_PATH, 'wb') as out_file:
            data = response.read()
            out_file.write(data)
        print("Download completed successfully.")
    except Exception as e:
        print(f"Error downloading dataset: {e}")
        return False
        print(f"Attempting backup download from {BACKUP_URL}...")
        try:
            urllib.request.urlretrieve(BACKUP_URL, ZIP_PATH)
            print("Backup download completed successfully.")
        except Exception as ex:
            print(f"Backup download failed: {ex}")
            print("Please ensure you have internet access and try again.")
            return False

    print(f"Extracting {CSV_NAME}...")
    try:
        with zipfile.ZipFile(ZIP_PATH, 'r') as zip_ref:
            # Read files from zip
            if CSV_NAME in zip_ref.namelist():
                csv_data = zip_ref.read(CSV_NAME)
                print(f"Successfully read {CSV_NAME} from zip. Processing...")
            else:
                print(f"Error: {CSV_NAME} not found in zip.")
                return False
    except Exception as e:
        print(f"Error opening zip: {e}")
        return False

    # Process and clean data
    # The file is semicolon separated, encoded in latin-1, and enclosed in double quotes.
    # We will parse it and write a clean CSV.
    print("Parsing and cleaning CSV data...")
    cleaned_rows = []
    
    # Use io.StringIO to read byte content as string
    content_str = csv_data.decode("latin-1")
    f = io.StringIO(content_str)
    
    # We will read line-by-line to avoid issues with bad quotes in the dataset
    reader = csv.reader(f, delimiter=';', quotechar='"', escapechar='\\')
    
    # Read headers
    try:
        header = next(reader)
        print("Original Headers:", header)
    except Exception as e:
        print(f"Failed to read header: {e}")
        return False
        
    count = 0
    skipped = 0
    # Expected columns: ISBN, Book-Title, Book-Author, Year-Of-Publication, Publisher, Image-URL-S, Image-URL-M, Image-URL-L
    for row in reader:
        if len(row) < 5:
            skipped += 1
            continue
            
        isbn = row[0].strip()
        title = row[1].strip()
        author = row[2].strip()
        year = row[3].strip()
        publisher = row[4].strip()
        # Grab image URL if available
        image_url = row[6].strip() if len(row) > 6 else ""

        # Basic year cleaning
        try:
            year_int = int(year)
            if year_int < 1000 or year_int > 2027:
                year_int = 0  # set invalid years to 0
        except ValueError:
            year_int = 0

        # We will keep books with valid ISBN, title and author
        if not isbn or not title or not author:
            skipped += 1
            continue

        cleaned_rows.append([isbn, title, author, year_int, publisher, image_url])
        count += 1
        
        # We want the entire dataset or at least 50,000. Let's do 50,000 to keep it manageable.
        if count >= 50000:
            break

    print(f"Processed {count} clean records. Skipped {skipped} malformed records.")

    # Write cleaned CSV
    print(f"Writing to {OUTPUT_PATH}...")
    with open(OUTPUT_PATH, "w", newline="", encoding="utf-8") as out_f:
        writer = csv.writer(out_f)
        writer.writerow(["isbn", "title", "author", "publication_year", "publisher", "image_url"])
        writer.writerows(cleaned_rows)

    print("Cleaning temp zip file...")
    if os.path.exists(ZIP_PATH):
        os.remove(ZIP_PATH)

    print("Finished successfully!")
    return True

if __name__ == "__main__":
    download_and_extract()
