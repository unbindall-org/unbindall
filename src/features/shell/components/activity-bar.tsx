"use client";

import { signOut } from "next-auth/react";
import type { Session } from "next-auth";
import { BookOpenCheck, Compass, House, LogIn, LogOut, Settings, ShieldCheck, ShieldUser } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Logo } from "@/components/logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { hasRole, type UserRole } from "@/features/auth/domain/roles";

/**
 * The icon rail — the places you can go. It never toggles the file panel; that
 * belongs to the configurator and is toggled from the tab bar.
 */
export function ActivityBar({
  user,
  activeTabId,
  onOpenStart,
  onOpenCommunity,
  onOpenCommands,
  onOpenModeration,
  onOpenAdmin,
  onOpenAccount,
  onOpenSettings,
  role,
}: {
  user: Session["user"] | null;
  activeTabId: string | null;
  role: UserRole | null;
  onOpenStart(): void;
  onOpenCommunity(): void;
  onOpenCommands(): void;
  onOpenModeration(): void;
  onOpenAdmin(): void;
  onOpenAccount(): void;
  onOpenSettings(): void;
}) {
  const { t } = useTranslation();

  return (
    <nav className="activity-bar" aria-label={t("Bereiche")}>
      <span className="activity-brand" aria-hidden><Logo size={22} /></span>

      <Item label={t("Start")} active={activeTabId === "start"} onClick={onOpenStart}>
        <House size={20} />
      </Item>
      <Item
        label={t("Community")}
        active={activeTabId === "community" || activeTabId === "community-post"}
        onClick={onOpenCommunity}
      >
        <Compass size={20} />
      </Item>
      <Item label={t("Command-Register")} active={activeTabId === "commands"} onClick={onOpenCommands}>
        <BookOpenCheck size={20} />
      </Item>

      {role && hasRole(role, "moderator") && (
        <div className="activity-role-group" aria-label={t("Team-Bereiche")}>
          <Item label={t("Moderation")} active={activeTabId === "moderation"} onClick={onOpenModeration}>
            <ShieldCheck size={20} />
          </Item>
          {hasRole(role, "platform_admin") && (
            <Item label={t("Administration")} active={activeTabId === "admin"} onClick={onOpenAdmin}>
              <ShieldUser size={20} />
            </Item>
          )}
        </div>
      )}

      <div className="activity-spacer" />

      {user ? (
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger
                className="activity-item activity-account-trigger"
                aria-label={`${t("Benutzermenü")}: ${user.name ?? t("Account")}`}
              >
                <Avatar className="activity-avatar">
                  {user.image && <AvatarImage src={user.image} alt="" />}
                  <AvatarFallback>{initials(user.name)}</AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="right">{t("Account")}</TooltipContent>
          </Tooltip>
          <DropdownMenuContent className="user-popover" align="end" side="right" sideOffset={8}>
            <DropdownMenuLabel>
              <strong>{user.name}</strong>
              <span>{user.email ?? t("Verknüpfter OAuth-Account")}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onOpenAccount}><ShieldCheck />{t("Account & Daten")}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => signOut()}><LogOut />{t("Abmelden")}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Item label={t("Anmelden")} active={false} onClick={onOpenAccount}><LogIn size={20} /></Item>
      )}
      <Item label={t("Einstellungen")} active={activeTabId === "settings"} onClick={onOpenSettings}>
        <Settings size={20} />
      </Item>
    </nav>
  );
}

function initials(name: string | null | undefined) {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  return (parts.length > 1 ? `${parts[0]![0]}${parts.at(-1)![0]}` : parts[0]?.slice(0, 2) ?? "?").toUpperCase();
}

function Item({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick(): void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={`activity-item${active ? " is-active" : ""}`}
          aria-pressed={active}
          aria-label={label}
          onClick={onClick}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}
