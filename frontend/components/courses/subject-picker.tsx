'use client'

import { useEffect, useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { getCourseSubjects, type CourseSubjectOption } from '@/lib/api/courses'
import { toApiError } from '@/lib/api/errors'

/** Matches the DTO's cap; a course with more subjects than this is a taxonomy error. */
export const MAX_COURSE_SUBJECTS = 8

/**
 * The platform's subject list is a fixed, tiny taxonomy, so one successful fetch is
 * shared for the whole session by the editor and the edit dialog. A failed load is
 * not cached, so opening either surface again retries it.
 */
let pending: Promise<CourseSubjectOption[]> | null = null
function loadSubjects(): Promise<CourseSubjectOption[]> {
  pending ??= getCourseSubjects().catch((cause: unknown) => {
    pending = null
    throw cause
  })
  return pending
}

/**
 * Subjects an author links a course to, so students and other tutors can tell two
 * courses with the same title apart and so the library can be segmented by subject.
 * Links are optional: a course with no subject is still complete.
 */
export function SubjectPicker({ value, onChange, disabled = false, idPrefix }: {
  value: string[]
  onChange: (codes: string[]) => void
  disabled?: boolean
  idPrefix: string
}) {
  // Result and failure are separate so the effect only ever reports through an
  // async callback — no state is written during the effect body itself.
  const [options, setOptions] = useState<CourseSubjectOption[] | null>(null)
  const [failure, setFailure] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    let active = true
    void loadSubjects()
      .then(data => { if (active) { setOptions(data); setFailure(null) } })
      .catch((cause: unknown) => { if (active) { setOptions(null); setFailure(toApiError(cause).message) } })
    return () => { active = false }
  }, [retry])

  const error = failure

  const selected = new Set(value.map(code => code.toLowerCase()))
  const needle = filter.trim().toLowerCase()
  const rows = (options ?? []).filter(option =>
    !needle || option.name.toLowerCase().includes(needle) || option.code.includes(needle))
  const atCapacity = selected.size >= MAX_COURSE_SUBJECTS

  function toggle(code: string, checked: boolean) {
    const next = new Set(selected)
    if (checked) {
      if (next.size >= MAX_COURSE_SUBJECTS) return
      next.add(code.toLowerCase())
    } else {
      next.delete(code.toLowerCase())
    }
    // The picker renders in the taxonomy's order, so the sent list is stable.
    onChange((options ?? []).map(option => option.code).filter(candidate => next.has(candidate.toLowerCase())))
  }

  return (
    <section aria-labelledby={`${idPrefix}-subjects-heading`} className="space-y-3">
      <div className="space-y-1">
        <h2 id={`${idPrefix}-subjects-heading`} className="text-lg font-semibold">Subjects</h2>
        <p className="text-sm text-muted-foreground">
          Optional, up to {MAX_COURSE_SUBJECTS}. Students see courses picked for their subjects, and subjects are how
          two courses with the same title are told apart.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            <p>Could not load subjects. {error}</p>
            <Button type="button" variant="outline" className="mt-2 h-11" disabled={disabled} onClick={() => { setFailure(null); setRetry(c => c + 1) }}>Retry</Button>
          </AlertDescription>
        </Alert>
      )}

      {options === null && !error && (
        <div className="space-y-2" role="status" aria-label="Loading subjects">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      )}

      {options !== null && (
        <>
          {options.length > MAX_COURSE_SUBJECTS && (
            <div className="space-y-2">
              <Label htmlFor={`${idPrefix}-subject-search`}>Filter subjects</Label>
              <Input id={`${idPrefix}-subject-search`} type="search" className="h-11" maxLength={80} value={filter} onChange={event => setFilter(event.target.value)} />
            </div>
          )}
          <p role="status" className="text-xs text-muted-foreground">
            {selected.size} of {MAX_COURSE_SUBJECTS} selected
          </p>
          <ul className="max-h-64 divide-y overflow-y-auto rounded-lg border">
            {rows.map(option => {
              const checked = selected.has(option.code.toLowerCase())
              return (
                <li key={option.code} className="flex items-center gap-3 p-3">
                  <Checkbox
                    id={`${idPrefix}-subject-${option.code}`}
                    className="size-5"
                    checked={checked}
                    disabled={disabled || (!checked && atCapacity)}
                    onCheckedChange={next => toggle(option.code, next === true)}
                  />
                  <Label htmlFor={`${idPrefix}-subject-${option.code}`} className="min-h-11 flex-1 cursor-pointer items-center">
                    <span className="text-sm font-medium wrap-anywhere">{option.name}</span>
                  </Label>
                </li>
              )
            })}
            {rows.length === 0 && <li className="p-3 text-sm text-muted-foreground">No subjects match that filter.</li>}
          </ul>
          {atCapacity && <p className="text-xs text-muted-foreground">Deselect one to choose another.</p>}
        </>
      )}
    </section>
  )
}
