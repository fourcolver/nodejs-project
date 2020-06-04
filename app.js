//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const flash = require("express-flash");
const session = require("express-session");
const passport = require("passport");
const dateFormatter = require("./util/date-formatter");
const cors = require("cors");
const MemoryStore = require("memorystore")(session);

// Setting up the log
const logger = require ('./config/log4');
// Setting up the app *****************
const app = express();
app.use(cors());
app.use (logger.express);
var routes = require('./routers/router');
app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true, parameterLimit: 50000 }));
app.use(session({
    cookie: { maxAge: 86400000 },
    store: new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    }),
    resave: false,
    saveUninitialized: true,
    secret: process.env.SECRET
}));

app.use(passport.initialize());
app.use(passport.session());
app.locals.dateFormatter = dateFormatter;
app.use(flash());
app.use('/', routes);
// ************************************************************
// Setting up database stuff
// ************************************************************
mongoUrl = process.env.DB_CONNECTION_STRING || "mongodb://localhost/test";
mongoose.connect(mongoUrl, {
  useNewUrlParser: true
});
mongoose.set("useCreateIndex", true);
require('./config/passport')(passport);

// setup server process
let port = process.env.PORT || 3000;
app.listen(port, function () {
  console.log("Server started on port " + port);
});
