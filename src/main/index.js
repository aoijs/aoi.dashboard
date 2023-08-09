const express = require("express");
const path = require("path");
const chalk = require("chalk");
const session = require("express-session");
const passport = require("passport");
const ejs = require("ejs");
const { KeyValue } = require("@akarui/aoi.db");
const DiscordStrategy = require("passport-discord").Strategy;

class Dashboard {
  constructor(client, options) {
    this.client = client;
    this.port = options.port;
    this.redirectURL = options.url + "/auth/callback";
    this.scopes = options.scopes || ["identify", "email", "guilds"];
    this.secret = options.secret;
    this.dashbar = options.sidebar || [
      { title: "Discord", to: "discord" },
      { title: "Commands", to: "commands" },
      { title: "Invite", to: "invite" },
    ];
    this.sidebar = options.navbar || [
      { title: "Discord", to: "discord" },
      { title: "Commands", to: "commands" },
      { title: "Invite", to: "invite" },
    ];
    this.features = options.features;
    this.guilds = new Map();
    this.authSecret = require("crypto").randomBytes(16).toString("hex");
    this.sessionSecret = require("crypto").randomBytes(16).toString("hex");
    this.db = this.client.db;
  }

  getDefaultComponent(to) {
    const defaultComponents = {
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

    for (const item of this.dashbar) {
      if ("category" in item) {
        if (Object.keys(item).length !== 2 || !("title" in item)) {
          console.error(
            `${chalk.red.bold("\r[ERR]")} ${chalk.red(
              "[SIDEBAR]"
            )} [Dashboard]: Failed to load dashboard with reason: ${chalk.yellow.bold(
              "category"
            )} requires ${chalk.yellow.bold("title")} to work properly.`
          );
          process.exit(1);
        }
      } else {
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
    }

    for (const feature of this.features) {
      if (!("title" in feature)) {
        console.warn(
          `\r${chalk.yellow.bold(
            "[WARNING]"
          )} [Dashboard]: Feature is missing ${chalk.yellow.bold(
            "title"
          )}. Therefore it may not display correctly.`
        );
      }

      if (!("description" in feature) || feature.description.length === 0) {
        console.warn(
          `\r${chalk.yellow.bold("[WARNING]")} [Dashboard]: Feature "${
            feature.title
          }" is missing description points. Therefore it may not display correctly.`
        );
      }

      if (
        !("preview" in feature) ||
        (feature.preview && feature.preview.trim() === "")
      ) {
        console.warn(
          `\r${chalk.yellow.bold("[WARNING]")} [Dashboard]: Feature "${
            feature.title
          }" has an empty or missing preview image. Therefore it may not display correctly.`
        );
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
    const app = express();
    await new Promise((resolve) => {
      this.client.once("ready", () => {
        resolve();
      });
    });

    this.client.on("guildCreate", async (guild) => {
      this.guilds.set(guild.id, guild);
    });

    this.client.on("guildDelete", async (guild) => {
      this.guilds.delete(guild.id);
    });

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
      "bot",
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

    app.use(express.json());
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

    app.get("/auth/callback", (req, res) => {
      try {
        passport.authenticate("discord", { failureRedirect: "/" })(
          req,
          res,
          () => {
            res.redirect("/dash");
          }
        );
      } catch (error) {
        res.redirect("/");
      }
    });

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

    app.get("/", async (req, res) => {
      const data = {
        features: this.features,
        user: {
          avatar:
            `https://cdn.discordapp.com/avatars/${req.user?.id}/${req.user?.avatar}.png` ||
            `https://cdn.discordapp.com/embed/avatars/${req.user.id % 5}.png`,
          username: req.user?.username,
          id: req.user?.id,
        },
        avatar:
          this.client.user.avatarURL({ format: "png", size: 4096 }) ||
          `https://cdn.discordapp.com/embed/avatars/${
            this.client.user.id % 5
          }.png`,
        username: this.client.user.username,
        id: this.client.user.id,
        auth: req.isAuthenticated(),
        guildCount: await this.client.guilds
          .fetch()
          .then((guilds) => guilds?.size),
        cachedUsers: this.client.users.cache?.size,
      };

      ejs.renderFile(
        path.join(__dirname, "../", "dashboard/html/pages/index.html"),
        {
          data,
          sidebar: this.sidebar,
          getDefaultComponent: this.getDefaultComponent,
        },
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

    app.post("/data/update/:guildid", ensureAuthenticated, async (req, res) => {
      const guildId = req.params.guildid;
      const userPermissions = req.user.guilds.find(
        (guild) => guild.id === guildId
      )?.permissions;
      if (
        Boolean(userPermissions & 0x0000000000000008) ||
        Boolean(userPermissions & 0x0000000000000020)
      ) {
        try {
          const data = req.body;

          this.db.set(
            this.client.db.tables[0],
            data.variable,
            guildId,
            data.value
          );

          res.status(200).json({ message: "Data updated successfully" });
        } catch (error) {
          console.error(error);
          res.status(500).json({ error: "An error occurred" });
        }
      } else {
        return;
      }
    });

    app.get("/dash/guilds/:guildid", ensureAuthenticated, async (req, res) => {
      const guildId = req.params.guildid;
      const guild = await this.client.guilds.fetch(guildId);
      const owner = await guild.fetchOwner();
      
      const gobj = {
        name: guild.name,
        ownerId: owner.id,
        ownerTag: owner.user.tag,
        memberCount: guild.memberCount,
      };
      

      const data = {
        user: {
          avatar:
            `https://cdn.discordapp.com/avatars/${req.user?.id}/${req.user?.avatar}.png` ||
            `https://cdn.discordapp.com/embed/avatars/${req.user.id % 5}.png`,
          username: req.user?.username,
          id: req.user?.id,
        },
        avatar:
          this.client.user.avatarURL({ format: "png", size: 4096 }) ||
          `https://cdn.discordapp.com/embed/avatars/${
            this.client.user.id % 5
          }.png`,
        username: this.client.user.username,
        id: this.client.user.id,
        auth: req.isAuthenticated(),
      };

      if (!guild) {
        ejs.renderFile(
          path.join(__dirname, "../", "dashboard/html/pages/error.html"),
          {
            sidebar: this.sidebar,
            getDefaultComponent: this.getDefaultComponent,
          },
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
        return;
      }

      const userPermissions = req.user.guilds.find(
        (guild) => guild.id === guildId
      )?.permissions;

      if (
        Boolean(userPermissions & 0x0000000000000008) ||
        Boolean(userPermissions & 0x0000000000000020)
      ) {
        ejs.renderFile(
          path.join(__dirname, "../", "dashboard/html/pages/guild.html"),
          {
            gobj,
            data,
            sidebar: this.dashbar,
            getDefaultComponent: this.getDefaultComponent,
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
      } else {
        ejs.renderFile(
          path.join(__dirname, "../", "dashboard/html/pages/error.html"),
          {
            data,
            sidebar: this.sidebar,
            getDefaultComponent: this.getDefaultComponent,
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
              return;
            } else {
              res.send(html);
              return;
            }
          }
        );
      }
    });

    app.get("/dash", ensureAuthenticated, (req, res) => {
      const mutualGuilds = this.client.guilds.cache.filter((guild) =>
        req.user.guilds.some((userGuild) => userGuild.id === guild.id)
      );

      const data = {
        user: {
          avatar:
            `https://cdn.discordapp.com/avatars/${req.user?.id}/${req.user?.avatar}.png` ||
            `https://cdn.discordapp.com/embed/avatars/${req.user.id % 5}.png`,
          username: req.user?.username,
          id: req.user?.id,
        },
        avatar:
          this.client.user.avatarURL({ format: "png", size: 4096 }) ||
          `https://cdn.discordapp.com/embed/avatars/${
            this.client.user.id % 5
          }.png`,
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
        {
          guildData,
          data,
          sidebar: this.sidebar,
          getDefaultComponent: this.getDefaultComponent,
        },
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

    app.use((req, res) => {
      res
        .status(404)
        .sendFile(path.join(__dirname, "../", "dashboard/html/pages/404.html"));
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
