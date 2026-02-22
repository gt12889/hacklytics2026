# RxGuard

**Adverse event intelligence, powered by FDA data.**

RxGuard is a clinical decision-support tool that helps healthcare providers assess the risk of adverse drug events before prescribing a new medication. Enter a patient's clinical background — age, sex, current medications, and conditions — and RxGuard surfaces FDA adverse event data, outcome statistics, similar historical cases, and an AI-generated safety analysis powered by Google Gemini.

---

## Features

- **Search Page** — Free-text clinical input form for patient background and proposed prescription
- **Adverse Event Dashboard** — Visual breakdown of FDA FAERS data including:
  - Total adverse event reports
  - Outcome severity (deaths, hospitalizations, life-threatening events)
  - Top reported reactions (bar chart)
  - Sex distribution (pie chart)
  - Age distribution (area chart)
  - Similar historical cases table with similarity scores
- **AI Analysis** — Google Gemini-powered medication safety summary based on the clinical query

---

## Tech Stack

- [React 19](https://react.dev/)
- [Vite 7](https://vite.dev/)
- [Recharts](https://recharts.org/) — data visualization
- [Google Generative AI SDK](https://www.npmjs.com/package/@google/generative-ai) — Gemini integration

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up your Gemini API key

Create a `.env` file in the project root:

```
VITE_GEMINI_API_KEY=your_api_key_here
```

Get a free API key at [Google AI Studio](https://aistudio.google.com/app/apikey).

### 3. Run the dev server

```bash
npm run dev
```

### 4. Build for production

```bash
npm run build
```

---

## Project Structure

```
src/
  App.jsx                  # Root component, handles page routing
  SearchPage.jsx           # Landing page with clinical input form
  rxguard_dashboard.jsx    # Main dashboard with charts and AI analysis
  main.jsx                 # Entry point
  App.css / index.css      # Global styles
```

---

## Notes

- The `.env` file is gitignored — never commit your API key
- Dashboard currently uses mock FDA data; live API integration is in progress
