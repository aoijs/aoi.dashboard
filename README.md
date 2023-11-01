## Unofficial aoi.js Dashboard

Gives your users the ability to manage your bot in their guild.


https://github.com/Faf4a/dashboard/labels/Feature%20Request:
You can always open a feature request to request upcoming features, nothing is decided yet and more may come.

https://github.com/Faf4a/dashboard/labels/Issue%20Tracker:
You can also report issues easily my opening an [Github Issue](https://github.com/Faf4a/dashboard/issues), follow the progress [here](https://github.com/users/Faf4a/projects/2)!

## Setup[^1]

```js
const dashboard = new Dashboard(bot, { // the client
  port: 3000, // The port, default: 3000
  secret: "", // The client secret.
  scopes: ["identify", "email", "guilds"], // Scopes the website/bot will ask for. Identify/guilds are required for the dashboard to work properly.
  url: "http://localhost:3000", // Url to your website.
  logging: true, // Toggle all irrelevant console logs (run message will always display to indicate successful startup).
  routes: [{ name: "/(your route)", path: "(your path to html file)", requireAuth: true }], // Custom Routes, include data for sidebar, navbar and other selectors.
  navbar: [ // Custom Navbar, these endpoints are always available. Can be disabled with "default: false" (not implemented)
    { title: "Dashboard", to: "/dash" },
    { title: "Commands", to: "/commands" },
    { title: "Status", to: "/status" },
    { title: "Invite", to: "/invite" }, 
    { title: "Discord", href: "https://example.com" },
  ],
  sidebar: [ // Custom Sidebar, these endpoints are always available. Can be disabled with "default: false" (not implemented)
    { title: "Category 1", category: true },
    { title: "Guild Info", to: "/guild", basePath: false },
    { title: "Bot Settings", to: "/settings", basePath: false },
    { title: "Category 2", category: true },
    { title: "Commands", to: "/commands", basePath: true },
  ],
  features: [
    {
      title: "Moderation Built-In", // Title of the feature, required.
      description: [
        // Description of the Feature, optional
        "Everything you need, in one bot",
        "Anti-raid system, to keep your server safe!",
        "Easy to use, for everyone",
      ],
      preview: {
        image: "https://i.imgur.com/aRXhH8O.png",
        width: "auto",
        height: "auto",
        alt: "Image of some website",
      }, // Preview Image, optional
    },
  ],
});
```

[^1]: last updated: 01/11/2023
