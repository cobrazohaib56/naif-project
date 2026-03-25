

# UNITEN AI Study Companion — Frontend Implementation Plan

## Overview
Build a beautiful, mobile-responsive frontend for the **UNITEN AI Study Companion**, a web-based academic assistant for university students. The app will feature a clean, modern UI with a sidebar navigation and multiple feature pages — all using static/mock data (no backend).

---

## Pages & Screens to Build

### 1. **Student Dashboard** (Home Page)
- Greeting header with emoji ("Good Morning, Alex! ☀️")
- 3 stat cards: Notes Summarized, Quizzes Aced, Study Streak
- Recent Activity list (Biology Chapter 1 summary, Calculus Quiz score)
- Quick Actions section (Upload New Note, Start a Quiz)
- Sidebar navigation with all menu items

### 2. **My Notes — List View**
- Page title "My Notes" with search bar and Upload button
- Grid of note cards with thumbnail previews, file names, dates
- Green "Summarized" badges on processed notes
- Cards for: History of Art.pdf, Quantum Physics.docx, Calculus II Notes.pdf, Biology Lab Report.docx, Creative Writing.pdf, Microeconomics.pdf

### 3. **My Notes — Detail View**
- Split layout: PDF viewer area (left) + AI Insights panel (right)
- AI Insights panel with tabs: Summary, Key Concepts, Chat
- Copy and download icons in the panel header
- Bullet-point summary content (Renaissance, Baroque, Rococo, Neoclassicism)

### 4. **Quiz Zone — Quiz List**
- Title "Quizzes" with subtitle and search bar
- Filter by Subject dropdown
- Grid of quiz cards with colored subject badges (Biology 101, Chemistry 204, etc.)
- Each card shows quiz name, question count, and "Start Quiz" button

### 5. **Quiz Zone — Active Quiz**
- Clean centered layout with progress indicator ("Question 3 of 10")
- Timer display (04:59) in top right
- Bold question text
- 4 answer option cards in a 2×2 grid with radio selection
- Selected answer highlighted in blue
- "Next Question" button at bottom

### 6. **Quiz Zone — Results Screen**
- Quiz title and encouragement message
- Score display with large fraction (8/10) and percentage (80%)
- Performance Summary: 3 stat cards (Correct Answers, Incorrect Answers, Topics Covered)
- Action buttons: "Review Answers" and "Go to Dashboard"

### 7. **Ask AI (RAG Chat)**
- Chat interface with message bubbles
- User messages in blue (right-aligned)
- AI responses in white cards (left-aligned) with AI Assistant label and sparkle icon
- Source citation card with document name and external link icon
- Text input at bottom with send button

### 8. **Writing Coach (Writing Improver)**
- Split layout: "Your Text" textarea (left) + "AI Suggestions" panel (right)
- Subtitle: "Get AI-powered feedback to enhance your writing"
- Suggestion cards categorized by Grammar (red), Clarity (yellow), Style (pink)
- Each suggestion has highlighted problem text, explanation, Accept and Ignore buttons
- "Analyze Text" button below the textarea

### 9. **Schedule Page**
- Task/calendar management view for academic scheduling

### 10. **Settings Page**
- User profile and app settings

---

## Shared Layout & Navigation

### Sidebar (Desktop)
- UNITEN AI Companion branding at top
- Nav items: Dashboard, My Notes, Quiz Zone, Ask AI, Writing Coach, Schedule, Settings
- Active state with blue highlight
- User avatar + name at bottom
- Logout button

### Mobile Navigation
- Collapsible hamburger menu or bottom navigation
- All pages fully responsive with stacked layouts on small screens

---

## Design Style
- Clean, white background with soft rounded cards and subtle shadows
- Blue primary accent color (matching UNITEN branding)
- Colorful category badges (green, purple, red, yellow, pink)
- Friendly, spacious layout with generous padding
- Lucide React icons throughout
- Consistent card-based UI with rounded corners

---

## Technical Approach
- All data will be hardcoded/mock data (no backend needed for this phase)
- React Router for page navigation
- Reusable sidebar layout component
- Tailwind CSS for all styling
- shadcn/ui components where applicable
- Fully mobile-responsive design

