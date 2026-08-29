'use client'

import React from 'react'

type StarBorderProps<T extends React.ElementType> = React.ComponentPropsWithoutRef<T> & {
  as?: T
  className?: string
  children?: React.ReactNode
  color?: string
  speed?: React.CSSProperties['animationDuration']
  thickness?: number
  backgroundColor?: string
  textColor?: string
  borderColor?: string
  /** Corner radius in px for both the shell and the inner surface. */
  radius?: number
  /** Inner padding of the content shell. Defaults to the library's roomy button padding. */
  innerClassName?: string
}

const StarBorder = <T extends React.ElementType = 'button'>({
  as,
  className = '',
  color = 'white',
  speed = '6s',
  thickness = 1,
  backgroundColor = '#000000',
  textColor = '#ffffff',
  borderColor = '#222222',
  radius = 20,
  innerClassName = 'text-center text-[16px] py-[16px] px-[26px]',
  children,
  ...rest
}: StarBorderProps<T>) => {
  const Component = as || 'button'

  return (
    <Component
      className={`relative inline-block overflow-hidden ${className}`}
      {...(rest as Record<string, unknown>)}
      style={{
        padding: `${thickness}px 0`,
        borderRadius: `${radius}px`,
        ...(rest as { style?: React.CSSProperties }).style,
      }}
    >
      <div
        className="absolute bottom-[-11px] right-[-250%] z-0 h-[50%] w-[300%] rounded-full opacity-70 motion-safe:animate-star-movement-bottom"
        style={{ background: `radial-gradient(circle, ${color}, transparent 10%)`, animationDuration: speed }}
      />
      <div
        className="absolute left-[-250%] top-[-10px] z-0 h-[50%] w-[300%] rounded-full opacity-70 motion-safe:animate-star-movement-top"
        style={{ background: `radial-gradient(circle, ${color}, transparent 10%)`, animationDuration: speed }}
      />
      <div
        className={`relative z-[1] border ${innerClassName}`}
        style={{ background: backgroundColor, color: textColor, borderColor, borderRadius: `${radius}px` }}
      >
        {children}
      </div>
    </Component>
  )
}

export default StarBorder
