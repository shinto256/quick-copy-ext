export function installChromeStorageMock() {
  const store = {};
  globalThis.chrome = {
    storage: {
      local: {
        async get(key) {
          return Object.prototype.hasOwnProperty.call(store, key)
            ? { [key]: store[key] }
            : {};
        },
        async set(items) {
          Object.assign(store, items);
        },
      },
    },
  };
  return store;
}
