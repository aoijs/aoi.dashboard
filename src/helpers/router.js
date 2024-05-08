const express = require("express");
const session = require("express-session");
const passport = require("passport");
const DiscordStrategy = require("passport-discord").Strategy;
const ejs = require("ejs");
const path = require("path");

const routes = require("../helpers/routes/Data.js");

//todo: sharding support
let shards;

module.exports = (dashboard) => {
    const router = express.Router();

    const render = (filePath, auth = false, admin = false) => {
        return async (req, res) => {
            if (auth && !req.isAuthenticated()) return res.redirect("/login");

            if (admin && !req.isAuthenticated()) return res.redirect("/login");

            const isAllowed = await getDashboardAdmins(req.user?.id)

            if (admin && !isAllowed) return res.redirect("/?loginFailed=true");

            console.log(isAllowed)

            if (isAllowed && !dashboard.navbar.some((tab) => tab.title === "Admin")) {
                dashboard.navbar.push({ title: "Admin", to: "/admin" });
            } else if (!isAllowed) {
                dashboard.navbar = dashboard.navbar.filter((tab) => tab.title !== "Admin");
            }

            dashboard.navbar.forEach((item) => {
                if (item.to === req.path) {
                    item.active = true;
                } else {
                    item.active = false;
                }
            });

            const data = {
                user: {
                    user: req?.user,
                    avatar: `https://cdn.discordapp.com/avatars/${req?.user?.id}/${req?.user?.avatar}.png`,
                    owner: isAllowed
                },
                client: {
                    ...dashboard.client,
                    token: undefined
                },
                global: {
                    guild_data: {
                        guilds: [...global.fetchedGuilds.values()],
                        memberCount: global.memberCount
                    },
                    auth: req?.isAuthenticated() || false,
                    navbar: dashboard.navbar,
                    shards: shards || []
                }
            };

            console.log(data.global.guild_data.guilds)

            try {
                const html = await ejs.renderFile(path.join(__dirname, filePath), data);
                res.send(html);
            } catch (err) {
                console.log(err);
                res.redirect("/");
            }
        };
    };

    const ensureAuthenticated = (req, res, next) => {
        if (req.isAuthenticated()) {
            return next();
        }
        res.redirect("/login");
    };

    async function getDashboardAdmins(user) {
        if (user === (await dashboard.client.application.fetch()).owner.id) return true;
        if (!user) {
            return false;
        } else {
            const admins = (await dashboard.db.get("main", "admins"))?.value || [];
            return admins.includes(user);
        }
    }

    passport.serializeUser((user, done) => {
        done(null, user);
    });

    passport.deserializeUser((obj, done) => {
        done(null, obj);
    });

    passport.use(
        new DiscordStrategy(
            {
                clientID: dashboard.client.user.id,
                clientSecret: dashboard.secret,
                callbackURL: dashboard.callbackURL + "/auth/callback",
                scope: dashboard.scopes || ["identify", "guilds"]
            },
            (accessToken, refreshToken, profile, done) => {
                return done(null, profile);
            }
        )
    );

    router.use(
        session({
            secret: dashboard.secret || require("crypto").randomBytes(32).toString("hex"),
            resave: true,
            saveUninitialized: true
        })
    );

    router.use(passport.initialize());
    router.use(passport.session());
    router.use("/auth", require("../helpers/routes/Auth.js"));
    router.use("/api", routes(dashboard));

    router.get("/", render("../public/main/index.html"));
    router.get("/login", render("../public/auth/login.html"));
    router.get("/commands", render("../public/main/commands.html"));
    router.get("/status", render("../public/main/status.html"));
    router.get("/admin", render("../public/admin/admin.html", true, true));

    //todo: custom routes per user config

    return router;
};
