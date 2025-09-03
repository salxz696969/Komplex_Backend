import dotenv from "dotenv";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { db } from "../../db";
import { users } from "../../db/schema";
import { and, eq } from "drizzle-orm";
import { userOauth } from "../../db/models/user_oauth";

// Serialize user for session
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id: any, done) => {
  try {
    const user = await db.select().from(users).where(eq(users.id, id)).limit(1);
    done(null, user[0] || null);
  } catch (error) {
    done(error, null);
  }
});

dotenv.config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: "http://localhost:6969/auth/google/callback",
    },
    async (
      accessToken: string,
      refreshToken: string,
      profile: any,
      done: any
    ) => {
      try {
        console.log(profile);
        const existingUser = await db
          .select({
            id: users.id,
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName,
            isAdmin: users.isAdmin,
            isVerified: users.isVerified,
            phone: users.phone,
            createdAt: users.createdAt,
            updatedAt: users.updatedAt,
          })
          .from(users)
          .leftJoin(userOauth, eq(users.id, userOauth.userId))
          .where(
            and(
              eq(users.email, profile.emails[0].value),
              eq(userOauth.provider, "google"),
              eq(userOauth.providerId, profile.id)
            )
          )
          .limit(1);

        if (existingUser.length > 0) {
          return done(null, existingUser[0]); // Return the user object
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

        // create user_oauth
        await db.insert(userOauth).values({
          userId: newUser.id,
          provider: "google",
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
