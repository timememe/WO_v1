// DAYVIBE THEME - Design System
// ==============================

// ============== COLORS ==============

export const colors = {
    // Base
    bg: {
        primary: '#0d1117',
        secondary: '#161b22',
        tertiary: '#1c2128',
        overlay: 'rgba(13, 17, 23, 0.92)',
    },

    // Text
    text: {
        primary: '#c9d1d9',
        secondary: '#8b949e',
        muted: '#6e7681',
    },

    // Accents
    accent: {
        blue: '#3498db',
        red: '#e74c3c',
        green: '#16a085',
        purple: '#8e44ad',
        orange: '#e67e22',
    },

    // Status
    status: {
        success: '#2ecc71',
        error: '#e74c3c',
        warning: '#f39c12',
        info: '#3498db',
    },

    // Borders
    border: {
        default: '#30363d',
        hover: '#444c56',
        active: '#3498db',
    },

    // Visualizer
    visualizer: {
        bar: 'rgba(52, 152, 219, 0.25)',
        glow: 'rgba(52, 152, 219, 0.15)',
    },
};

// ============== SPACING ==============

export const spacing = {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    xxl: '24px',
    xxxl: '32px',
};

// ============== TYPOGRAPHY ==============

export const typography = {
    fonts: {
        heading: '"Press Start 2P", monospace',
        body: '"Courier New", monospace',
        code: '"Courier New", monospace',
    },

    sizes: {
        xs: '10px',
        sm: '12px',
        md: '14px',
        lg: '16px',
        xl: '20px',
        xxl: '24px',
    },

    weights: {
        normal: 400,
        bold: 700,
    },
};

// ============== BREAKPOINTS ==============

export const breakpoints = {
    mobile: {
        max: 375,
        query: '@media (max-width: 375px)',
    },
    tablet: {
        min: 376,
        max: 767,
        query: '@media (min-width: 376px) and (max-width: 767px)',
    },
    desktop: {
        min: 768,
        query: '@media (min-width: 768px)',
    },
};

// ============== SHADOWS ==============

export const shadows = {
    sm: '0 1px 3px rgba(0, 0, 0, 0.12)',
    md: '0 4px 6px rgba(0, 0, 0, 0.16)',
    lg: '0 10px 20px rgba(0, 0, 0, 0.19)',
    xl: '0 15px 30px rgba(0, 0, 0, 0.25)',
    glow: '0 0 20px rgba(52, 152, 219, 0.3)',
};

// ============== ANIMATIONS ==============

export const animations = {
    duration: {
        fast: '150ms',
        normal: '300ms',
        slow: '500ms',
    },

    easing: {
        default: 'cubic-bezier(0.4, 0, 0.2, 1)',
        in: 'cubic-bezier(0.4, 0, 1, 1)',
        out: 'cubic-bezier(0, 0, 0.2, 1)',
        inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
};

// ============== LAYOUT ==============

export const layout = {
    maxWidth: {
        container: '800px',
        content: '600px',
    },

    aspectRatio: {
        mobile: '9 / 16',
        desktop: 'auto',
    },

    gap: {
        sm: '8px',
        md: '12px',
        lg: '16px',
    },
};

// ============== COMPONENT SIZES ==============

export const sizes = {
    button: {
        compact: {
            width: '36px',
            height: '36px',
        },
        compactSmall: {
            width: '28px',
            height: '28px',
        },
        normal: {
            height: '40px',
            padding: '0 16px',
        },
    },

    tile: {
        loop: {
            height: '60px',
        },
    },

    slider: {
        box: {
            minWidth: '120px',
        },
    },
};

// ============== BORDERS ==============

export const borders = {
    radius: {
        sm: '4px',
        md: '6px',
        lg: '8px',
        full: '50%',
    },

    width: {
        thin: '1px',
        normal: '2px',
        thick: '3px',
    },
};

// ============== Z-INDEX ==============

export const zIndex = {
    background: 0,
    content: 1,
    overlay: 10,
    modal: 100,
    tooltip: 1000,
};

// ============== HELPER FUNCTIONS ==============

// Создать gradient background
export function createGradient(color1, color2, angle = 135) {
    return `linear-gradient(${angle}deg, ${color1}, ${color2})`;
}

// Создать transition
export function createTransition(properties, duration = animations.duration.normal, easing = animations.easing.default) {
    if (Array.isArray(properties)) {
        return properties.map(prop => `${prop} ${duration} ${easing}`).join(', ');
    }
    return `${properties} ${duration} ${easing}`;
}

// Создать media query
export function mediaQuery(breakpoint, styles) {
    return `
        ${breakpoints[breakpoint].query} {
            ${styles}
        }
    `;
}

// Создать backdrop filter blur
export function createBackdrop(blur = '4px') {
    return `backdrop-filter: blur(${blur}); -webkit-backdrop-filter: blur(${blur});`;
}

// Проверка размера экрана
export function isMobile() {
    return window.innerWidth <= breakpoints.mobile.max;
}

export function isTablet() {
    return window.innerWidth > breakpoints.tablet.min && window.innerWidth <= breakpoints.tablet.max;
}

export function isDesktop() {
    return window.innerWidth >= breakpoints.desktop.min;
}

// Responsive value (возвращает значение в зависимости от breakpoint)
export function responsive(mobileValue, tabletValue, desktopValue) {
    if (isMobile()) return mobileValue;
    if (isTablet()) return tabletValue || mobileValue;
    return desktopValue || tabletValue || mobileValue;
}

// ============== THEME EXPORT ==============

export const theme = {
    colors,
    spacing,
    typography,
    breakpoints,
    shadows,
    animations,
    layout,
    sizes,
    borders,
    zIndex,
    createGradient,
    createTransition,
    mediaQuery,
    createBackdrop,
    isMobile,
    isTablet,
    isDesktop,
    responsive,
};

export default theme;
