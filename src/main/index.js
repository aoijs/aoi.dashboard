const { startServer, log, animateLoading } = require("./start.js");

const DiscordStrategy = require("passport-discord").Strategy;
const session = require("express-session");
const passport = require("passport");
const express = require("express");
const chalk = require("chalk");
const path = require("path");
const ejs = require("ejs");
const fs = require("fs");
let logging = true;

class Dashboard {
  constructor(client, options) {
    logging = options.logging;
    this.client = client;
    this.port = options.port || 3000;
    this.redirectURL = options.url + "/auth/callback";
    this.scopes = options.scopes || ["identify", "email", "guilds"];
    this.secret = options.secret;
    this.sidebar = options.sidebar || [
      { title: "Discord", to: "discord" },
      { title: "Commands", to: "commands" },
      { title: "Invite", to: "invite" },
    ];
    this.navbar = options.navbar || [
      { title: "Discord", to: "discord" },
      { title: "Commands", to: "commands" },
      { title: "Invite", to: "invite" },
    ];
    this.features = options.features;
    this.guilds = new Map();
    this.routes = options.routes;
    this.authSecret = require("crypto").randomBytes(32).toString("hex");
    this.sessionSecret = require("crypto").randomBytes(32).toString("hex");
    this.db = this.client.db;
    this.connect();
  }
  getDefaultComponent(to) {
    const defaultComponents = {
      commands: { title: "Commands", to: "/commands" },
      invite: { title: "Invite", to: "/invite" },
    };
    return (
      defaultComponents[to.toLowerCase()] || {
        title: title,
        to: `/${to}`,
      }
    );
  }

