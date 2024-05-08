global.fetchedGuilds = new Map();
global.memberCount = 0;
class Guilds {
    static async fetch(client, logging = true) {
        const guilds = client.guilds.cache;

        for (const guild of guilds.values()) {
            try {
                const fetched = await client.guilds.fetch(guild.id);
                const owner = await fetched.fetchOwner();

                if (owner) {
                    fetchedGuilds.set(fetched.id, {
                        guild: {
                            id: guild.id,
                            shardId: guild?.shardId ?? 0,
                            name: guild.name,
                            icon: guild.iconURL() ?? "https://cdn.discordapp.com/embed/avatars/0.png",
                            members: fetched.memberCount,
                        },
                        owner: {
                            user: {
                                id: owner.user.id,
                                username: owner.user.username,
                                avatar: owner.user.avatarURL() ?? owner.user.defaultAvatarURL()
                            }
                        }
                    });

                    memberCount += fetched.memberCount;
                }
            } catch {
                if (logging) console.error(`Failed to fetch guild ${guild.id}`);
            }
        }
    }
}

module.exports = Guilds;
