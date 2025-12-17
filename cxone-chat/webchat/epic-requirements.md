Epic Overview

Fork and customize the official Cognigy WebChat widget to integrate conversational AI into Actions, leveraging Cognigy's mature codebase while adding CXone-specific styling and plugins.

User Story

As a CXone Actions user
I want to access AI-powered conversational features through a polished chat interface
So that I can efficiently query data, generate emails, and create articles using natural language

Requirements

WebChat Fork Setup

• Fork official Cognigy WebChat repository
• Set up build pipeline for custom CXone fork
• Configure WebChat for embedded mode within Actions panel
• Establish process for pulling upstream updates

CXone Styling

• Apply CXone brand colors, fonts, and design language
• Customize message bubbles and visual elements
• Ensure responsive behavior within Actions panel

Message Streaming

• Enable Cognigy's built-in streaming capabilities
• Configure streaming endpoint and socket connections
• Display typing indicators during response generation

Quick Actions

• Enable quick replies feature in WebChat config
• Style quick reply buttons per CXone standards
• Implement quick reply state management

Custom Plugins Development

• Audit existing Cognigy plugins to identify gaps
• Develop custom plugins for:
• Data table rendering (for QueryData results)
• Email preview (for draft emails)
• Article structure display (for formatted articles)
• Draft manipulation (inline editing capabilities)
• Create plugin documentation

Cognigy Flow Setup

• QueryData Flow: Natural language data querying with custom rendering
• Create Email Flow: Email template generation with preview
• Create Article Flow: KB article generation with formatting
• Manipulate Draft Flow: Content refinement (decide: combined or separate tools)

Technical Implementation

• Document all customizations to forked code
• Follow Cognigy plugin development best practices
• Build Actions-to-WebChat integration bridge
• Handle authentication token passing from Actions to Cognigy

Acceptance Criteria

• Forked WebChat builds successfully with all customizations
• UI aligns with CXone brand guidelines
• Message streaming functions with minimal latency
• Quick replies render and respond correctly
• All custom plugins function as specified
• All 4 use cases complete successfully end-to-end