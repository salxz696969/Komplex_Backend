import passport from "passport";
import { Strategy as MicrosoftStrategy } from "passport-microsoft";
import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import { users } from "../../db/schema";
import { userOauth } from "../../db/models/user_oauth";

passport.use(
  new MicrosoftStrategy(
    {
      clientID: process.env.MICROSOFT_CLIENT_ID!,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
      callbackURL: "http://localhost:6969/auth/microsoft/callback",
      scope: ["user.read"],
      tenant: "common", // for multi-tenant
    },
    async (accessToken: any, refreshToken: any, profile: any, done: any) => {
      try {
        const email = profile.emails?.[0]?.value || "";
        let existingUser = await db
          .select()
          .from(users)
          .leftJoin(userOauth, eq(users.id, userOauth.userId))
          .where(
            and(
              eq(users.email, email),
              eq(userOauth.provider, "microsoft"),
              eq(userOauth.providerId, profile.id)
            )
          );

        if (existingUser.length > 0) return done(null, existingUser);

        const [newUser] = await db
          .insert(users)
          .values({
            email,
            firstName: profile.name?.givenName || "",
            lastName: profile.name?.familyName || "",
            password: "",
            isAdmin: false,
            isVerified: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        // create user_oauth
        await db.insert(userOauth).values({
          userId: newUser.id,
          provider: "microsoft",
          providerId: profile.id,
          createdAt: new Date(),
        });

        return done(null, newUser);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

export default passport;
