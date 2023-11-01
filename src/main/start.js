const chalk = require("chalk");

const log = (logging, message, level = "default", tag = "") => {
  let logFunction;
  let logColor;

  if (logging === true) {
    switch (level.toLowerCase()) {
      case "error":
        logFunction = console.error;
        logColor = chalk.red.bold;
        tag = tag || "[ERR]";
        break;
      case "warn":
        logFunction = console.warn;
        logColor = chalk.yellow.bold;
        tag = tag || "[WARN]";
        break;
      case "success":
        logFunction = console.log;
        logColor = chalk.green.bold;
        tag = tag || "[SUCCESS]";
        break;
      default:
        logFunction = console.log;
        logColor = chalk.white;
        tag = tag || "";
    }

    logFunction(
      `\r${logColor(tag.padEnd(22))} ${chalk.whiteBright("[Dashboard]")}: ${message}`
    );
  }
};

const tryListen = (app, port) => {
  return new Promise((resolve, reject) => {
    app.listen(port, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

const startServer = async (app, port) => {
  const maxAttempts = 5;
  let attempt = 0;

  while (attempt < maxAttempts) {
    try {
      await tryListen(app, port);
      log(true, "Marked Dashboard as Running", "success", "[SERVER]");
      break;
    } catch (error) {
      attempt++;
      port = Math.floor(Math.random() * 5000) + 3000;
      if (attempt === maxAttempts)
        log(
          true,
          `Failed to load dashboard with reason: port ${chalk.yellow.bold(
            this.port
          )} already in use.`,
          "warn",
          "[SERVER] [port]"
        );
    }
  }
};

module.exports = { log, startServer };
