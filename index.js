const { AoiClient, LoadCommands } = require("aoi.js");
const { Dashboard } = require("./src/main/index.js");

const bot = new AoiClient({
  prefix: "!",
  token: "ODI3MjMxOTkyMDY3OTE1Nzc4.GCD_Sp.zKIMEa4mgMn-ZBvfEJ6PNJUgDHub2bZ770hyDQ",
  intents: ["MessageContent", "Guilds", "GuildMessages"],
  events: ["onMessage"],
  database: {
    type: "aoi.db",
    db: require("@akarui/aoi.db"),
    tables: ["main"],
    path: "./database/",
    extraOptions: {
      dbType: "KeyValue",
    },
  },
});

bot.command({
    name: "eval",
    code: `\`\`\`js
$eval[$message;true;true;true]
\`\`\``
})

bot.variables({
    prefix: "!"
})

const dashboard = new Dashboard(bot, {
  port: 3000,
  secret: "abuE7ne0FenDX6fi0PX0IRFFL8QiPHBg",
  scopes: ["identify", "email", "guilds"],
  url: "",
  navbar: [
    { title: "Dashboard", to: "/dash" },
    { title: "Commands", to: "/commands" },
    { title: "Status", to: "/status" },
    { title: "Invite", to: "/invite" },
    { title: "Discord", href: "https://example.com" },
  ],
  sidebar: [
    { title: "Category 1", category: true },
    { title: "Guild Info", to: "/guild", basePath: false },
    { title: "Bot Settings", to: "/settings", basePath: false },
    { title: "Category 2", category: true }, 
    { title: "Commands", to: "/commands", basePath: true },
  ],
  features: [
    {
      title: "some title",
      preview:
        "https://media.discordapp.net/attachments/832704676096245800/1136798304852775012/image0.jpg?width=723&height=559",
    },
    {
      title: "some other title",
      description: [
        "this would equal to point 1",
        "this would equal to point 2",
        "this would equal to point 3",
      ],
    },
  ],
});

dashboard.connect();