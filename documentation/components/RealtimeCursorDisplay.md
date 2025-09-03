# Realtime Cursor Display

This document describes the Realtime Cursor Display component.

## Overview
This component is designed to display the real-time cursor positions of other users on the screen. It uses Supabase's broadcast feature to send and receive cursor coordinates.

## Functionality
*   **Cursor Tracking:** Tracks the local user's touch movements and broadcasts their cursor position.
*   **Remote Cursor Display:** Receives and renders the cursor positions of other users in real-time.
*   **Overlay Behavior:** Acts as a transparent layer that floats above the main application content.

## How it acts as an Overlay Component
This component uses `position: 'absolute'` and `transparent` backgrounds to float over the main application content, typically appearing as small cursor icons with labels.

## Data Sources
*   Supabase (for real-time cursor position broadcasting).

## Components Used
*   `PanResponder` (from React Native)
*   `Animated` (from React Native)
*   `Icon` (from `react-native-vector-icons/MaterialIcons`)

## Images

<img src="images/realtime-cursor-display.png" alt="Realtime Cursor Display Overview" width="200"/>
<img src="images/realtime-cursor-example.png" alt="Realtime Cursor Example" width="200"/>