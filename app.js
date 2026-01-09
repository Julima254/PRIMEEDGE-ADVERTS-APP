require('dotenv').config(); // This loads environment variables
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportlocalmongoose = require("passport-local-mongoose");
const flash = require("connect-flash");
const adminRoutes = require("./routes/admin");




const app = express();
const PORT = process.env.PORT || 3000;


// Middleware
app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
    extended: true
}));

app.use("/admin", adminRoutes);


// Session
app.use(session({
  secret:"Our little secret.",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
// Make user info available in all EJS templates
app.use((req, res, next) => {
    res.locals.currentUser = req.user; // Passport sets req.user after login
    next();
});




// Connect to MongoDB
mongoose.connect("mongodb://127.0.0.1:27017/userDB");

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    country: { type: String, required: true },
    invitationCode: { type: String },
    referrer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    isAdmin: { type: Boolean, default: false }
});

userSchema.plugin(passportlocalmongoose);

const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect("/login");
}


//for frash message
app.use((req, res, next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    next();
});



app.get("/", function(req, res){
    if (req.isAuthenticated()) {
        res.redirect("/home");
    } else {
        res.redirect("/login");
    }
});


app.get("/login", function(req, res){
    res.render("login");
});


// Render the registration page
app.get('/register', (req, res) => {
    res.render('register'); // your register.ejs
});

// Handle registration form submission
app.post('/register', async (req, res) => {
    try {
        const { username, email, phone, country, invitationCode, password, confirmPassword } = req.body;

        if (password !== confirmPassword) {
            return res.send("Passwords do not match!");
        }

        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.send("Email or username already registered!");
        }

        let referrerUser = null;
        if (invitationCode?.trim()) {
            referrerUser = await User.findOne({ username: invitationCode.trim() });
        }

        const newUser = new User({
            username,
            email,
            phone,
            country,
            invitationCode: invitationCode || null,
            referrer: referrerUser ? referrerUser._id : null
        });

        User.register(newUser, password, function(err) {
            if (err) {
                console.log(err);
                return res.redirect("/register");
            }
            res.redirect("/login"); 
        });

    } catch (error) {
        console.log(error);
        res.send("An error occurred during registration.");
    }
});


// Handle login form
app.post("/login", passport.authenticate("local", {
    successRedirect: "/home",
    failureRedirect: "/login",
    failureFlash: "Invalid username or password!"
}));



app.get("/home", isLoggedIn, function(req, res){
    res.render("home");
});


app.get("/logout", function(req, res){
    req.logout(function(err){
        if (err) return console.log(err);
        res.redirect("/login");
    });
});


app.get("/forgot", function(req, res){
    res.render("forgot");
});


app.post("/forgot", async function(req, res){
    const username = req.body.username;

    try {
        const user = await User.findOne({ username });

        if (!user) {
            return res.send("User not found");
        }

        // Temporary password (for demo)
        const tempPassword = "123456";

        user.setPassword(tempPassword, function(err){
            if (err) {
                return res.send("Error resetting password");
            }

            user.save();
            res.send(`Password reset successful. Your new password is: ${tempPassword}`);
        });

    } catch (err) {
        console.log(err);
        res.send("Something went wrong");
    }
});





app.listen(PORT, function(){
    console.log(`server started on port ${PORT}`);
});


module.exports = { User };
