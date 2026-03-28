# Haunted House

CLI-first social deduction horror game built with Node.js + TypeScript.

This repository starts as a structured scaffold. Source files intentionally contain responsibility notes
instead of implementation so an AI coding agent can fill them in systematically.

Primary goals:
- Build a deterministic turn-based game engine.
- Keep CLI concerns separate from game logic.
- Support AI-generated ghost stories, tasks, and clues through interfaces and swappable providers.
- Allow mocked AI for tests and offline development.

Run:
1. npm install
2. cp .env.example .env
3. npm run dev
