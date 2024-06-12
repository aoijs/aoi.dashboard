const { AoiClient, LoadCommands } = require("aoi.js");
require("dotenv").config();
const { Dashboard } = require('./src/classes/Dashboard');

const client = new AoiClient({
    token: process.env.TOKEN,
    prefix: "=",
    intents: ["GuildVoiceStates", "Guilds", "GuildMessages", "DirectMessages", "MessageContent"],
    events: ["onInteractionCreate", "onGuildJoin", "onGuildLeave", "onMessage", "onVoiceStateUpdate"],
    guildOnly: true,
    database: {
        type: "aoi.db",
        db: require("@akarui/aoi.db"),
        dbType: "KeyValue",
        tables: ["main"]
    }
});

const DashConfig = {
    secret: process.env.SECRET,
    port: 3000, // Specify the port you want the dashboard to run on
    url: 'http://localhost:3000', // Adjust to your Dashboard URL
    navbar: [ // Customize your navbar items if needed
        { title: 'Dashboard', to: '/dash', icon: 'folder_managed' },
        { title: 'Commands', to: '/commands', icon: 'filter_list' },
        { title: 'Status', to: '/status', icon: 'checklist' },
        { title: 'Invite', to: '/invite', icon: 'share' }
    ]
};

const dashboard = new Dashboard(client, DashConfig);