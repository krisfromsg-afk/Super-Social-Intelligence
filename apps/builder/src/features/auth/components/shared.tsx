"use client"

import { CardTitle } from "@chatbotx.io/ui/components/ui/card"
import Image from "next/image"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { useEffect, useState } from "react"
import { useTenantSettings } from "@/features/tenant"
import { useCurrentTheme } from "@/hooks/use-current-theme"
import { resolveSsiLegalLinks } from "../legal-policy-links"

export type AuthHeaderProps = {
  title: string
}

export const AuthHeader = ({ title }: AuthHeaderProps) => {
  const currentTheme = useCurrentTheme()
  const [mounted, setMounted] = useState(false)
  const { name, logoLightUrl, logoDarkUrl } = useTenantSettings()

  useEffect(() => {
    setMounted(true)
  }, [])

  const logoUrl = currentTheme === "dark" ? logoLightUrl : logoDarkUrl

  return (
    <>
      <div className="flex items-center justify-center gap-4">
        {mounted ? (
          <Image
            alt={name}
            height={80}
            priority={true}
            src={logoUrl}
            width={271}
          />
        ) : (
          <div className="h-20 w-[271px]" />
        )}
      </div>

      <CardTitle className="text-slate-600 text-xl">{title}</CardTitle>
    </>
  )
}

export const AcceptTermsAndPolicy = ({
  termsOfService,
  privacyPolicy,
}: {
  termsOfService?: string | null
  privacyPolicy?: string | null
}) => {
  const t = useTranslations()
  const links = resolveSsiLegalLinks({ termsOfService, privacyPolicy })
  // Do not assert that registration accepts another vendor's terms or
  // render partial/untrusted legal URLs. Deployment policy remains a gate.
  if (!links) return null

  return (
    <div className="text-balance text-center text-muted-foreground text-xs [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-primary">
      <span>{t("auth.acceptTermsAndPolicy")}</span>{" "}
      <Link href={links.termsOfService} target="_blank" rel="noopener noreferrer">
        {t("auth.termsOfService")}
      </Link>{" "}
      <span>{t("auth.and")}</span>{" "}
      <Link href={links.privacyPolicy} target="_blank" rel="noopener noreferrer">
        {t("auth.privacyPolicy")}
      </Link>
    </div>
  )
}

export const OrSeparator = () => {
  const t = useTranslations()

  return (
    <div className="relative flex h-4 w-full items-center justify-center text-center text-sm">
      <hr className="w-full" />
      <span className="absolute bg-card px-2 font-medium text-foreground/60 text-sm">
        {t("auth.orContinueWith")}
      </span>
    </div>
  )
}
