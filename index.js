const express = require("express");
const bodyparser = require("body-parser");
const fs = require("fs");
const path = require("path");
const mysql = require("mysql");
const multer = require("multer");
const ejs = require("ejs");
const csv = require("fast-csv");
const app = express();
const axios = require("axios");
app.use(express.static("./public"));
app.use(bodyparser.json());
app.use(
  bodyparser.urlencoded({
    extended: true,
  })
);
app.set("view engine", "ejs");
const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "",
  database: "test",
});

var storage = multer.diskStorage({
  destination: (req, file, callBack) => {
    callBack(null, "./uploads/");
  },
  filename: (req, file, callBack) => {
    callBack(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  },
});
var upload = multer({
  storage: storage,
});

app.get("/", async (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

app.get("/transactions", async (req, res) => {
  let query = "SELECT * FROM expenses";
  let conditions = [];
  let params = [];
  // console.log(req.query.fromDate);

  if (req.query.startDate) {
    conditions.push("Date >= ?");
    params.push(req.query.startDate);
  }
  if (req.query.endDate) {
    conditions.push("Date <= ?");
    params.push(req.query.endDate);
  }
  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }
  // console.log(query);

  try {
    const connection = await getConnection();
    const [results, fields] = await connection.query(query, params);
    connection.release();
    console.log(results);
    res.render("resul", { transactions: results });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error retrieving transactions");
  }
});

app.post("/insert", async (req, res) => {
  const query =
    "INSERT INTO expenses (Date, Description, Amount, Currency) VALUES (?, ?, ?, ?)";
  const params = [
    req.body.date,
    req.body.description,
    req.body.amount,
    req.body.currency,
  ];

  try {
    const connection = await getConnection();
    const [result, fields] = await connection.query(query, params);
    connection.release();
    res.redirect("/");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error inserting transaction");
  }
});

app.get("/delete", async (req, res) => {
  const date = req.query.transactionDate;
  const query = "DELETE FROM expenses WHERE Date = ?";
  console.log(date);

  try {
    const connection = await getConnection();
    const [result, fields] = await connection.query(query, [date]);
    connection.release();
    if (result.affectedRows === 0) {
      res.status(404).send("Transaction not found");
    } else {
      res.redirect("/");
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Error deleting transaction");
  }
});

app.post("/import-csv", upload.single("import-csv"), async (req, res) => {
  console.log(req.file.path);
  uploadCsv(__dirname + "/uploads/" + req.file.filename);
  res.send("data imported done");
});

function uploadCsv(uriFile) {
  let stream


  async function uploadCsv(uriFile) {
    let stream = fs.createReadStream(uriFile);
    let csvDataColl = [];
    let fileStream = csv.parse()
      .on("data", function (data) {
        csvDataColl.push(data);
      })
      .on("end", async function () {
        let headers = csvDataColl.shift();
        
        for (let i = 0; i < csvDataColl.length; i++) {
          let data = csvDataColl[i];
          let dateString = data[0];
          let formatedDate = "";
          let year = dateString.substring(dateString.length - 4);
          let month = dateString.substring(3, 5);
          let day = dateString.substring(0, 2);
          formatedDate = year + "-" + month + "-" + day;
          data[0] = formatedDate;
  
          if (data[3] !== "INR") {
            try {
              const response = await axios.get(`https://api.exchangerate-api.com/v4/latest/INR?base=${data[3]}`); // This conversion is based on today's exchange rates. 
              console.log(data); //to get the exchange rate on that particular day, we can use https://openexchangerates.org/signup.
              data[2] = (data[2] * response.data.rates.INR).toFixed(2);
              data[3] = "INR";
              console.log(data);
  
              const connection = await pool.getConnection();
              const createTableQuery = "CREATE TABLE IF NOT EXISTS expenses (" + headers.map(header => `${header} VARCHAR(255)`).join(",") + ")";
              console.log(createTableQuery);
              await connection.query(createTableQuery);
  
              const query = "INSERT INTO expenses VALUES( ? )";
              await connection.query(query, [data]);
  
              connection.release();
            } catch (error) {
              console.log(error);
            }
          }
        }
  
        fs.unlinkSync(uriFile);
      });
  
    stream.pipe(fileStream);
  }
  
}
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Node app serving on port: ${PORT}`));