  async fetchGuilds() {
    let start = new Date();
    log(
      logging,
      "Attempting to fetch all guilds, this may take a while.",
      "warn",
      "[SERVER] [fetch]"
    );
    let loading;
    if (logging) {
      loading = animateLoading("Fetching guilds", "fetch");
    }
    if (
      this.client.cmd.default === undefined &&
      this.client.cmd.interaction.slash === undefined
    ) {
      log(
        logging,
        `No commands found, ensure you have the commands properties properly setup. Don't know how? ${chalk.blue.underline(
          "https://github.com/Faf4a/dashboard#commands"
        )}`,
        "warn",
        "[SERVER] [cmd]"
      );
    }
    const guilds = this.client.guilds.cache;
    for (const guild of guilds.values()) {
      try {
        const fetched = await this.client.guilds.fetch(guild.id);
        const owner = await this.getOwners(fetched);
        if (owner) {
          this.guilds.set(fetched.id, {
            guildName: fetched.name,
            ownerId: owner.user.id,
            ownerTag: owner.user.tag,
          });
        } else {
          log(
            logging,
            `Error fetching owner for guild with ID ${fetched.id}`,
            "error",
            "[fetch]"
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
    if (logging) {
      (await loading).stop();
    }
    for (const item of this.navbar) {
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
    for (const item of this.sidebar) {
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
        if (
          !(
            "html" in item ||
            ("title" in item && ("to" in item || "href" in item))
          )
        ) {
          console.error(
            `${chalk.red.bold("\r[ERR]")} ${chalk.red(
              "[SIDEBAR]"
            )} [Dashboard]: Failed to load dashboard with reason: ${chalk.yellow.bold(
              "title"
            )} requires ${chalk.yellow.bold("to")} or ${chalk.yellow.bold(
              "href"
            )} to work properly. \n\rLine: ${chalk.grey(
              `Line: ${JSON.stringify(item)}`
            )}`
          );
          process.exit(1);
        }
      }
    }
    for (const feature of this.features) {
      if (!("title" in feature)) {
        log(
          logging,
          `Feature has an empty or missing title. Therefore it may not display correctly.`,
          "warn",
          "\r[SERVER] [features]"
        );
      }
      if (!("description" in feature) || feature.description.length === 0) {
        log(
          logging,
          `Feature "${feature.title}" has an empty or missing descriptions. Therefore it may not display correctly.`,
          "warn",
          "\r[SERVER] [features]"
        );
      }
      if (
        !("preview" in feature) ||
        (feature.preview && feature.preview.trim() === "")
      ) {
        log(
          logging,
          `Feature "${feature.title}" has an empty or missing preview image. Therefore it may not display correctly.`,
          "warn",
          "\r[SERVER] [features]"
        );
      }
    }
    log(
      logging,
      `Fetched all guilds in ${(new Date() - start) / 1e3} seconds.`,
      "success",
      "[SERVER] [fetch]"
    );
  }
  async getOwners(guild) {
    try {
      const owner = await guild.fetchOwner();
      return owner;
    } catch (err) {
      return null;
    }
  }
  connect = async () => {
    const app = express();
    app.use(
      session({ secret: this.secret, resave: true, saveUninitialized: false })
    );
    app.use(express.json());
    app.use(passport.initialize());
    app.use(passport.session());
    await new Promise((resolve) => {
      this.client.once("ready", () => {
        if (logging) {
          setTimeout(() => {
            resolve();
          }, 4000); // delay due to aoi.js logging or user logging (ignore)
        } else {
          resolve(); // skip delay (no logging)
        }
      });
    });
    this.client.on("guildCreate", async (guild) => {
      this.guilds.set(guild.id, guild);
    });
    this.client.on("guildDelete", async (guild) => {
      this.guilds["delete"](guild.id);
    });
    const allowedScopes = [
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
      log(
        logging,
        "Failed to load dashboard with reason: Scopes must contain only allowed scopes or be non-empty.",
        "error",
        "[SERVER] [scopes]"
      );
      process.exit(1);
    }
    const invalidScopes = this.scopes.filter(
      (scope) => !allowedScopes.includes(scope)
    );
    if (invalidScopes.length > 0) {
      log(
        logging,
        `Failed to load dashboard with reason: Scopes must contain only allowed scopes or be non-empty. Invalid scopes: "${chalk.redBright.bold(
          invalidScopes.join(chalk.white(`", "`))
        )}"`,
        "error",
        "[SERVER] [scopes]"
      );
      process.exit(1);
    }
    if (!this.secret) {
      log(
        logging,
        "Failed to load dashboard with reason: Invalid or no clientSecret was provided. Don't know what that is? Check this: https://support.heateor.com/discord-client-id-discord-client-secret/",
        "error",
        "[SERVER] [clientSecret]"
      );
      process.exit(1);
    }
    if (
      !this.redirectURL ||
      (!this.redirectURL.startsWith("https://") &&
        !this.redirectURL.startsWith("http://"))
    ) {
      log(
        logging,
        `Failed to load dashboard with reason: Invalid or no ${chalk.yellow.bold(
          "redirectURL"
        )} was provided. ${chalk.yellow.bold(
          "redirectURL"
        )} must begin with either ${chalk.yellow.bold(
          "http://"
        )} or ${chalk.yellow.bold("https://")}`,
        "error",
        "[SERVER] [redirectURL]"
      );
      process.exit(1);
    }
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
    if (this.routes) {
      this.routes.forEach((route) => {
        if (!route.name) {
          log(
            logging,
            `Failed to load dashboard with reason: One or multiple routes are missing the name property. \n\r${chalk.grey(
              `Line: ${JSON.stringify(route)}`
            )}`,
            "error",
            "[SERVER] [ROUTES]"
          );
          process.exit(1);
        }
        const { name, path: filePath, requireAuth } = route;
        app.get(
          name,
          requireAuth === true
            ? ensureAuthenticated
            : (_req, _res, next) => next(),
          async (_req, res) => {
            if (!filePath || !fs.existsSync(filePath)) {
              ejs.renderFile(
                path.join(__dirname, "../dashboard/html/pages/setup.html"),
                {
                  sidebar: this.navbar,
                  getDefaultComponent: this.getDefaultComponent,
                },
                (err, html) => {
                  if (err) {
                    log(
                      logging,
                      "Failed to load dashboard with reason: One or multiple routes are invalid.",
                      "error",
                      "[SERVER] [ROUTES]"
                    );
                    return;
                  } else {
                    res.send(html);
                  }
                }
              );
            } else {
              ejs.renderFile(
                filePath,
                {
                  sidebar: this.navbar,
                  getDefaultComponent: this.getDefaultComponent,
                },
                (err, html) => {
                  if (err) {
                    log(
                      logging,
                      "Failed to load dashboard with reason: One or multiple routes are invalid.",
                      "error",
                      "[SERVER] [ROUTES]"
                    );
                    return;
                  } else {
                    res.send(html);
                  }
                }
              );
            }
          }
        );
      });
    }

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
          data: data,
          sidebar: this.navbar,
          getDefaultComponent: this.getDefaultComponent,
        },
        (err, html) => {
          if (err) {
            log(
              logging,
              `Failed to load Dashboard with reason: ${err}`,
              "error",
              "[SERVER]"
            );
            this.client.destroy();
          } else {
            res.send(html);
          }
        }
      );
    });

    app.get("/assets/style.css", (req, res) => {
      res.sendFile(
        path.join(__dirname, "../", "dashboard/html/assets/style.css"),
        {
          headers: {
            "Content-Type": "text/css",
          },
        },
        (err) => {
          if (err) {
            log(
              logging,
              `Failed to load Dashboard with reason: ${err}`,
              "error",
              "[SERVER] [css]"
            );
            this.client.destroy();
          }
        }
      );
    });

    app.get("/status", async (req, res) => {
      const data = {
        client: this.client,
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
        path.join(__dirname, "../", "dashboard/html/pages/status.html"),
        {
          data: data,
          sidebar: this.navbar,
          getDefaultComponent: this.getDefaultComponent,
        },
        (err, html) => {
          if (err) {
            log(
              logging,
              `Failed to load Dashboard with reason: ${err}`,
              "error",
              "[SERVER]"
            );
            this.client.destroy();
          } else {
            res.send(html);
          }
        }
      );
    });

    app.get("/commands", async (req, res) => {
      const data = {
        client: this.client,
        commands: {
          text: this.client.cmd.default.map((x) => x.name).join(", "),
          slash: this.client.cmd.interaction.slash
            .map((x) => x.name)
            .join(", "),
        },
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
      if (
        this.client.cmd.default === undefined &&
        this.client.cmd.interaction.slash === undefined
      ) {
        ejs.renderFile(
          path.join(__dirname, "../dashboard/html/pages/commands-setup.html"),
          {
            sidebar: this.navbar,
            getDefaultComponent: this.getDefaultComponent,
          },
          (err, html) => {
            if (err) {
              log(
                logging,
                "Failed to load dashboard with reason: One or multiple routes are invalid.",
                "error",
                "[SERVER] [ROUTES]"
              );
              return;
            } else {
              res.send(html);
            }
          }
        );
      } else {
        ejs.renderFile(
          path.join(__dirname, "../", "dashboard/html/pages/commands.html"),
          {
            data: data,
            sidebar: this.navbar,
            getDefaultComponent: this.getDefaultComponent,
          },
          (err, html) => {
            if (err) {
              log(
                logging,
                `Failed to load Dashboard with reason: ${err}`,
                "error",
                "[SERVER]"
              );
              this.client.destroy();
            } else {
              res.send(html);
            }
          }
        );
      }
    });

    app.get("/invite", async (req, res) => {
      const data = {
        avatar:
          this.client.user.avatarURL({ format: "png", size: 4096 }) ||
          `https://cdn.discordapp.com/embed/avatars/${
            this.client.user.id % 5
          }.png`,
        invite: this.client.generateInvite({
          scopes: ["applications.commands", "bot"],
        }),
        username: this.client.user.username,
        id: this.client.user.id,
      };
      ejs.renderFile(
        path.join(__dirname, "../", "dashboard/html/pages/invite.html"),
        {
          data: data,
          sidebar: this.navbar,
          getDefaultComponent: this.getDefaultComponent,
        },
        (err, html) => {
          if (err) {
            log(
              logging,
              `Failed to load Dashboard with reason: ${err}`,
              "error",
              "[SERVER]"
            );
            this.client.destroy();
          } else {
            res.send(html);
          }
        }
      );
    });

    app.get("/api/client", async (req, res) => {
      res.status(200).send({
        data: {
          ping: JSON.stringify(this.client.ws.ping),
          db_ping: JSON.stringify(this.client.db.ping),
          uptime: JSON.stringify(this.client.uptime),
        },
      });
    });

    app.post("/data/update/:guildid", ensureAuthenticated, async (req, res) => {
      const guildId = req.params.guildid;
      const userPermissions = req.user.guilds.find(
        (guild) => guild.id === guildId
      )?.permissions;
      if (Boolean(userPermissions & 8) || Boolean(userPermissions & 32)) {
        try {
          const data = req.body;
          this.db.set(
            this.client.db.tables[0],
            data.variable,
            guildId,
            data.value
          );
          res.status(200).json({ message: "Data updated successfully" });
        } catch (err) {
          log(
            logging,
            `Failed to update data with reason: ${err}`,
            "error",
            "[SERVER] [API]"
          );
          res.status(500).json({ error: "Failed to update data" });
        }
      } else {
        return;
      }
    });
    app.get("/dash/guilds/:guildid", ensureAuthenticated, async (req, res) => {
      const mutualGuilds = this.client.guilds.cache.filter((guild) =>
        req.user.guilds.some((userGuild) => userGuild.id === guild.id)
      );
      const guildId = req.params.guildid;
      const guild = await this.client.guilds.fetch(guildId);
      const owner = await guild.fetchOwner();
      const gobj = {
        name: guild.name,
        id: guild.id,
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
      if (!guild) {
        ejs.renderFile(
          path.join(__dirname, "../", "dashboard/html/pages/401.html"),
          {
            sidebar: this.navbar,
            getDefaultComponent: this.getDefaultComponent,
          },
          async (err, html) => {
            if (err) {
              log(
                logging,
                `Failed to load Dashboard with reason: ${err}`,
                "error",
                "[SERVER]"
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
      if (Boolean(userPermissions & 8) || Boolean(userPermissions & 32)) {
        ejs.renderFile(
          path.join(__dirname, "../", "dashboard/html/pages/guild.html"),
          {
            guildData: guildData,
            gobj: gobj,
            data: data,
            sidebar: this.sidebar,
            getDefaultComponent: this.getDefaultComponent,
          },
          (err, html) => {
            if (err) {
              log(
                logging,
                `Failed to load Dashboard with reason: ${err}`,
                "error",
                "[SERVER]"
              );
              this.client.destroy();
            } else {
              res.send(html);
            }
          }
        );
      } else {
        ejs.renderFile(
          path.join(__dirname, "../", "dashboard/html/pages/401.html"),
          {
            data: data,
            sidebar: this.navbar,
            getDefaultComponent: this.getDefaultComponent,
          },
          (err, html) => {
            if (err) {
              log(
                logging,
                `Failed to load Dashboard with reason: ${err}`,
                "error",
                "[SERVER]"
              );
              this.client.destroy();
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
          guildData: guildData,
          data: data,
          sidebar: this.navbar,
          getDefaultComponent: this.getDefaultComponent,
        },
        async (err, html) => {
          if (err) {
            log(
              logging,
              `Failed to load Dashboard with reason: ${err}`,
              "error",
              "[SERVER]"
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
    startServer(app, this.port, this.secret);
  };
}

module.exports = { Dashboard };
