# NewsPaper Screen

This screen displays various online newspapers.

## Purpose

To provide users with direct access to online news publications within the app.

## Functionality
*   **Newspaper Selection:** Displays a grid of tiles, each representing a different Telugu newspaper.
*   **In-App Web Viewer:** When a newspaper tile is tapped, a `WebView` component loads the selected newspaper's website directly within the app.
*   **Back Button:** Provides a "Back to Newspapers" button within the WebView view to return to the newspaper selection grid.

## Data Sources
*   Hardcoded list of Telugu newspapers with their names and URLs.

## Components Used
*   `WebView` (from `react-native-webview`)
*   `FlatList` (from React Native)
*   `TouchableOpacity` (from React Native)

## Images

<img src="images/newspaper-selection-grid.png" alt="Newspaper Selection Grid" width="200"/>
