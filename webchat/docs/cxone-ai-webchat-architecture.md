# CXone AI Webchat - Architecture & Implementation Plan

## Executive Summary

This document outlines the architecture and implementation plan for integrating Cognigy's conversational AI into CXone Actions through a custom webchat wrapper. Instead of forking the Cognigy Webchat, we create a **wrapper package** that bundles the official webchat with CXone-specific plugins, theming, and configuration.

**Key Decision**: No fork required. We build a wrapper that:
- Uses the official Cognigy Webchat as a dependency
- Bundles custom CXone plugins
- Provides CXone theming out of the box
- Exposes a simple API for Actions integration

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Component Descriptions](#component-descriptions)
3. [Data Flow](#data-flow)
4. [Custom Plugins](#custom-plugins)
5. [Configuration & Theming](#configuration--theming)
6. [Implementation Plan](#implementation-plan)
7. [Technical Specifications](#technical-specifications)
8. [API Reference](#api-reference)
9. [Testing Strategy](#testing-strategy)
10. [Risks & Mitigations](#risks--mitigations)

---

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                     │
│                              USER'S BROWSER                                         │
│                                                                                     │
│  ┌───────────────────────────────────────────────────────────────────────────────┐ │
│  │                                                                               │ │
│  │                         CXone ACTIONS (Host Application)                      │ │
│  │                                                                               │ │
│  │  ┌─────────────────────────────────┐  ┌─────────────────────────────────────┐│ │
│  │  │                                 │  │                                     ││ │
│  │  │      ACTIONS UI                 │  │    CXONE-AI-WEBCHAT                 ││ │
│  │  │      (Existing)                 │  │    (Our Wrapper Package)            ││ │
│  │  │                                 │  │                                     ││ │
│  │  │  • Data dashboards              │  │  ┌───────────────────────────────┐  ││ │
│  │  │  • Email composer               │  │  │ Cognigy Webchat (official)    │  ││ │
│  │  │  • KB article editor            │  │  │ + CXone Theme                 │  ││ │
│  │  │  • User context                 │  │  │ + Custom Plugins:             │  ││ │
│  │  │                                 │  │  │   • DataTable Plugin          │  ││ │
│  │  │         ┌───────────┐           │  │  │   • EmailPreview Plugin       │  ││ │
│  │  │         │ Auth      │───────────┼──┼──│   • ArticleDisplay Plugin     │  ││ │
│  │  │         │ Token     │           │  │  │   • DraftManipulation Plugin  │  ││ │
│  │  │         │ Context   │           │  │  └───────────────────────────────┘  ││ │
│  │  │         └───────────┘           │  │                                     ││ │
│  │  └─────────────────────────────────┘  └──────────────────┬──────────────────┘│ │
│  │                                                          │                    │ │
│  └──────────────────────────────────────────────────────────┼────────────────────┘ │
│                                                             │                      │
└─────────────────────────────────────────────────────────────┼──────────────────────┘
                                                              │
                                                              │ WebSocket
                                                              │
┌─────────────────────────────────────────────────────────────┼──────────────────────┐
│                         COGNIGY.AI PLATFORM                 │                      │
│                                                             ▼                      │
│  ┌──────────────────────────────────────────────────────────────────────────────┐ │
│  │                           WEBCHAT ENDPOINT                                    │ │
│  └──────────────────────────────────────────────────────────────────────────────┘ │
│                                          │                                        │
│            ┌─────────────────────────────┼─────────────────────────────┐          │
│            ▼                             ▼                             ▼          │
│  ┌──────────────────┐        ┌──────────────────┐        ┌──────────────────┐    │
│  │  QueryData Flow  │        │ CreateEmail Flow │        │CreateArticle Flow│    │
│  │                  │        │                  │        │                  │    │
│  │  → Actions API   │        │  → Actions API   │        │  → Actions API   │    │
│  └──────────────────┘        └──────────────────┘        └──────────────────┘    │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                            CXone ACTIONS API                                     │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### Package Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        cxone-ai-webchat (Our Package)                        │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                              Entry Point                                │ │
│  │                         initCXoneWebchat()                              │ │
│  └───────────────────────────────┬────────────────────────────────────────┘ │
│                                  │                                          │
│  ┌───────────────────────────────┼────────────────────────────────────────┐ │
│  │                               ▼                                        │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐ │ │
│  │  │                 │  │                 │  │                         │ │ │
│  │  │  CXone Theme    │  │  Custom Plugins │  │  Wrapper Logic          │ │ │
│  │  │                 │  │                 │  │                         │ │ │
│  │  │  • Colors       │  │  • DataTable    │  │  • Context injection    │ │ │
│  │  │  • Fonts        │  │  • EmailPreview │  │  • Auth token handling  │ │ │
│  │  │  • CSS          │  │  • Article      │  │  • Event bridging       │ │ │
│  │  │  • Layout       │  │  • Draft        │  │  • Analytics            │ │ │
│  │  │                 │  │                 │  │                         │ │ │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────────────┘ │ │
│  │                                                                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                  │                                          │
│                                  ▼                                          │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                   @cognigy/webchat (Dependency)                        │ │
│  │                      Official Cognigy Webchat                          │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Descriptions

### 1. cxone-ai-webchat (Wrapper Package)

**Purpose**: Single entry point for Actions to integrate AI chat functionality.

**Responsibilities**:
- Bundle official Cognigy Webchat
- Register custom CXone plugins
- Apply CXone theming
- Handle authentication context
- Provide simplified API for Actions

**Output**: Single JavaScript bundle (`cxone-ai-webchat.js`)

### 2. CXone Theme

**Purpose**: Apply CXone brand identity to the webchat.

**Includes**:
- Brand colors (primary, secondary, accent)
- Typography (font family, sizes)
- Component styling (buttons, inputs, messages)
- Layout adjustments for Actions panel embedding

### 3. Custom Plugins

#### 3.1 DataTable Plugin
**Purpose**: Render query results as interactive tables.

**Trigger**: `message.data._plugin.type === 'dataTable'`

**Features**:
- Sortable columns
- Pagination (optional)
- Row selection (optional)
- Export capability (optional)

#### 3.2 EmailPreview Plugin
**Purpose**: Display generated email drafts with actions.

**Trigger**: `message.data._plugin.type === 'emailPreview'`

**Features**:
- Formatted email preview (To, Subject, Body)
- Action buttons: [Use This] [Refine] [Copy]
- Rich text body display

#### 3.3 ArticleDisplay Plugin
**Purpose**: Show generated KB articles with structure.

**Trigger**: `message.data._plugin.type === 'article'`

**Features**:
- Hierarchical section display
- Markdown rendering
- Action buttons: [Create Article] [Refine]

#### 3.4 DraftManipulation Plugin
**Purpose**: Display draft revisions with change tracking.

**Trigger**: `message.data._plugin.type === 'draftRevision'`

**Features**:
- Revised content display
- Change summary list
- Action buttons: [Use This] [Undo] [Refine More]

### 4. Cognigy Flows (Backend)

**Purpose**: Handle business logic and Actions API integration.

| Flow | Responsibility |
|------|----------------|
| QueryData | Parse NL query → Call Actions API → Return table data |
| CreateEmail | Generate email via LLM → Return email preview |
| CreateArticle | Generate KB article → Return structured content |
| ManipulateDraft | Refine content → Return revision with changes |

---

## Data Flow

### Flow 1: User Queries Data

```
1. User types: "Show sales for last month"
   │
   ▼
2. cxone-ai-webchat sends via Cognigy socket
   { text: "Show sales for last month", data: { _context: { app: "actions", authToken: "..." } } }
   │
   ▼
3. Cognigy QueryData Flow:
   - Parses intent
   - Calls Actions API: GET /api/sales?period=lastMonth
   - Formats response
   │
   ▼
4. Flow returns:
   {
     text: "Here are your sales:",
     data: {
       _plugin: {
         type: "dataTable",
         columns: ["Product", "Revenue", "Units"],
         rows: [["Widget A", "$5,000", "100"], ...]
       }
     }
   }
   │
   ▼
5. DataTable Plugin renders interactive table
```

### Flow 2: User Creates & Refines Content

```
1. User: "Draft a follow-up email for the client meeting"
   │
   ▼
2. CreateEmail Flow generates draft via LLM
   │
   ▼
3. Returns: { data: { _plugin: { type: "emailPreview", subject: "...", body: "..." } } }
   │
   ▼
4. EmailPreview Plugin renders with [Use This] [Refine] buttons
   │
   ▼
5. User clicks [Refine]: "Make it shorter"
   │
   ▼
6. ManipulateDraft Flow refines content
   │
   ▼
7. Returns: { data: { _plugin: { type: "draftRevision", revised: "...", changes: [...] } } }
   │
   ▼
8. User clicks [Use This]
   │
   ▼
9. Flow calls Actions API to save/use the content
```

---

## Custom Plugins

### Plugin Interface

```typescript
interface CXonePlugin {
  name: string;
  match: (message: Message, config: Config) => boolean;
  component: React.ComponentType<PluginProps>;
  options?: {
    fullscreen?: boolean;
    fullwidth?: boolean;
    passthrough?: boolean;
  };
}

interface PluginProps {
  message: Message;
  onSendMessage: (text: string, data?: object) => void;
  config: Config;
  // ... other props from Cognigy webchat
}
```

### DataTable Plugin Implementation

```typescript
// src/plugins/data-table/index.tsx

import { CXonePlugin } from '../types';

export const DataTablePlugin: CXonePlugin = {
  name: 'cxone-data-table',

  match: (message) => message.data?._plugin?.type === 'dataTable',

  component: ({ message, onSendMessage }) => {
    const { columns, rows, title } = message.data._plugin;

    return (
      <div className="cxone-data-table">
        {title && <h3>{title}</h3>}
        <table>
          <thead>
            <tr>
              {columns.map((col, i) => (
                <th key={i}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
};
```

### EmailPreview Plugin Implementation

```typescript
// src/plugins/email-preview/index.tsx

import { CXonePlugin } from '../types';

export const EmailPreviewPlugin: CXonePlugin = {
  name: 'cxone-email-preview',

  match: (message) => message.data?._plugin?.type === 'emailPreview',

  component: ({ message, onSendMessage }) => {
    const { to, subject, body, cc, bcc } = message.data._plugin;

    const handleUse = () => {
      onSendMessage('', {
        _action: 'useEmail',
        email: { to, subject, body, cc, bcc }
      });
    };

    const handleRefine = () => {
      // Could open a modal or prompt for refinement instructions
      const instruction = prompt('How would you like to refine this email?');
      if (instruction) {
        onSendMessage(instruction, { _action: 'refineEmail' });
      }
    };

    const handleCopy = () => {
      navigator.clipboard.writeText(body);
    };

    return (
      <div className="cxone-email-preview">
        <div className="email-header">
          <div><strong>To:</strong> {to}</div>
          {cc && <div><strong>Cc:</strong> {cc}</div>}
          <div><strong>Subject:</strong> {subject}</div>
        </div>
        <div className="email-body">
          {body}
        </div>
        <div className="email-actions">
          <button onClick={handleUse} className="btn-primary">Use This</button>
          <button onClick={handleRefine} className="btn-secondary">Refine</button>
          <button onClick={handleCopy} className="btn-tertiary">Copy</button>
        </div>
      </div>
    );
  }
};
```

### ArticleDisplay Plugin Implementation

```typescript
// src/plugins/article-display/index.tsx

import { CXonePlugin } from '../types';

export const ArticleDisplayPlugin: CXonePlugin = {
  name: 'cxone-article-display',

  match: (message) => message.data?._plugin?.type === 'article',

  component: ({ message, onSendMessage }) => {
    const { title, sections, tags } = message.data._plugin;

    const handleCreate = () => {
      onSendMessage('', {
        _action: 'createArticle',
        article: { title, sections, tags }
      });
    };

    return (
      <div className="cxone-article-display">
        <h2>{title}</h2>
        {tags && (
          <div className="article-tags">
            {tags.map((tag, i) => (
              <span key={i} className="tag">{tag}</span>
            ))}
          </div>
        )}
        {sections.map((section, i) => (
          <div key={i} className="article-section">
            <h3>{section.heading}</h3>
            <div className="section-content">{section.content}</div>
          </div>
        ))}
        <div className="article-actions">
          <button onClick={handleCreate} className="btn-primary">Create Article</button>
          <button onClick={() => onSendMessage('Refine this article')} className="btn-secondary">
            Refine
          </button>
        </div>
      </div>
    );
  }
};
```

### DraftManipulation Plugin Implementation

```typescript
// src/plugins/draft-manipulation/index.tsx

import { CXonePlugin } from '../types';

export const DraftManipulationPlugin: CXonePlugin = {
  name: 'cxone-draft-manipulation',

  match: (message) => message.data?._plugin?.type === 'draftRevision',

  component: ({ message, onSendMessage }) => {
    const { revised, changes, originalId } = message.data._plugin;

    const handleUse = () => {
      onSendMessage('', { _action: 'useDraft', content: revised });
    };

    const handleUndo = () => {
      onSendMessage('', { _action: 'undoRevision', originalId });
    };

    return (
      <div className="cxone-draft-revision">
        <div className="revision-content">
          {revised}
        </div>
        {changes && changes.length > 0 && (
          <div className="revision-changes">
            <strong>Changes made:</strong>
            <ul>
              {changes.map((change, i) => (
                <li key={i}>{change}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="revision-actions">
          <button onClick={handleUse} className="btn-primary">Use This</button>
          <button onClick={handleUndo} className="btn-secondary">Undo</button>
          <button onClick={() => onSendMessage('Refine more')} className="btn-tertiary">
            Refine More
          </button>
        </div>
      </div>
    );
  }
};
```

---

## Configuration & Theming

### CXone Theme Configuration

```typescript
// src/theme/cxone-theme.ts

export const cxoneTheme = {
  colors: {
    primaryColor: '#0D47A1',        // CXone primary blue
    secondaryColor: '#1565C0',
    chatInterfaceColor: '#FFFFFF',
    botMessageColor: '#F5F5F5',
    userMessageColor: '#E3F2FD',
    textLinkColor: '#1976D2',
  },
  layout: {
    title: 'AI Assistant',
    disableToggleButton: true,      // Actions controls visibility
    watermark: 'none',
    enableGenericHTMLStyling: true,
  },
  behavior: {
    enableTypingIndicator: true,
    messageDelay: 0,
    enableSTT: false,
    enableTTS: false,
  },
  homeScreen: {
    enabled: false,                 // Skip home screen in embedded mode
    previousConversations: {
      enabled: true,
      buttonText: 'Previous Conversations',
      title: 'Your Conversations',
    },
  },
};
```

### CSS Customization

```css
/* src/theme/cxone-webchat.css */

/* Container */
.webchat-root {
  font-family: 'Open Sans', -apple-system, sans-serif;
}

/* Header */
.webchat-header-bar {
  background: linear-gradient(135deg, #0D47A1 0%, #1565C0 100%);
}

/* Messages */
.webchat-message-row.bot .webchat-message-bubble {
  border-radius: 12px 12px 12px 0;
}

.webchat-message-row.user .webchat-message-bubble {
  border-radius: 12px 12px 0 12px;
}

/* Custom Plugin Styles */
.cxone-data-table {
  width: 100%;
  border-collapse: collapse;
  margin: 8px 0;
}

.cxone-data-table th,
.cxone-data-table td {
  padding: 8px 12px;
  text-align: left;
  border-bottom: 1px solid #E0E0E0;
}

.cxone-data-table th {
  background: #F5F5F5;
  font-weight: 600;
}

.cxone-email-preview {
  background: #FAFAFA;
  border: 1px solid #E0E0E0;
  border-radius: 8px;
  padding: 16px;
  margin: 8px 0;
}

.cxone-email-preview .email-header {
  border-bottom: 1px solid #E0E0E0;
  padding-bottom: 12px;
  margin-bottom: 12px;
}

.cxone-email-preview .email-actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}

.cxone-email-preview .btn-primary {
  background: #0D47A1;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.cxone-email-preview .btn-secondary {
  background: white;
  color: #0D47A1;
  border: 1px solid #0D47A1;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

/* Article Display */
.cxone-article-display {
  background: #FAFAFA;
  border-radius: 8px;
  padding: 16px;
  margin: 8px 0;
}

.cxone-article-display h2 {
  margin: 0 0 12px 0;
  color: #0D47A1;
}

.cxone-article-display .article-section {
  margin: 16px 0;
}

.cxone-article-display .article-tags {
  display: flex;
  gap: 4px;
  margin-bottom: 12px;
}

.cxone-article-display .tag {
  background: #E3F2FD;
  color: #0D47A1;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
}

/* Draft Revision */
.cxone-draft-revision {
  background: #FAFAFA;
  border-radius: 8px;
  padding: 16px;
  margin: 8px 0;
}

.cxone-draft-revision .revision-changes {
  background: #FFF8E1;
  padding: 12px;
  border-radius: 4px;
  margin: 12px 0;
}

.cxone-draft-revision .revision-changes ul {
  margin: 8px 0 0 20px;
  padding: 0;
}
```

---

## Implementation Plan

### Phase 1: Project Setup (Week 1)

| Task | Description | Deliverable |
|------|-------------|-------------|
| 1.1 | Create new repository `cxone-ai-webchat` | Git repo with README |
| 1.2 | Set up build pipeline (Webpack/Vite) | Build configuration |
| 1.3 | Configure TypeScript | tsconfig.json |
| 1.4 | Add @cognigy/webchat as dependency | package.json |
| 1.5 | Create entry point with wrapper logic | src/index.ts |
| 1.6 | Set up CI/CD pipeline | GitHub Actions / Azure DevOps |

**Milestone**: Project scaffolding complete, can build empty bundle.

### Phase 2: Theming & Base Integration (Week 2)

| Task | Description | Deliverable |
|------|-------------|-------------|
| 2.1 | Implement CXone color theme | src/theme/cxone-theme.ts |
| 2.2 | Create CSS customizations | src/theme/cxone-webchat.css |
| 2.3 | Build `initCXoneWebchat()` wrapper | src/index.ts |
| 2.4 | Implement context/auth injection | src/utils/context.ts |
| 2.5 | Test basic integration with Actions | Integration test |

**Milestone**: Styled webchat working in Actions with context passing.

### Phase 3: DataTable Plugin (Week 3)

| Task | Description | Deliverable |
|------|-------------|-------------|
| 3.1 | Create DataTable plugin component | src/plugins/data-table/ |
| 3.2 | Implement table rendering | React component |
| 3.3 | Add sorting capability (optional) | Sort handlers |
| 3.4 | Style according to CXone design | CSS |
| 3.5 | Create corresponding Cognigy Flow | QueryData Flow |
| 3.6 | End-to-end testing | Test cases |

**Milestone**: User can query data and see results in table format.

### Phase 4: EmailPreview Plugin (Week 4)

| Task | Description | Deliverable |
|------|-------------|-------------|
| 4.1 | Create EmailPreview plugin component | src/plugins/email-preview/ |
| 4.2 | Implement email preview UI | React component |
| 4.3 | Add action buttons (Use, Refine, Copy) | Button handlers |
| 4.4 | Style according to CXone design | CSS |
| 4.5 | Create corresponding Cognigy Flow | CreateEmail Flow |
| 4.6 | End-to-end testing | Test cases |

**Milestone**: User can generate and preview email drafts.

### Phase 5: ArticleDisplay Plugin (Week 5)

| Task | Description | Deliverable |
|------|-------------|-------------|
| 5.1 | Create ArticleDisplay plugin component | src/plugins/article-display/ |
| 5.2 | Implement article structure UI | React component |
| 5.3 | Add markdown rendering | Markdown parser |
| 5.4 | Add action buttons | Button handlers |
| 5.5 | Style according to CXone design | CSS |
| 5.6 | Create corresponding Cognigy Flow | CreateArticle Flow |
| 5.7 | End-to-end testing | Test cases |

**Milestone**: User can generate and preview KB articles.

### Phase 6: DraftManipulation Plugin (Week 6)

| Task | Description | Deliverable |
|------|-------------|-------------|
| 6.1 | Create DraftManipulation plugin component | src/plugins/draft-manipulation/ |
| 6.2 | Implement revision display UI | React component |
| 6.3 | Add change tracking display | Change list component |
| 6.4 | Add action buttons (Use, Undo, Refine) | Button handlers |
| 6.5 | Style according to CXone design | CSS |
| 6.6 | Create corresponding Cognigy Flow | ManipulateDraft Flow |
| 6.7 | End-to-end testing | Test cases |

**Milestone**: User can iteratively refine content.

### Phase 7: Integration & Polish (Week 7-8)

| Task | Description | Deliverable |
|------|-------------|-------------|
| 7.1 | Actions-to-Webchat event bridging | Event handlers |
| 7.2 | Error handling & edge cases | Error boundaries |
| 7.3 | Loading states & animations | UI polish |
| 7.4 | Accessibility audit & fixes | A11y compliance |
| 7.5 | Performance optimization | Bundle optimization |
| 7.6 | Documentation | README, API docs |
| 7.7 | Full E2E testing | Test suite |
| 7.8 | Security review | Security audit |

**Milestone**: Production-ready package.

---

## Technical Specifications

### Repository Structure

```
cxone-ai-webchat/
├── src/
│   ├── index.ts                 # Entry point, exports initCXoneWebchat
│   ├── types/
│   │   └── index.ts             # TypeScript interfaces
│   ├── theme/
│   │   ├── cxone-theme.ts       # Theme configuration
│   │   └── cxone-webchat.css    # CSS customizations
│   ├── plugins/
│   │   ├── index.ts             # Plugin registration
│   │   ├── data-table/
│   │   │   ├── index.tsx
│   │   │   └── styles.css
│   │   ├── email-preview/
│   │   │   ├── index.tsx
│   │   │   └── styles.css
│   │   ├── article-display/
│   │   │   ├── index.tsx
│   │   │   └── styles.css
│   │   └── draft-manipulation/
│   │       ├── index.tsx
│   │       └── styles.css
│   └── utils/
│       ├── context.ts           # Context handling
│       └── events.ts            # Event bridging
├── dist/                        # Built output
│   └── cxone-ai-webchat.js
├── docs/
│   ├── integration-guide.md
│   └── plugin-development.md
├── tests/
│   ├── unit/
│   └── e2e/
├── package.json
├── tsconfig.json
├── webpack.config.js
└── README.md
```

### Build Configuration

```javascript
// webpack.config.js
const path = require('path');

module.exports = {
  entry: './src/index.ts',
  output: {
    filename: 'cxone-ai-webchat.js',
    path: path.resolve(__dirname, 'dist'),
    library: {
      name: 'CXoneAIWebchat',
      type: 'umd',
    },
    globalObject: 'this',
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  externals: {
    // Don't bundle React if host app provides it
    // react: 'React',
    // 'react-dom': 'ReactDOM',
  },
};
```

### Package.json

```json
{
  "name": "@cxone/ai-webchat",
  "version": "1.0.0",
  "description": "CXone AI Webchat - Cognigy integration for CXone Actions",
  "main": "dist/cxone-ai-webchat.js",
  "types": "dist/types/index.d.ts",
  "scripts": {
    "build": "webpack --mode production",
    "build:dev": "webpack --mode development",
    "dev": "webpack serve --mode development",
    "test": "jest",
    "test:e2e": "cypress run",
    "lint": "eslint src/",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@cognigy/webchat": "^3.x.x"
  },
  "devDependencies": {
    "@types/react": "^18.x.x",
    "css-loader": "^6.x.x",
    "style-loader": "^3.x.x",
    "ts-loader": "^9.x.x",
    "typescript": "^5.x.x",
    "webpack": "^5.x.x",
    "webpack-cli": "^5.x.x"
  },
  "peerDependencies": {
    "react": "^18.x.x",
    "react-dom": "^18.x.x"
  }
}
```

---

## API Reference

### initCXoneWebchat

Main entry point for initializing the webchat.

```typescript
interface CXoneWebchatOptions {
  // Cognigy endpoint URL
  endpoint: string;

  // User identification
  userId?: string;
  sessionId?: string;

  // CXone context
  context?: {
    app: string;           // e.g., 'actions', 'dashboard'
    authToken?: string;    // Actions API auth token
    tenant?: string;
    user?: {
      id: string;
      name?: string;
      role?: string;
    };
    [key: string]: any;    // Additional context
  };

  // Theme overrides (optional)
  theme?: Partial<CXoneTheme>;

  // Feature flags
  features?: {
    previousConversations?: boolean;
    quickReplies?: boolean;
    fileUpload?: boolean;
  };

  // Event handlers
  onReady?: (webchat: CXoneWebchat) => void;
  onMessage?: (message: Message) => void;
  onAction?: (action: PluginAction) => void;
  onError?: (error: Error) => void;
}

interface CXoneWebchat {
  // Control methods
  open(): void;
  close(): void;
  toggle(): void;

  // Messaging
  sendMessage(text: string, data?: object): void;

  // Session management
  endSession(): void;
  switchSession(sessionId: string): void;

  // Context updates
  updateContext(context: object): void;

  // Event subscription
  on(event: string, handler: Function): void;
  off(event: string, handler: Function): void;
}

// Usage
const webchat = await initCXoneWebchat({
  endpoint: 'https://endpoint.cognigy.com/xxx',
  context: {
    app: 'actions',
    authToken: 'Bearer xxx',
    user: { id: '123', name: 'John' }
  },
  onReady: (wc) => console.log('Webchat ready'),
  onAction: (action) => {
    if (action.type === 'useEmail') {
      // Handle in Actions
      actionsApi.insertEmail(action.payload);
    }
  }
});
```

### Plugin Actions

Plugins can trigger actions that the host app can handle:

```typescript
interface PluginAction {
  type: string;
  payload: any;
}

// Example actions from plugins:
{ type: 'useEmail', payload: { to, subject, body } }
{ type: 'createArticle', payload: { title, sections } }
{ type: 'useDraft', payload: { content } }
{ type: 'refineEmail', payload: { instruction } }
```

---

## Testing Strategy

### Unit Tests

```typescript
// tests/unit/plugins/data-table.test.tsx
import { render, screen } from '@testing-library/react';
import { DataTablePlugin } from '../../../src/plugins/data-table';

describe('DataTablePlugin', () => {
  const mockMessage = {
    data: {
      _plugin: {
        type: 'dataTable',
        columns: ['Name', 'Value'],
        rows: [['Item 1', '100'], ['Item 2', '200']]
      }
    }
  };

  it('matches dataTable messages', () => {
    expect(DataTablePlugin.match(mockMessage, {})).toBe(true);
  });

  it('renders table with correct data', () => {
    render(<DataTablePlugin.component message={mockMessage} onSendMessage={jest.fn()} />);

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('200')).toBeInTheDocument();
  });
});
```

### E2E Tests

```typescript
// tests/e2e/query-data.cy.ts
describe('Query Data Flow', () => {
  beforeEach(() => {
    cy.visit('/actions-test-page');
    cy.initCXoneWebchat();
  });

  it('should display query results as table', () => {
    cy.get('.webchat-input').type('Show sales for last month{enter}');

    cy.get('.cxone-data-table', { timeout: 10000 }).should('be.visible');
    cy.get('.cxone-data-table th').should('have.length.greaterThan', 0);
    cy.get('.cxone-data-table tbody tr').should('have.length.greaterThan', 0);
  });
});
```

---

## Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Cognigy Webchat breaking changes | High | Low | Pin version, monitor releases, test before upgrading |
| Plugin API changes | Medium | Low | Abstract plugin interface, version our API |
| Performance issues with large tables | Medium | Medium | Implement pagination, virtual scrolling |
| Actions API rate limits | Medium | Medium | Implement caching, debouncing |
| Browser compatibility | Low | Low | Test matrix, polyfills |
| Bundle size too large | Medium | Medium | Code splitting, tree shaking |

---

## Success Criteria

1. **Functional**: All 4 use cases (QueryData, CreateEmail, CreateArticle, ManipulateDraft) work end-to-end
2. **Performance**: Initial load < 2s, message response < 500ms
3. **Reliability**: 99.9% uptime, graceful error handling
4. **Usability**: Intuitive UI, matches CXone design language
5. **Maintainability**: Clear documentation, automated tests, CI/CD pipeline

---

## Appendix

### A. Cognigy Flow Response Formats

#### DataTable Response
```json
{
  "text": "Here are your results:",
  "data": {
    "_plugin": {
      "type": "dataTable",
      "title": "Sales Report",
      "columns": ["Product", "Revenue", "Units", "Growth"],
      "rows": [
        ["Widget A", "$12,500", "250", "+15%"],
        ["Widget B", "$8,200", "164", "+8%"]
      ],
      "summary": "Total: $20,700"
    }
  }
}
```

#### EmailPreview Response
```json
{
  "data": {
    "_plugin": {
      "type": "emailPreview",
      "to": "client@example.com",
      "cc": "manager@company.com",
      "subject": "Follow-up: Project Discussion",
      "body": "Dear Team,\n\nThank you for taking the time to meet with us yesterday...",
      "attachments": []
    }
  }
}
```

#### Article Response
```json
{
  "data": {
    "_plugin": {
      "type": "article",
      "title": "How to Reset Your Password",
      "tags": ["password", "security", "account"],
      "sections": [
        {
          "heading": "Overview",
          "content": "This article explains how to reset your password..."
        },
        {
          "heading": "Steps",
          "content": "1. Navigate to the login page\n2. Click 'Forgot Password'..."
        }
      ]
    }
  }
}
```

#### DraftRevision Response
```json
{
  "data": {
    "_plugin": {
      "type": "draftRevision",
      "originalId": "draft-123",
      "revised": "Dear Sir/Madam,\n\nThank you for your inquiry...",
      "changes": [
        "Shortened from 150 to 80 words",
        "Applied formal tone",
        "Removed colloquialisms"
      ]
    }
  }
}
```

### B. Quick Reference: Actions Integration

```html
<!-- In Actions HTML -->
<script src="https://cdn.cxone.com/ai-webchat/cxone-ai-webchat.js"></script>

<script>
  // Initialize when Actions loads
  document.addEventListener('DOMContentLoaded', async () => {
    const webchat = await CXoneAIWebchat.init({
      endpoint: window.COGNIGY_ENDPOINT,
      context: {
        app: 'actions',
        authToken: ActionsAPI.getAuthToken(),
        user: ActionsAPI.getCurrentUser()
      },
      onAction: (action) => {
        switch (action.type) {
          case 'useEmail':
            ActionsAPI.insertEmail(action.payload);
            break;
          case 'createArticle':
            ActionsAPI.createKBArticle(action.payload);
            break;
          case 'useDraft':
            ActionsAPI.updateDraft(action.payload);
            break;
        }
      }
    });

    // Store reference for later use
    window.cxoneWebchat = webchat;
  });
</script>
```
