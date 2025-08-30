import { and } from "drizzle-orm";
// backend/passport/discord.ts
import passport from "passport";
import { Strategy as DiscordStrategy } from "passport-discord";
import { db } from "../../db"; // drizzle
import { users } from "../../db/schema";
import { eq } from "drizzle-orm";
import { userOauth } from "../../db/models/user_oauth";

passport.use(
  new DiscordStrategy(
    {
      clientID: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      callbackURL: "http://localhost:6969/auth/discord/callback",
      scope: ["identify", "email"], // adjust as needed
    },
    async (accessToken: any, refreshToken: any, profile: any, done: any) => {
      try {
        // check if user exists
        const [existingUser] = await db
          .select()
          .from(users)
          .leftJoin(userOauth, eq(users.id, userOauth.userId))
          .where(
            and(
              eq(userOauth.provider, "discord"),
              eq(userOauth.providerId, profile.id)
            )
          );

        if (existingUser) return done(null, existingUser);

        // create user
        const [newUser] = await db
          .insert(users)
          .values({
            email: profile.email || "",
            firstName: profile.username,
            lastName: "", // Discord doesn't provide separate last name
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
          provider: "discord",
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
