// DAYVIBE COMPONENTS - UI Component Library
// ==========================================

import { theme, colors, spacing, typography, borders, shadows, animations } from './theme.js';

// ============== BASE ELEMENT BUILDER ==============

function createElement(tag, options = {}) {
    const {
        className = '',
        styles = {},
        attributes = {},
        children = [],
        events = {},
        dataset = {}
    } = options;

    const el = document.createElement(tag);

    // Class
    if (className) el.className = className;

    // Inline styles
    Object.entries(styles).forEach(([key, value]) => {
        el.style[key] = value;
    });

    // Attributes
    Object.entries(attributes).forEach(([key, value]) => {
        el.setAttribute(key, value);
    });

    // Dataset
    Object.entries(dataset).forEach(([key, value]) => {
        el.dataset[key] = value;
    });

    // Events
    Object.entries(events).forEach(([event, handler]) => {
        el.addEventListener(event, handler);
    });

    // Children
    children.forEach(child => {
        if (typeof child === 'string') {
            el.appendChild(document.createTextNode(child));
        } else if (child instanceof HTMLElement) {
            el.appendChild(child);
        }
    });

    return el;
}

// ============== BUTTON COMPONENTS ==============

export function Button(options = {}) {
    const {
        text = '',
        icon = '',
        variant = 'primary', // primary, secondary, danger, success
        size = 'normal', // compact, normal
        disabled = false,
        onClick = null,
        title = '',
    } = options;

    const variantStyles = {
        primary: {
            background: theme.createGradient(colors.accent.blue, '#2980b9'),
            color: colors.text.primary,
        },
        secondary: {
            background: theme.createGradient(colors.bg.tertiary, colors.bg.secondary),
            color: colors.text.primary,
        },
        danger: {
            background: theme.createGradient(colors.accent.red, '#c0392b'),
            color: colors.text.primary,
        },
        success: {
            background: theme.createGradient(colors.accent.green, '#138d75'),
            color: colors.text.primary,
        },
        ai: {
            background: theme.createGradient(colors.accent.purple, '#6c3483'),
            color: colors.text.primary,
        },
    };

    const sizeStyles = {
        compact: {
            width: theme.sizes.button.compact.width,
            height: theme.sizes.button.compact.height,
            fontSize: typography.sizes.md,
        },
        normal: {
            height: theme.sizes.button.normal.height,
            padding: theme.sizes.button.normal.padding,
            fontSize: typography.sizes.sm,
        },
    };

    return createElement('button', {
        className: `btn btn-${variant} btn-${size}`,
        styles: {
            ...variantStyles[variant],
            ...sizeStyles[size],
            border: 'none',
            borderRadius: borders.radius.md,
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? '0.5' : '1',
            fontFamily: typography.fonts.body,
            transition: theme.createTransition(['transform', 'box-shadow']),
        },
        attributes: {
            disabled,
            title,
        },
        events: {
            click: onClick,
            mouseenter: (e) => {
                if (!disabled) {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = shadows.md;
                }
            },
            mouseleave: (e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
            },
        },
        children: [icon ? `${icon} ${text}` : text],
    });
}

export function IconButton(options = {}) {
    const { icon, ...rest } = options;
    return Button({
        ...rest,
        text: icon,
        size: 'compact',
    });
}

// ============== LOOP TILE COMPONENT ==============

