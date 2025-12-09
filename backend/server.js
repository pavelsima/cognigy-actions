/**
 * Conversation Backend Server for cognigy-actions
 *
 * Provides conversation storage/retrieval for CXone AI Webchat integration.
 * Uses SQLite for simple persistent storage.
 */

import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3002; // Different port from main dev server

// Initialize SQLite database
const db = new Database(join(__dirname, 'conversations.db'));

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    text TEXT,
    source TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    data TEXT,
    FOREIGN KEY (session_id) REFERENCES sessions(id)
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
  CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
`);

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

/**
 * GET /api/conversations?userId=xxx
 *
 * Returns all conversations for a user in the format expected by Cognigy Webchat localStorage.
 */
app.get('/api/conversations', (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    // Get all sessions for user
    const sessions = db
      .prepare('SELECT * FROM sessions WHERE user_id = ? ORDER BY updated_at DESC')
      .all(userId);

    // Get messages for each session
    const conversations = sessions.map((session) => {
      const messages = db
        .prepare('SELECT * FROM messages WHERE session_id = ? ORDER BY timestamp ASC')
        .all(session.id);

      return {
        sessionId: session.id,
        messages: messages.map((msg) => {
          // Parse text: bot messages are stored as JSON arrays, user messages as strings
          let text = msg.text;
          if (msg.source === 'bot' && msg.text) {
            try {
              text = JSON.parse(msg.text);
            } catch {
              // If parsing fails, keep as string
            }
          }
          return {
            id: msg.id,
            text,
            source: msg.source,
            timestamp: msg.timestamp,
            data: msg.data ? JSON.parse(msg.data) : undefined,
          };
        }),
        rating: { hasGivenRating: false },
      };
    });

    console.log(`[Backend] Retrieved ${conversations.length} conversations for user ${userId}`);
    res.json(conversations);
  } catch (error) {
    console.error('[Backend] Error fetching conversations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Time window for merging streaming messages (ms)
const MESSAGE_MERGE_WINDOW_MS = 2000;

/**
 * POST /api/conversations/message
 *
 * Save a message to a conversation. Creates session if it doesn't exist.
 * For bot messages: merges streaming chunks into text array within time window.
 */
app.post('/api/conversations/message', (req, res) => {
  const { userId, sessionId, message } = req.body;

  if (!userId || !sessionId || !message) {
    return res.status(400).json({ error: 'userId, sessionId, and message are required' });
  }

  try {
    const now = Date.now();

    // Ensure session exists
    const existingSession = db
      .prepare('SELECT id FROM sessions WHERE id = ?')
      .get(sessionId);

    if (!existingSession) {
      db.prepare(
        'INSERT INTO sessions (id, user_id, created_at, updated_at) VALUES (?, ?, ?, ?)'
      ).run(sessionId, userId, now, now);
      console.log(`[Backend] Created new session: ${sessionId}`);
    } else {
      db.prepare('UPDATE sessions SET updated_at = ? WHERE id = ?').run(now, sessionId);
    }

    // Check for recent message from same source to merge (handles streaming)
    const recentMessage = db.prepare(`
      SELECT id, text, timestamp FROM messages
      WHERE session_id = ? AND source = ? AND timestamp > ?
      ORDER BY timestamp DESC LIMIT 1
    `).get(sessionId, message.source || 'unknown', now - MESSAGE_MERGE_WINDOW_MS);

    if (recentMessage && message.source === 'bot') {
      // Merge streaming: append text to array
      let existingText;
      try {
        existingText = JSON.parse(recentMessage.text);
        if (!Array.isArray(existingText)) {
          existingText = existingText ? [existingText] : [];
        }
      } catch {
        existingText = recentMessage.text ? [recentMessage.text] : [];
      }

      // Append new text chunk
      if (message.text) {
        existingText.push(message.text);
      }

      // Update with merged text array and latest properties
      db.prepare(
        'UPDATE messages SET text = ?, data = ? WHERE id = ?'
      ).run(
        JSON.stringify(existingText),
        message.data ? JSON.stringify(message.data) : null,
        recentMessage.id
      );
      console.log(`[Backend] Merged streaming chunk into ${recentMessage.id}`);
    } else {
      // Insert new message (store text as array for bot, string for user)
      const textToStore = message.source === 'bot' && message.text
        ? JSON.stringify([message.text])
        : message.text || '';

      db.prepare(
        'INSERT OR REPLACE INTO messages (id, session_id, user_id, text, source, timestamp, data) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(
        message.id,
        sessionId,
        userId,
        textToStore,
        message.source || 'unknown',
        message.timestamp || now,
        message.data ? JSON.stringify(message.data) : null
      );
      console.log(`[Backend] Saved message ${message.id} to session ${sessionId}`);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[Backend] Error saving message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/conversations/session
 *
 * Create or switch to a session
 */
app.post('/api/conversations/session', (req, res) => {
  const { userId, sessionId } = req.body;

  if (!userId || !sessionId) {
    return res.status(400).json({ error: 'userId and sessionId are required' });
  }

  try {
    const now = Date.now();

    const existingSession = db
      .prepare('SELECT id FROM sessions WHERE id = ?')
      .get(sessionId);

    if (!existingSession) {
      db.prepare(
        'INSERT INTO sessions (id, user_id, created_at, updated_at) VALUES (?, ?, ?, ?)'
      ).run(sessionId, userId, now, now);
      console.log(`[Backend] Created session: ${sessionId}`);
    }

    res.json({ success: true, sessionId });
  } catch (error) {
    console.error('[Backend] Error creating session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/conversations?userId=xxx
 *
 * Delete all conversations for a user
 */
app.delete('/api/conversations', (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    // Delete messages first (foreign key)
    db.prepare('DELETE FROM messages WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);

    console.log(`[Backend] Deleted all conversations for user ${userId}`);
    res.json({ success: true });
  } catch (error) {
    console.error('[Backend] Error deleting conversations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/debug/seed
 *
 * Seed some test data (development only)
 */
app.post('/api/debug/seed', (req, res) => {
  const { userId = 'test-user' } = req.body;
  const now = Date.now();
  const sessionId = `session-${now}`;

  try {
    // Create a test session
    db.prepare(
      'INSERT INTO sessions (id, user_id, created_at, updated_at) VALUES (?, ?, ?, ?)'
    ).run(sessionId, userId, now, now);

    // Add some test messages
    const messages = [
      { id: `msg-1-${now}`, text: 'Hello, I need help with something', source: 'user', timestamp: now - 60000 },
      { id: `msg-2-${now}`, text: 'Hi! I\'d be happy to help. What do you need assistance with?', source: 'bot', timestamp: now - 55000 },
      { id: `msg-3-${now}`, text: 'Can you show me my recent activity?', source: 'user', timestamp: now - 30000 },
      { id: `msg-4-${now}`, text: 'Sure! Let me pull up your activity dashboard.', source: 'bot', timestamp: now - 25000 },
    ];

    const insertStmt = db.prepare(
      'INSERT INTO messages (id, session_id, user_id, text, source, timestamp, data) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );

    messages.forEach((msg) => {
      insertStmt.run(msg.id, sessionId, userId, msg.text, msg.source, msg.timestamp, null);
    });

    console.log(`[Backend] Seeded test data for user ${userId}`);
    res.json({ success: true, sessionId, messageCount: messages.length });
  } catch (error) {
    console.error('[Backend] Error seeding data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/debug/all
 *
 * Get all data (development only)
 */
app.get('/api/debug/all', (_req, res) => {
  try {
    const sessions = db.prepare('SELECT * FROM sessions ORDER BY updated_at DESC').all();
    const messages = db.prepare('SELECT * FROM messages ORDER BY timestamp ASC').all();

    res.json({ sessions, messages });
  } catch (error) {
    console.error('[Backend] Error fetching all data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Serve webchat files (for local development)
const webchatPath = join(__dirname, '..', 'webchat', 'dist');
if (existsSync(webchatPath)) {
  app.use('/webchat', express.static(webchatPath));
  console.log(`[Backend] Serving webchat from ${webchatPath}`);
}

app.listen(PORT, () => {
  console.log(`[Backend] Conversation server running at http://localhost:${PORT}`);
  console.log(`[Backend] Endpoints:`);
  console.log(`  GET  /api/health`);
  console.log(`  GET  /api/conversations?userId=xxx`);
  console.log(`  POST /api/conversations/message`);
  console.log(`  POST /api/conversations/session`);
  console.log(`  DELETE /api/conversations?userId=xxx`);
  console.log(`  POST /api/debug/seed`);
  console.log(`  GET  /api/debug/all`);
  if (existsSync(webchatPath)) {
    console.log(`  GET  /webchat/* (static files)`);
  }
});
