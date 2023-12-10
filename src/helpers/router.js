const express = require("express");
const session = require("express-session");
const passport = require("passport");
const DiscordStrategy = require("passport-discord").Strategy;
const ejs = require("ejs");
const path = require("path");

const routes = require("../helpers/routes/Data.js");

let shards;

module.exports = (dashboard) => {
  const router = express.Router();

  const render = (filePath) => {
    return async (req, res) => {
      const data = {
        user: {
          user: req?.user,
          avatar:
            `https://cdn.discordapp.com/avatars/${req?.user?.id}/${req?.user?.avatar}.png` ||
            `https://cdn.discordapp.com/embed/avatars/${req?.user?.id % 5}.png`,
        },
        client: {
          ...dashboard.client,
          token: undefined,          
        },
        global: {
          guild_data: {
            guilds: [...global.fetchedGuilds.values()],
            memberCount: global.memberCount,
          },
          auth: req?.isAuthenticated() || false,
          navbar: dashboard.navbar,
          shards: shards || [],
        },
      };

      try {
        const html = await ejs.renderFile(path.join(__dirname, filePath), data);
        res.send(html);
      } catch (err) {
        res.redirect("/");
      }
    };
  };

  const ensureAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.redirect("/auth/login");
  };

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
        scope: dashboard.scopes || ["identify", "guilds"],
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
      saveUninitialized: true,
    })
  );

  router.use(passport.initialize());
  router.use(passport.session());
  router.use("/auth", require("../helpers/routes/Auth.js"));
  router.use("/api", routes(dashboard.client));

  router.get("/", render("../public/main/index.html"));
  router.get("/status", async (req, res) => {
    await updateData();
    render("../public/main/status.html")(req, res);
  });

  const updateData = async () => {
    try {
      shards =
        (await dashboard.client.shard.broadcastEval((client) => [
          client.ws.status,
          client.ws.ping,
          client.guilds.cache.size,
          client.shard.count,
        ])) || [];

    } catch {
      shards = [];
    }
  };

  return router;
};
