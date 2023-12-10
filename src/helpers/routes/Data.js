const express = require("express");
const router = express.Router();

const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  res.redirect("/auth/login");
};

const hasPermission = (member) => {
  return (
    member.permissions.has("MANAGE_GUILD") ||
    member.permissions.has("ADMINISTRATOR")
  );
};

module.exports = (client) => {
  router.get("/client", (req, res) => {
    res.json({ client: { ws: client.ws.ping, uptime: client.uptime } });
  });

  router.get("/guilds", ensureAuthenticated, (req, res) => {
    const filteredGuilds = req.user.guilds.reduce((acc, guild) => {
      const g = client.guilds.cache.get(guild.id);
      if (!g) return acc;

      const member = g.members.cache.get(req.user.id);
      if (!member) return acc;

      const botInGuild = g.members.cache.get(client.user.id);
      const invited = hasPermission(member) && !!botInGuild;

      acc.push({
        id: guild.id,
        name: guild.name,
        description: guild.description,
        ownerId: guild.ownerId,
        owner: req.user.id === guild.ownerId,
        memberCount: guild.memberCount,
        icon: guild.icon
          ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.webp`
          : null,
        banner: guild.banner
          ? `https://cdn.discordapp.com/banners/${guild.id}/${guild.banner}.webp`
          : null,
        splash: guild.splash
          ? `https://cdn.discordapp.com/splashes/${guild.id}/${guild.splash}.webp`
          : null,
        invited: invited,
      });

      return acc;
    }, []);

    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ guilds: filteredGuilds, size: filteredGuilds.length }, null, 2));
  });

  return router;
};
