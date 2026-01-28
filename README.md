# Histori-Bot 🦖🎥

**"Make History Go Viral"**

Histori-Bot is an AI-powered content engine that transforms dry historical facts into viral, high-retention video scripts and scenes. It features a multi-persona scripting engine, parallel video generation, and a "Director's Cut" editor for fine-tuning your content.

## ✨ Key Features

### 🧠 Multi-Persona Scripting
Choose the voice of your narrator:
*   **Sarcastic Teacher**: Cynical, witty, and educational.
*   **Gen Z Explainer**: Fast-paced, slang-heavy, and high energy.
*   **Noir Detective**: Moody, dramatic, and 1940s-styled.
*   **Alien Observer**: Clinical, confused by human behavior.

### ⚡ Performance & Parallel Generation
*   **Parallel Execution**: All scenes generate simultaneously for 5x faster turnaround.
*   **Smart Caching**: Re-using existing assets when regenerating only parts of a video.
*   **Veo 3.1 & Sora 2 Support**: Switch engines per scene.

### 🎬 "Director's Cut" Interactive Editor
*   **Re-Roll Video**: Regenerate just one scene if the AI hallucinates.
*   **Dub Audio**: Re-generate narration for a specific scene after text edits.
*   **Manual Prompt Tweaking**: Edit the visual prompt directly to fix generation errors.

### 🤖 Tech Stack
*   **Frontend**: React, Vite, TailwindCSS
*   **AI Models**: Gemini 1.5 Pro (Scripting), KIE AI / Veo 3.1 (Video), OpenAI Sora 2 (Video), Cartesia (Voice), Fal.ai (Audio Mixing/Storage).
*   **Storage**: Cloudflare R2

## 🚀 Getting Started

### Prerequisites
*   Node.js (v18+)
*   API Keys for: Gemini, KIE AI, Cartesia, Fal.ai, OpenAI (optional)

### Installation

1.  **Install dependencies:**
    ```bash
    npm install
    ```

2.  **Configure Environment:**
    Set the `GEMINI_API_KEY` in `.env.local` to your Gemini API key.
    ```env
    GEMINI_API_KEY=your_key_here
    ```
    *Note: Other keys can be entered in the app's "Settings" menu.*

3.  **Run Locally:**
    ```bash
    npm run dev
    ```

## 🛠️ Usage

1.  **Enter a Topic**: Type "The Great Emu War" or any historical event.
2.  **Select Persona & Style**: Choose "Gen Z Explainer" and "Cinematic".
3.  **Refine**: Use the **Director's Cut** controls to re-roll specific scenes or edit prompts.
4.  **Render**: Click "Stitch & Render Master" to get your final viral video.

---
Built with ❤️