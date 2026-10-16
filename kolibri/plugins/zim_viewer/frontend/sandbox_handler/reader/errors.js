export class NotZimError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotZimError';
  }
}

export class CorruptZimError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CorruptZimError';
  }
}

export class UnsupportedCompressionError extends Error {
  constructor(compression) {
    super(`Unsupported ZIM cluster compression byte: ${compression}`);
    this.name = 'UnsupportedCompressionError';
    this.compression = compression;
  }
}

export class ResolveError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'ResolveError';
    this.status = status;
  }
}
