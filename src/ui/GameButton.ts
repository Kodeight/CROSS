/**
 * CROSS! v3.0 — Standard GameButton Component & Utility
 * Handles variant styling, glossy gradients/shadows, ARIA state, and
 * tactile press feedback for all buttons across the game.
 */

import { DesignTokens } from './DesignTokens';

export type GameButtonVariant = 'play' | 'characters' | 'worlds' | 'missions' | 'settings' | 'primary' | 'secondary' | 'danger';

export interface GameButtonOptions {
  variant?: GameButtonVariant;
  text?: string;
  iconSvg?: string;
  arrowSvg?: string;
  onClick?: (e: MouseEvent) => void;
  fullWidth?: boolean;
}

export class GameButton {
  /**
   * Applies DesignToken styles directly to an existing HTMLButtonElement
   * ensuring identical glossy appearance, border, height, and touch response.
   */
  public static styleButton(
    buttonEl: HTMLButtonElement,
    variant: GameButtonVariant = 'primary'
  ): void {
    const spec = DesignTokens.buttonVariants[variant] || DesignTokens.buttonVariants.primary;
    buttonEl.style.background = spec.bg;
    buttonEl.style.color = spec.color;
    buttonEl.style.border = spec.border;
    buttonEl.style.boxShadow = spec.shadow;
    buttonEl.style.height = spec.height;
    buttonEl.style.borderRadius = spec.radius;
    buttonEl.style.fontFamily = variant === 'play' ? "'Bungee', cursive, sans-serif" : "'Nunito', system-ui, sans-serif";
    buttonEl.style.fontWeight = '900';
    buttonEl.style.cursor = 'pointer';
    buttonEl.style.transition = 'transform 0.12s ease, box-shadow 0.12s ease';

    // Touch & Active tactile feedback handlers
    buttonEl.addEventListener('pointerdown', () => {
      buttonEl.style.transform = 'translateY(3px)';
      buttonEl.style.boxShadow = 'inset 0 1px 0 rgba(255, 255, 255, 0.5), 0 2px 0 #0F2657';
    });

    const resetState = () => {
      buttonEl.style.transform = 'none';
      buttonEl.style.boxShadow = spec.shadow;
    };

    buttonEl.addEventListener('pointerup', resetState);
    buttonEl.addEventListener('pointercancel', resetState);
    buttonEl.addEventListener('mouseleave', resetState);
  }

  /**
   * Creates a brand new glossy HTMLButtonElement conforming to DesignTokens.
   */
  public static create(options: GameButtonOptions): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = `btn btn-game btn-variant-${options.variant || 'primary'}`;

    if (options.fullWidth) {
      btn.style.width = '100%';
    }

    this.styleButton(btn, options.variant || 'primary');

    let innerHtml = '';
    if (options.iconSvg) {
      innerHtml += `<span class="btn-ico" aria-hidden="true">${options.iconSvg}</span>`;
    }
    if (options.text) {
      innerHtml += `<span class="btn-txt">${options.text}</span>`;
    }
    if (options.arrowSvg) {
      innerHtml += `<span class="btn-arr" aria-hidden="true">${options.arrowSvg}</span>`;
    }

    btn.innerHTML = innerHtml;

    if (options.onClick) {
      btn.addEventListener('click', options.onClick);
    }

    return btn;
  }
}
