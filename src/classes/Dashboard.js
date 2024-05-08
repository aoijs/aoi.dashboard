const Guilds = require("./Fetch.js");
const router = require("../helpers/router");
const express = require("express");
const { KeyValue } = require("@akarui/aoi.db");

class Dashboard {
    constructor(client, { secret, port, url, navbar }) {
        this.client = client;
        this.db = new KeyValue({
            dataConfig: { path: "./dashboard-db" }
        });

        // Configuration
        this.secret = secret;
        this.port = port;
        this.callbackURL = url;

        // Customization
        this.navbar = navbar || [
            { title: "Dashboard", to: "/dash", icon: "folder_managed" },
            { title: "Commands", to: "/commands", icon: "filter_list" },
            { title: "Status", to: "/status", icon: "checklist" },
            { title: "Invite", to: "/invite", icon: "share" }
        ];

        this.db.connect();
        this.app = express();
        this.initialize();
    }

    async initialize() {
        await new Promise((resolve) => {
            this.client.once("ready", () => {
                resolve();
            });
        });

        await Guilds.fetch(this.client);

        this.app.use("/", router(this));
        this.app.listen(this.port, () => {
            console.log("hi");
        });
    }
}

module.exports = { Dashboard };
