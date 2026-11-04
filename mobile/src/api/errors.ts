// The error type every API call throws.
export class ApiError extends Error {
  constructor(
    public kind: 'network' | 'http',
    public status: number,
    public detail: unknown,
  ) {
    super(typeof detail === 'string' ? detail : JSON.stringify(detail));
  }
}
