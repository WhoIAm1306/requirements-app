import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogPortal = DialogPrimitive.Portal
export const DialogClose = DialogPrimitive.Close

export function DialogOverlay(props: ComponentProps<typeof DialogPrimitive.Overlay>) {
  const { className, ...rest } = props
  return <DialogPrimitive.Overlay className={cn('fixed inset-0 z-40 bg-black/50', className)} {...rest} />
}

export function DialogContent(props: ComponentProps<typeof DialogPrimitive.Content>) {
  const { className, children, ...rest } = props
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        className={cn(
          'fixed left-1/2 top-1/2 z-50 w-[min(960px,95vw)] -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-white p-5 shadow-xl',
          className,
        )}
        {...rest}
      >
        {children}
        <DialogPrimitive.Close className="absolute right-3 top-3 rounded-md p-1 text-slate-500 hover:bg-slate-100">
          <X className="h-4 w-4" />
          <span className="sr-only">Закрыть</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

export function DialogHeader(props: ComponentProps<'div'>) {
  const { className, ...rest } = props
  return <div className={cn('mb-3 flex items-center justify-between gap-3', className)} {...rest} />
}

export function DialogTitle(props: ComponentProps<typeof DialogPrimitive.Title>) {
  const { className, ...rest } = props
  return <DialogPrimitive.Title className={cn('text-lg font-semibold', className)} {...rest} />
}
