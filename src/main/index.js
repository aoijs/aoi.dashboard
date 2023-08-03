const express = require("express");
const fs = require("fs");
const path = require("path");
const chalk = require("chalk");
const session = require("express-session");
const passport = require("passport");
const ejs = require("ejs");
const DiscordStrategy = require("passport-discord").Strategy;

class Dashboard {
  constructor(client, options) {
    this.client = client;
    this.port = options.port;
    this.redirectURL = options.url + "/auth/callback";
    this.scopes = options.scopes || ["identify", "email", "guilds"];
    this.secret = options.secret;
    this.sidebar = options.sidebar || [
      { title: "Discord", to: "discord" },
      { title: "Commands", to: "commands" },
      { title: "Invite", to: "invite" },
    ];
    this.guilds = new Map();
    this.authSecret = require("crypto").randomBytes(16).toString("hex");
    this.sessionSecret = require("crypto").randomBytes(16).toString("hex");
  }

  getDefaultComponent(to) {
    const defaultComponents = {
      discord: {
        title: "Discord",
        to: "/discord",
      },
      commands: {
        title: "Commands",
        to: "/commands",
      },
      invite: {
        title: "Invite",
        to: "/invite",
      },
    };

    return (
      defaultComponents[to.toLowerCase().replace("/", "")] || {
        title: title,
        to: `/${to}`,
      }
    );
  }

  updateVariable(key, value) {
    this.client.db.set(this.client.db.tables[0], key, { value: value });
  }

  async fetchGuilds() {
    let start = new Date();
    console.log(
      `${chalk.yellow.bold(
        "[FETCH]"
      )} [Dashboard]: Attempting to fetch all guilds, this may take a while.`
    );

    const animateLoading = () => {
      const frames = ["⠙", "⠘", "⠰", "⠴", "⠤", "⠦", "⠆", "⠃", "⠋", "⠉"];
      let i = 0;

      return setInterval(() => {
        process.stdout.write(
          `\r ${chalk.blue.bold(frames[i])} ${chalk.yellow.bold(
            "[FETCH]"
          )} [Dashboard]: Fetching guilds `
        );
        i = (i + 1) % frames.length;
      }, 100);
    };

    const loading = animateLoading();
    const guilds = this.client.guilds.cache;

    for (const guild of guilds.values()) {
      try {
        const owner = await this.getOwners(guild);
        if (owner) {
          this.guilds.set(guild.id, {
            guildName: guild.name,
            ownerId: owner.user.id,
            ownerTag: owner.user.tag,
          });
        } else {
          console.error(
            `${chalk.red.bold(
              "[ERR]"
            )} [Dashboard]: Error fetching owner for guild with ID ${guild.id}`
          );
        }
      } catch (err) {
        console.error(
          `${chalk.red.bold(
            "[ERR]"
          )} [Dashboard]: Error fetching owner for guild with ID ${guild.id}`
        );
      }
    }

    clearInterval(loading);
    process.stdout.clearLine();

    for (const item of this.sidebar) {
      if (!("title" in item && ("to" in item || "href" in item))) {
        console.error(
          `${chalk.red.bold("\r[ERR]")} ${chalk.red(
            "[SIDEBAR]"
          )} [Dashboard]: Failed to load dashboard with reason: ${chalk.yellow.bold(
            "title"
          )} requires ${chalk.yellow.bold("to")} or ${chalk.yellow.bold(
            "href"
          )} to work properly.`
        );
        process.exit(1);
      }
    }

    console.log(
      `\r${chalk.green.bold("[FETCH]")} [Dashboard]: Fetched all guilds in ${
        (new Date() - start) / 1000
      } seconds.`
    );
  }

  async getOwners(guild) {
    try {
      const owner = await guild.fetchOwner();
      return owner;
    } catch (err) {
      console.error(
        `${chalk.red.bold("[ERR]")} ${chalk.red.bold(
          "[ERR]"
        )} [Dashboard]: Error fetching owner for guild with ID ${guild.id}`
      );
      return null;
    }
  }

