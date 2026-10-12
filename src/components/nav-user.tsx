"use client"

import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { useState } from "react"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { authClient } from "@/lib/auth-client"
import {
  BadgeCheckIcon,
  BellIcon,
  CheckIcon,
  ChevronsUpDownIcon,
  CreditCardIcon,
  Loader2,
  LogInIcon,
  LogOutIcon,
  MonitorIcon,
  MoonIcon,
  SunIcon,
} from "lucide-react"

function initials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.trim() || "?"
  const parts = source.split(/\s+/)
  if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase()
  return source.slice(0, 2).toUpperCase()
}

export function NavUser() {
  const router = useRouter()
  const { isMobile } = useSidebar()
  const { theme, setTheme } = useTheme()
  const { data: session, isPending } = authClient.useSession()
  const user = session?.user

  const themeOptions = [
    { value: "light", label: "Light", icon: <SunIcon /> },
    { value: "dark", label: "Dark", icon: <MoonIcon /> },
    { value: "system", label: "System", icon: <MonitorIcon /> },
  ] as const

  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    const { error } = await authClient.signOut({
      fetchOptions: {
        onSuccess: () => router.push("/login"),
      },
    })
    if (error) {
      console.error("Sign out failed", error)
      setIsLoggingOut(false)
    }
  }

  // Not signed in (or still loading): offer a log-in entry point.
  if (!user) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            size="lg"
            disabled={isPending}
            onClick={() => router.push("/login")}
          >
            <Avatar>
              <AvatarFallback>?</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">
                {isPending ? "Loading…" : "Not signed in"}
              </span>
              <span className="truncate text-xs">Log in to continue</span>
            </div>
            <LogInIcon className="ml-auto size-4" />
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  const displayName = user.name || user.email || "Account"
  const avatarSrc = (user as { image?: string | null }).image ?? undefined

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton size="lg" className="aria-expanded:bg-muted" />
            }
          >
            <Avatar>
              <AvatarImage src={avatarSrc} alt={displayName} />
              <AvatarFallback>{initials(user.name, user.email)}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{displayName}</span>
              <span className="truncate text-xs">{user.email}</span>
            </div>
            <ChevronsUpDownIcon className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-fit"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar>
                    <AvatarImage src={avatarSrc} alt={displayName} />
                    <AvatarFallback>{initials(user.name, user.email)}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{displayName}</span>
                    <span className="truncate text-xs">{user.email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => router.push("/billing")}>
                <BadgeCheckIcon />
                Account
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/billing")}>
                <CreditCardIcon />
                Billing
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/generations")}>
                <BellIcon />
                Generations
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              {themeOptions.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => setTheme(option.value)}
                >
                  {option.icon}
                  {option.label}
                  {theme === option.value && (
                    <CheckIcon className="ml-auto size-4" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled={isLoggingOut} onClick={handleLogout}>
              {isLoggingOut ? (
                <Loader2 className="animate-spin" />
              ) : (
                <LogOutIcon />
              )}
              {isLoggingOut ? "Logging out…" : "Log out"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
