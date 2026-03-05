/**
 * Color Manipulator Class
 */
export class QColor {
  #regex = {
    /**
     * Matches HSL and HSLA color strings, capturing the following groups:<br>
     * 01: "hsl" or "hsla" <br>
     * 02: Hue value (0-360 with optional decimal)<br>
     * 03: Optional "deg" unit for hue<br>
     * 04: Separator for saturation (comma or whitespace with optional surrounding whitespace)<br>
     * 05: Saturation value (0-100 with optional decimal)<br>
     * 06: Optional "%" unit for saturation<br>
     * 07: Separator for lightness (comma or whitespace with optional surrounding whitespace)<br>
     * 08: Lightness value (0-100 with optional decimal)<br>
     * 09: Optional "%" unit for lightness<br>
     * 10: All optional alpha components (including separator)<br>
     * 11: Separator for alpha (comma or slash with optional surrounding whitespace)<br>
     * 12: Optional alpha value (0-100 with optional decimal or percentage)<br>
     * 13: Optional "%" unit for alpha<br>
     */
    hsl: /^\s*(hsla?)\(\s*((?:3[0-5][0-9]|[0-2]?[0-9]{1,2})(?:\.\d*)?|\.\d+|360(?:\.0*)?)(deg)?\s*(\s*,\s*|\s+)\s*([0-9]{1,2}(?:\.\d*)?|\.\d+|100(?:\.0*)?)(%)?\s*(\s*,\s*|\s+)\s*([0-9]{1,2}(?:\.\d*)?|\.\d+|100(?:\.0*)?)(%)?\s*((\s*[,\/]\s*|\s+)\s*([0-9]{1,2}(?:\.\d*)?|\.\d+|100(?:\.0*)?)(%)?)?\s*\)\s*$/i
  };
  
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
    if (h) this.h = h;
    if (s) this.s = s;
    if (l) this.l = l;
    if (a) this.a = a;
  }
  
  
  // RGB
  
  /** @returns {{r: number, g: number, b: number, a: number}} */
  get_rgba() {
    return {...QColor.hsl_to_rgb(this.h, this.s, this.l), a: this.a};
  }
  
  set_rgba({r, g, b, a}) {
    if (!r || !g || !b || !a) {
      const curr = this.get_rgba();
      r = r ?? curr.r;
      g = g ?? curr.g;
      b = b ?? curr.b;
      a = a ?? curr.a;
    }
    const hsl = QColor.rgb_to_hsl(r, g, b);
    this.hsla = {...hsl, a};
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
  }
  
  
  
  /**
   * @param {QColor|string|null} color Color string or QColor instance, defaults to black.
   */
  constructor(color = null) {
    if (color instanceof QColor) {
      this.h = color.h;
      this.s = color.s;
      this.l = color.l;
      this.a = color.a;
    } else if (typeof color === 'string') {
      this.parse(color);
    }
  }
  
  
  
  
  /**
   * Converts the color to a string representation in the specified format.
   * Todo: Consider legacy vs modern formatting for RGB(A) as well.
   * @param {'hsl'|'rgb'|'hex'} [mode = 'hsl'] Output format: 'hsl', 'rgb', or 'hex'
   * @param [precision = 5] Number of decimal places for HSL and RGB components (alpha is always 2 decimals)
   * @param [legacy = true]
   * @returns {string}
   */
  to_string(mode = 'hsl', precision = 5, legacy = true) {
    mode = mode.toLowerCase();
    
    const has_alpha = this.a < 1.0;
    
    
    if (mode === 'rgb') {
      const rgb = this.get_rgba();
      if (this.a >= 1.0) {
        return `rgb(${QColor.to_precision(rgb.r, precision)}, ${QColor.to_precision(rgb.g, precision)}, ${QColor.to_precision(rgb.b, precision)})`;
      }
      return `rgba(${QColor.to_precision(rgb.r, precision)}, ${QColor.to_precision(rgb.g, precision)}, ${QColor.to_precision(rgb.b, precision)}, ${QColor.to_precision(rgb.a, 2)})`;
    } else if (mode === 'hex') {
      const rgb = this.get_rgba();
      return QColor.rgb_to_hex(Math.round(rgb.r), Math.round(rgb.g), Math.round(rgb.b)) + (this.a < 1.0 ? Math.round(this.a * 255).toString(16).padStart(2, '0').toUpperCase() : '');
    } else {
      const parts = [
        QColor.to_precision(this.h, precision),
        QColor.to_precision(this.s, precision) + "%",
        QColor.to_precision(this.l, precision) + "%",
      ];
      if (has_alpha) {
        const tmp = QColor.to_precision(this.a, 2);
        parts.push(legacy ? tmp : "/ " + (tmp * 100) + "%");
      }
      if (!legacy) return `hsl(${parts.join(' ')})`;
      
      return (has_alpha ? 'hsla' : 'hsl') + `(${parts.join(', ')})`;
    }
    
  }
  
  clone() {
    return new QColor(this);
  }
  
  toString() {
    return this.to_string('hsl', 10);
  }
  
  equals(other_color) {
    return this.to_string('hsl', 10) === other_color.to_string('hsl', 10);
  }
  
  /**
   * Parses a color string in HSL(A), RGB(A) or Hex format and updates the color's properties accordingly.<br>
   * Todo: Imrpove regex for RGB(A) and flexibilize parsing to fix common errors.<br>
   * @param str
   * @returns {boolean|'hsla'|' hsl'}
   */
  parse(str) {
    let hsl_match = this.#regex.hsl.exec(str);
    if (hsl_match) {
      this.h = parseFloat(hsl_match[2]);
      this.s = parseFloat(hsl_match[5]);
      this.l = parseFloat(hsl_match[8]);
      
      let spaces = hsl_match[4].trim() + hsl_match[7].trim();
      if (spaces === ',') return false;
      
      let inferred_mode = (spaces === ',,') ? 'legacy' : 'modern';
      
      if (hsl_match[11]) {
        spaces += hsl_match[11].trim();
        if (![',,,', '/'].includes(spaces)) return false;
      }
      
      if (hsl_match[12]) {
        const tmp = parseFloat(hsl_match[12]);
        this.a = hsl_match[13] === '%' ? tmp / 100.0 : tmp;
      }
      
      
      
      return 'hsl';
    }
    let hex_match = str.match(/^#([0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3})$/i);
    if (hex_match) {
      const rgb = QColor.hex_to_rgb(hex_match[1].slice(0, 6));
      this.set_rgba({r: rgb.r, g: rgb.g, b: rgb.b, a: hex_match[1].length === 8 ? parseInt(hex_match[1].slice(6, 8), 16) / 255.0 : 1.0});
      return 'hex';
    }
    let rgba_match = str.match(/rgba\s*?\(\s*?(000|0?\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\s*?,\s*?(000|0?\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\s*?,\s*?(000|0?\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\s*?,\s*?(0|0*\.\d+|1|1.0*)\s*?\)/i);
    if (rgba_match) {
      this.set_rgba({r: parseFloat(rgba_match[1]), g: parseFloat(rgba_match[2]), b: parseFloat(rgba_match[3]), a: parseFloat(rgba_match[4])});
      return 'rgb';
    }
    let rgb_match = str.match(/rgb\s*?\(\s*?(000|0?\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\s*?,\s*?(000|0?\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\s*?,\s*?(000|0?\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\s*?\)/i);
    if (rgb_match) {
      this.set_rgba({r: parseFloat(rgb_match[1]), g: parseFloat(rgb_match[2]), b: parseFloat(rgb_match[3]), a: 1.0});
      return 'rgb';
    }
    
    return false;
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
    let matches = exp.matchAll(/([hsla])\((([+-])?[\d.]+)(%?)\)/g);
    for (let match of matches) {
      let mode = match[1];
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
   * @param {QColor} other_color
   * @param weight
   * @param {'rgb'| 'hsl'} mode
   * @returns {QColor}
   */
  blend(other_color, weight = 0.5, mode = 'hsl') {
    if (weight < 0) weight = 0;
    if (weight > 1) weight /= 100;
    if (weight > 100) weight = 100;
    
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
   * Todo: Consider alpha adjustments before falling back to desaturation.
   *
   * @param {QColor} background_color The color to calculate the contrast against.
   * @param {number} contrast_ratio Decimal number specifying the minimum contrast ratio.
   * @returns {QColor}
   */
  min_contrast_color(background_color, contrast_ratio = 4.5) {
    let modified = this.clone();
    if (modified.a < 1) modified.a = 1;
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
      if (candidate.a < 1) candidate.a = 1;
      for (let i = 0; i < 50; i++) {
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
    for (let i = 0; i < 50; i++) {
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
    const linear_rgb = [rgb.r / 255, rgb.g / 255, rgb.b / 255].map((v) => {
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * linear_rgb[0] + 0.7152 * linear_rgb[1] + 0.0722 * linear_rgb[2];
  }
  
  /**
   * Calculates the contrast ratio between this color and another color.
   * Where 1 is no contrast and 21 is maximum contrast (black vs white)
   * @param {QColor} other_color
   * @returns {number}
   */
  contrast_ratio(other_color) {
    const L1 = this.luminance();
    const L2 = other_color.luminance();
    const lighter = Math.max(L1, L2);
    const darker = Math.min(L1, L2);
    return (lighter + 0.05) / (darker + 0.05);
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
    if (v === 0) sl = s;
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
    if (l === 0) sv = s;
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
    
    r = parseFloat(r);
    g = parseFloat(g);
    b = parseFloat(b);
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
  
  
  
  static hsl_to_oklc(h, s, l, normalized = false) {
  }
  
  
  /**
   * @param value
   * @param {number} precision
   * @returns {number}
   */
  static to_precision(value, precision) {
    return parseFloat(value.toFixed(precision));
  }
  
}