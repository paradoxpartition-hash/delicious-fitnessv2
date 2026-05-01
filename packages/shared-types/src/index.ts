/**
 * Developed by SaaSolutions SL
 * Intellectual Property owned by Paradox FZCO
 * © 2026 Paradox FZCO. All rights reserved.
 *
 * Shared TypeScript types for Delicious Fitness
 */

// ─── USER / PROFILE ───────────────────────────────────────────────────────────
export type UserRole = 'USER' | 'CHEF' | 'MODERATOR' | 'ADMIN';

export interface Profile {
  id:         string;
  username:   string;
  avatar_url: string | null;
  bio:        string | null;
  role:       UserRole;
  created_at: string;
  updated_at: string;
}

// ─── RECIPE ───────────────────────────────────────────────────────────────────
export type RecipeStatus   = 'draft' | 'published' | 'archived';
export type RecipeCategory = 'meat' | 'fish' | 'fruit' | 'dairy' | 'drinks' | 'vegan' | 'pasta' | 'salad';
export type RecipeGoal     = 'bulk' | 'cut' | 'maintain';
export type DietTag        = 'halal' | 'vegan' | 'kosher' | 'gluten-free';

export interface MacroProfile {
  kcal:      number;
  protein_g: number;
  carbs_g:   number;
  fat_g:     number;
}

export interface RecipeIngredient {
  name:          string;
  amount:        number;
  unit:          string;
  affiliate_url?: string;
}

export interface RecipeStep {
  order:       number;
  instruction: string;
}

export interface RecipeTranslation {
  title:          string;
  description:    string;
  steps:          RecipeStep[];
  translated_at:  string;
  source:         'deepl' | 'groq' | 'gemini' | 'manual';
}

export interface Recipe {
  id:             string;
  author_id:      string;
  title:          string;
  description:    string | null;
  category:       RecipeCategory | null;
  goal:           RecipeGoal | null;
  diet_tags:      DietTag[];
  servings:       number;
  prep_time_min:  number | null;
  cook_time_min:  number | null;
  ingredients:    RecipeIngredient[];
  steps:          RecipeStep[];
  cached_macros:  MacroProfile | null;
  image_url:      string | null;
  status:         RecipeStatus;
  forked_from_id: string | null;
  fork_count:     number;
  view_count:     number;
  save_count:     number;
  rating_avg:     number | null;
  rating_count:   number;
  translations:   Record<string, RecipeTranslation>;
  created_at:     string;
  updated_at:     string;
  // Joined fields
  profiles?:      Pick<Profile, 'id' | 'username' | 'avatar_url'> | null;
}

export type RecipeListItem = Pick<
  Recipe,
  | 'id' | 'title' | 'description' | 'category' | 'goal'
  | 'diet_tags' | 'cached_macros' | 'image_url' | 'status'
  | 'fork_count' | 'rating_avg' | 'rating_count' | 'created_at'
> & { profiles?: Pick<Profile, 'username' | 'avatar_url'> | null };

// ─── CHEF ─────────────────────────────────────────────────────────────────────
export interface ChefStats {
  recipe_count:     number;
  total_views:      number;
  total_forks:      number;
  total_saves:      number;
  avg_rating:       number | null;
  affiliate_clicks: number;
  monthly_views:    number;
}

export interface ChefProfile {
  id:                 string;
  user_id:            string;
  stripe_customer_id: string | null;
  bio:                string | null;
  specialties:        string[];
  social_links:       Record<string, string>;
  stats:              ChefStats;
  verified:           boolean;
  created_at:         string;
  updated_at:         string;
}

// ─── SUBSCRIPTION ─────────────────────────────────────────────────────────────
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid' | 'paused';
export type SubscriptionPlan   = 'monthly' | 'annual';

export interface Subscription {
  id:                      string;
  user_id:                 string;
  stripe_subscription_id:  string;
  stripe_customer_id:      string;
  status:                  SubscriptionStatus;
  plan:                    SubscriptionPlan;
  current_period_start:    string;
  current_period_end:      string;
  cancel_at_period_end:    boolean;
  trial_end:               string | null;
  created_at:              string;
  updated_at:              string;
}

