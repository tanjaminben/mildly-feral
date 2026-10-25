import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
export const notebooks = sqliteTable("notebooks", {
  owner: text("owner").primaryKey(), document: text("document").notNull(),
  revision: integer("revision").notNull().default(0), updatedAt: text("updated_at").notNull(),
});
export const photos = sqliteTable("photos", {
  id: text("id").primaryKey(), owner: text("owner").notNull(), objectKey: text("object_key").notNull(),
  mime: text("mime").notNull(), bytes: integer("bytes").notNull(), createdAt: text("created_at").notNull(),
}, (table) => [index("photos_owner_idx").on(table.owner)]);
