declare module '@/components/TextType' {
  import type { CSSProperties, ElementType, ReactNode } from 'react'

  interface TextTypeProps {
    text: string | string[]
    as?: ElementType
    typingSpeed?: number
    initialDelay?: number
    pauseDuration?: number
    deletingSpeed?: number
    loop?: boolean
    className?: string
    showCursor?: boolean
    hideCursorWhileTyping?: boolean
    cursorCharacter?: ReactNode
    cursorClassName?: string
    cursorBlinkDuration?: number
    textColors?: string[]
    variableSpeed?: { min: number; max: number }
    onSentenceComplete?: (sentence: string, index: number) => void
    reverseMode?: boolean
    startOnVisible?: boolean
    style?: CSSProperties
  }

  const TextType: (props: TextTypeProps) => ReactNode
  export default TextType
}
