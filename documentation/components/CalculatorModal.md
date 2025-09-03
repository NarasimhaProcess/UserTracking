# Calculator Modal

This document describes the Calculator Modal component.

## Overview
This component implements a basic calculator. It handles numerical input, arithmetic operations (addition, subtraction, multiplication, division), and displays the results.

## Functionality
*   **Basic Arithmetic:** Supports addition, subtraction, multiplication, and division.
*   **Number Input:** Allows input of numbers and decimal points.
*   **Clear Function:** "AC" button to clear the display and reset the calculator.
*   **Sign Change:** "+/-" button to toggle the sign of the displayed number.
*   **Modal Presentation:** Appears as a popup overlay, dimming the background content.

## How it acts as a Modal Component
This component directly uses the `Modal` component from React Native, making it a true modal that floats above the current screen, dimming the background content.

## Components Used
*   `Modal` (from React Native)
*   `View`, `Text`, `TouchableOpacity` (from React Native)

## Images

<img src="images/calculator-modal.png" alt="Calculator Modal Overview" width="200"/>
<img src="images/calculator-modal-example.png" alt="Calculator Modal Example" width="200"/>