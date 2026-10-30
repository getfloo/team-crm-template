import "server-only";
import { asc, eq, sql } from "drizzle-orm";
import type { User } from "@/lib/identity";
import { getDb } from "./index";
import { users } from "./schema";

export async function syncUser(user: User) {
  const identity = { id: user.id, email: user.email, name: user.name, role: user.role };
  await getDb().insert(users).values(identity).onConflictDoUpdate({
    target: users.id,
    set: {
      email: user.email,
      name: user.name,
      role: user.role,
      updatedAt: new Date(),
    },
  });
}

export type TeamMember = typeof users.$inferSelect;

/** Everyone who has signed in at least once: the people a deal can be assigned to. */
export async function listTeam(): Promise<TeamMember[]> {
  return getDb().select().from(users).orderBy(asc(users.name), asc(users.email));
}

/** The id of the signed-in teammate with this email, case-insensitive, if they have signed in. */
export async function userIdByEmail(email: string): Promise<string | undefined> {
  const [user] = await getDb().select({ id: users.id }).from(users)
    .where(eq(sql`lower(${users.email})`, email.toLowerCase()));
  return user?.id;
}
