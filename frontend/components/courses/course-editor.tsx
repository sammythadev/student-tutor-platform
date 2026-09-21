'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { createCourse } from '@/lib/api/courses'
import { toApiError } from '@/lib/api/errors'
import { useAuthStore } from '@/lib/store/authStore'
import { SubjectPicker } from './subject-picker'

type DraftTopic = { id: number; title: string; content: string }

const MAX_TOPICS = 100

export function CourseEditor() {
  const router = useRouter()
  const userId = useAuthStore(s => s.user?.id)
  const role = useAuthStore(s => s.user?.role)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [subjectCodes, setSubjectCodes] = useState<string[]>([])
  const [published, setPublished] = useState(false)
  const [topics, setTopics] = useState<DraftTopic[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const nextTopicId = useRef(1)
  const submissionPending = useRef(false)
  const lifetime = useRef(0)
  const topicInputs = useRef(new Map<number, HTMLInputElement>())
  const focusTopic = useRef<number | null>(null)
  const addTopicButton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    lifetime.current++
    return () => { lifetime.current++ }
  }, [userId])

  useEffect(() => {
    if (focusTopic.current !== null) {
      topicInputs.current.get(focusTopic.current)?.focus()
      focusTopic.current = null
    }
  }, [topics])

  function addTopic() {
    if (submissionPending.current || topics.length >= MAX_TOPICS) return
    const id = nextTopicId.current++
    focusTopic.current = id
    setTopics(previous => [...previous, { id, title: '', content: '' }])
  }

  function updateTopic(id: number, field: 'title' | 'content', value: string) {
    setTopics(previous => previous.map(topic => topic.id === id ? { ...topic, [field]: value } : topic))
  }

  function removeTopic(id: number) {
    if (submissionPending.current) return
    const index = topics.findIndex(topic => topic.id === id)
    const next = topics[index + 1] ?? topics[index - 1]
    if (next) focusTopic.current = next.id
    else addTopicButton.current?.focus()
    setTopics(previous => previous.filter(topic => topic.id !== id))
  }

  function moveTopic(id: number, direction: -1 | 1) {
    if (submissionPending.current) return
    setTopics(previous => {
      const index = previous.findIndex(topic => topic.id === id)
      const target = index + direction
      if (index < 0 || target < 0 || target >= previous.length) return previous
      const ordered = [...previous]
      ;[ordered[index], ordered[target]] = [ordered[target], ordered[index]]
      return ordered
    })
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submissionPending.current) return
    const form = event.currentTarget
    // Native required validation does not reject whitespace-only titles.
    for (const element of Array.from(form.elements)) {
      if (element instanceof HTMLInputElement && element.required) {
        element.setCustomValidity(element.value.trim() ? '' : 'Enter a title, not just spaces.')
      }
    }
    if (!form.reportValidity()) return
    if (topics.length > MAX_TOPICS) {
      setError('A course can contain at most 100 topics')
      return
    }
    const auth = useAuthStore.getState()
    if (!userId || auth.user?.id !== userId || (auth.user.role !== 'tutor' && auth.user.role !== 'admin') || !auth.accessToken) return

    submissionPending.current = true
    setSaving(true)
    setError(null)
    const requestLifetime = lifetime.current
    const isCurrent = () => {
      const current = useAuthStore.getState()
      return lifetime.current === requestLifetime && current.user?.id === userId &&
        (current.user?.role === 'tutor' || current.user?.role === 'admin') && !!current.accessToken
    }
    try {
      const course = await createCourse({
        title: title.trim(),
        description: description.trim() || null,
        subjectCodes,
        published,
        topics: topics.map(topic => ({ title: topic.title.trim(), content: topic.content.trim() || null })),
      })
      if (isCurrent()) router.push(`/courses/${course.id}`)
    } catch (cause) {
      if (isCurrent()) {
        setError(toApiError(cause).message)
        submissionPending.current = false
        setSaving(false)
      }
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 py-3">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Create course</h1>
        <p className="text-sm text-muted-foreground">Build a learning outline. Assign students after creating your course.</p>
      </header>

      <form onSubmit={submit} noValidate className="space-y-6" aria-busy={saving}>
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Could not create course</AlertTitle>
            <AlertDescription>{error} Your draft is still here.</AlertDescription>
          </Alert>
        )}

        <fieldset disabled={saving} className="min-w-0 space-y-6">
          <legend className="sr-only">Course details and topics</legend>
          <div className="space-y-2">
            <Label htmlFor="course-title">Course title</Label>
            <Input id="course-title" name="title" value={title} required maxLength={120} className="h-11" aria-describedby="course-title-hint" onChange={event => {
              event.currentTarget.setCustomValidity('')
              setTitle(event.target.value)
            }} />
            <p id="course-title-hint" className="text-xs text-muted-foreground">Required. Up to 120 characters.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="course-description">Description</Label>
            <Textarea id="course-description" name="description" value={description} onChange={event => setDescription(event.target.value)} maxLength={2000} rows={4} className="min-h-24" aria-describedby="course-description-hint" />
            <p id="course-description-hint" className="text-xs text-muted-foreground">Optional. Up to 2,000 characters.</p>
          </div>

          <SubjectPicker idPrefix="course-editor" value={subjectCodes} onChange={setSubjectCodes} disabled={saving} />

          {/* Platform material is discoverable regardless, so this only means
              something for a tutor's own course. */}
          {role === 'tutor' && (
            <div className="flex items-start gap-3 rounded-lg border p-4">
              <Switch id="course-published" checked={published} disabled={saving} onCheckedChange={setPublished} />
              <div className="space-y-1">
                <Label htmlFor="course-published">Publish for other tutors</Label>
                <p className="text-xs text-muted-foreground">
                  Off by default: only you and the students you set it for can see this course. Published courses are
                  listed for every tutor, who can then set them for their own students. It stays yours to edit.
                </p>
              </div>
            </div>
          )}

          <section aria-labelledby="topics-heading" className="space-y-4">
            <div className="space-y-2">
              <h2 id="topics-heading" className="text-lg font-semibold">Topics</h2>
              <p className="text-sm text-muted-foreground">Topics are optional. You can add, edit and reorder them after creating the course.</p>
              <p className="text-xs text-muted-foreground" role="status">{topics.length} of {MAX_TOPICS} topics</p>
            </div>
            <ol className="space-y-6">
              {topics.map((topic, index) => (
                <li key={topic.id} className="space-y-4 border-t pt-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <h3 className="text-sm font-semibold">Topic {index + 1}</h3>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="ghost" className="h-11" disabled={index === 0} onClick={() => moveTopic(topic.id, -1)} aria-label={`Move topic ${index + 1} up`}><ArrowUp aria-hidden="true" />Move up</Button>
                      <Button type="button" variant="ghost" className="h-11" disabled={index === topics.length - 1} onClick={() => moveTopic(topic.id, 1)} aria-label={`Move topic ${index + 1} down`}><ArrowDown aria-hidden="true" />Move down</Button>
                      <Button type="button" variant="ghost" className="h-11" onClick={() => removeTopic(topic.id)} aria-label={`Remove topic ${index + 1}`}><Trash2 aria-hidden="true" />Remove topic</Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`topic-title-${topic.id}`}>Title</Label>
                    <Input id={`topic-title-${topic.id}`} name={`topic-title-${topic.id}`} ref={element => {
                      if (element) topicInputs.current.set(topic.id, element)
                      else topicInputs.current.delete(topic.id)
                    }} value={topic.title} required maxLength={160} className="h-11" aria-describedby={`topic-title-hint-${topic.id}`} onChange={event => {
                      event.currentTarget.setCustomValidity('')
                      updateTopic(topic.id, 'title', event.target.value)
                    }} />
                    <p id={`topic-title-hint-${topic.id}`} className="text-xs text-muted-foreground">Required. Up to 160 characters.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`topic-content-${topic.id}`}>Content</Label>
                    <Textarea id={`topic-content-${topic.id}`} name={`topic-content-${topic.id}`} value={topic.content} onChange={event => updateTopic(topic.id, 'content', event.target.value)} maxLength={20000} rows={5} className="min-h-32" aria-describedby={`topic-content-hint-${topic.id}`} />
                    <p id={`topic-content-hint-${topic.id}`} className="text-xs text-muted-foreground">Optional plain text. Up to 20,000 characters.</p>
                  </div>
                </li>
              ))}
            </ol>
            <Button ref={addTopicButton} type="button" variant="outline" className="h-11 w-full shadow-none md:w-auto" disabled={topics.length >= MAX_TOPICS} onClick={addTopic}><Plus aria-hidden="true" />Add topic</Button>
            {topics.length >= MAX_TOPICS && <p className="text-sm text-muted-foreground">A course can contain at most 100 topics.</p>}
          </section>
        </fieldset>

        <div className="flex flex-col gap-2 border-t pt-6 md:flex-row">
          <Button type="submit" className="h-11 w-full md:w-auto" disabled={saving}>{saving ? 'Creating course…' : 'Create course'}</Button>
          <Button asChild variant="ghost" className="h-11 w-full md:w-auto"><Link href="/courses">Cancel</Link></Button>
        </div>
        {saving && <p role="status" className="text-sm text-muted-foreground">Saving your course and topics…</p>}
      </form>
    </div>
  )
}