export function LoopTile(options = {}) {
    const {
        index = 0,
        loop = null,
        isActive = false,
        isPlaying = false,
        onSelect = null,
        onDelete = null,
        onMoveUp = null,
        onMoveDown = null,
        canMoveUp = true,
        canMoveDown = true,
    } = options;

    const tile = createElement('div', {
        className: `loop-tile ${loop ? 'active' : 'empty'} ${isPlaying ? 'playing' : ''}`,
        styles: {
            position: 'relative',
            background: loop
                ? (isPlaying ? colors.accent.blue : colors.bg.tertiary)
                : colors.bg.secondary,
            border: `${borders.width.normal} solid ${isPlaying ? colors.border.active : colors.border.default}`,
            borderRadius: borders.radius.md,
            padding: spacing.md,
            minHeight: theme.sizes.tile.loop.height,
            cursor: loop ? 'pointer' : 'default',
            transition: theme.createTransition(['background', 'border-color', 'transform']),
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
        },
        events: {
            click: (e) => {
                // Проверяем что клик не по кнопкам
                if (!e.target.closest('.loop-controls-mini') && loop && onSelect) {
                    onSelect(index);
                }
            },
            mouseenter: (e) => {
                if (loop) {
                    e.target.style.transform = 'scale(1.02)';
                    e.target.style.borderColor = colors.border.hover;
                }
            },
            mouseleave: (e) => {
                e.target.style.transform = 'scale(1)';
                e.target.style.borderColor = isPlaying ? colors.border.active : colors.border.default;
            },
        },
    });

    if (loop) {
        // Loop name
        const loopName = createElement('div', {
            className: 'loop-name',
            styles: {
                fontSize: typography.sizes.sm,
                color: colors.text.primary,
                fontFamily: typography.fonts.body,
                marginBottom: spacing.sm,
                wordBreak: 'break-word',
            },
            children: [loop.name || `Loop ${index + 1}`],
        });

        // Controls container
        const controls = createElement('div', {
            className: 'loop-controls-mini',
            styles: {
                display: 'flex',
                gap: spacing.xs,
                justifyContent: 'flex-end',
            },
        });

        // Move up button
        const upBtn = IconButton({
            icon: '▲',
            variant: 'secondary',
            disabled: !canMoveUp,
            title: 'Move up',
            onClick: (e) => {
                e.stopPropagation();
                if (onMoveUp) onMoveUp(index);
            },
        });

        // Move down button
        const downBtn = IconButton({
            icon: '▼',
            variant: 'secondary',
            disabled: !canMoveDown,
            title: 'Move down',
            onClick: (e) => {
                e.stopPropagation();
                if (onMoveDown) onMoveDown(index);
            },
        });

        // Delete button
        const deleteBtn = IconButton({
            icon: '×',
            variant: 'danger',
            title: 'Delete loop',
            onClick: (e) => {
                e.stopPropagation();
                if (onDelete) onDelete(index);
            },
        });

        controls.appendChild(upBtn);
        controls.appendChild(downBtn);
        controls.appendChild(deleteBtn);

        tile.appendChild(loopName);
        tile.appendChild(controls);
    } else {
        // Empty tile
        const emptyText = createElement('div', {
            className: 'loop-empty-text',
            styles: {
                fontSize: typography.sizes.xxl,
                color: colors.text.muted,
                textAlign: 'center',
                lineHeight: theme.sizes.tile.loop.height,
            },
            children: ['+'],
        });
        tile.appendChild(emptyText);
    }

    return tile;
}

// ============== SLIDER COMPONENT ==============

export function SliderBox(options = {}) {
    const {
        label = '',
        value = 0,
        min = 0,
        max = 1,
        step = 0.01,
        onChange = null,
        debounce = 50,
    } = options;

    const container = createElement('div', {
        className: 'slider-box',
        styles: {
            background: colors.bg.tertiary,
            border: `${borders.width.thin} solid ${colors.border.default}`,
            borderRadius: borders.radius.sm,
            padding: spacing.md,
            minWidth: theme.sizes.slider.box.minWidth,
        },
    });

    // Header (label + value)
    const header = createElement('div', {
        className: 'slider-box-header',
        styles: {
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: spacing.sm,
            fontSize: typography.sizes.xs,
            fontFamily: typography.fonts.body,
        },
    });

    const labelEl = createElement('span', {
        className: 'slider-box-label',
        styles: { color: colors.text.secondary },
        children: [label],
    });

    const valueEl = createElement('span', {
        className: 'slider-box-value',
        styles: { color: colors.text.primary, fontWeight: typography.weights.bold },
        children: [value.toFixed(step >= 1 ? 0 : 2)],
    });

    header.appendChild(labelEl);
    header.appendChild(valueEl);

    // Slider input
    const input = createElement('input', {
        className: 'slider-box-input',
        styles: {
            width: '100%',
            accentColor: colors.accent.blue,
        },
        attributes: {
            type: 'range',
            min,
            max,
            step,
            value,
        },
    });

    let debounceTimeout = null;
    input.addEventListener('input', (e) => {
        const newValue = parseFloat(e.target.value);
        valueEl.textContent = newValue.toFixed(step >= 1 ? 0 : 2);

        if (onChange) {
            clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(() => {
                onChange(newValue);
            }, debounce);
        }
    });

    container.appendChild(header);
    container.appendChild(input);

    return container;
}

