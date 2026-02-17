import type { Express } from "express";
import { authStorage } from "./storage";
import { isAuthenticated } from "./replitAuth";

const TEST_ACCOUNT_ID = "test_clean_account";
const REVIEWER_ACCOUNT_ID = "reviewer_account";

export function registerAuthRoutes(app: Express): void {
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await authStorage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post("/api/auth/switch-test", isAuthenticated, async (req: any, res) => {
    try {
      const originalUserId = req.user.claims.sub;

      if (originalUserId === TEST_ACCOUNT_ID) {
        return res.status(400).json({ message: "Already on test account" });
      }

      await authStorage.upsertUser({
        id: TEST_ACCOUNT_ID,
        email: "test@maker.clean",
        firstName: "Test",
        lastName: "Account",
        profileImageUrl: null,
      });

      const originalClaims = { ...req.user.claims };
      const testUser: any = {
        claims: {
          sub: TEST_ACCOUNT_ID,
          email: "test@maker.clean",
          first_name: "Test",
          last_name: "Account",
        },
        expires_at: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
        _originalClaims: originalClaims,
      };

      req.login(testUser, (err: any) => {
        if (err) {
          return res.status(500).json({ message: "Switch failed" });
        }
        req.session.save((saveErr: any) => {
          if (saveErr) {
            return res.status(500).json({ message: "Session save failed" });
          }
          res.json({ success: true, testUserId: TEST_ACCOUNT_ID });
        });
      });
    } catch (error) {
      console.error("Switch to test account error:", error);
      res.status(500).json({ message: "Switch failed" });
    }
  });

  app.post("/api/auth/switch-reviewer", isAuthenticated, async (req: any, res) => {
    try {
      const originalUserId = req.user.claims.sub;

      if (originalUserId === REVIEWER_ACCOUNT_ID) {
        return res.status(400).json({ message: "Already on reviewer account" });
      }
      if (originalUserId === TEST_ACCOUNT_ID) {
        return res.status(400).json({ message: "Switch back first before switching to reviewer" });
      }

      await authStorage.upsertUser({
        id: REVIEWER_ACCOUNT_ID,
        email: "reviewer@maker.review",
        firstName: "Reviewer",
        lastName: "",
        profileImageUrl: null,
      });

      const originalClaims = { ...req.user.claims };
      const reviewerUser: any = {
        claims: {
          sub: REVIEWER_ACCOUNT_ID,
          email: "reviewer@maker.review",
          first_name: "Reviewer",
          last_name: "",
        },
        expires_at: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
        _originalClaims: originalClaims,
      };

      req.login(reviewerUser, (err: any) => {
        if (err) {
          return res.status(500).json({ message: "Switch failed" });
        }
        req.session.save((saveErr: any) => {
          if (saveErr) {
            return res.status(500).json({ message: "Session save failed" });
          }
          res.json({ success: true, reviewerUserId: REVIEWER_ACCOUNT_ID });
        });
      });
    } catch (error) {
      console.error("Switch to reviewer account error:", error);
      res.status(500).json({ message: "Switch failed" });
    }
  });

  app.post("/api/auth/switch-back", isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.user.claims.sub;
      const originalClaims = req.user._originalClaims;
      const isSwitchedAccount = (currentUserId === TEST_ACCOUNT_ID || currentUserId === REVIEWER_ACCOUNT_ID) && originalClaims;

      if (!isSwitchedAccount) {
        return res.status(400).json({ message: "Not on a switched account" });
      }

      const restoredUser: any = {
        claims: originalClaims,
        expires_at: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
      };

      req.login(restoredUser, (err: any) => {
        if (err) {
          return res.status(500).json({ message: "Switch back failed" });
        }
        req.session.save((saveErr: any) => {
          if (saveErr) {
            return res.status(500).json({ message: "Session save failed" });
          }
          res.json({ success: true, userId: originalClaims.sub });
        });
      });
    } catch (error) {
      console.error("Switch back error:", error);
      res.status(500).json({ message: "Switch back failed" });
    }
  });
}
