"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle, ShieldUser, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { UserRole } from "@/features/auth/domain/roles";
import { useTRPC } from "@/trpc/client";
import { CommandCatalogAdmin } from "./command-catalog-admin";

const assignableRoles: UserRole[] = ["user", "moderator", "platform_admin"];

export function AdminPage({ currentUserId }: { currentUserId: string }) {
  const { t } = useTranslation();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const usersQuery = useQuery(trpc.admin.users.queryOptions());
  const roleMutation = useMutation(trpc.admin.setUserRole.mutationOptions({
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: trpc.admin.users.queryKey() });
      toast.success(t("Rolle aktualisiert."));
    },
    onError: (error) => toast.error(error.message),
  }));

  const users = usersQuery.data ?? [];

  return (
    <div className="role-page">
      <div className="role-inner role-inner-wide">
        <header className="start-head">
          <p className="eyebrow">{t("PLATFORM-ADMINISTRATION")}</p>
          <h1>{t("Adminbereich")}</h1>
          <p className="page-lead">{t("Accounts und ihre Zugriffsrollen zentral verwalten.")}</p>
        </header>

        <div className="role-overview">
          <article className="role-stat">
            <span><Users size={17} /></span>
            <div><strong>{users.length}</strong><p>{t("Accounts insgesamt")}</p></div>
          </article>
          <article className="role-stat">
            <span><ShieldUser size={17} /></span>
            <div>
              <strong>{users.filter((user) => user.role !== "user").length}</strong>
              <p>{t("Teammitglieder")}</p>
            </div>
          </article>
        </div>

        <section className="role-card">
          <div className="role-card-head">
            <div><strong>{t("Benutzer & Rollen")}</strong><p>{t("Admins erhalten automatisch auch Zugriff auf den Moderatorenbereich.")}</p></div>
          </div>

          {usersQuery.isPending ? (
            <p className="role-loading"><LoaderCircle className="spin" size={16} />{t("Accounts werden geladen …")}</p>
          ) : (
            <div className="role-table-wrap">
              <table className="role-table">
                <thead><tr><th>{t("Account")}</th><th>{t("Seit")}</th><th>{t("Rolle")}</th></tr></thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div className="role-user">
                          <span className="account-avatar">{(user.name ?? "?").slice(0, 2).toUpperCase()}</span>
                          <div><strong>{user.name ?? t("Ohne Namen")}</strong><span>{user.email ?? t("OAuth-Account")}</span></div>
                          {user.id === currentUserId && <Badge variant="outline">{t("Du")}</Badge>}
                        </div>
                      </td>
                      <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td>
                        <Select
                          value={user.role}
                          disabled={user.id === currentUserId || roleMutation.isPending}
                          onValueChange={(role) => roleMutation.mutate({ userId: user.id, role: role as UserRole })}
                        >
                          <SelectTrigger size="sm" aria-label={t("Rolle für {{name}}", { name: user.name ?? user.email ?? t("Account") })}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent align="end">
                            {assignableRoles.map((role) => <SelectItem key={role} value={role}>{t(`role.${role}`)}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <CommandCatalogAdmin />
      </div>
    </div>
  );
}
