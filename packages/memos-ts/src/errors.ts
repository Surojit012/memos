export class MemosError extends Error {
  public readonly statusCode: number | undefined
  constructor(message: string, statusCode?: number) {
    super(message)
    this.name = 'MemosError'
    this.statusCode = statusCode
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class AuthError extends MemosError {
  constructor(message = 'Invalid or missing API key') {
    super(message, 401)
    this.name = 'AuthError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class RateLimitError extends MemosError {
  constructor() {
    super('Rate limit exceeded. Wait before retrying.', 429)
    this.name = 'RateLimitError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class NotFoundError extends MemosError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404)
    this.name = 'NotFoundError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class ServerError extends MemosError {
  constructor(message: string, statusCode: number) {
    super(message, statusCode)
    this.name = 'ServerError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
