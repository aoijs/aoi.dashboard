const { Console } = require("./Log.js");

class Checker {
  static input({ secret, port, url, navbar, client }) {
    if (!secret || typeof secret !== "string") {
      const error = "Invalid secret provided";
      Console.log(error, "error");
      throw new Error(error);
    }

    if (!port || typeof port !== "number") {
      const error = "Invalid port provided";
      Console.log(error, "error");
      throw new Error(error);
    }

    if (!url || typeof url !== "string") {
      const error = "Invalid URL provided";
      Console.log(error, "error");
      throw new Error(error);
    }

    const index = navbar.findIndex((item) => !item.title || (!item.to && !item.href));
    if (!Array.isArray(navbar) || index !== -1) {
      const error = index !== -1 ? `Navbar element at index ${index} is missing a 'title' or either a 'to' or 'href' item` : "Navbar elements should be an array";
      Console.log(error, "error");
      throw new Error(error);
    }

    if (!url.startsWith("https://") && !url.startsWith("http://")) {
      const error = "Invalid callback URL. It should start with 'https://' or 'http://'";
      Console.log(error, "error");
      throw new Error(error);
    }

    if (typeof client !== "object" || client === null) {
      const error = "Invalid client provided";
      Console.log(error, "error");
      throw new Error(error);
    }
  }
}

module.exports = { Checker };