// ============== SLIDER LINE GROUP ==============

export function SliderLineGroup(options = {}) {
    const {
        lineText = '',
        sliders = [], // [{label, value, min, max, step, onChange}, ...]
    } = options;

    const group = createElement('div', {
        className: 'slider-line-group',
        styles: {
            marginBottom: spacing.lg,
            background: colors.bg.secondary,
            borderRadius: borders.radius.md,
            padding: spacing.md,
        },
    });

    // Line header (code preview)
    const header = createElement('div', {
        className: 'slider-line-header',
        styles: {
            fontSize: typography.sizes.xs,
            color: colors.text.muted,
            fontFamily: typography.fonts.code,
            marginBottom: spacing.md,
            padding: spacing.sm,
            background: colors.bg.tertiary,
            borderRadius: borders.radius.sm,
            overflow: 'auto',
            whiteSpace: 'pre',
        },
        children: [lineText],
    });

    // Sliders container
    const slidersContainer = createElement('div', {
        className: 'slider-line-sliders',
        styles: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
            gap: spacing.md,
        },
    });

    sliders.forEach(sliderOpts => {
        slidersContainer.appendChild(SliderBox(sliderOpts));
    });

    group.appendChild(header);
    group.appendChild(slidersContainer);

    return group;
}

// ============== STATUS INDICATOR ==============

export function StatusIndicator(options = {}) {
    const {
        active = false,
        text = '',
    } = options;

    const indicator = createElement('div', {
        className: `status-indicator ${active ? 'active' : 'stopped'}`,
        styles: {
            width: '12px',
            height: '12px',
            borderRadius: borders.radius.full,
            background: active ? colors.status.success : colors.status.error,
            boxShadow: active ? `0 0 10px ${colors.status.success}` : 'none',
            transition: theme.createTransition(['background', 'box-shadow']),
        },
    });

    const textEl = createElement('span', {
        className: 'status-value',
        styles: {
            marginLeft: spacing.sm,
            fontSize: typography.sizes.sm,
            color: colors.text.secondary,
            fontFamily: typography.fonts.body,
        },
        children: [text],
    });

    const container = createElement('div', {
        styles: {
            display: 'flex',
            alignItems: 'center',
        },
    });

    container.appendChild(indicator);
    container.appendChild(textEl);

    return container;
}

// ============== VISUALIZER BAR ==============

export function VisualizerBar() {
    return createElement('div', {
        className: 'visualizer-bar',
        styles: {
            flex: 1,
            background: colors.visualizer.bar,
            borderRadius: borders.radius.sm,
            height: '10%',
            transition: theme.createTransition('height', animations.duration.fast),
            backdropFilter: 'blur(2px)',
        },
    });
}

// ============== GRID CONTAINER ==============

export function Grid(options = {}) {
    const {
        columns = 'auto-fill',
        minItemWidth = '120px',
        gap = spacing.md,
        children = [],
    } = options;

    return createElement('div', {
        className: 'grid-container',
        styles: {
            display: 'grid',
            gridTemplateColumns: `repeat(${columns}, minmax(${minItemWidth}, 1fr))`,
            gap,
        },
        children,
    });
}

// ============== HELPERS ==============

// Apply responsive styles
export function applyResponsiveStyles(element, styles) {
    const { mobile, tablet, desktop } = styles;

    if (theme.isMobile() && mobile) {
        Object.entries(mobile).forEach(([key, value]) => {
            element.style[key] = value;
        });
    } else if (theme.isTablet() && tablet) {
        Object.entries(tablet).forEach(([key, value]) => {
            element.style[key] = value;
        });
    } else if (theme.isDesktop() && desktop) {
        Object.entries(desktop).forEach(([key, value]) => {
            element.style[key] = value;
        });
    }
}

// Update responsive styles on window resize
export function setupResponsiveUpdates(element, styles) {
    applyResponsiveStyles(element, styles);

    window.addEventListener('resize', () => {
        applyResponsiveStyles(element, styles);
    });
}

// ============== EXPORTS ==============

export const UI = {
    createElement,
    Button,
    IconButton,
    LoopTile,
    SliderBox,
    SliderLineGroup,
    StatusIndicator,
    VisualizerBar,
    Grid,
    applyResponsiveStyles,
    setupResponsiveUpdates,
};

export default UI;