  connect = async () => {
    await new Promise((resolve) => {
      this.client.once("ready", () => {
        resolve();
      });
    });
    const app = express();

    const allowedScopes = [
      "identify",
      "guilds",
      "activities.read",
      "activities.write",
      "applications.builds.read",
      "applications.builds.upload",
      "applications.commands",
      "applications.commands.update",
      "applications.commands.permissions.update",
      "applications.entitlements",
      "applications.store.update",
      "connections",
      "dm_channels.read",
      "email",
      "gdm.join",
      "guilds",
      "guilds.join",
      "guilds.members.read",
      "identify",
      "messages.read",
      "relationships.read",
      "role_connections.write",
      "rpc",
      "rpc.activities.write",
      "rpc.notifications.read",
      "rpc.voice.read",
      "rpc.voice.write",
      "voice",
      "webhook.incoming",
    ];

    if (!this.scopes || !Array.isArray(this.scopes)) {
      console.error(
        `${chalk.red.bold(
          "[ERR]"
        )} [Dashboard]: Failed to load dashboard with reason: Scopes must contain only allowed scopes or be non-empty.`
      );

      process.exit(1);
    }

    const invalidScopes = this.scopes.filter(
      (scope) => !allowedScopes.includes(scope)
    );

    if (invalidScopes.length > 0) {
      console.error(
        `${chalk.red.bold("[ERR]")} ${chalk.red(
          "[redirectURL]"
        )} [Dashboard]: Failed to load dashboard with reason: Scopes must contain only allowed scopes or be non-empty. Invalid scopes: "${chalk.redBright.bold(
          invalidScopes.join(chalk.white(`", "`))
        )}"`
      );

      process.exit(1);
    }

    if (!this.secret) {
      console.error(
        `${chalk.red.bold("[ERR]")} ${chalk.red(
          "[clientSecret]"
        )} [Dashboard]: Failed to load dashboard with reason: Invalid or no clientSecret was provided. Don't know what that is? Check this: https://support.heateor.com/discord-client-id-discord-client-secret/`
      );

      process.exit(1);
    }

    if (
      !this.redirectURL ||
      (!this.redirectURL.startsWith("https://") &&
        !this.redirectURL.startsWith("http://"))
    ) {
      console.error(
        `${chalk.red.bold("[ERR]")} ${chalk.red(
          "[redirectURL]"
        )} [Dashboard]: Failed to load dashboard with reason: Invalid or no ${chalk.yellow.bold(
          "redirectURL"
        )} was provided. ${chalk.yellow.bold(
          "redirectURL"
        )} must begin with either ${chalk.yellow.bold(
          "http://"
        )} or ${chalk.yellow.bold("https://")}`
      );

      process.exit(1);
    }

    app.use(
      session({
        secret: this.secret,
        resave: true,
        saveUninitialized: false,
      })
    );

    app.use(passport.initialize());
    app.use(passport.session());

    passport.use(
      new DiscordStrategy(
        {
          clientID: this.client.user.id,
          clientSecret: this.secret,
          callbackURL: this.redirectURL,
          scope: this.scopes,
        },
        (accessToken, refreshToken, profile, done) => {
          return done(null, profile);
        }
      )
    );

    passport.serializeUser((user, done) => {
      done(null, user);
    });
    passport.deserializeUser((obj, done) => {
      done(null, obj);
    });

    app.get("/auth/login", passport.authenticate("discord"));

    app.get(
      "/auth/callback",
      passport.authenticate("discord", { failureRedirect: "/" }),
      (req, res) => {
        res.redirect("/dash");
      }
    );

    app.get("/auth/logout", (req, res) => {
      req.logout(() => {});
      res.redirect("/");
    });

    const ensureAuthenticated = (req, res, next) => {
      if (req.isAuthenticated()) {
        return next();
      }
      res.redirect("/auth/login");
    };

    app.get("/", (req, res) => {
      const data = {
        avatar: this.client.user.avatarURL(),
        username: this.client.user.username,
        id: this.client.user.id,
        auth: req.isAuthenticated(),
      };

      ejs.renderFile(
        path.join(__dirname, "../", "dashboard/html/pages/index.html"),
        { data },
        (err, html) => {
          if (err) {
            this.client.destroy();
            console.error(
              `${chalk.red.bold(
                "[ERR]"
              )} [Dashboard]: Failed to load dashboard data with reason:`,
              err
            );
          } else {
            res.send(html);
          }
        }
      );
    });

    app.get("/dash/guilds/:guildid", async (req, res) => {
      const guildId = req.params.guildid;
      const guild = await this.client.guilds.cache.get(guildId);

      const data = {
        avatar: this.client.user.avatarURL(),
        username: this.client.user.username,
        id: this.client.user.id,
        auth: req.isAuthenticated(),
      };

      if (!guild) {
        console.error(
          `${chalk.red.bold(
            "[ERR]"
          )} [Dashboard]: Failed to load dashboard with reason: Failed to retrieve guild data.`
        );
      }

      ejs.renderFile(
        path.join(__dirname, "../", "dashboard/html/pages/guild.html"),
        {
          guild,
          data,
          sidebar: this.sidebar, // Include the sidebar variable here
          getDefaultComponent: this.getDefaultComponent, // Include the function here
        },
        (err, html) => {
          if (err) {
            this.client.destroy();
            console.error(
              `${chalk.red.bold(
                "[ERR]"
              )} [Dashboard]: Failed to load dashboard with reason:`,
              err
            );
          } else {
            res.send(html);
          }
        }
      );
    });

    app.get("/dash", ensureAuthenticated, (req, res) => {
      const mutualGuilds = this.client.guilds.cache.filter((guild) =>
        req.user.guilds.some((userGuild) => userGuild.id === guild.id)
      );

      const data = {
        user: {
          avatar: `https://cdn.discordapp.com/avatars/${req.user.id}/${req.user.avatar}.png`,
          username: req.user.username,
          id: req.user.id,
        },
        avatar: this.client.user.avatarURL(),
        username: this.client.user.username,
        id: this.client.user.id,
        auth: req.isAuthenticated(),
      };

      const guildData = mutualGuilds.map((guild) => {
        const permissions = guild.members.cache.get(
          this.client.user.id
        )?.permissions;
        const userpermissions = guild.members.cache.get(
          req.user.id
        )?.permissions;

        return {
          guildID: guild.id,
          guildName: guild.name,
          permissions: userpermissions ? userpermissions.toArray() : [],
          botPermissions: permissions ? guild.me?.permissions?.toArray() : [],
          iconURL:
            guild.iconURL({ dynamic: true }) ||
            "https://cdn.discordapp.com/embed/avatars/1.png",
        };
      });

      ejs.renderFile(
        path.join(__dirname, "../", "dashboard/html/pages/dash.html"),
        { guildData, data },
        async (err, html) => {
          if (err) {
            console.error(
              `${chalk.red.bold(
                "[ERR]"
              )} [Dashboard]: Failed to load dashboard with reason:`,
              err
            );
            this.client.destroy();
          } else {
            res.send(html);
          }
        }
      );
    });

    await this.fetchGuilds();

    app.listen(this.port, () => {
      console.log(
        `${chalk.green.bold(
          "[SERVER]"
        )} [Dashboard]: Marked Dashboard as Running`
      );
    });
  };
}

module.exports = {
  Dashboard,
};
