# Roials Agent-Kanban SOP (FRAME Phase)

## Problem Definition
The current "Veritas Kanban" is too static and disconnected from the agents' live internal state. Jonas needs a high-performance, autonomous "Mission Control" that handles task delegation, agent status tracking (Antigravity, Bo, Plåtnicklas), and sdr-prioritization automatically.

## Core Features
1.  **Multi-Agent Status Dashboard:** Each agent (Antigravity, Bo, Plåtnicklas) has a "Pulse" indicator (Active, Idle, Thinking) and a current task summary.
2.  **Autonomous Lane Movement:** Task cards (stored as JSON/Markdown in GitHub) are automatically moved between "ToDo", "InProgress", and "Done" based on agent output hooks.
3.  **SDR Focus Lock:** A "Revenue Shield" that highlights and locks high-impact sales tasks (King Process) to ensure Jonas prioritizes the money-making calls first.
4.  **Premium Glassmorphism UI:** Tailored for a "Royals" aesthetic—translucent dark backgrounds, smooth micro-animations, and Outfit/Inter typography.

## Tech Stack (Optimized for Lovable)
- **Frontend:** React + Vite + Tailwind CSS.
- **Backend:** GitHub API (Two-Way Sync) + Supabase (optional for real-time state).
- **Communication:** Agents write to `/tasks/*.json` in the repo; Lovable UI renders them live.

## Design Rules (LAYOUT Phase)
- **Color Palette:** HSL(0, 72%, 51%) for Alpha accents, HSL(222, 47%, 11%) for base dark mode.
- **Visual Style:** Soft shadows, heavy blurs (Glassmorphism), and thin borders for a premium "Apple-like" feel.
