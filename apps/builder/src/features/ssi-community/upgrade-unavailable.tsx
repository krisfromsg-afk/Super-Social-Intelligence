"use client"

import { Button } from "@chatbotx.io/ui/components/ui/button"
import type { ComponentProps } from "react"

/**
 * SSI Community has no paid billing portal. Retains rendering compatibility
 * for legacy Cloud-only branches without enabling a non-existent checkout.
 * Replace with an independent SSI billing module when billing is implemented.
 */
export function UpgradePlanButton({
  children,
  ...props
}: ComponentProps<typeof Button>) {
  return (
    <Button
      {...props}
      aria-disabled="true"
      disabled
      title="Billing is not available in this self-hosted edition"
    >
      {children}
    </Button>
  )
}

export function UpgradePlanDialog(_props: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return null
}
