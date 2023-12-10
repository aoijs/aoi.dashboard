const { Checker } = require("./Check");
const { Console } = require("./Log.js");
const Guilds = require("./Fetch.js");

const router = require("../helpers/router");
const express = require("express");
const net = require("net");

class Dashboard {
  constructor(client, { secret, port, url, navbar }) {
    this.client = client;

    // Configuration
    this.secret = secret;
    this.port = port;
    this.callbackURL = url;

    // Customization
    this.navbar = navbar || [
      { title: "Dashboard", to: "/dash" },
      { title: "Commands", to: "/commands" },
      { title: "Status", to: "/status" },
      { title: "Invite", to: "/invite" },
    ];

    this.app = express();
    this.initialize();
  }

  async initialize() {
    await new Promise((resolve) => {
      this.client.once("ready", () => {
        setTimeout(() => {
          resolve();
        }, 5000);
      });
    });

    // Check if the port is already in use
    if ((await this.checkPort(this.port))) {
      Console.log(`Port ${this.port} is already in use, skipping.`, "warn");
      return;
    }

    try {
      Checker.input({
        secret: this.secret,
        port: this.port,
        url: this.callbackURL,
        navbar: this.navbar,
        client: this.client,
      });
    } catch (error) {
      Console.log("Failed to initialize dashboard.", "error");
      throw error;
    }

    await Guilds.fetch(this.client);

    this.app.use("/", router(this));
    this.app.listen(this.port, () => {
      Console.log(`Server is running on port ${this.port}`, "info");
    });
  }

  async checkPort(port) {
    return new Promise((resolve) => {
      const tester = net.createServer()
        .once('error', () => resolve(true))
        .once('listening', () => {
          tester.once('close', () => resolve(false)).close();
        })
        .listen(port);
    });
  }
}

module.exports = { Dashboard };
