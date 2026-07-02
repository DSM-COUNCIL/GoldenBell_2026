export class ServiceError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error";
}

export function getErrorStatus(error: unknown): number {
  if (error instanceof ServiceError) {
    return error.status;
  }

  return 500;
}
