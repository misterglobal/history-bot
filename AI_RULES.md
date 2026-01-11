# AI Rules & Guidelines

## Tech Stack
- **Framework**: React 19 (Functional Components + Hooks)
- **Language**: TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS (Utility-first)
- **AI Services**: 
  - Google GenAI SDK (Text/Image generation)
  - KIE AI (Video generation via API)
  - Fal.ai (FFmpeg video stitching)
- **Icons**: lucide-react
- **Routing**: React Router (if needed, currently single page)
- **State Management**: React Hooks (useState, useEffect)

## Development Rules

### 1. Component Structure
- Use functional components with TypeScript interfaces for props.
- Keep components small and focused (under 100 lines when possible).
- Place reusable components in `src/components/`.
- Use `lucide-react` for all icons instead of inline SVGs.

### 2. Styling
- **ALWAYS** use Tailwind CSS classes.
- Do not create separate CSS files unless absolutely necessary for complex animations not possible with Tailwind.
- Use the existing dark mode color palette (`zinc-950`, `zinc-900`, `yellow-500` accents).

### 3. API & Data Fetching
- Keep all API interaction logic in `src/services/`.
- Do not make API calls directly inside components; call service functions instead.
- Handle errors gracefully and propagate them to the UI layer.

### 4. Type Safety
- **ALWAYS** define types/interfaces for data structures in `src/types.ts`.
- Avoid using `any` types; be explicit about data shapes, especially for API responses.

### 5. File Organization
- `src/components/`: Reusable UI components.
- `src/services/`: API clients and business logic.
- `src/types.ts`: Shared TypeScript definitions.
- `src/constants.ts`: Configuration constants and prompts.

### 6. AI & Environment
- Use `process.env.GEMINI_API_KEY` and other env vars as defined in `vite.config.ts`.
- When modifying prompts, update them in `src/constants.ts`, not inside the service files.
- Update application header version numbers.