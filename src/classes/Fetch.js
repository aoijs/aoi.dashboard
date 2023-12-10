global.fetchedGuilds = new Map();
global.memberCount = 0;

const { Console } = require("./Log");

class Guilds {
  static async fetch(client, logging = true) {
    const guilds = client.guilds.cache;
    const start = new Date();

    if (logging) {
      Console.log(`Fetching ${guilds.size} guilds. Estimated time: ~${guilds.size * 0.5} seconds`, "info");
    }

    for (const guild of guilds.values()) {
      try {
        const fetched = await client.guilds.fetch(guild.id);
        const owner = await fetched.fetchOwner();

        if (owner) {
          fetchedGuilds.set(fetched.id, {
            guild: {
              id: guild.id,
              shardId: guild?.shardId || -1,
              name: guild.name,
              icon: guild.iconURL() || "https://cdn.discordapp.com/embed/avatars/0.png",
            },
            owner: {
              user: {
                id: owner.user.id,
                username: owner.user.username,
                avatar: owner.user.avatarURL() || owner.user.defaultAvatarURL,
              },
            },
          });

          memberCount += fetched.memberCount;
        } else {
          Console.log(`Error fetching owner for guild with ID: ${guild.id}. Unable to find guild owner.`, "warn");
          Console.log("Fetching guilds...", "custom", "LOAD");
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      } catch (err) {
        Console.log(`Error fetching owner for guild with ID ${guild.id}: ${err}`, "error");
        Console.log("Fetching guilds...", "custom", "LOAD");
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    Console.log("All guilds fetched successfully!", "info");
  }
}

module.exports = Guilds;
