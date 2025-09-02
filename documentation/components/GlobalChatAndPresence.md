# Global Chat and Presence

This document describes the Global Chat and Presence component.

## Overview
This component provides a real-time chat system with presence detection (showing who is online) for different user groups. It fetches historical messages, listens for new messages in real-time using Supabase, and allows users to send messages. It also manages user presence within selected chat groups.

## Functionality
*   **Real-time Messaging:** Users can send and receive messages instantly.
*   **User Presence:** Displays the online status of users within selected chat groups.
*   **Group Selection:** Allows users to select different chat groups to participate in.
*   **Historical Messages:** Fetches and displays a limited number of past messages.

## How it acts as an Overlay Component
This component uses `position: 'absolute'` and `transparent` backgrounds to float over the main application content, typically appearing as a chat window in a corner of the screen.

## Data Sources
*   Supabase (for real-time messages and presence).

## Components Used
*   `KeyboardAvoidingView` (from React Native)
*   `FlatList` (from React Native)
*   `TextInput` (from React Native)
*   `TouchableOpacity` (from React Native)
*   `Button` (from React Native)

## Images

![Global Chat Interface](images/global-chat-interface.png)
![Global Chat Group Selection](images/chat-group-selection.png)
![Global Chat User List](images/online-user-list.png)