export type ApiErrorDetails = Array<{
  path: Array<string | number>;
  message: string;
}>;

export type ApiErrorResponse = {
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetails;
  };
};

export function toErrorPath(
  path: readonly PropertyKey[],
  prefix?: string,
): Array<string | number> {
  const segments: Array<string | number> = prefix === undefined ? [] : [prefix];

  for (const segment of path) {
    if (typeof segment === "symbol") {
      segments.push(segment.description ?? segment.toString());
    } else {
      segments.push(segment);
    }
  }

  return segments;
}

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: ApiErrorDetails;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: ApiErrorDetails,
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;

    if (details !== undefined) {
      this.details = details;
    }
  }
}
