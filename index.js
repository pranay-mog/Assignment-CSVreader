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

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

app.get("/transactions", (req, res) => {
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

  pool.getConnection((error, connection) => {
    if (error) {
      console.error(error);
    } else {
      connection.query(query, params, (error, results) => {
        connection.release();
        if (error) {
          console.error(error);
          res.status(500).send("Error retrieving transactions");
        } else {
          console.log(results);
          res.render("resul", { transactions: results });
        }
      });
    }
  });
});

app.get("/insert", (req, res) => {
  const query =
    "INSERT INTO expenses (Date, Description, Amount, Currency) VALUES (?, ?, ?, ?)";
  const params = [
    req.body.date,
    req.body.description,
    req.body.amount,
    req.body.currency,
  ];
  pool.getConnection((error, connection) => {
    if (error) {
      console.error(error);
      res.status(500).send("Error inserting transaction");
    } else {
      connection.query(query, params, (error, result) => {
        connection.release();
        if (error) {
          console.error(error);
          res.status(500).send("Error inserting transaction");
        } else {
          res.redirect("/");
        }
      });
    }
  });
});

app.get("/delete", (req, res) => {
  const date = req.query.transactionDate;
  const query = "DELETE FROM expenses WHERE Date = ?";
  console.log(date);
  pool.getConnection((error, connection) => {
    if (error) {
      console.error(error);
      res.status(500).send("Error deleting transaction");
    } else {
      connection.query(query, [date], (error, result) => {
        connection.release();
        if (error) {
          console.error(error);
          res.status(500).send("Error deleting transaction");
        } else if (result.affectedRows === 0) {
          res.status(404).send("Transaction not found");
        } else {
          res.redirect("/");
        }
      });
    }
  });
});

app.post("/import-csv", upload.single("import-csv"), (req, res) => {
  console.log(req.file.path);
  uploadCsv(__dirname + "/uploads/" + req.file.filename);
  res.send("data imported done");
});

function uploadCsv(uriFile) {
  let stream = fs.createReadStream(uriFile);
  let csvDataColl = [];
  let fileStream = csv
    .parse()
    .on("data", function (data) {
      csvDataColl.push(data);
    })
    .on("end", function () {
      let headers = csvDataColl.shift();
      // console.log(headers);
      // console.log(csvDataColl[0]);
      // console.log(csvDataColl[4]);

      csvDataColl.forEach((data) => {
        let dateString = data[0];

        let formatedDate = "";
        let year = dateString.substring(dateString.length - 4);
        let month = dateString.substring(3, 5);
        let day = dateString.substring(0, 2);
        formatedDate = year + "-" + month + "-" + day;

        data[0] = formatedDate;

        if (data[3] !== "INR") {
          axios
            .get(
              `https://api.exchangerate-api.com/v4/latest/INR?base=${data[3]}` // This api gives out today's exchange rates.
            )         // to get the amount converted into INR on the respective day, we need to try it on https://openexchangerates.org/signup.
            .then((response) => {
              console.log(data);
              data[2] = (data[2] * response.data.rates.INR).toFixed(2);
              data[3] = "INR";
              console.log(data);
              pool.getConnection((error, connection) => {
                if (error) {
                  console.error(error);
                } else {
                  let createTableQuery =
                    "CREATE TABLE IF NOT EXISTS expenses (";
                  headers.forEach((header, index) => {
                    createTableQuery += header + " VARCHAR(255)";
                    if (index < headers.length - 1) {
                      createTableQuery += ",";
                    }
                  });
                  createTableQuery += ")";
                  console.log(createTableQuery);
                  connection.query(createTableQuery, (error, res) => {
                    console.log(error || res);
                    let query = "INSERT INTO expenses VALUES( ? )";
                    connection.query(query, [data], (error, res) => {
                      console.log(error || res);
                    });
                  });
                }
              });
            })
            .catch((error) => {
              console.log(error);
            });
        }
      });

      fs.unlinkSync(uriFile);
    });

  stream.pipe(fileStream);
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Node app serving on port: ${PORT}`));
