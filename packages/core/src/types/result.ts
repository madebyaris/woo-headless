/**
 * Result type for comprehensive error handling
 * Following the enhanced unified-10x-dev framework
 */

export interface Success<T> {
  readonly success: true;
  readonly data: T;
}

export interface Failure<E> {
  readonly success: false;
  readonly error: E;
}

export type Result<T, E> = Success<T> | Failure<E>;

/**
 * Create a successful result
 */
export function Ok<T>(data: T): Success<T> {
  return { success: true, data };
}

/**
 * Create a failed result
 */
export function Err<E>(error: E): Failure<E> {
  return { success: false, error };
}

/**
 * Check if result is successful
 */
export function isOk<T, E>(result: Result<T, E>): result is Success<T> {
  return result.success;
}

/**
 * Check if result is failed
 */
export function isErr<T, E>(result: Result<T, E>): result is Failure<E> {
  return !result.success;
}

/**
 * Get data from successful result or throw
 */
export function unwrap<T, E>(result: Result<T, E>): T {
  if (isOk(result)) {
    return result.data;
  }
  throw new Error(`Called unwrap on Err: ${JSON.stringify(result.error)}`);
}

/**
 * Get error from failed result or throw
 */
export function unwrapErr<T, E>(result: Result<T, E>): E {
  if (isErr(result)) {
    return result.error;
  }
  throw new Error(`Called unwrapErr on Ok: ${JSON.stringify(result.data)}`);
}

/**
 * Get data from successful result or return default
 */
export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
  return isOk(result) ? result.data : defaultValue;
}

/**
 * Map successful result to new type
 */
export function map<T, U, E>(
  result: Result<T, E>,
  fn: (data: T) => U
): Result<U, E> {
  return isOk(result) ? Ok(fn(result.data)) : result;
}

/**
 * Map error to new type
 */
export function mapErr<T, E, F>(
  result: Result<T, E>,
  fn: (error: E) => F
): Result<T, F> {
  return isErr(result) ? Err(fn(result.error)) : result;
}

/**
 * Chain operations on successful results
 */
export function andThen<T, U, E>(
  result: Result<T, E>,
  fn: (data: T) => Result<U, E>
): Result<U, E> {
  return isOk(result) ? fn(result.data) : result;
} 