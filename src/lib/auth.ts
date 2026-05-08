import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

export const authOptions: NextAuthOptions = {
  secret: env().NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
          include: {
            workspaces: {
              include: { workspace: true },
              take: 1,
            },
          },
        });

        if (!user) return null;

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;

        const workspace = user.workspaces[0]?.workspace;
        if (!workspace) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? user.email,
          workspaceId: workspace.id,
          workspaceName: workspace.name,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.workspaceId = (user as { workspaceId?: string }).workspaceId;
        token.workspaceName = (user as { workspaceName?: string }).workspaceName;
      }

      return token;
    },
    async session({ session, token }) {
      session.user = {
        ...session.user,
        id: token.id as string,
        workspaceId: token.workspaceId as string,
        workspaceName: token.workspaceName as string,
      };

      return session;
    },
  },
};
