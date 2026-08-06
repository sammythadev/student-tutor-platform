import { AxiosError } from 'axios'

export type ApiErrorKind =
  | 'capacity'      // 409 — tutor filled up concurrently
  | 'ineligible'    // 400 — hard eligibility filter rejected the pairing
  | 'already-matched'
  | 'validation'    // 422 — payload failed class-validator
  | 'unauthorized'
  | 'not-found'
  | 'server'
  | 'network'

export interface ApiError {
  kind: ApiErrorKind
  /** Server-provided text, safe to show. Falls back to a kind-specific default. */
  message: string
  status: number | null
  /** What the user can actually do about it. Empty when there is no useful action. */
  action: string
}

const DEFAULT_MESSAGE: Record<ApiErrorKind, string> = {
  capacity: 'That tutor just reached their student limit.',
  ineligible: 'This tutor is not a match for your subject and grade level.',
  'already-matched': 'You already have an active tutor.',
  validation: 'Some of the details provided are not valid.',
  unauthorized: 'Your session has expired.',
  'not-found': 'We could not find what you were looking for.',
  server: 'Something went wrong on our end.',
  network: 'Cannot reach the server. Check your connection.',
}

const ACTION: Record<ApiErrorKind, string> = {
  capacity: 'Choose another tutor from your matches.',
  ineligible: 'Browse tutors who teach your required subject.',
  'already-matched': 'End your current match before choosing a new tutor.',
  validation: '',
  unauthorized: 'Sign in again to continue.',
  'not-found': '',
  server: 'Please try again in a moment.',
  network: '',
}

function readMessage(payload: unknown): string | null {
  if (typeof payload !== 'object' || payload === null) return null
  const message = (payload as { message?: unknown }).message
  if (typeof message === 'string') return message
  // class-validator returns an array of constraint failures
  if (Array.isArray(message) && typeof message[0] === 'string') return message[0]
  return null
}

// The backend distinguishes "already has an active assignment" from a genuine
// eligibility rejection, but both surface as 400. The message is the only signal.
function isAlreadyMatched(message: string | null): boolean {
  return message !== null && message.toLowerCase().includes('already has an active assignment')
}

function classify(status: number | null, message: string | null): ApiErrorKind {
  if (status === null) return 'network'
  if (status === 409) return 'capacity'
  if (status === 401 || status === 403) return 'unauthorized'
  if (status === 404) return 'not-found'
  if (status === 422) return 'validation'
  if (status === 400) return isAlreadyMatched(message) ? 'already-matched' : 'ineligible'
  return 'server'
}

export function toApiError(error: unknown): ApiError {
  const status = error instanceof AxiosError ? (error.response?.status ?? null) : null
  const serverMessage = error instanceof AxiosError ? readMessage(error.response?.data) : null
  const kind = classify(status, serverMessage)

  return {
    kind,
    message: serverMessage ?? DEFAULT_MESSAGE[kind],
    status,
    action: ACTION[kind],
  }
}

/** Single-line form for toasts, which have no room for a separate action line. */
export function apiErrorText(error: unknown): string {
  const { message, action } = toApiError(error)
  return action ? `${message} ${action}` : message
}
