# Project Momentum: A Privacy-First, AI-Enhanced Productivity App

**Project Momentum** is a modern, offline-first personal productivity application designed for users who value privacy, speed, and intelligent assistance. All of your data is stored locally in your browser, and no account or internet connection is required for core functionality. Optional, powerful AI features can be enabled by providing your own Groq API key.

This application is built with vanilla HTML, CSS, and JavaScript, ensuring it is lightweight, fast, and has no external dependencies.

## Core Features

### 1. Task Manager

A versatile tool to manage your daily to-dos with multiple views.

*   **List View:** A clean, simple list of your tasks. You can add, edit, mark as complete, and delete tasks.
*   **Kanban Board:** Visualize your workflow with a four-column Kanban board:
    *   **To Do:** Your backlog of tasks.
    *   **Selected:** A special, AI-curated list of tasks and habits for your daily plan.
    *   **In Progress:** Tasks you are actively working on.
    *   **Done:** Completed tasks.
*   **Drag & Drop:** Easily move tasks between the To Do, In Progress, and Done columns.

### 2. AI-Powered Daily Planner

The "Selected" column on the Kanban board features an interactive title. Clicking it allows you to:

*   **Specify Available Time:** Tell the AI how many hours you have available for the day.
*   **Set Mandatory Tasks:** List any tasks that you absolutely must complete.
*   **Generate a Realistic Plan:** The Groq AI will analyze your To-Do list and your daily habits, selecting a realistic set of tasks and habits to fill your available time. It will then automatically move these items into the "Selected" column.

### 3. Habit Tracker

A data-driven and motivating way to build consistency.

*   **Completion Graph:** A bar chart visualizes the number of habits you have completed over the last seven days, giving you a clear view of your recent progress.
*   **Daily Completion List:** A simple list of all your habits with a "Complete for Today" button. The button disables itself after being clicked and resets automatically the next day.

### 4. Notes / Journal

A clean, professional, two-column interface for note-taking.

*   **Note Sidebar:** A list of all your notes on the left, showing the title and a short snippet of the content for easy identification.
*   **Dedicated Editor:** A large editor pane on the right for the selected note, with a clear title input and a spacious content area.
*   **Auto-Saving:** All changes are saved automatically after a brief pause.
*   **AI Summarization:** If you have enabled the AI assistant, you can click the "Summarize" button to get a concise summary of your note, which appears in a separate, clean section.

### 5. Calendar / Planner

A visual way to see your time-sensitive tasks.

*   **Month View:** A traditional calendar grid that displays all tasks with a due date. Long task names are automatically truncated to keep the grid clean and uniform.
*   **"Day Zoom" View:** Clicking on any day in the calendar hides the month grid and shows a detailed, full-width view of all tasks scheduled for that day, with their full, untruncated names.

### 6. Settings & Personalization

*   **Theme Switching:** Toggle between a futuristic dark theme and a clean light theme. Your preference is saved locally.
*   **Data Management:** Export all of your application data (tasks, habits, notes) to a single JSON file for backup. You can import this file later to restore your data.
*   **AI Integration:** Securely enter and save your Groq API key to enable all AI-powered features.

## Dependencies

This project is committed to being entirely self-contained. It does not and will not use any external libraries or packages. All functionality is built using standard, built-in features of HTML, CSS, and JavaScript.

## How to Run the Application Locally

This application must be served by a local web server for all features (especially the offline mode) to work correctly.

### Prerequisites

*   **Python 3:** Most modern Linux and macOS systems have Python 3 pre-installed.

### Instructions

1.  **Open a terminal** in the root directory of the project.

2.  **Start the web server** with the following command:

    ```bash
    python3 -m http.server
    ```

3.  Your terminal will display a message like `Serving HTTP on 0.0.0.0 port 8000 ...`. **Leave this terminal window open.**

4.  **Open your web browser** and navigate to:

    [http://localhost:8000](http://localhost:8000)

The application will now be running.
