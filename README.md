CSV Upload and Parsing with APIs:

This is a simple Node.js application that allows you to upload a CSV file, parse its fields, and store the data in a SQL database. The application also provides APIs for viewing, editing, inserting, and deleting transactions.

Getting Started
To get started, you need to clone this repository and install the necessary dependencies:


git clone https://github.com/pranay-mog/Assignment-CSVreader.git
cd csv-upload-parsing-apis
npm install
Before running the application, you also need to set up a SQL database and create a .env file with the database credentials:

Uploading CSV Files
To upload a CSV file, you need to send a POST request to the /import-csv endpoint with the file attached as a multipart/form-data payload. The application will parse the file and store the data in the database.

Using the APIs
The application provides the following APIs:

GET /transactions: returns all the transactions in the database.
GET /transactions/:id: returns the transaction with the specified ID.
PUT /transactions/:id: updates the transaction with the specified ID.
POST /transactions: adds a new transaction to the database.
DELETE /transactions/:id: deletes the transaction with the specified ID.

To use these APIs, you need to send HTTP requests to the respective endpoints. You can use tools like Postman or curl to send the requests.
