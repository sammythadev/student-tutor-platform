"use client"

import * as React from "react"
import { SearchIcon, XIcon } from "lucide-react"

import { cn } from "@/lib/utils"

type SearchInputProps = Omit<React.ComponentProps<"input">, "type"> & {
  /**
   * Real, programmatically associated label. A placeholder is not a label — it
   * vanishes on the first keystroke and several screen readers skip it — so it
   * renders visually hidden rather than being dropped entirely.
   */
  label: string
  /** Called on Enter, from the wrapping search form. */
  onSubmit?: () => void
  /** Render the trailing clear affordance while the field holds a value. */
  onClear?: () => void
  /** Set false to opt out of the global "/" focus shortcut. */
  enableShortcut?: boolean
  containerClassName?: string
}

/**
 * Search field for catalogue surfaces.
 *
 * Reads as a field rather than as a line of text: recessed `surface-2` fill plus
 * a real border, 44px tall to meet the touch-target floor. Pressing "/" anywhere
 * on the page — outside another field — moves focus here, the convention on
 * result lists with no room for a visible hint.
 */
function SearchInput({
  label,
  onSubmit,
  onClear,
  enableShortcut = true,
  containerClassName,
  className,
  id,
  onKeyDown,
  ...props
}: SearchInputProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const generatedId = React.useId()
  const inputId = id ?? `search-input-${generatedId}`

  // Derived from the DOM rather than `props.value` alone, so a future
  // uncontrolled caller still gets a correct clear button.
  const [filled, setFilled] = React.useState(
    () => Boolean(props.defaultValue) || (typeof props.value === "string" && props.value !== ""),
  )

  React.useEffect(() => {
    if (!enableShortcut) return
    function handleGlobalKeyDown(event: KeyboardEvent) {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
      event.preventDefault()
      inputRef.current?.focus()
    }
    document.addEventListener("keydown", handleGlobalKeyDown)
    return () => document.removeEventListener("keydown", handleGlobalKeyDown)
  }, [enableShortcut])

  return (
    <form
      role="search"
      onSubmit={event => {
        event.preventDefault()
        onSubmit?.()
      }}
      className={cn("relative", containerClassName)}
    >
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <SearchIcon
        className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <input
        ref={inputRef}
        id={inputId}
        type="search"
        className={cn(
          // The native WebKit clear affordance would collide with ours.
          "[&::-webkit-search-cancel-button]:appearance-none",
          "h-11 w-full min-w-0 rounded-md border border-input bg-surface-2 pl-10 text-base text-foreground shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground md:text-sm",
          "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
          "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
          filled && "pr-11",
          className
        )}
        onInput={event => setFilled(event.currentTarget.value !== "")}
        onKeyDown={event => {
          onKeyDown?.(event)
          if (event.key === "Enter") onSubmit?.()
        }}
        {...props}
      />
      {filled && (
        <button
          type="button"
          onClick={() => {
            onClear?.()
            inputRef.current?.focus()
          }}
          aria-label={`Clear ${label.charAt(0).toLowerCase()}${label.slice(1)}`}
          className="absolute right-0 top-0 flex size-11 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <XIcon className="size-4" aria-hidden="true" />
        </button>
      )}
    </form>
  )
}

export { SearchInput }