const express = require("express");
const router = express.Router();

// IMPORT User FROM app.js
const { User } = require("../app");

// Admin guard
function isAdmin(req, res, next) {
    if (req.isAuthenticated() && req.user.isAdmin) {
        return next();
    }
    req.flash("error", "Access denied");
    res.redirect("/home");
}

// ADMIN DASHBOARD
router.get("/", isAdmin, async (req, res) => {
    try {
        const users = await User.find().populate("referrer");
        const totalUsers = await User.countDocuments();

        res.render("admin", {
            users,
            totalUsers
        });
    } catch (err) {
        console.log(err);
        res.redirect("/home");
    }
});

module.exports = router;
