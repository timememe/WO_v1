// DAYVIBE LAYOUT - Responsive Helpers & Layout System
// ====================================================

import { theme, spacing, breakpoints } from './theme.js';

// ============== FLEX HELPERS ==============

export function Flex(options = {}) {
    const {
        direction = 'row', // row, column, row-reverse, column-reverse
        justify = 'flex-start', // flex-start, center, flex-end, space-between, space-around
        align = 'stretch', // flex-start, center, flex-end, stretch
        wrap = 'nowrap', // nowrap, wrap, wrap-reverse
        gap = spacing.md,
        children = [],
        className = '',
        styles = {},
    } = options;

    const container = document.createElement('div');
    container.className = `flex-container ${className}`;

    Object.assign(container.style, {
        display: 'flex',
        flexDirection: direction,
        justifyContent: justify,
        alignItems: align,
        flexWrap: wrap,
        gap,
        ...styles,
    });

    children.forEach(child => {
        if (child instanceof HTMLElement) {
            container.appendChild(child);
        }
    });

    return container;
}

// ============== GRID HELPERS ==============

export function Grid(options = {}) {
    const {
        columns = 'auto-fill',
        rows = 'auto',
        minItemWidth = '120px',
        maxItemWidth = '1fr',
        gap = spacing.md,
        children = [],
        className = '',
        styles = {},
    } = options;

    const container = document.createElement('div');
    container.className = `grid-container ${className}`;

    const gridColumns = typeof columns === 'number'
        ? `repeat(${columns}, 1fr)`
        : `repeat(${columns}, minmax(${minItemWidth}, ${maxItemWidth}))`;

    Object.assign(container.style, {
        display: 'grid',
        gridTemplateColumns: gridColumns,
        gridTemplateRows: rows,
        gap,
        ...styles,
    });

    children.forEach(child => {
        if (child instanceof HTMLElement) {
            container.appendChild(child);
        }
    });

    return container;
}

// ============== RESPONSIVE CONTAINER ==============

export function Container(options = {}) {
    const {
        maxWidth = theme.layout.maxWidth.container,
        padding = spacing.lg,
        centered = true,
        children = [],
        className = '',
        styles = {},
    } = options;

    const container = document.createElement('div');
    container.className = `container ${className}`;

    Object.assign(container.style, {
        maxWidth,
        padding,
        margin: centered ? '0 auto' : '0',
        width: '100%',
        ...styles,
    });

    children.forEach(child => {
        if (child instanceof HTMLElement) {
            container.appendChild(child);
        }
    });

    return container;
}

// ============== STACK (Vertical Flex) ==============

export function Stack(options = {}) {
    return Flex({
        ...options,
        direction: 'column',
    });
}

// ============== RESPONSIVE WRAPPER ==============

export class ResponsiveElement {
    constructor(element) {
        this.element = element;
        this.breakpointStyles = {
            mobile: {},
            tablet: {},
            desktop: {},
        };
        this.currentBreakpoint = this.getCurrentBreakpoint();

        // Setup resize listener
        window.addEventListener('resize', this.handleResize.bind(this));
    }

    getCurrentBreakpoint() {
        if (theme.isMobile()) return 'mobile';
        if (theme.isTablet()) return 'tablet';
        return 'desktop';
    }

    // Set styles for specific breakpoint
    on(breakpoint, styles) {
        this.breakpointStyles[breakpoint] = styles;
        this.applyCurrentStyles();
        return this; // Chainable
    }

    // Apply styles based on current breakpoint
    applyCurrentStyles() {
        const bp = this.getCurrentBreakpoint();
        const styles = this.breakpointStyles[bp];

        Object.entries(styles).forEach(([key, value]) => {
            this.element.style[key] = value;
        });
    }

    handleResize() {
        const newBreakpoint = this.getCurrentBreakpoint();

        if (newBreakpoint !== this.currentBreakpoint) {
            this.currentBreakpoint = newBreakpoint;
            this.applyCurrentStyles();
        }
    }

    // Get the element
    get() {
        return this.element;
    }
}

// Wrapper function
export function responsive(element) {
    return new ResponsiveElement(element);
}

// ============== MEDIA QUERY MANAGER ==============

export class MediaQueryManager {
    constructor() {
        this.queries = {};
        this.listeners = {};
    }

    // Add media query listener
    add(name, query, callback) {
        const mq = window.matchMedia(query);

        this.queries[name] = mq;
        this.listeners[name] = callback;

        // Initial check
        if (mq.matches) {
            callback(true);
        }

        // Listen for changes
        mq.addEventListener('change', (e) => {
            callback(e.matches);
        });

        return this;
    }

