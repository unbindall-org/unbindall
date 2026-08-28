"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import type { Session } from "next-auth";
import { BookOpenCheck, ChevronDown, FolderOpen, Info, LogIn, LogOut, Save, ShieldCheck, SlidersHorizontal, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Logo } from "@/components/logo";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { moduleCount, moduleDocumentItemCount, type GeneratorModule, type GeneratorModuleId } from "../modules/registry";
import type { GeneratorDocument } from "../domain/types";
import { commandRegistry, isCommandEditable, type CommandDefinition } from "../catalog/commands";
import { isCommandAvailable } from "../domain/config-types";
import { generatorModuleIcons } from "./module-icons";

type Props = {
  user: Session["user"] | null;
  document: GeneratorDocument;
  activeCategory: "all" | GeneratorModuleId;
  activeModuleCount: number;
  settingsModules: GeneratorModule[];
  bindModules: GeneratorModule[];
  commands: CommandDefinition[];
  onSelectCategory(category: "all" | GeneratorModuleId): void;
  onOpenLibrary(): void;
  onRequestSave(): void;
  onOpenAccount(): void;
  onOpenAuth(): void;
  onOpenCommandRegister(): void;
};

export function GeneratorSidebar({
  user,
  document,
  activeCategory,
  activeModuleCount,
  settingsModules,
  bindModules,
  commands,
  onSelectCategory,
  onOpenLibrary,
  onRequestSave,
  onOpenAccount,
  onOpenAuth,
  onOpenCommandRegister,
}: Props) {
  const { t } = useTranslation();

  function NavItem({ module }: { module: GeneratorModule }) {
    const Icon = generatorModuleIcons[module.id];
    const count = module.kind === "settings"
      ? commands.filter((command) => command.category === module.id && isCommandEditable(command) && isCommandAvailable(document.configType, command)).length
      : moduleCount(module) ?? moduleDocumentItemCount(module, document);
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          isActive={activeCategory === module.id}
          tooltip={module.shortLabel}
          onClick={() => onSelectCategory(module.id)}
        >
          <Icon /><span>{module.shortLabel}</span>
        </SidebarMenuButton>
        <SidebarMenuBadge>{count}</SidebarMenuBadge>
      </SidebarMenuItem>
    );
  }

  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <span className="brand-symbol"><Logo size={30} /></span>
                <span className="brand-text"><strong>UNBINDALL</strong><span>CS2 CONFIG</span></span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={activeCategory === "all"} tooltip={t("Aktuelle Config")} onClick={() => onSelectCategory("all")}>
                  <SlidersHorizontal /><span>{t("Aktuelle Config")}</span>
                </SidebarMenuButton>
                <SidebarMenuBadge>{activeModuleCount}</SidebarMenuBadge>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>{t("EINSTELLUNGEN")}</SidebarGroupLabel>
          <SidebarGroupContent><SidebarMenu>{settingsModules.map((module) => <NavItem key={module.id} module={module} />)}</SidebarMenu></SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>{t("BIND-MODULE")}</SidebarGroupLabel>
          <SidebarGroupContent><SidebarMenu>{bindModules.map((module) => <NavItem key={module.id} module={module} />)}</SidebarMenu></SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>{t("COMMANDS")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip={t("Command-Register")} onClick={onOpenCommandRegister}>
                  <BookOpenCheck /><span>{t("Command-Register")}</span>
                </SidebarMenuButton>
                <SidebarMenuBadge>{commandRegistry.length}</SidebarMenuBadge>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {user && (
          <SidebarGroup>
            <SidebarGroupLabel>{t("DEINE CLOUD")}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem><SidebarMenuButton onClick={onOpenLibrary}><FolderOpen /><span>{t("Verwalten")}</span></SidebarMenuButton></SidebarMenuItem>
                <SidebarMenuItem><SidebarMenuButton onClick={onRequestSave}><Save /><span>{t("Speichern")}</span></SidebarMenuButton></SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem><SidebarMenuButton asChild><Link href="/impressum"><Info /><span>{t("Impressum")}</span></Link></SidebarMenuButton></SidebarMenuItem>
              <SidebarMenuItem><SidebarMenuButton asChild><Link href="/datenschutz"><ShieldCheck /><span>{t("Datenschutz")}</span></Link></SidebarMenuButton></SidebarMenuItem>
              <p className="sidebar-disclaimer">{t("Kein offizielles Valve-Produkt. Counter-Strike und CS2 sind Marken der Valve Corporation.")}</p>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <LanguageSwitcher />
        <SidebarMenu>
          {user ? (
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton size="lg">
                    <User />
                    <span className="grid flex-1 text-left text-sm leading-tight"><strong className="truncate">{user.name}</strong><small className="truncate text-xs text-muted-foreground">{user.email ?? t("Verknüpfter OAuth-Account")}</small></span>
                    <ChevronDown />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="user-popover" align="end" side="right">
                  <DropdownMenuLabel><strong>{user.name}</strong><span>{user.email ?? t("Verknüpfter OAuth-Account")}</span></DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onOpenAccount}><ShieldCheck />{t("Account & Daten")}</DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" onClick={() => signOut()}><LogOut />{t("Abmelden")}</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          ) : (
            <SidebarMenuItem><SidebarMenuButton onClick={onOpenAuth}><LogIn /><span>{t("Anmelden")}</span></SidebarMenuButton></SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
