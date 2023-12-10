const chalk = require("chalk");

class Console {
  static log(text, type, custom) {
    switch (type) {
      case "error":
        console.error(chalk.bgRed(" ERR ") + " [Dashboard]: " + text);
        break;
      case "warn":
        console.warn(chalk.bgYellow(" WARN ") + " [Dashboard]: " + text);
        break;
      case "info":
        console.log(chalk.bgBlueBright(" INFO ") + " [Dashboard]: " + text);
        break;
      case "custom":
        console.log(chalk.bgWhite(` ${custom} `) + " [Dashboard]: " + text);
        break;
      default:
        console.log(text);
        break;
    }
  }
}

module.exports = { Console };
