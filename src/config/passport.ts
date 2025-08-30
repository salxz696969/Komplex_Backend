import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { db } from "../db";
import { users } from "../db/models/users";
import { eq } from "drizzle-orm";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: process.env.SERVER_URL + "/auth/google/callback",
    },
    async (
      accessToken: string,
      refreshToken: string,
      profile: any,
      done: any
    ) => {
      try {
        const existingUser = await db
          .select()
          .from(users)
          .where(eq(users.email, profile.emails[0].value))
          .limit(1);

        if (existingUser.length > 0) {
          return done(null, existingUser[0]);
        }

        const [newUser] = await db
          .insert(users)
          .values({
            email: profile.emails[0].value,
            firstName: profile.name.givenName,
            lastName: profile.name.familyName,
            password: "",
            isAdmin: false,
            isVerified: false,
            phone: profile.phone || null,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        return done(null, newUser);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

export default passport;
