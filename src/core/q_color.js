export class QColor {
  #regex = {
    hsl: /^\s*(hsla?)\(\s*((?:3[0-5][0-9]|[0-2]?[0-9]{1,2})(?:\.\d*)?|\.\d+|360(?:\.0*)?)(deg)?\s*(\s*,\s*|\s+)\s*([0-9]{1,2}(?:\.\d*)?|\.\d+|100(?:\.0*)?)(%)?\s*(\s*,\s*|\s+)\s*([0-9]{1,2}(?:\.\d*)?|\.\d+|100(?:\.0*)?)(%)?\s*((\s*[,\/]\s*|\s+)\s*([0-9]{1,2}(?:\.\d*)?|\.\d+|100(?:\.0*)?)(%)?)?\s*\)\s*$/i
  };
  
  /** @type {{[key:string]: {parse: function(string), to_string: function(QColor, number, boolean)}}} */
  static modes = {
    hsl:   {
      parse:     (str) => {
        const regex = /hsla?\((\d*\.\d+|\d+)(?:deg)?\s*[\s,]\s*(\d*\.\d+|\d+)%?\s*[\s,]\s*(\d*\.\d+|\d+)%?\s*(?:[\/,]\s*(\d*\.\d+|\d+)(%?)\s*)?\)/ig;
        let matches = regex.exec(str);
        if (!matches) return false;
        
        let h = parseFloat(matches[1]);
        let s = parseFloat(matches[2]);
        let l = parseFloat(matches[3]);
        let a = parseFloat(matches[4] || 1);
        let a_is_percent = matches[5] === '%';
        
        if (h < 0 || h > 360 || l < 0 || l > 100 || s < 0 || s > 100) return false;
        
        
        let color = new QColor();
        color.hsla = {h, s, l, a: a_is_percent ? a / 100 : a};
        return {
          mode:  'hsl',
          color: color
        };
      },
      to_string: (color, precision, force_alpha = false) => {
        const parts = [
          QColor.#to_fixed(color.h, precision),
          QColor.#to_fixed(color.s, precision) + "%",
          QColor.#to_fixed(color.l, precision) + "%",
        ];
        if (color.a < 1 || force_alpha) parts.push('/', QColor.#to_fixed(color.a, 3));
        
        return `hsl(${parts.join(" ")})`;
      }
    },
    rgb:   {
      parse:     (str) => {
        const regex = /rgba?\((\d*\.\d+|\d+)\s*[\s,]\s*(\d*\.\d+|\d+)\s*[\s,]\s*(\d*\.\d+|\d+)\s*(?:[\/,]\s*(\d*\.\d+|\d+)(%?)\s*)?\)/ig;
        let matches = regex.exec(str);
        if (!matches) return false;
        
        let r = parseFloat(matches[1]);
        let g = parseFloat(matches[2]);
        let b = parseFloat(matches[3]);
        let a = parseFloat(matches[4] || 1);
        let a_is_percent = matches[5] === '%';
        
        if (r < 0 || g < 0 || b < 0 || r > 255 || g > 255 || b > 255) return false;
        
        return {
          mode:  'rgb',
          color: new QColor().set_rgba({r, g, b, a: a_is_percent ? a / 100 : a})
        };
      },
      to_string: (color, precision, force_alpha = false) => {
        const rgb = QColor.hsl_to_rgb(color.h, color.s, color.l);
        const parts = [
          QColor.#to_fixed(rgb.r, precision),
          QColor.#to_fixed(rgb.g, precision),
          QColor.#to_fixed(rgb.b, precision),
        ];
        if (color.a < 1 || force_alpha) parts.push('/', QColor.#to_fixed(color.a, 3));
        
        return `rgb(${parts.join(" ")})`;
      }
    },
    hex:   {
      parse:     (str) => {
        let match = str.match(/^#([0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3})$/i);
        if (!match) return false;
        const rgb = QColor.hex_to_rgb(match[1].slice(0, 6));
        return {
          mode:  'hex',
          color: new QColor().set_rgba({r: rgb.r, g: rgb.g, b: rgb.b, a: match[1].length === 8 ? parseInt(match[1].slice(6, 8), 16) / 255.0 : 1.0})
        };
      },
      to_string: (color, precision, force_alpha = false) => {
        const rgb = QColor.hsl_to_rgb(color.h, color.s, color.l);
        let hex = QColor.rgb_to_hex(rgb.r, rgb.g, rgb.b);
        
        if (color.a < 1)
          hex += Math.round(color.a * 255).toString(16).padStart(2, '0').toUpperCase();
        
        return hex;
      }
    },
    oklch: {
      parse:     (str) => {
        const regex = /oklch\((\d*\.\d+|\d+)\s+(\d*\.\d+|\d+)\s+(\d*\.\d+|\d+)\s*(?:\/\s*(\d*\.\d+|\d+)(%?)\s*)?\)/ig;
        let matches = regex.exec(str);
        if (!matches) return false;
        
        let l = parseFloat(matches[1]);
        let c = parseFloat(matches[2]);
        let h = parseFloat(matches[3]);
        let a = parseFloat(matches[4] || 1);
        let a_is_percent = matches[5] === '%';
        
        if (l < 0 || l > 1 || c < 0 || c > 0.47 || h < 0 || h > 360) return false;
        
        return {
          mode:  'oklch',
          color: new QColor().set_oklch({l, c, h, a: a_is_percent ? a / 100 : a})
        };
      },
      to_string: (color, precision, force_alpha = false) => {
        const oklch = QColor.hsl_to_oklch(color.h, color.s, color.l);
        const parts = [
          QColor.#to_fixed(oklch.l, precision),
          QColor.#to_fixed(oklch.c, precision),
          QColor.#to_fixed(oklch.h, precision),
        ];
        if (color.a < 1 || force_alpha) parts.push('/', QColor.#to_fixed(color.a, 3));
        
        return `oklch(${parts.join(' ')})`;
      }
    }
  };
  
  /**
   * Parses a color string in HSL(A), RGB(A) or Hex format and updates the color's properties accordingly.<br>
   * @param str
   * @returns {boolean|'hsla'|' hsl'}
   */
  parse(str) {
    for (let m in QColor.modes) {
      let mode = QColor.modes[m];
      let resp = mode.parse(str);
      if (resp) {
        this.hsla = resp.color.hsla;
        return resp.mode;
      }
    }
    
    
    return false;
  }
  
  h = 0.0;
  s = 0.0;
  l = 0.0;
  a = 1.0;
  
  
  /** @returns {{h: number, s: number, l: number, a: number}} */
  get hsla() {
    return {h: this.h, s: this.s, l: this.l, a: this.a};
  }
  
  /** @param {{h: number?, s: number?, l: number?, a?: number?}} hsla */
  set hsla({h, s, l, a}) {
    if (h != null) this.h = h;
    if (s != null) this.s = s;
    if (l != null) this.l = l;
    if (a != null) this.a = a;
  }
  
  
  // RGB
  
  /** @returns {{r: number, g: number, b: number, a: number}} */
  get_rgba() {
    return {...QColor.hsl_to_rgb(this.h, this.s, this.l), a: this.a};
  }
  
  set_rgba({r, g, b, a}) {
    const curr = this.get_rgba();
    r = r != null ? r : curr.r;
    g = g != null ? g : curr.g;
    b = b != null ? b : curr.b;
    a = a != null ? a : curr.a;
    const hsl = QColor.rgb_to_hsl(r, g, b);
    this.hsla = {...hsl, a};
    return this;
  }
  
  // HSV
  
  /** @returns {{h: number, s: number, v: number, a: number}} */
  get_hsva() {
    return {...QColor.hsl_to_hsv(this.h, this.s, this.l), a: this.a};
  }
  
  set_hsva({h, s, v, a}) {
    let hsva = this.get_hsva();
    hsva = {...hsva, ...arguments[0]};
    this.hsla = {...QColor.hsv_to_hsl(hsva.h, hsva.s, hsva.v), a: hsva.a};
    return this;
  }
  
  // OKLCH
  
  /** @returns {{l: number, c: number, h: number, a: number}} */
  get_oklch() {
    return {...QColor.hsl_to_oklch(this.h, this.s, this.l), a: this.a};
  }
  
  set_oklch({l, c, h, a}) {
    let oklch = this.get_oklch();
    oklch = {...oklch, ...arguments[0]};
    this.hsla = {...QColor.oklch_to_hsl(oklch.l, oklch.c, oklch.h), a: oklch.a};
    return this;
  }
  
  
  
  /**
   * @param {QColor|string|Object|null} color Color string or QColor instance, defaults to black.
   */
  constructor(color = null) {
    if (!color) return this;
    
    if (color instanceof QColor || typeof color === 'object') {
      try {
        this.h = color.h;
        this.s = color.s;
        this.l = color.l;
        this.a = color.a;
      } catch (e) {
        console.error('Failed to create QColor from object: ', e);
      }
    } else if (typeof color === 'string') {
      this.parse(color);
    }
  }
  
  
  
  
  /**
   * Converts the color to a string representation in the specified format.
   *
   * @param {'hsl'|'rgb'|'hex'|'oklch'} mode Output format: 'hsl', 'rgb', 'hex', or 'oklch'
   * @param {number} precision of decimal places for HSL and RGB components (alpha is always 2 decimals)
   * @param [force_alpha] Whether to include alpha in the output even if it's 1 (fully opaque)
   * @returns {string}
   */
  to_string(mode = 'oklch', precision = 8, force_alpha = false) {
    mode = mode.toLowerCase();
    return QColor.modes[mode].to_string(this, precision, force_alpha);
  }
  
  clone() {
    return new QColor(this);
  }
  
  toString() {
    return this.to_string('hsl', 8);
  }
  
  /**
   * Compares two colors using an epsilon tolerance to avoid floating-point precision issues.
   * @param {QColor} other_color
   * @param {number} tolerance
   * @returns {boolean}
   */
  equals(other_color, tolerance = 1e-7) {
    return Math.abs(this.h - other_color.h) < tolerance
      && Math.abs(this.s - other_color.s) < tolerance
      && Math.abs(this.l - other_color.l) < tolerance
      && Math.abs(this.a - other_color.a) < tolerance;
  }
  
  /* Manipulations */
  
  #clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }
  
  /**
   * @param {string} exp
   * @returns {QColor}
   */
  shade(exp = 'h(+10%) s(-10%) l(+10%) a(+0%)') {
    let cloned = this.clone();
    let matches = exp.matchAll(/([hsla])\((([+-])?[\d.]+)(%?)\)/gi);
    for (let match of matches) {
      let mode = match[1].toLowerCase();
      let sign = match[3] === '+' || match[3] === '-';
      let val = parseFloat(match[2]);
      let is_percent = match[4] === '%';
      if (mode === 'h') {
        let delta = is_percent ? ((sign ? this.h : 100) * val / 100.0) : val;
        cloned.h = (sign ? cloned.h + delta : delta) % 360;
      } else if (mode === 's') {
        let delta = is_percent ? ((sign ? this.s : 100) * val / 100.0) : val;
        cloned.s = this.#clamp(sign ? cloned.s + delta : delta, 0, 100);
      } else if (mode === 'l') {
        let delta = is_percent ? ((sign ? this.l : 100) * val / 100.0) : val;
        cloned.l = this.#clamp(sign ? cloned.l + delta : delta, 0, 100);
      } else if (mode === 'a') {
        let delta = is_percent ? ((sign ? this.a : 100) * val / 100.0) : val;
        cloned.a = this.#clamp(sign ? cloned.a + delta : delta, 0, 1.0);
      }
    }
    return cloned;
  }
  
  /**
   * Applies adjustments to the color in OKLCH space.<br>
   * Expression keys: L (lightness 0-1), C (chroma ~0-0.4), H (hue 0-360), a (alpha 0-1).<br>
   * Examples: 'L(+0.1)', 'C(-0.05)', 'H(+30)', 'L(0.5)', 'L(+10%) C(-20%)'<br>
   * With sign (+/-): relative adjustment. Without sign: absolute set.<br>
   * With %: percentage of current value (signed) or range max (absolute).
   * @param {string} exp
   * @returns {QColor}
   */
  shade_oklch(exp = 'l(+0) c(+0) h(+0) a(+0)') {
    let cloned = this.clone();
    let oklch = cloned.get_oklch();
    let matches = exp.matchAll(/([lcha])\((([+-])?[\d.]+)(%?)\)/gi);
    for (let match of matches) {
      let key = match[1].toLowerCase();
      let sign = match[3] === '+' || match[3] === '-';
      let val = parseFloat(match[2]);
      let is_percent = match[4] === '%';
      if (key === 'l') {
        let delta = is_percent ? ((sign ? oklch.l : 1) * val / 100.0) : val;
        oklch.l = this.#clamp(sign ? oklch.l + delta : delta, 0, 1);
      } else if (key === 'c') {
        let delta = is_percent ? ((sign ? oklch.c : 0.4) * val / 100.0) : val;
        oklch.c = Math.max(0, sign ? oklch.c + delta : delta);
      } else if (key === 'h') {
        let delta = is_percent ? ((sign ? oklch.h : 360) * val / 100.0) : val;
        oklch.h = ((sign ? oklch.h + delta : delta) % 360 + 360) % 360;
      } else if (key === 'a') {
        let delta = is_percent ? ((sign ? oklch.a : 1) * val / 100.0) : val;
        oklch.a = this.#clamp(sign ? oklch.a + delta : delta, 0, 1.0);
      }
    }
    // Gamut clamp to keep result within sRGB
    const clamped = QColor.gamut_clamp_oklch(oklch.l, oklch.c, oklch.h);
    cloned.set_oklch({l: clamped.l, c: clamped.c, h: clamped.h, a: oklch.a});
    return cloned;
  }
  
  /**
   * @param {QColor} other_color
   * @param weight
   * @param {'rgb'| 'hsl', 'oklch'} mode
   * @returns {QColor}
   */
  blend(other_color, weight = 0.5, mode = 'hsl') {
    if (weight < 0) weight = 0;
    if (weight > 1) weight = weight > 100 ? 1 : weight / 100;
    
    if (mode === 'hsl') {
      const c1 = this.clone();
      const c2 = other_color.hsla;
      
      const h = (c1.h * (1 - weight) + c2.h * weight);
      const s = (c1.s * (1 - weight) + c2.s * weight);
      const l = (c1.l * (1 - weight) + c2.l * weight);
      const a = c1.a * (1 - weight) + c2.a * weight;
      const blended = new QColor();
      blended.hsla = {h, s, l, a};
      return blended;
    }
    
    if (mode === 'oklch') {
      const c1 = this.get_oklch();
      const c2 = other_color.get_oklch();
      const l = (c1.l * (1 - weight) + c2.l * weight);
      const c = (c1.c * (1 - weight) + c2.c * weight);
      const h = (c1.h * (1 - weight) + c2.h * weight);
      const a = c1.a * (1 - weight) + c2.a * weight;
      const blended = new QColor();
      blended.set_oklch({l, c, h, a});
      return blended;
    }
    
    const c1 = this.get_rgba();
    const c2 = other_color.get_rgba();
    const r = (c1.r * (1 - weight) + c2.r * weight);
    const g = (c1.g * (1 - weight) + c2.g * weight);
    const b = (c1.b * (1 - weight) + c2.b * weight);
    const a = c1.a * (1 - weight) + c2.a * weight;
    const blended = new QColor();
    blended.set_rgba({r, g, b, a});
    return blended;
  }
  
  /**
   * Modifies a color to ensure a minimum contrast ratio against a "background" color.<br>
   * Adjusts lightness first, then reduces saturation if lightness alone is insufficient.<br>
   *
   * @param {QColor} background_color The color to calculate the contrast against.
   * @param {number} contrast_ratio Decimal number specifying the minimum contrast ratio.
   * @returns {QColor}
   */
  min_contrast_color(background_color, contrast_ratio = 4.5) {
    let modified = this.clone();
    // if (modified.a < 1) modified.a = 1;
    if (modified.contrast_ratio(background_color) >= contrast_ratio) return modified;
    /**
     * Binary search on lightness in a given direction for a color.
     * Returns the candidate with the minimal lightness change that meets the ratio.
     * @param {QColor} color
     * @param {'lighten'|'darken'} direction
     * @returns {QColor}
     */
    const try_lightness = (color, direction) => {
      let lo, hi;
      if (direction === 'lighten') {
        lo = color.l;
        hi = 100;
      } else {
        lo = 0;
        hi = color.l;
      }
      let candidate = color.clone();
      // if (candidate.a < 1) candidate.a = 1;
      for (let i = 0; i < 20; i++) {
        let mid = (lo + hi) / 2;
        candidate.l = mid;
        if (candidate.contrast_ratio(background_color) >= contrast_ratio) {
          if (direction === 'lighten') hi = mid;
          else lo = mid;
        } else {
          if (direction === 'lighten') lo = mid;
          else hi = mid;
        }
      }
      candidate.l = direction === 'lighten' ? hi : lo;
      return candidate;
    };
    
    /**
     * Tries both lighten and darken, returns the candidate closest
     * to the original lightness, or null if neither meets the ratio.
     * @param {QColor} color
     * @returns {QColor|null}
     */
    const best_lightness_candidate = (color) => {
      const lightened = try_lightness(color, 'lighten');
      const darkened = try_lightness(color, 'darken');
      const light_meets = lightened.contrast_ratio(background_color) >= contrast_ratio;
      const dark_meets = darkened.contrast_ratio(background_color) >= contrast_ratio;
      if (light_meets && dark_meets) {
        return Math.abs(lightened.l - this.l) <= Math.abs(darkened.l - this.l) ? lightened : darkened;
      }
      if (light_meets) return lightened;
      if (dark_meets) return darkened;
      return null;
    };
    // Phase 1: lightness only adjustment at current saturation
    let result = best_lightness_candidate(modified);
    if (result) return result;
    
    // Phase 2: binary search on saturation, retrying lightness at each level
    // Maximizes preserved saturation while meeting the contrast target.
    let s_lo = 0;
    let s_hi = modified.s;
    let best = null;
    for (let i = 0; i < 20; i++) {
      let s_mid = (s_lo + s_hi) / 2;
      let attempt = modified.clone();
      attempt.s = s_mid;
      let candidate = best_lightness_candidate(attempt);
      if (candidate) {
        best = candidate;
        s_lo = s_mid; // try to preserve more saturation
      } else {
        s_hi = s_mid; // need to desaturate further
      }
    }
    if (best && best.contrast_ratio(background_color) >= contrast_ratio) return best;
    
    // Phase 3: fully desaturated (grayscale), try lightness
    let gray = modified.clone();
    gray.s = 0;
    result = best_lightness_candidate(gray);
    if (result) return result;
    
    // Phase 4: absolute fallback - black or white
    let black = this.clone();
    black.hsla = {h: this.h, s: 0, l: 0, a: 1};
    let white = this.clone();
    white.hsla = {h: this.h, s: 0, l: 100, a: 1};
    return black.contrast_ratio(background_color) > white.contrast_ratio(background_color) ? black : white;
  }
  
  
  /**
   * Calculates the relative luminance of a color.
   * @returns {number} Relative luminance (0 for black, 1 for white)
   */
  luminance() {
    const rgb = this.get_rgba();
    const lr = QColor.#srgb_to_linear(rgb.r / 255);
    const lg = QColor.#srgb_to_linear(rgb.g / 255);
    const lb = QColor.#srgb_to_linear(rgb.b / 255);
    return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
  }
  
  /**
   * Calculates the contrast ratio between this color and another color.
   * Where 1 is no contrast and 21 is maximum contrast (black vs white)
   * @param {QColor} foreground_color
   * @returns {number}
   */
  contrast_ratio(foreground_color) {
    const L1 = this.luminance();
    let L2 = (foreground_color.a < 1) ?
      this.blend(foreground_color, foreground_color.a, 'rgb').luminance() :
      foreground_color.luminance();
    
    const lighter = Math.max(L1, L2);
    const darker = Math.min(L1, L2);
    return (lighter + 0.05) / (darker + 0.05);
  }
  
  /**
   * Perceptual contrast using OKLCH lightness difference.<br>
   * Returns ΔL (0-1) where 0 = identical lightness, 1 = black vs white.<br>
   * Not a WCAG metric — use contrast_ratio() for accessibility compliance.
   * @param {QColor} other_color
   * @returns {number}
   */
  oklch_contrast(other_color) {
    return Math.abs(this.get_oklch().l - other_color.get_oklch().l);
  }
  
  /**
   * Modifies a color to ensure a minimum WCAG contrast ratio against a background,
   * using OKLCH perceptual lightness for the search (converges faster and produces
   * more perceptually uniform results than HSL-based search).<br>
   * Falls back to chroma reduction, then grayscale, then black/white.
   *
   * @param {QColor} background_color The color to calculate the contrast against.
   * @param {number} target_ratio Decimal number specifying the minimum contrast ratio.
   * @returns {QColor}
   */
  min_contrast_oklch(background_color, target_ratio = 4.5) {
    let modified = this.clone();
    // if (modified.a < 1) modified.a = 1;
    if (modified.contrast_ratio(background_color) >= target_ratio) return modified;
    
    /**
     * Binary search on OKLCH lightness in a given direction.
     * @param {QColor} color
     * @param {'lighten'|'darken'} direction
     * @returns {QColor}
     */
    const try_lightness = (color, direction) => {
      const oklch = color.get_oklch();
      let lo, hi;
      if (direction === 'lighten') {
        lo = oklch.l;
        hi = 1;
      } else {
        lo = 0;
        hi = oklch.l;
      }
      let candidate = color.clone();
      // if (candidate.a < 1) candidate.a = 1;
      for (let i = 0; i < 20; i++) {
        let mid = (lo + hi) / 2;
        const clamped = QColor.gamut_clamp_oklch(mid, oklch.c, oklch.h);
        candidate.set_oklch({l: clamped.l, c: clamped.c, h: clamped.h});
        if (candidate.contrast_ratio(background_color) >= target_ratio) {
          if (direction === 'lighten') hi = mid;
          else lo = mid;
        } else {
          if (direction === 'lighten') lo = mid;
          else hi = mid;
        }
      }
      const final_l = direction === 'lighten' ? hi : lo;
      const clamped = QColor.gamut_clamp_oklch(final_l, oklch.c, oklch.h);
      candidate.set_oklch({l: clamped.l, c: clamped.c, h: clamped.h});
      return candidate;
    };
    
    /**
     * Tries both lighten and darken, returns the candidate closest
     * to the original OKLCH lightness, or null if neither meets the ratio.
     * @param {QColor} color
     * @returns {QColor|null}
     */
    const best_lightness_candidate = (color) => {
      const original_l = this.get_oklch().l;
      const lightened = try_lightness(color, 'lighten');
      const darkened = try_lightness(color, 'darken');
      const light_meets = lightened.contrast_ratio(background_color) >= target_ratio;
      const dark_meets = darkened.contrast_ratio(background_color) >= target_ratio;
      if (light_meets && dark_meets) {
        return Math.abs(lightened.get_oklch().l - original_l) <= Math.abs(darkened.get_oklch().l - original_l)
          ? lightened : darkened;
      }
      if (light_meets) return lightened;
      if (dark_meets) return darkened;
      return null;
    };
    
    // Phase 1: OKLCH lightness adjustment at current chroma
    let result = best_lightness_candidate(modified);
    if (result) return result;
    
    // Phase 2: binary search on chroma, retrying lightness at each level
    const oklch = modified.get_oklch();
    let c_lo = 0;
    let c_hi = oklch.c;
    let best = null;
    for (let i = 0; i < 20; i++) {
      let c_mid = (c_lo + c_hi) / 2;
      let attempt = modified.clone();
      attempt.set_oklch({c: c_mid});
      let candidate = best_lightness_candidate(attempt);
      if (candidate) {
        best = candidate;
        c_lo = c_mid; // try to preserve more chroma
      } else {
        c_hi = c_mid; // need to reduce chroma further
      }
    }
    if (best && best.contrast_ratio(background_color) >= target_ratio) return best;
    
    // Phase 3: achromatic (zero chroma), try lightness
    let gray = modified.clone();
    gray.set_oklch({c: 0});
    result = best_lightness_candidate(gray);
    if (result) return result;
    
    // Phase 4: absolute fallback - black or white
    let black = this.clone();
    black.hsla = {h: this.h, s: 0, l: 0, a: 1};
    let white = this.clone();
    white.hsla = {h: this.h, s: 0, l: 100, a: 1};
    return black.contrast_ratio(background_color) > white.contrast_ratio(background_color) ? black : white;
  }
  
  randomize() {
    this.h = Math.random() * 360;
    this.s = Math.random() * 100;
    this.l = Math.random() * 100;
    this.a = 1;
    return this;
  }
  
  
  /* Static Conversion Methods */
  
  static hex_to_rgb(hex) {
    hex = hex.replace(/^#/, '');
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('');
    }
    const bigint = parseInt(hex, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return {r: r, g: g, b: b};
  }
  
  static rgb_to_hex(r, g, b, normalized = false) {
    if (normalized) {
      r = Math.round(r * 255);
      g = Math.round(g * 255);
      b = Math.round(b * 255);
    } else {
      r = Math.round(r);
      g = Math.round(g);
      b = Math.round(b);
    }
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
  }
  
  static rgb_to_hsv(r, g, b, normalized = false) {
    if (!normalized) {
      r /= 255.0;
      g /= 255.0;
      b /= 255.0;
    }
    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, v = max;
    let d = max - min;
    s = max === 0 ? 0 : d / max;
    if (max === min) {
      h = 0; // achromatic
    } else {
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }
    if (!normalized) {
      h *= 360;
      s *= 100;
      v *= 100;
    }
    return {h: h, s: s, v: v};
  }
  
  
  static hsv_to_rgb(h, s, v, normalized = false) {
    if (!normalized) {
      s /= 100.0;
      v /= 100.0;
    } else h *= 360;
    
    let r, g, b;
    let i = Math.floor(h / 60);
    let f = h / 60 - i;
    let p = v * (1 - s);
    let q = v * (1 - f * s);
    let t = v * (1 - (1 - f) * s);
    switch (i % 6) {
      case 0:
        r = v;
        g = t;
        b = p;
        break;
      case 1:
        r = q;
        g = v;
        b = p;
        break;
      case 2:
        r = p;
        g = v;
        b = t;
        break;
      case 3:
        r = p;
        g = q;
        b = v;
        break;
      case 4:
        r = t;
        g = p;
        b = v;
        break;
      case 5:
        r = v;
        g = p;
        b = q;
        break;
    }
    if (!normalized) {
      return {r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255)};
    }
    return {r: r, g: g, b: b};
  }
  
  static hsv_to_hsl(h, s, v, normalized = false) {
    if (!normalized) {
      s /= 100.0;
      v /= 100.0;
    }
    
    let l = v * (1 - s / 2);
    let sl = (l === 0 || l === 1) ? 0 : (v - l) / Math.min(l, 1 - l);
    if (!normalized) {
      sl *= 100;
      l *= 100;
    }
    return {h: h, s: sl, l: l};
  }
  
  /**
   * @param {number} h
   * @param {number} s
   * @param {number} l
   * @param normalized
   * @returns {{h: number, s: number, v: number}}
   */
  static hsl_to_hsv(h, s, l, normalized = false) {
    if (!normalized) {
      s /= 100.0;
      l /= 100.0;
    }
    let v = l + s * Math.min(l, 1 - l);
    let sv = (v === 0) ? 0 : 2 * (1 - l / v);
    if (!normalized) {
      sv *= 100;
      v *= 100;
    }
    return {h: h, s: sv, v: v};
  }
  
  /**
   * @param {number} h
   * @param {number} s
   * @param {number} l
   * @param normalized
   * @returns {{r: number, g: number, b: number}}
   */
  static hsl_to_rgb(h, s, l, normalized = false) {
    if (!normalized) {
      h /= 360.0;
      s /= 100.0;
      l /= 100.0;
    }
    
    const hue_to_rgb = (p, q, h) => {
      if (h < 0) h += 1;
      if (h > 1) h -= 1;
      if (h < 1 / 6.0) return p + (q - p) * 6.0 * h;
      if (h < 1 / 2.0) return q;
      if (h < 2 / 3.0) return p + (q - p) * (2 / 3.0 - h) * 6.0;
      return p;
    };
    
    let r, g, b;
    
    if (s === 0) {
      r = g = b = l;
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue_to_rgb(p, q, h + 1 / 3.0);
      g = hue_to_rgb(p, q, h);
      b = hue_to_rgb(p, q, h - 1 / 3.0);
    }
    
    if (!normalized) {
      r *= 255;
      g *= 255;
      b *= 255;
    }
    
    return {r, g, b};
  }
  
  /**
   * @param {number} r
   * @param {number} g
   * @param {number} b
   * @param normalized
   * @returns {{h: number, s: number, l: number}}
   */
  static rgb_to_hsl(r, g, b, normalized = false) {
    if (!normalized) {
      r /= 255.0;
      g /= 255.0;
      b /= 255.0;
    }
    
    const high = Math.max(r, g, b);
    const low = Math.min(r, g, b);
    let h, s, l = (high + low) / 2.0;
    if (high === low) {
      h = s = 0.0;
    } else {
      const d = high - low;
      s = l > 0.5 ? d / (2.0 - high - low) : d / (high + low);
      if (high === r) {
        h = (g - b) / d + (g < b ? 6.0 : 0);
      } else if (high === g) {
        h = (b - r) / d + 2.0;
      } else { // high === b
        h = (r - g) / d + 4.0;
      }
      h /= 6.0;
    }
    
    if (!normalized) {
      h *= 360;
      s *= 100;
      l *= 100;
    }
    return {h: h, s: s, l: l};
  }
  
  
  
  /**
   * Converts HSL to OKLCH color space.
   * @param {number} h Hue (0-360 or 0-1 if normalized)
   * @param {number} s Saturation (0-100 or 0-1 if normalized)
   * @param {number} l Lightness (0-100 or 0-1 if normalized)
   * @param {boolean} normalized
   * @returns {{l: number, c: number, h: number}} L: 0-1, C: ~0-0.4, H: 0-360
   */
  static hsl_to_oklch(h, s, l, normalized = false) {
    // Normalize HSL to 0-1 range for internal math
    if (!normalized) {
      h /= 360;
      s /= 100;
      l /= 100;
    }
    const rgb = QColor.hsl_to_rgb(h, s, l, true);
    const lr = QColor.#srgb_to_linear(rgb.r);
    const lg = QColor.#srgb_to_linear(rgb.g);
    const lb = QColor.#srgb_to_linear(rgb.b);
    const lab = QColor.#linear_srgb_to_oklab(lr, lg, lb);
    return QColor.#oklab_to_oklch(lab.l, lab.a, lab.b);
  }
  
  /**
   * Converts OKLCH to HSL color space.
   * @param {number} l Perceptual lightness (0-1)
   * @param {number} c Chroma (~0-0.4)
   * @param {number} h Hue (0-360)
   * @param {boolean} normalized If true, returns HSL in 0-1 ranges
   * @returns {{h: number, s: number, l: number}}
   */
  static oklch_to_hsl(l, c, h, normalized = false) {
    const lab = QColor.#oklch_to_oklab(l, c, h);
    const linear = QColor.#oklab_to_linear_srgb(lab.l, lab.a, lab.b);
    const r = QColor.#linear_to_srgb(Math.max(0, Math.min(1, linear.r)));
    const g = QColor.#linear_to_srgb(Math.max(0, Math.min(1, linear.g)));
    const b = QColor.#linear_to_srgb(Math.max(0, Math.min(1, linear.b)));
    // rgb values are already 0-1, so always use normalized=true for rgb_to_hsl
    const hsl = QColor.rgb_to_hsl(r, g, b, true);
    if (!normalized) {
      hsl.h *= 360;
      hsl.s *= 100;
      hsl.l *= 100;
    }
    return hsl;
  }
  
  
  // --- OKLab / OKLCH internal helpers ---
  
  /**
   * Checks if an OKLCH color is within sRGB gamut.
   * @param {number} l
   * @param {number} c
   * @param {number} h
   * @returns {boolean}
   */
  static #is_in_srgb_gamut(l, c, h) {
    const lab = QColor.#oklch_to_oklab(l, c, h);
    const rgb = QColor.#oklab_to_linear_srgb(lab.l, lab.a, lab.b);
    const EPS = 1e-6;
    return rgb.r >= -EPS && rgb.r <= 1 + EPS
      && rgb.g >= -EPS && rgb.g <= 1 + EPS
      && rgb.b >= -EPS && rgb.b <= 1 + EPS;
  }
  
  /**
   * Clamps an OKLCH color to sRGB gamut by reducing chroma via binary search.
   * Preserves lightness and hue as much as possible.
   * @param {number} l
   * @param {number} c
   * @param {number} h
   * @returns {{l: number, c: number, h: number}}
   */
  static gamut_clamp_oklch(l, c, h) {
    // Clamp L to valid range
    l = Math.max(0, Math.min(1, l));
    
    // Black/white have no chroma
    if (l <= 0) return {l: 0, c: 0, h};
    if (l >= 1) return {l: 1, c: 0, h};
    
    // Already in gamut
    if (QColor.#is_in_srgb_gamut(l, c, h)) return {l, c, h};
    
    // Binary search on chroma
    let lo = 0;
    let hi = c;
    for (let i = 0; i < 20; i++) {
      const mid = (lo + hi) / 2;
      if (QColor.#is_in_srgb_gamut(l, mid, h)) {
        lo = mid;
      } else {
        hi = mid;
      }
    }
    return {l, c: lo, h};
  }
  
  /**
   * sRGB component (0-1) to linear sRGB.
   * @param {number} v
   * @returns {number}
   */
  static #srgb_to_linear(v) {
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  }
  
  /**
   * Linear sRGB component to sRGB (0-1).
   * @param {number} v
   * @returns {number}
   */
  static #linear_to_srgb(v) {
    return v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
  }
  
  /**
   * Linear sRGB (0-1 each) to OKLab.
   * @param {number} r
   * @param {number} g
   * @param {number} b
   * @returns {{l: number, a: number, b: number}}
   */
  static #linear_srgb_to_oklab(r, g, b) {
    // M1: linear sRGB → LMS
    let lms_l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
    let lms_m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
    let lms_s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
    
    // Cube root
    lms_l = Math.cbrt(lms_l);
    lms_m = Math.cbrt(lms_m);
    lms_s = Math.cbrt(lms_s);
    
    // M2: LMS^(1/3) → OKLab
    return {
      l: 0.2104542553 * lms_l + 0.7936177850 * lms_m - 0.0040720468 * lms_s,
      a: 1.9779984951 * lms_l - 2.4285922050 * lms_m + 0.4505937099 * lms_s,
      b: 0.0259040371 * lms_l + 0.7827717662 * lms_m - 0.8086757660 * lms_s,
    };
  }
  
  /**
   * OKLab to linear sRGB (0-1 each, may exceed gamut).
   * @param {number} l
   * @param {number} a
   * @param {number} b
   * @returns {{r: number, g: number, b: number}}
   */
  static #oklab_to_linear_srgb(l, a, b) {
    // M2⁻¹: OKLab → LMS^(1/3)
    let lms_l = l + 0.3963377774 * a + 0.2158037573 * b;
    let lms_m = l - 0.1055613458 * a - 0.0638541728 * b;
    let lms_s = l - 0.0894841775 * a - 1.2914855480 * b;
    
    // Cube
    lms_l = lms_l * lms_l * lms_l;
    lms_m = lms_m * lms_m * lms_m;
    lms_s = lms_s * lms_s * lms_s;
    
    // M1⁻¹: LMS → linear sRGB
    return {
      r: 4.0767416621 * lms_l - 3.3077115913 * lms_m + 0.2309699292 * lms_s,
      g: -1.2684380046 * lms_l + 2.6097574011 * lms_m - 0.3413193965 * lms_s,
      b: -0.0041960863 * lms_l - 0.7034186147 * lms_m + 1.7076147010 * lms_s,
    };
  }
  
  /**
   * OKLab (L, a, b) to OKLCH (L, C, H).
   * @param {number} l
   * @param {number} a
   * @param {number} b
   * @returns {{l: number, c: number, h: number}} L: 0-1, C: ~0-0.4, H: 0-360
   */
  static #oklab_to_oklch(l, a, b) {
    const c = Math.sqrt(a * a + b * b);
    let h = Math.atan2(b, a) * 180 / Math.PI;
    if (h < 0) h += 360;
    return {l, c, h};
  }
  
  /**
   * OKLCH (L, C, H) to OKLab (L, a, b).
   * @param {number} l
   * @param {number} c
   * @param {number} h Hue in degrees (0-360)
   * @returns {{l: number, a: number, b: number}}
   */
  static #oklch_to_oklab(l, c, h) {
    const rad = h * Math.PI / 180;
    return {
      l,
      a: c * Math.cos(rad),
      b: c * Math.sin(rad),
    };
  }
  
  
  /**
   * @param value
   * @param {number} precision
   * @returns {number}
   */
  static #to_fixed(value, precision) {
    return parseFloat(value.toFixed(precision));
  }
  
}