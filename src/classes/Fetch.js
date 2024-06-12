fetchedGuilds = new Map();
ownerData = {};

class Guilds {
    static async fetch(client, user = client.user.id, logging = true) {
        const guilds = client.guilds.cache;

        for (const guild of guilds.values()) {
            try {
                const member = await guild.members.fetch(user).catch(() => null);

                if (member && member.permissions.has("MANAGE_GUILD")) {
                    const fetched = await client.guilds.fetch(guild.id);
                    const owner = await fetched.fetchOwner();

                    fetchedGuilds.set(fetched.id, {
                        guild: {
                            id: guild.id,
                            shardId: guild?.shardId ?? 0,
                            name: guild.name,
                            icon: guild.iconURL() ?? "https://cdn.discordapp.com/embed/avatars/0.png",
                            banner: guild.bannerURL(),
                            members: fetched.memberCount
                        },
                    });
                    
                    ownerData =  {
                        user: {
                            id: owner.user.id,
                            username: owner.user.username,
                            avatar: owner.user.avatarURL() ?? owner.user.defaultAvatarURL()
                        }
                    }
                }
            } catch (error) {
                if (logging) console.error(`Failed to fetch guild ${guild.id}: ${error.message}`);
            }
        }

        return { fetchedGuilds: Array.from(fetchedGuilds.values())};
    }
}

module.exports = Guilds;
