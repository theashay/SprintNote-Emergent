import {
  pgTable,
  text,
  varchar,
  boolean,
  integer,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// users
export const users = pgTable(
  'users',
  {
    userId: varchar('user_id', { length: 32 }).primaryKey(),
    email: text('email').notNull(),
    name: text('name'),
    password: text('password'), // null for OAuth users
    picture: text('picture'),
    verified: boolean('verified').default(false).notNull(),
    authProvider: varchar('auth_provider', { length: 16 }).default('email').notNull(),
    otp: varchar('otp', { length: 6 }),
    otpExpires: timestamp('otp_expires', { withTimezone: true }),
    plan: varchar('plan', { length: 16 }).default('free').notNull(),
    notesUsed: integer('notes_used').default(0).notNull(),
    notesQuota: integer('notes_quota').default(50).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    lastLogin: timestamp('last_login', { withTimezone: true }),
  },
  (t) => ({
    emailIdx: uniqueIndex('users_email_idx').on(t.email),
  })
);

// notes
export const notes = pgTable(
  'notes',
  {
    noteId: varchar('note_id', { length: 32 }).primaryKey(),
    userId: varchar('user_id', { length: 32 }).notNull(),
    title: text('title').notNull(),
    transcript: text('transcript').notNull(),
    polished: text('polished').default('').notNull(),
    style: varchar('style', { length: 32 }).default('Clear & Simple').notNull(),
    duration: integer('duration').default(0).notNull(),
    folder: varchar('folder', { length: 64 }).default('Uncategorized').notNull(),
    favorite: boolean('favorite').default(false).notNull(),
    tags: jsonb('tags').$type<string[]>().default([]).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index('notes_user_idx').on(t.userId, t.createdAt),
  })
);

// sessions (Emergent OAuth)
export const userSessions = pgTable('user_sessions', {
  sessionToken: text('session_token').primaryKey(),
  userId: varchar('user_id', { length: 32 }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
