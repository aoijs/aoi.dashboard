const express = require('express');
const passport = require('passport');
const router = express.Router();

router.get("/login", passport.authenticate("discord"));
router.get("/callback", passport.authenticate("discord", { failureRedirect: "/" }), (req, res) => { res.redirect("/") });
router.get("/logout", (req, res) => { req.logout(() => {}); res.redirect("/") });

module.exports = router;