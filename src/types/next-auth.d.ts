import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      workspaceId: string;
      workspaceName: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }

  interface User {
    workspaceId?: string;
    workspaceName?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    workspaceId?: string;
    workspaceName?: string;
  }
}
