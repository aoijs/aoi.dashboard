## Unofficial aoi.js Dashboard

Gives your users the ability to manage your bot in their guild.

Follow the progress **[here](https://github.com/users/Faf4a/projects/2)**!

## Setup

```js
const dashboard = new Dashboard(bot, { // the client
  port: 3000, // The port, default: 3000
  secret: "", // The client secret.
  scopes: ["identify", "email", "guilds"], // Scopes the website/bot will ask for. Identify/guilds are required for the dashboard to work properly.
  url: "http://localhost:3000", // Url to your website.
  logging: true, // Disable all console logs.
  routes: [{ name: "/hello", path: "", requireAuth: true }], // Custom Routes
  navbar: [ // Custom Navbar
    { title: "Dashboard", to: "/dash" },
    { title: "Commands", to: "/commands" },
    { title: "Status", to: "/status" },
    { title: "Invite", to: "/invite" },
    { title: "Discord", href: "https://example.com" },
  ],
  sidebar: [ // Custom Sidebar
    { title: "Category 1", category: true },
    { title: "Guild Info", to: "/guild", basePath: false },
    { title: "Bot Settings", to: "/settings", basePath: false },
    { title: "Category 2", category: true },
    { title: "Commands", to: "/commands", basePath: true },
  ],
  features: [
    {
      title: "Moderation System", // Title of the feature, required.
      description: [ // Description of the Feature, optional
        "Everything you need, in one bot", 
        "Anti-raid system, to keep your server safe!",
        "Easy to use, for everyone",
      ],
      preview: "Preview Image URL", // Preview Image, optional
    },
  ],
});
```
