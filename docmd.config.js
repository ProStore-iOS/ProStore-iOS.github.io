// docmd.config.js: basic config for docmd
module.exports = {
  // Core Site Metadata
  siteTitle: 'ProStore',
  // Define a base URL for your site, crucial for SEO and absolute paths
  // No trailing slash
  siteUrl: 'https://prostore-ios.github.io/docs', // Replace with your actual deployed URL

  // Logo Configuration
  logo: {
    light: '/assets/images/icon.png', // Path relative to outputDir root
    dark: '/assets/images/icon.png',   // Path relative to outputDir root
    alt: 'ProStore Logo',                      // Alt text for the logo
    href: '/',                              // Link for the logo, defaults to site root
  },

  // Directory Configuration
  srcDir: 'documentation',       // Source directory for Markdown files
  outputDir: 'docs',    // Directory for generated static site

  // Search Configuration
  search: true,        // Enable/disable search functionality

  // Build Options
  minify: true,        // Enable/disable HTML/CSS/JS minification

  // Sidebar Configuration
  sidebar: {
    collapsible: true,        // or false to disable
    defaultCollapsed: false,  // or true to start collapsed
  },

  // Theme Configuration
  theme: {
    name: 'sky',            // Themes: 'default', 'sky'
    defaultMode: 'light',   // Initial color mode: 'light' or 'dark'
    enableModeToggle: true, // Show UI button to toggle light/dark modes
    positionMode: 'top', // 'top' or 'bottom' for the theme toggle
    codeHighlight: true,    // Enable/disable codeblock highlighting and import of highlight.js
  },

  // Content Processing
  autoTitleFromH1: true, // Set to true to automatically use the first H1 as page title
  copyCode: true, // Enable/disable the copy code button on code blocks

  // Navigation Structure (Sidebar)
  // Icons are kebab-case names from Lucide Icons (https://lucide.dev/)
  navigation: [
      { title: 'Welcome', path: '/', icon: 'home' }, // Corresponds to docs/index.md
      {
        title: 'Getting Started',
        icon: 'rocket',
        path: '#',
        collapsible: true, // This makes the menu section collapsible
        children: [
          { title: 'Anti-Revoke DNS', path: 'dns', icon: 'shield-ban', external: false },
          { title: 'Installation', path: 'installation', icon: 'package', external: false },
          { title: 'Setup', path: 'setup', icon: 'settings', external: false },
        ],
      },
      { title: 'Adding Certificates', path: 'certificates', icon: 'signature' },
      { title: 'Installing Apps', path: 'appInstall', icon: 'download' },
      { title: 'Updating ProStore', path: 'update', icon: 'cloud-download' },

      // External links:
      { title: 'GitHub', path: 'https://github.com/ProStore-iOS/ProStore', icon: 'github', external: true },
      { title: 'Create Issue', path: 'https://github.com/ProStore-iOS/ProStore/issues/new/choose', icon: 'circle-alert', external: true },
    ],
    
  pageNavigation: true, // Enable previous / next page navigation at the bottom of each page

  // Footer Configuration
  // Markdown is supported here.
  footer: '© ' + new Date().getFullYear() + ' ProStore iOS',

  // Favicon Configuration
  // Path relative to outputDir root
  favicon: '/assets/images/icon.png',
};