// ─── MEAL PLAN ────────────────────────────────────────────────────────────────
export interface MealSlot {
  recipe_id:    string | null;
  recipe_title: string | null;
  kcal:         number | null;
  custom_label: string | null;
}

export interface DayPlan {
  day:       number;
  day_name:  string;
  breakfast: MealSlot;
  lunch:     MealSlot;
  dinner:    MealSlot;
  snack:     MealSlot | null;
}

// ─── COMMUNITY ────────────────────────────────────────────────────────────────
export interface CommunityPost {
  id:         string;
  user_id:    string;
  content:    string;
  image_url:  string | null;
  recipe_id:  string | null;
  like_count: number;
  liked:      boolean;
  created_at: string;
  updated_at: string;
  profiles?:  Pick<Profile, 'id' | 'username' | 'avatar_url'> | null;
  recipes?:   Pick<Recipe, 'id' | 'title'> | null;
}

export interface RecipeComment {
  id:         string;
  recipe_id:  string;
  user_id:    string;
  content:    string;
  parent_id:  string | null;
  like_count: number;
  created_at: string;
  updated_at: string;
  profiles?:  Pick<Profile, 'username' | 'avatar_url'> | null;
}

// ─── AFFILIATE ────────────────────────────────────────────────────────────────
export interface AffiliateLink {
  id:           string;
  chef_id:      string;
  recipe_id:    string;
  partner_name: string;
  url:          string;
  click_count:  number;
  active:       boolean;
  created_at:   string;
  updated_at:   string;
}

// ─── WORKOUT ──────────────────────────────────────────────────────────────────
export type WorkoutLevel = 'beginner' | 'intermediate' | 'advanced';
export type WorkoutType  = 'strength' | 'cardio' | 'hiit' | 'yoga' | 'mobility';

export interface WorkoutExercise {
  name: string;
  sets: number;
  reps: string;
}

export interface Workout {
  id:           string;
  title:        string;
  description:  string | null;
  level:        WorkoutLevel;
  type:         WorkoutType;
  duration_min: number;
  goal:         RecipeGoal | null;
  exercises:    WorkoutExercise[];
  image_url:    string | null;
  created_at:   string;
}

// ─── CHALLENGE ────────────────────────────────────────────────────────────────
export interface Challenge {
  id:                string;
  title:             string;
  description:       string;
  icon:              string;
  duration_days:     number;
  goal:              RecipeGoal | null;
  participant_count: number;
  start_date:        string | null;
  end_date:          string | null;
  created_at:        string;
  // Joined: user's participation
  user_progress?: {
    enrolled:  boolean;
    day:       number;
    completed: boolean;
  } | null;
}

// ─── BLOG ─────────────────────────────────────────────────────────────────────
export type BlogStatus = 'draft' | 'published' | 'archived';

export interface BlogPost {
  id:           string;
  author_id:    string;
  title:        string;
  slug:         string;
  excerpt:      string | null;
  content:      string | null;
  cover_url:    string | null;
  category:     string | null;
  read_time:    number | null;
  status:       BlogStatus;
  published_at: string | null;
  created_at:   string;
  updated_at:   string;
  profiles?:    Pick<Profile, 'username' | 'avatar_url'> | null;
}

// ─── SEARCH ───────────────────────────────────────────────────────────────────
export interface SearchFilters {
  query:       string;
  category:    RecipeCategory | 'all';
  dietTags:    DietTag[];
  goal:        RecipeGoal | null;
  kcalMin:     number;
  kcalMax:     number;
  page:        number;
}

// ─── API RESPONSES ────────────────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  data:  T[];
  count: number;
  page:  number;
  total_pages: number;
}

export interface ApiError {
  error:   string;
  message: string;
  status:  number;
}

// ─── I18N ─────────────────────────────────────────────────────────────────────
export type LangCode = 'en' | 'nl' | 'de' | 'fr' | 'es';

export interface LangMeta {
  code:   LangCode;
  label:  string;
  flag:   string;
  locale: string;
}
