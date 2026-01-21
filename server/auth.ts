import cookieSession from "cookie-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import express, { type Express } from "express";
import { scryptSync, randomBytes, timingSafeEqual } from "crypto";
import { users, type User } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

async function hashPassword(password: string) {
    const salt = randomBytes(16).toString("hex");
    const buf = scryptSync(password, salt, 64) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
    const [hashed, salt] = stored.split(".");
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = scryptSync(supplied, salt, 64) as Buffer;
    return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
    app.use(cookieSession({
        name: 'session',
        keys: [process.env.SESSION_SECRET || 'erp-secret-key'],
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        httpOnly: true,
    }));

    app.use(passport.initialize());
    app.use(passport.session());

    passport.use(
        new LocalStrategy(async (username, password, done) => {
            try {
                const [user] = await db
                    .select()
                    .from(users)
                    .where(eq(users.username, username))
                    .limit(1);

                if (!user || !(await comparePasswords(password, user.password))) {
                    return done(null, false);
                }

                return done(null, user);
            } catch (err) {
                return done(err);
            }
        }),
    );

    passport.serializeUser((user, done) => {
        done(null, (user as User).id);
    });

    passport.deserializeUser(async (id: number, done) => {
        try {
            const [user] = await db
                .select()
                .from(users)
                .where(eq(users.id, id))
                .limit(1);
            done(null, user);
        } catch (err) {
            done(err);
        }
    });

    app.post("/api/register", async (req, res, next) => {
        try {
            const { username, password } = req.body;

            if (!username || !password) {
                return res.status(400).send("Username and password are required");
            }

            const [existingUser] = await db
                .select()
                .from(users)
                .where(eq(users.username, username))
                .limit(1);

            if (existingUser) {
                return res.status(400).send("Username already exists");
            }

            const hashedPassword = await hashPassword(password);
            const [user] = await db
                .insert(users)
                .values({
                    username,
                    password: hashedPassword,
                })
                .returning();

            req.login(user, (err) => {
                if (err) return next(err);
                res.status(201).json(user);
            });
        } catch (err) {
            next(err);
        }
    });

    app.post("/api/login", (req, res, next) => {
        passport.authenticate("local", (err: any, user: any, info: any) => {
            if (err) return next(err);
            if (!user) return res.status(401).send("Invalid username or password");
            req.login(user, (err) => {
                if (err) return next(err);
                res.status(200).json(user);
            });
        })(req, res, next);
    });

    app.post("/api/logout", (req, res, next) => {
        req.logout((err) => {
            if (err) return next(err);
            res.sendStatus(200);
        });
    });

    app.get("/api/user", (req, res) => {
        if (!req.isAuthenticated()) return res.sendStatus(401);
        res.json(req.user);
    });
}
