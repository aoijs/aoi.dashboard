const Guilds = require("../../classes/Fetch.js");
const express = require("express");
const router = express.Router();

const ensureAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) return next();
    res.redirect("/login");
};

router.use(express.json());

module.exports = (d) => {
    router.get("/client", async (req, res) => {
        res.json({ client: { ws: d.client.ws.ping, uptime: d.client.uptime } });
    });

    router.post("/theme", ensureAuthenticated, async (req, res) => {
        if (!getDashboardAdmins(req.user.id)) return res.redirect("/?loginFailed=true");

        const mode = req.body.type;
        const theme = req.body.theme;

        try {
            await d.db.set("main", `theme_${mode}`, { value: theme });
            return res.status(200).json({ mode, theme });
        } catch {
            return res.status(500).json({ error: "An error occurred while updating the theme." });
        }
    });

    router.get("/getTheme", async (req, res) => {
        try {
            const dark = await d.db.get("main", "theme_dark");
            const light = await d.db.get("main", "theme_light");
            return res.status(200).json({ dark: dark?.value || "dark", light: light?.value || "light" });
        } catch (e) {
            return res.status(500).json({ dark: "dark", light: "light" });
        }
    });

    router.post("/manage/users/add", ensureAuthenticated, async (req, res) => {
        if (!getDashboardAdmins(req.user.id)) return res.redirect("/?loginFailed=true");

        const user = req.body.user;
        const role = req.body.role;
        const discordUser = await d.client.users.fetch(user).catch(() => null);

        if (!discordUser) return res.status(404).json({ users: [] });

        const admins = (await d.db.get("main", "admins"))?.value || [];
        let roleCheck = (await d.db.get("main", `role_${discordUser.id}`))?.value;
        if ((await d.client.application.fetch()).owner.id === req.user.id) roleCheck = "Owner";
        if (!roleCheck) roleCheck = "Manager";

        admins.push(discordUser.id);

        try {
            await d.db.set("main", "admins", { value: admins });
            await d.db.set("main", `role_${discordUser.id}`, { value: role });
            return res.status(200).json({
                // current user
                user: { role: roleCheck },
                // bot owner
                owner: { id: (await d.client.application.fetch()).owner.id },
                // user requested to be added
                user: { role: role, username: discordUser.username, id: discordUser.id, avatar: discordUser.avatarURL() || discordUser.defaultAvatarURL },
                // list of all admins (minimal data (avatar, username, id))
                admins
            });
        } catch {
            return res.status(500).json({ error: "An error occurred while updating the dashboard admins." });
        }
    });

    router.get("/manage/users/get", ensureAuthenticated, async (req, res) => {
        if (!getDashboardAdmins(req.user.id)) return res.redirect("/?loginFailed=true");

        const admins = (await d.db.get("main", "admins"))?.value;
        if (!admins) return res.status(200).json({ users: [] });

        const discordUser = await d.client.users.fetch(req.user.id).catch(() => null);

        if (!discordUser) return res.status(404).json({ users: [] });
        const users = [];
        let roleCheck = (await d.db.get("main", `role_${discordUser.id}`))?.value;
        if ((await d.client.application.fetch()).owner.id === req.user.id) roleCheck = "Owner";
        if (!roleCheck) roleCheck = "Manager";

        for (const admin of admins) {
            const discordUser = await d.client.users.fetch(admin);
            if (!discordUser) continue;
            const role = (await d.db.get("main", `role_${discordUser.id}`))?.value || "Manager";
            users.push({
                role,
                username: discordUser.username,
                id: discordUser.id,
                avatar: discordUser.avatarURL() || discordUser.defaultAvatarURL
            });
        }

        return res.status(200).json({ user: { role: roleCheck }, owner: { id: (await d.client.application.fetch()).owner.id }, users });
    });

    router.post("/manage/users/remove", ensureAuthenticated, async (req, res) => {
        if (!getDashboardAdmins(req.user.id)) return res.redirect("/?loginFailed=true");

        const user = req.body.user;
        const discordUser = await d.client.users.fetch(user).catch(() => null);

        if (!discordUser) return res.status(404).json({ users: [] });

        let admins = (await d.db.get("main", "admins"))?.value || [];

        admins = admins.filter((x) => x !== discordUser.id);

        try {
            await d.db.set("main", "admins", { value: admins });
            return res.status(200).json({ user: { id: discordUser.id }, admins });
        } catch {
            return res.status(500).json({ error: "An error occurred while updating the dashboard admins." });
        }
    });

    router.get('/user/guilds', ensureAuthenticated, async (req, res) => {
        try {
            const userGuilds = await Guilds.fetch(d.client, req.user.id);
            res.json(userGuilds);
        } catch (error) {
            console.log(error)
            res.status(500).json({ error: "Couldn't fetch guilds" });
        }
    });
    
    async function getDashboardAdmins(user) {
        if (user === (await d.client.application.fetch()).owner.id) return true;
        if (!user) {
            return (await d.db.get("main", "admins"))?.value || [];
        } else {
            const admins = (await d.db.get("main", "admins"))?.value || [];
            return admins.includes(user);
        }
    }
    
    function formatUptime(ms) {
        let seconds = Math.floor(ms / 1000);
        let minutes = Math.floor(seconds / 60);
        let hours = Math.floor(minutes / 60);
    
        seconds = seconds % 60;
        minutes = minutes % 60;
    
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    router.get('/status', (req, res) => {
        res.json({
            status: d.client.uptime ? 'Online' : 'Offline',
            ping: d.client.ws.ping + 'ms',
            uptime: d.client.uptime ? formatUptime(d.client.uptime) : 'N/A',
        });
    });

    return router;
};