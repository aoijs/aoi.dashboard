const chalk = require("chalk");
const express = require("express");
const session = require("express-session");
const passport = require("passport");

const animateLoading = (text, type) => {
  const frames = ["⠙", "⠘", "⠰", "⠴", "⠤", "⠦", "⠆", "⠃", "⠋", "⠉"];
  let i = 0;
  let loadingInterval;

  return {
    start: () => {
      loadingInterval = setInterval(() => {
        process.stdout.clearLine();
        process.stdout.cursorTo(0);
        process.stdout.write(
          `\r ${chalk.blue.bold(frames[i])} ${chalk.yellow.bold(
            `[SERVER] [${type}]`
          )} [Dashboard]: ${text}`
        );
        i = (i + 1) % frames.length;
      }, 100);
    },
    stop: () => {
      clearInterval(loadingInterval);
      process.stdout.clearLine();
      process.stdout.cursorTo(0);
    },
  };
};

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
      `\r${logColor(tag)} ${chalk.whiteBright("[Dashboard]")}: ${message}`
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

  const loadingInterval = animateLoading(
    "Attempting to start the web server..",
    "init"
  );
  loadingInterval.start();

  while (attempt < maxAttempts) {
    try {
      await tryListen(app, port);
      (await loadingInterval).stop();
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

module.exports = { animateLoading, log, startServer };
