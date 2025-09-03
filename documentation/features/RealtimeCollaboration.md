# Realtime Collaboration

This feature enables real-time collaborative functionalities within the application, allowing multiple users to interact simultaneously.

## Overview

Leverages Supabase Realtime capabilities to provide instant updates and shared experiences across different user sessions.

## Key Components/Services Involved

*   [`RealtimeCollaboration.js`](../../src/components/RealtimeCollaboration.js) (component): Manages the real-time connection and shared state.
*   Supabase Realtime: The backend service providing WebSocket connections for real-time data synchronization.

## Functionality

*   **Shared State Synchronization:** Updates made by one user are immediately reflected for others in the same collaborative session.
    <img src="../images/realtime-collaboration-in-action.png" alt="Realtime Collaboration in action" width="200"/>
*   **Presence Indicators:** Shows which users are currently active or present in a collaborative space.
    <img src="../images/user-presence-indicators.png" alt="User Presence Indicators" width="200"/>
*   **Realtime Cursor Display:** (If implemented) Shows the cursors of other users in real-time.
    <img src="../images/realtime-cursor-display.png" alt="Realtime Cursor Display" width="200"/>

## Implementation Details

*   Utilizes Supabase channels for broadcasting and listening to real-time events.
*   Can be toggled on/off via a header button.

<img src="../images/realtime-collaboration-toggle-button.png" alt="Realtime Collaboration Toggle Button" width="200"/>
