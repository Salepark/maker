import type { Express } from "express";
import { authStorage } from "./storage";
import { isAuthenticated } from "./replitAuth";
import { storage } from "../../storage";

const DEMO_USER_ID = "36570281";
const DEMO_USERNAME = "reviewer";
const DEMO_PASSWORD = "makelr2025";

export function registerAuthRoutes(app: Express): void {
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await authStorage.getUser(userId);

      try {
        await storage.ensureDefaultBots(userId);
      } catch (e) {
        console.error("Error ensuring default bots:", e);
      }

      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post("/api/demo-login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (username !== DEMO_USERNAME || password !== DEMO_PASSWORD) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      await authStorage.upsertUser({
        id: DEMO_USER_ID,
        email: "reviewer@makelr.demo",
        firstName: "Reviewer",
        lastName: "Account",
        profileImageUrl: null,
      });

      const demoUser: any = {
        claims: {
          sub: DEMO_USER_ID,
          email: "reviewer@makelr.demo",
          first_name: "Reviewer",
          last_name: "Account",
        },
        expires_at: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
      };

      req.login(demoUser, (err: any) => {
        if (err) {
          console.error("Demo login session error:", err);
          return res.status(500).json({ message: "Session creation failed" });
        }
        res.json({ success: true });
      });
    } catch (error) {
      console.error("Demo login error:", error);
      res.status(500).json({ message: "Demo login failed" });
    }
  });
}
