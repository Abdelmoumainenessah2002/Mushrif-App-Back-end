const messages = new Proxy(
  {},
  {
    get: (_, key) => {
      if (typeof key !== "string") return undefined;
      return key;
    },
  },
);

module.exports = messages;
