# Delicious Fitness — "The GitHub of Recipes"

> Developed by **SaaSolutions SL** · Owned by **Paradox FZCO** · Build: `DF-PARADOX-SaaS-2026`

A **full-stack SaaS nutrition platform** with structured, macro-accurate, multilingual recipes.
Version-controlled recipe management, AI meal planning, chef subscriptions, and a vibrant community.

**Live:** [delicious-fitness-web.vercel.app](https://delicious-fitness-web.vercel.app)

---

## 🔐 Intellectual Property

| Attribute  | Value |
|------------|-------|
| **Developer** | SaaSolutions SL |
| **IP Owner** | Paradox FZCO |
| **Copyright** | © 2026 Paradox FZCO. All rights reserved. |
| **Build** | `DF-PARADOX-SaaS-2026` |
| **License** | Proprietary — see `/LICENSE` |

### Usage Restrictions

All intellectual property rights are owned exclusively by **Paradox FZCO**.
Unauthorized copying, modification, distribution, sublicensing, or reverse engineering
is strictly prohibited without written permission from Paradox FZCO.

The attribution footer (`Developed by SaaSolutions SL | © 2026 Paradox FZCO`) is mandatory
and must appear on all pages. It cannot be removed via the admin panel.

---

## 🎯 Vision

"Structured nutrition data, like Git for recipes."

- **Recipes as code**: versioned, forked, diff-able
- **Macro-accurate**: automated calculation from ingredient database
- **Multilingual**: auto-translated to 5 languages (EN, NL, DE, FR, ES)
- **Community-driven**: forks, ratings, comment threads, translation voting
- **Chef monetization**: €5/month subscription, affiliate link tracking, analytics

---

## 🆕 v2.0 Redesign Changelog

### New Homepage (`/`)
- Full community-driven onepager replacing old recipe grid homepage
- Sections: Hero → Features → Active Community → Partner Sliders → Trust → Built By → CTA
- All sections are admin-toggleable via LocalStorage
- Auto-populates community feed from real Supabase data

### Recipes Page (`/recipes`)
- Former homepage functionality moved here
- **All existing logic preserved**: search, filters, recipe grid, pagination, save/unsave
- UI redesigned with new design system

### Multilingual System (NEW)
- 5 languages: EN, NL, DE, FR, ES
- Language priority: LocalStorage → Browser → English default
- Language switcher in header
- All UI text dynamically updates on language change
- Translations in `/src/lib/i18n.ts`

### Design System (NEW — `globals.css`)
- Primary: `#22C55E` · Accent: `#FF7A00` · Dark: `#111111` · BG: `#F9FAFB`
- Fonts: Syne (display) + DM Sans (body)
- CSS custom properties for all tokens
- Mobile-first responsive breakpoints

### Admin Panel (`/admin`)
- Toggle 8 homepage sections on/off
- Manage supermarket + supplement partner sliders
- Add/remove/enable individual partners
- All saves to LocalStorage (no backend required for homepage config)

### IP Attribution (ALL FILES)
Every `.tsx`, `.ts`, and `.css` file contains:
```
Developed by SaaSolutions SL
Intellectual Property owned by Paradox FZCO
© 2026 Paradox FZCO. All rights reserved.
```

---

## 🏗️ Tech Stack

| Layer | Tech |
|---|---|
| **Frontend** | Next.js 14 (App Router) + CSS Modules → Vercel |
| **Backend** | Supabase (PostgreSQL 15 + RLS) |
| **Auth** | Supabase Auth (email + Google OAuth) |
| **AI** | Gemini Flash → Groq Llama 3.3 → OpenRouter |
| **Payments** | Stripe (iDEAL, Visa, Mastercard; €5/mo or €50/yr) |
| **Translation** | DeepL + LLM fallback + Community voting |
| **i18n** | Custom (no external library) — `/src/lib/i18n.ts` |
| **Monorepo** | Turborepo + pnpm workspaces |

---

## 📁 Repository Structure

```
delicious-fitness/
├── apps/web/src/
│   ├── app/
│   │   ├── page.tsx                  # NEW: Community-driven homepage
│   │   ├── recipes/page.tsx          # MOVED: Recipe grid (was homepage)
│   │   ├── globals.css               # NEW: Full design system
│   │   ├── layout.tsx                # Updated: Navbar + Footer wrappers
│   │   ├── admin/page.tsx            # NEW: Admin panel w/ section toggles
│   │   ├── pricing/page.tsx          # Redesigned (logic preserved)
│   │   ├── auth/
│   │   │   ├── signin/page.tsx       # Redesigned (logic preserved)
│   │   │   └── signup/page.tsx       # Redesigned (logic preserved)
│   │   ├── search/page.tsx           # Unchanged
│   │   ├── recipes/[id]/page.tsx     # Unchanged
│   │   ├── chef/dashboard/page.tsx   # Unchanged
│   │   └── meal-plan/page.tsx        # Unchanged
│   ├── components/
│   │   ├── layout/
│   │   │   ├── navbar.tsx            # Redesigned + language switcher
│   │   │   ├── footer.tsx            # Redesigned + IP attribution
│   │   │   └── language-switcher.tsx # NEW
│   │   └── ui/
│   │       └── toaster.tsx           # Redesigned
│   └── lib/
│       └── i18n.ts                   # NEW: Full multilingual system
├── LICENSE                           # NEW: Proprietary license
├── package.json                      # Updated: author + license fields
└── README.md                         # Updated: IP section + changelog
```

---

## 🌍 Multilingual System

**Supported languages:** EN · NL · DE · FR · ES

**Priority order:**
1. `localStorage.getItem('df_lang')` — user preference
2. `navigator.language` — browser language
3. Default: English

**Usage in components:**
```tsx
import { detectLanguage, getTranslations } from '@/lib/i18n';

const lang = detectLanguage(); // 'en' | 'nl' | 'de' | 'fr' | 'es'
const t    = getTranslations(lang);

// t.home.heroTitle, t.nav.recipes, t.footer.rights, etc.
```

**Language change event** (global, for cross-component reactivity):
```js
window.dispatchEvent(new CustomEvent('df:langchange', { detail: 'nl' }));
```

---

## ⚙️ Admin Panel (`/admin`)

### Homepage Section Toggles
| Section | LocalStorage Key | Default |
|---|---|---|
| Hero | `df_homepage_sections.hero` | ✅ |
| Features | `df_homepage_sections.features` | ✅ |
| Active Community | `df_homepage_sections.community` | ✅ |
| Supermarket Slider | `df_homepage_sections.supermarkets` | ✅ |
| Supplement Slider | `df_homepage_sections.supplements` | ✅ |
| Trust Section | `df_homepage_sections.trust` | ✅ |
| Built By | `df_homepage_sections.builtBy` | ✅ |
| CTA | `df_homepage_sections.cta` | ✅ |

> ⚠️ **The IP attribution footer is NOT toggleable.** It is hardcoded and always visible.

### Partner Management
- `df_supermarket_partners` — array of `{ id, icon, name, active }`
- `df_supplement_partners` — array of `{ id, icon, name, active }`

---

## 🚀 Getting Started

```bash
git clone https://github.com/paradoxpartition-hash/delicious-fitness.git
cd delicious-fitness
pnpm install
cp .env.example .env.local
# Fill in Supabase, Stripe, AI keys in .env.local
supabase start
supabase db push
pnpm dev
```

---

## 📱 Responsive Breakpoints

| Breakpoint | Behaviour |
|---|---|
| `< 480px` | Single-column, bottom nav bar |
| `480–768px` | 2-column grids, hamburger menu |
| `768–1024px` | Standard layout, desktop nav |
| `> 1024px` | Full layout, 4-col footer |

---

## 📄 License

Proprietary — © 2026 Paradox FZCO. Developed by SaaSolutions SL.
See `/LICENSE` for full terms.

---

**Built with ❤️ for fitness enthusiasts, chefs, and the power of structured data.**
*Developed by SaaSolutions SL · Owned by Paradox FZCO*
