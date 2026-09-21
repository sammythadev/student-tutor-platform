'use client'

import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { SubjectPicker } from './subject-picker'

export type DetailDialog =
  | { kind: 'course'; title: string; text: string; subjectCodes: string[] }
  | { kind: 'add'; title: string; text: string }
  | { kind: 'edit'; topicId: string; title: string; text: string }
  | { kind: 'delete'; topicId: string; title: string }

export function CourseDetailDialog({ dialog, busy, error, onClose, onSave, onDelete, restoreFocus }: {
  dialog: DetailDialog
  busy: boolean
  error: string | null
  onClose: () => void
  onSave: (title: string, text: string, subjectCodes: string[]) => void
  onDelete: () => void
  restoreFocus: () => void
}) {
  const [title, setTitle] = useState(dialog.title)
  const [text, setText] = useState('text' in dialog ? dialog.text : '')
  const [subjectCodes, setSubjectCodes] = useState<string[]>(() => dialog.kind === 'course' ? dialog.subjectCodes : [])
  const course = dialog.kind === 'course'
  const deleting = dialog.kind === 'delete'
  const heading = deleting ? 'Delete topic' : course ? 'Edit course' : dialog.kind === 'add' ? 'Add topic' : 'Edit topic'

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const input = event.currentTarget.elements.namedItem('title') as HTMLInputElement
    input.setCustomValidity(title.trim() ? '' : 'Enter a title.')
    if (!event.currentTarget.reportValidity()) return
    onSave(title.trim(), text.trim(), subjectCodes)
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose() }}>
      <DialogContent showCloseButton={false} className="max-h-[85dvh] overflow-y-auto" onCloseAutoFocus={(event) => { event.preventDefault(); restoreFocus() }} onEscapeKeyDown={(event) => { if (busy) event.preventDefault() }} onPointerDownOutside={(event) => { if (busy) event.preventDefault() }}>
        <DialogHeader className="text-left">
          <DialogTitle>{heading}</DialogTitle>
          <DialogDescription>{deleting ? 'Deleting this topic also removes its completion records.' : course ? 'Update the course title, description and subjects.' : 'Write plain-text learning material. Editing content preserves completion records.'}</DialogDescription>
        </DialogHeader>
        {deleting ? (
          <>
            <p className="break-words text-sm">Delete “{title}”?</p>
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
            <DialogFooter>
              <Button className="h-11" variant="outline" disabled={busy} onClick={onClose}>Cancel</Button>
              <Button className="h-11" variant="destructive" disabled={busy} onClick={onDelete}>{busy ? 'Deleting...' : 'Delete topic'}</Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={submit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="detail-title">{course ? 'Course title' : 'Title'}</Label>
              <Input id="detail-title" name="title" autoFocus required maxLength={course ? 120 : 160} value={title} disabled={busy} className="h-11" onChange={(event) => { event.target.setCustomValidity(''); setTitle(event.target.value) }} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="detail-text">{course ? 'Description' : 'Content'}</Label>
              <Textarea id="detail-text" value={text} disabled={busy} maxLength={course ? 2000 : 20000} rows={course ? 4 : 8} className="max-h-80 min-h-32" onChange={(event) => setText(event.target.value)} />
              <p className="text-xs text-muted-foreground">Optional. Maximum {course ? '2,000' : '20,000'} characters.</p>
            </div>
            {course && <SubjectPicker idPrefix="course-detail-dialog" value={subjectCodes} onChange={setSubjectCodes} disabled={busy} />}
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
            <DialogFooter>
              <Button type="button" className="h-11" variant="outline" disabled={busy} onClick={onClose}>Cancel</Button>
              <Button type="submit" className="h-11" disabled={busy}>{busy ? 'Saving...' : dialog.kind === 'add' ? 'Add topic' : 'Save changes'}</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
