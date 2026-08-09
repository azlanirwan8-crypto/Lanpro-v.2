if (!globalThis.DOMException) {
  // Fallback for older environments, though Node 18+ has native DOMException
  globalThis.DOMException = class DOMException extends Error {
    constructor(message, name) {
      super(message);
      this.name = name || 'DOMException';
    }
  };
}

module.exports = globalThis.DOMException;
