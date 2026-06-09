import { Router } from "express";
import { db } from "@workspace/db";
import { clubEventsTable, runsTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { getOrCreateMember } from "./members";

const router = Router();

// GET /api/club-events — list all events sorted by date
router.get("/club-events", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const events = await db
    .select()
    .from(clubEventsTable)
    .orderBy(asc(clubEventsTable.date));

  res.json(events);
});

// POST /api/club-events — admin creates an event
router.post("/club-events", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const member = await getOrCreateMember(req);
  if (!member?.isAdmin) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const { name, date, description } = req.body as {
    name?: string;
    date?: string;
    description?: string;
  };

  if (!name || typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "name is required" });
    return;
  }
  if (!date || typeof date !== "string") {
    res.status(400).json({ error: "date is required (YYYY-MM-DD)" });
    return;
  }

  const [event] = await db
    .insert(clubEventsTable)
    .values({ name: name.trim(), date, description: description?.trim() ?? null })
    .returning();

  res.status(201).json(event);
});

// PATCH /api/club-events/:eventId — admin edits an event
router.patch("/club-events/:eventId", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const member = await getOrCreateMember(req);
  if (!member?.isAdmin) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const eventId = parseInt(req.params.eventId, 10);
  if (isNaN(eventId)) {
    res.status(400).json({ error: "Invalid event ID" });
    return;
  }

  const existing = await db.query.clubEventsTable.findFirst({
    where: eq(clubEventsTable.id, eventId),
  });
  if (!existing) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  const { name, date, description } = req.body as {
    name?: string;
    date?: string;
    description?: string;
  };

  const [updated] = await db
    .update(clubEventsTable)
    .set({
      name: name?.trim() ?? existing.name,
      date: date ?? existing.date,
      description: description !== undefined ? (description?.trim() || null) : existing.description,
    })
    .where(eq(clubEventsTable.id, eventId))
    .returning();

  res.json(updated);
});

// DELETE /api/club-events/:eventId — admin deletes an event
router.delete("/club-events/:eventId", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const member = await getOrCreateMember(req);
  if (!member?.isAdmin) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const eventId = parseInt(req.params.eventId, 10);
  if (isNaN(eventId)) {
    res.status(400).json({ error: "Invalid event ID" });
    return;
  }

  // Unlink any runs associated with this event
  await db
    .update(runsTable)
    .set({ clubEventId: null })
    .where(eq(runsTable.clubEventId, eventId));

  await db.delete(clubEventsTable).where(eq(clubEventsTable.id, eventId));

  res.json({ deleted: true });
});

export default router;
