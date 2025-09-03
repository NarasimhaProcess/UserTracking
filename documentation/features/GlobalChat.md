# Global Chat and Presence

This feature provides a global chat system and presence indicators, allowing users to communicate and see who is online.

## Overview

Enables real-time messaging and displays the online status of users within the application.

## Key Components/Services Involved

*   [`GlobalChatAndPresence.js`](../../src/components/GlobalChatAndPresence.js) (component): Manages the chat interface and presence logic.
*   Supabase Realtime: Powers the real-time messaging and presence tracking.

## Functionality

*   **Real-time Messaging:** Users can send and receive messages instantly.
    <img src="../images/global-chat-interface.png" alt="Global Chat Interface" width="200"/>
*   **User Presence:** Displays which users are currently online or active.
    <img src="../images/online-user-list.png" alt="Online User List" width="200"/>
*   **Group Selection:** (If implemented) Allows users to select different chat groups or channels.
    <img src="../images/chat-group-selection.png" alt="Chat Group Selection" width="200"/>

## Implementation Details

*   Leverages Supabase Realtime subscriptions for chat messages and presence updates.
*   Can be toggled on/off via a header button.

[<img src="../images/global-chat-toggle-button.png" width="200" alt="Global Chat Toggle Button">](../images/global-chat-toggle-button.png)
