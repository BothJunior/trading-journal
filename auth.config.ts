import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  trustHost: true,
  providers: [],
  pages: {
    signIn: "/login",
    newUser: "/register",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isDashboard = nextUrl.pathname.startsWith("/dashboard") || nextUrl.pathname.startsWith("/reports");
      const isApi = nextUrl.pathname.startsWith("/api") && !nextUrl.pathname.startsWith("/api/auth");

      if (isDashboard || isApi) {
        if (isLoggedIn) return true;
        return false; // Redirect unauthenticated users to login page
      }

      if (isLoggedIn && (nextUrl.pathname === "/login" || nextUrl.pathname === "/register")) {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }

      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      const canonicalBase = process.env.NEXTAUTH_URL || baseUrl;
      if (url.startsWith("/")) {
        return `${canonicalBase}${url}`;
      }
      try {
        const urlObj = new URL(url);
        const canonicalObj = new URL(canonicalBase);
        if (urlObj.host.includes("localhost") || urlObj.host.includes("127.0.0.1")) {
          return `${canonicalObj.origin}${urlObj.pathname}${urlObj.search}${urlObj.hash}`;
        }
        if (urlObj.origin === canonicalObj.origin) {
          return url;
        }
      } catch {
        // Ignore parsing errors
      }
      return canonicalBase;
    },
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "super-secret-antigravity-trading-journal-jwt-key-32chars",
};