    // Check if query matches
    matches(name) {
        return this.queries[name]?.matches || false;
    }

    // Remove listener
    remove(name) {
        delete this.queries[name];
        delete this.listeners[name];
        return this;
    }
}

export const mediaQueries = new MediaQueryManager();

// ============== VIEWPORT UTILITIES ==============

export function getViewportSize() {
    return {
        width: window.innerWidth,
        height: window.innerHeight,
    };
}

export function onViewportResize(callback, debounceMs = 300) {
    let timeout;
    window.addEventListener('resize', () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            callback(getViewportSize());
        }, debounceMs);
    });
}

// ============== ASPECT RATIO CONTAINER ==============

export function AspectRatio(options = {}) {
    const {
        ratio = '16 / 9', // width / height
        children = [],
        className = '',
        styles = {},
    } = options;

    const container = document.createElement('div');
    container.className = `aspect-ratio-container ${className}`;

    Object.assign(container.style, {
        position: 'relative',
        width: '100%',
        aspectRatio: ratio,
        ...styles,
    });

    children.forEach(child => {
        if (child instanceof HTMLElement) {
            child.style.position = 'absolute';
            child.style.top = '0';
            child.style.left = '0';
            child.style.width = '100%';
            child.style.height = '100%';
            container.appendChild(child);
        }
    });

    return container;
}

// ============== SCROLL CONTAINER ==============

export function ScrollContainer(options = {}) {
    const {
        maxHeight = '400px',
        direction = 'vertical', // vertical, horizontal, both
        children = [],
        className = '',
        styles = {},
    } = options;

    const container = document.createElement('div');
    container.className = `scroll-container ${className}`;

    const overflowMap = {
        vertical: { overflowY: 'auto', overflowX: 'hidden' },
        horizontal: { overflowX: 'auto', overflowY: 'hidden' },
        both: { overflow: 'auto' },
    };

    Object.assign(container.style, {
        maxHeight,
        ...overflowMap[direction],
        ...styles,
    });

    children.forEach(child => {
        if (child instanceof HTMLElement) {
            container.appendChild(child);
        }
    });

    return container;
}

// ============== SPACER ==============

export function Spacer(size = spacing.md) {
    const spacer = document.createElement('div');
    spacer.className = 'spacer';
    spacer.style.height = size;
    spacer.style.width = size;
    return spacer;
}

// ============== DIVIDER ==============

export function Divider(options = {}) {
    const {
        orientation = 'horizontal', // horizontal, vertical
        color = 'rgba(255, 255, 255, 0.1)',
        thickness = '1px',
        margin = spacing.md,
    } = options;

    const divider = document.createElement('div');
    divider.className = `divider divider-${orientation}`;

    if (orientation === 'horizontal') {
        Object.assign(divider.style, {
            width: '100%',
            height: thickness,
            background: color,
            margin: `${margin} 0`,
        });
    } else {
        Object.assign(divider.style, {
            height: '100%',
            width: thickness,
            background: color,
            margin: `0 ${margin}`,
        });
    }

    return divider;
}

// ============== ADAPTIVE GRID (Auto-adjusts columns) ==============

export function AdaptiveGrid(options = {}) {
    const {
        minItemWidth = '150px',
        gap = spacing.md,
        children = [],
        className = '',
    } = options;

    const grid = Grid({
        columns: 'auto-fit',
        minItemWidth,
        gap,
        children,
        className,
    });

    // Auto-adjust on resize
    const updateGrid = () => {
        const containerWidth = grid.offsetWidth;
        const itemCount = children.length;
        const itemWidth = parseInt(minItemWidth);
        const gapWidth = parseInt(gap);

        // Calculate optimal columns
        const availableWidth = containerWidth - (itemCount - 1) * gapWidth;
        const columns = Math.floor(availableWidth / itemWidth);

        if (columns > 0) {
            grid.style.gridTemplateColumns = `repeat(${Math.min(columns, itemCount)}, 1fr)`;
        }
    };

    onViewportResize(updateGrid, 100);
    updateGrid();

    return grid;
}

// ============== LAYOUT EXPORTS ==============

export const Layout = {
    Flex,
    Grid,
    Container,
    Stack,
    AspectRatio,
    ScrollContainer,
    Spacer,
    Divider,
    AdaptiveGrid,
    responsive,
    ResponsiveElement,
    mediaQueries,
    getViewportSize,
    onViewportResize,
};

export default Layout;
