export class ValidationError extends Error {
  constructor(field, message) {
    super(message ?? `Validation failed: ${field}`);
    this.name = "ValidationError";
    this.field = field;
  }
}

export class NotFoundError extends Error {
  constructor(id) {
    super(`Not found: ${id}`);
    this.name = "NotFoundError";
    this.id = id;
  }
}

export class StorageError extends Error {
  constructor(cause) {
    super("Storage operation failed");
    this.name = "StorageError";
    this.cause = cause;
  }
}
