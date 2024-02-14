const Guilds = require("./Fetch.js");
const router = require("../helpers/router");
const express = require("express");

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

    await Guilds.fetch(this.client);

    this.app.use("/", router(this));
    this.app.listen(this.port, () => {
      console.log("running")
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
