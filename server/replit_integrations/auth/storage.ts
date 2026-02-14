import { users as pgUsers, type User, type UpsertUser } from "@shared/models/auth";
import { users as sqliteUsers } from "../../../shared/schema.sqlite";
import { db, driver } from "../../db";
import { eq } from "drizzle-orm";

export interface IAuthStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
}

const users = driver === "sqlite" ? sqliteUsers : pgUsers;

class AuthStorage implements IAuthStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user as User | undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    if (driver === "sqlite") {
      const existing = await this.getUser(userData.id!);
      if (existing) {
        await db
          .update(sqliteUsers)
          .set({
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            profileImageUrl: userData.profileImageUrl,
            updatedAt: new Date(),
          })
          .where(eq(sqliteUsers.id, userData.id!));
        const [updated] = await db.select().from(sqliteUsers).where(eq(sqliteUsers.id, userData.id!));
        return updated as unknown as User;
      } else {
        await db.insert(sqliteUsers).values({
          id: userData.id!,
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        const [created] = await db.select().from(sqliteUsers).where(eq(sqliteUsers.id, userData.id!));
        return created as unknown as User;
      }
    }

    const [user] = await db
      .insert(pgUsers)
      .values(userData)
      .onConflictDoUpdate({
        target: pgUsers.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }
}

export const authStorage = new AuthStorage();
