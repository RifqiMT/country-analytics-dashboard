# Architecture

## Overview

The system has frontend, backend, data, and AI/web-context layers.

## Frontend
- Dashboard
- Global Analytics
- Assistant
- Pestel
- Porter
- BusinessAnalytics

## Backend
- Route orchestration in `index.ts`
- Data modules for country/global views
- Assistant modules for intent and grounding
- Strategy and correlation modules

## Runtime flow (simple)
1. User selects context
2. Frontend calls API
3. Backend validates and fetches data
4. Optional AI generation + safety checks
5. Response rendered with attribution context
