# HealthTwin Guardian AI: Technical PRD & Hackathon Submission

## 1. Mission
To transition healthcare from reactive to proactive by providing every individual with a living Digital Health Twin that predicts risks, explains complexity, and protects lives.

## 2. Technical Architecture

### Frontend (Next.js 15 + TypeScript)
- **Framework:** App Router for optimized server-side rendering and streaming.
- **Styling:** Tailwind CSS with a custom Design System for medical-grade UI.
- **Interactions:** Framer Motion for agent swarm visualizations and smooth transitions.
- **Charts:** Recharts for health trend analysis and risk forecasting.
- **Components:** Shadcn/ui for accessible, consistent primitives.

### AI Agent Swarm (Orchestration)
- **Orchestrator:** A central "Guardian Agent" that routes tasks to specialized sub-agents.
- **Agents:** 
    - 🩸 **Hematology Agent:** Analyzes blood panels and highlights anomalies.
    - 💊 **Pharmacology Agent:** OCR for meds, interaction checking, and dosage safety.
    - ❤️ **Cardiac Agent:** Risk modeling based on vitals and history.
    - 🌍 **Linguistic Agent:** Real-time translation and simplified medical terminology.
- **Logic:** Multi-agent reasoning using Gemini 1.5 Pro's long context for cross-referencing years of medical history.

### Backend & Storage
- **API:** FastAPI for high-performance async processing of medical data.
- **Database:** PostgreSQL (via Supabase) for structured health records.
- **Storage:** Supabase Storage for secure PDF and image (medicine/report) hosting.

## 3. Database Schema (Simplified)
- **Users:** profile, health_score, digital_twin_config.
- **HealthRecords:** type (pdf/image), raw_data, ai_analysis_summary, timestamps.
- **Medications:** name, dosage, schedule, interaction_risks.
- **EmergencyProfiles:** blood_group, allergies, chronic_conditions, contacts.

## 4. API Endpoints
- `POST /api/v1/analyze/report`: Upload & OCR extraction.
- `GET /api/v1/twin/score`: Real-time health score calculation.
- `POST /api/v1/emergency/activate`: Trigger alerts & generate PDF Health Card.
- `GET /api/v1/translate`: Multilingual medical terminology mapping.

## 5. Development Roadmap (10-Hour Build)
- **H1-2:** Design System, Landing Page, & Core UI Shell.
- **H3-4:** Agent Swarm logic & Gemini API integration.
- **H5-6:** OCR pipeline (Vision API) & Report Explainer UI.
- **H7-8:** Emergency Mode & Health Twin 3D visualization.
- **H9-10:** Final Polishing, Pitch Deck, & Demo Video.
