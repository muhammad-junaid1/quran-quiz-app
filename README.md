# Quran Furqan (Quran Quiz App)

Quran Furqan is an interactive study application built to test, track, and improve your knowledge of the Quran. Unlike traditional reading apps, this tool employs active recall techniques by letting you take assessments chapter by chapter for all 114 Surahs.

## 🚀 Features

- **Chapter-by-Chapter Quizzes:** Structured assessment questions for every Surah in the Quran.
- **Active Recall & Custom Answers:** Type out your answers to ensure true comprehension before viewing the official answer.
- **Progress Tracking:** Chapter-specific progress bars so you can easily pick up where you left off.
- **"Not Sure" Isolation:** Identify the areas where your knowledge is weak and mark them for later review.
- **Streak & Gamification:** Daily engagement incentives to build a consistent habit.
- **Report Generation:** Download comprehensive progress reports as CSV/Excel file backups or to share with educators.
- **Cloud Sync:** Supabase integration ensures that your progress, streaks, and saved answers are safely backed up in the cloud.

## 🛠 Tech Stack

- **Frontend:** React 19, TypeScript, Vite
- **Backend & Auth:** Supabase (Database, OAuth Authentication)
- **Styling:** Tailwind CSS (implied via standard setups), Lucide UI icons
- **Analytics:** PostHog

## ⚙️ Run Locally

**Prerequisites:** Node.js (v18+)

1. **Clone and Install dependencies:**
   ```bash
   npm install
   ```

2. **Environment Variables:**
   Create a `.env` file in the root directory and configure the appropriate variables as configured in Supabase and PostHog:
   ```env
   VITE_PUBLIC_SUPABASE_URL=your_supabase_url
   VITE_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_PUBLIC_POSTHOG_KEY=your_posthog_key
   VITE_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Build for Production:**
   ```bash
   npm run build
   ```

## 🎯 Who is this for?

- **Hifz Students:** To systemize and track memorization revisions.
- **Islamic Studies Students:** To deepen their comprehension of Quranic themes and meanings.
- **Educators/Study Circles:** To easily generate assessments and track student performance.
- **General Readers:** Anyone seeking a more engaged and active relationship with the Quran.
