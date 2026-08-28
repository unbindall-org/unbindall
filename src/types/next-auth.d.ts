import "next-auth";
import "next-auth/jwt";
import type { UserRole } from "@/features/auth/domain/roles";

declare module "next-auth" {
  interface User {
    role: UserRole;
  }

  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: UserRole;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    role?: UserRole;
  }
}
