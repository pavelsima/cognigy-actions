/**
 * Production Server for cognigy-actions
 *
 * Serves:
 * - API routes at /api/*
 * - CXone Chat script at /cxone-chat/*
 * - SDK app at /sdk-app/*
 * - Demo app (SPA) at /*
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
const PORT = process.env.PORT || 3000;

// Database path - use /data for fly.io volume, fallback to local
const DB_PATH = process.env.DATABASE_PATH || join(__dirname, 'data', 'conversations.db');
console.log(`[Server] Database path: ${DB_PATH}`);

// Ensure data directory exists
import { mkdirSync } from 'fs';
try {
  mkdirSync(dirname(DB_PATH), { recursive: true });
} catch (e) {
  // Directory might already exist
}

const db = new Database(DB_PATH);

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

// Middleware
app.use(cors());
app.use(express.json());

// =============================================================================
// API Routes
// =============================================================================

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now(), env: process.env.NODE_ENV });
});

app.get('/api/conversations', (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    const sessions = db
      .prepare('SELECT * FROM sessions WHERE user_id = ? ORDER BY updated_at DESC')
      .all(userId);

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

    console.log(`[API] Retrieved ${conversations.length} conversations for user ${userId}`);
    res.json(conversations);
  } catch (error) {
    console.error('[API] Error fetching conversations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Time window for merging streaming messages (ms)
const MESSAGE_MERGE_WINDOW_MS = 2000;

app.post('/api/conversations/message', (req, res) => {
  const { userId, sessionId, message } = req.body;
  if (!userId || !sessionId || !message) {
    return res.status(400).json({ error: 'userId, sessionId, and message are required' });
  }

  try {
    const now = Date.now();
    const existingSession = db.prepare('SELECT id FROM sessions WHERE id = ?').get(sessionId);

    if (!existingSession) {
      db.prepare('INSERT INTO sessions (id, user_id, created_at, updated_at) VALUES (?, ?, ?, ?)').run(
        sessionId, userId, now, now
      );
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
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[API] Error saving message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/conversations/session', (req, res) => {
  const { userId, sessionId } = req.body;
  if (!userId || !sessionId) {
    return res.status(400).json({ error: 'userId and sessionId are required' });
  }

  try {
    const now = Date.now();
    const existingSession = db.prepare('SELECT id FROM sessions WHERE id = ?').get(sessionId);

    if (!existingSession) {
      db.prepare('INSERT INTO sessions (id, user_id, created_at, updated_at) VALUES (?, ?, ?, ?)').run(
        sessionId, userId, now, now
      );
    }

    res.json({ success: true, sessionId });
  } catch (error) {
    console.error('[API] Error creating session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/conversations/sync', (req, res) => {
  const { userId, sessionId, messages, rating } = req.body;
  if (!userId || !sessionId || !messages) {
    return res.status(400).json({ error: 'userId, sessionId, and messages are required' });
  }

  try {
    const now = Date.now();

    // Ensure session exists
    const existingSession = db.prepare('SELECT id FROM sessions WHERE id = ?').get(sessionId);
    if (!existingSession) {
      db.prepare('INSERT INTO sessions (id, user_id, created_at, updated_at) VALUES (?, ?, ?, ?)').run(
        sessionId, userId, now, now
      );
    } else {
      db.prepare('UPDATE sessions SET updated_at = ? WHERE id = ?').run(now, sessionId);
    }

    // Delete existing messages for this session
    db.prepare('DELETE FROM messages WHERE session_id = ?').run(sessionId);

    // Insert all messages from localStorage
    const insertStmt = db.prepare(
      'INSERT INTO messages (id, session_id, user_id, text, source, timestamp, data) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );

    for (const msg of messages) {
      const textToStore = typeof msg.text === 'string' ? msg.text : JSON.stringify(msg.text);
      insertStmt.run(
        msg.id,
        sessionId,
        userId,
        textToStore,
        msg.source || 'unknown',
        msg.timestamp || now,
        msg.data ? JSON.stringify(msg.data) : null
      );
    }

    console.log(`[API] Synced ${messages.length} messages for session ${sessionId}`);
    res.json({ success: true, messageCount: messages.length });
  } catch (error) {
    console.error('[API] Error syncing conversation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/conversations', (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    db.prepare('DELETE FROM messages WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
    res.json({ success: true });
  } catch (error) {
    console.error('[API] Error deleting conversations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =============================================================================
// Static Files
// =============================================================================

// Serve cxone-chat files
const cxoneChatPath = join(__dirname, 'cxone-chat', 'dist');
if (existsSync(cxoneChatPath)) {
  app.use('/cxone-chat', express.static(cxoneChatPath, { maxAge: '1d' }));
  console.log(`[Server] Serving cxone-chat from ${cxoneChatPath}`);
}

// Serve webchat files (our fork)
const webchatPath = join(__dirname, 'webchat', 'dist');
if (existsSync(webchatPath)) {
  app.use('/webchat', express.static(webchatPath, { maxAge: '1d' }));
  console.log(`[Server] Serving webchat from ${webchatPath}`);
}

// Serve sdk-app files
const sdkAppPath = join(__dirname, 'sdk-app', 'dist');
if (existsSync(sdkAppPath)) {
  app.use('/sdk-app/dist', express.static(sdkAppPath, { maxAge: '1d' }));
  console.log(`[Server] Serving sdk-app from ${sdkAppPath}`);
}

// Serve demo-app (SPA) - must be last
const demoAppPath = join(__dirname, 'demo-app', 'dist');
if (existsSync(demoAppPath)) {
  app.use(express.static(demoAppPath, { maxAge: '1h' }));
  // SPA fallback - serve index.html for all non-API routes
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(join(demoAppPath, 'index.html'));
    }
  });
  console.log(`[Server] Serving demo-app from ${demoAppPath}`);
}

// =============================================================================
// Start Server
// =============================================================================

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Server] Production server running on port ${PORT}`);
  console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
});
