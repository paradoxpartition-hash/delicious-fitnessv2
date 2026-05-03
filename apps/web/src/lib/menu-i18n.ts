/**
 * Developed by SaaSolutions SL
 * Intellectual Property owned by Paradox FZCO
 * © 2026 Paradox FZCO. All rights reserved.
 *
 * i18n menu key patch
 * Extends the existing translations in @/lib/i18n with dropdown menu keys.
 * Import this file wherever menu translations are needed.
 */

export const MENU_TRANSLATIONS = {
  en: {
    'menu.profile':      'My Profile',
    'menu.savedRecipes': 'Saved Recipes',
    'menu.settings':     'Settings',
    'menu.signOut':      'Sign Out',
    'menu.role':         'Role',
    'role.member':       'Member',
    'role.USER':         'Member',
    'role.chef':         'Chef',
    'role.CHEF':         'Chef',
    'role.dietitian':    'Dietitian',
    'role.admin':        'Administrator',
    'role.ADMIN':        'Administrator',
    'role.moderator':    'Moderator',
    'role.MODERATOR':    'Moderator',
  },
  nl: {
    'menu.profile':      'Mijn profiel',
    'menu.savedRecipes': 'Opgeslagen recepten',
    'menu.settings':     'Instellingen',
    'menu.signOut':      'Uitloggen',
    'menu.role':         'Rol',
    'role.member':       'Lid',
    'role.USER':         'Lid',
    'role.chef':         'Chef',
    'role.CHEF':         'Chef',
    'role.dietitian':    'Diëtist',
    'role.admin':        'Beheerder',
    'role.ADMIN':        'Beheerder',
    'role.moderator':    'Moderator',
    'role.MODERATOR':    'Moderator',
  },
  de: {
    'menu.profile':      'Mein Profil',
    'menu.savedRecipes': 'Gespeicherte Rezepte',
    'menu.settings':     'Einstellungen',
    'menu.signOut':      'Abmelden',
    'menu.role':         'Rolle',
    'role.member':       'Mitglied',
    'role.USER':         'Mitglied',
    'role.chef':         'Koch',
    'role.CHEF':         'Koch',
    'role.dietitian':    'Ernährungsberater',
    'role.admin':        'Administrator',
    'role.ADMIN':        'Administrator',
    'role.moderator':    'Moderator',
    'role.MODERATOR':    'Moderator',
  },
  fr: {
    'menu.profile':      'Mon profil',
    'menu.savedRecipes': 'Recettes sauvegardées',
    'menu.settings':     'Paramètres',
    'menu.signOut':      'Se déconnecter',
    'menu.role':         'Rôle',
    'role.member':       'Membre',
    'role.USER':         'Membre',
    'role.chef':         'Chef',
    'role.CHEF':         'Chef',
    'role.dietitian':    'Diététicien',
    'role.admin':        'Administrateur',
    'role.ADMIN':        'Administrateur',
    'role.moderator':    'Modérateur',
    'role.MODERATOR':    'Modérateur',
  },
  es: {
    'menu.profile':      'Mi perfil',
    'menu.savedRecipes': 'Recetas guardadas',
    'menu.settings':     'Configuración',
    'menu.signOut':      'Cerrar sesión',
    'menu.role':         'Rol',
    'role.member':       'Miembro',
    'role.USER':         'Miembro',
    'role.chef':         'Chef',
    'role.CHEF':         'Chef',
    'role.dietitian':    'Dietista',
    'role.admin':        'Administrador',
    'role.ADMIN':        'Administrador',
    'role.moderator':    'Moderador',
    'role.MODERATOR':    'Moderador',
  },
} as const;

type LangCode = 'en' | 'nl' | 'de' | 'fr' | 'es';
type MenuKey = keyof typeof MENU_TRANSLATIONS.en;

/**
 * Get a menu translation key in the current language.
 * Falls back to English if key not found.
 * Integrates with existing detectLanguage() from @/lib/i18n.
 */
export function tm(key: MenuKey, lang: LangCode): string {
  return (MENU_TRANSLATIONS[lang] as Record<string, string>)[key]
    ?? (MENU_TRANSLATIONS.en as Record<string, string>)[key]
    ?? key;
}
