# 💎 Roials Mission Control Hand-off

## 🎯 Project Overview
This is a high-end, autonomous Command Center for Jonas Hylten's AI Agents (Antigravity, Bo, Plåtnicklas). It is built as a React + Vite + Tailwind web application with a "Glassmorphism" aesthetic.

## 🛠 Tech Stack
- **Frontend:** React, TypeScript, Vite.
- **Styling:** Tailwind CSS (Dark Mode, Blur utilities).
- **Animations:** Framer Motion (Breathing pulses, smooth transitions).
- **Hosting:** Lovable.dev (Cloud) + GitHub Sync.

## 📋 Current To-Do List (Crucial)

### 1. Fix Agent Identity & Language (Svenska)
- **Problem:** Lovable körde "mock-data" på engelska som inte var vi på riktigt.
- **Lösning:** Jag har kodat `MissionChat.tsx` lokalt med **Svenska** som standardspråk.
- **Position:** Chatten är nu flyttad till **högra hörnet** med en funktion som visar de senaste 3 meddelandena även när den är stängd.

### 2. State Persistence (Chatten försvinner ej)
- **Problem:** Chatter raderades när fönstret stängdes.
- **Lösning:** Implementerat `localStorage` i `MissionChat.tsx`. Nu sparas all historik på din dator även om du startar om webbläsaren.

### 3. Drag-and-Drop + Chat-to-Task
- **Lösning:** Tillagt en "Plus-ikon" i chatten för att konvertera AI-svar till Kanban-kort.
- **DND:** Använd `@dnd-kit/core` för att flytta kort mellan kolumnerna.

### 4. Credit Conservation
Lovable credits are low. 
- **Guidance:** Do all code logic and heavy refactoring in **Cursor** or **VS Code** locally. Only push to GitHub to see the visual result in Lovable.

---

## 🤖 Instructions for AI Agents (Plånicklas, Bo, Antigravity)
- **Role:** You are specialized "Employees" in this Mission Control.
- **Workflow:** To update your status, modify your entry in `src/data/agents.json`. To move a task, update its `status` in `src/data/tasks.json`.
- **Communication:** Always keep the Swedish language "Active" in the dashboard outputs.

## 🚀 How to build further
1. Clone this repo.
2. `npm install`
3. `npm run dev` (to see the board locally).
4. Follow the **SDR Focus Protocol** for every new feature.
