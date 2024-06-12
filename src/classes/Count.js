memberCount = 0;

class Count {
    static async fetch(client, logging = true) {
        const guilds = client.guilds.cache;

        for (const guild of guilds.values()) {
            try {
                    const fetched = await client.guilds.fetch(guild.id);

                    memberCount += fetched.memberCount;
                
            } catch (error) {
                if (logging) console.error(`Failed to fetch members count: ${error.message}`);
            }
        }
    }
}

module.exports = Count;