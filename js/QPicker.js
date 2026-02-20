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
  // _hsl = {h: 0, s: 0, l: 0, a: 1};
  #hsl_precision = 2;
  #legacy = false;
  
  h = 0;
  s = 0;
  l = 0;
  a = 1;
  
  // DYNAMIC PROPERTY DEFINITIONS
  get legacy() {
    return this.#legacy;
  }
  
  set legacy(value) {
    this.#legacy = !!value;
  }
  
  get precision() {
    return this.#hsl_precision;
  }
  
  set precision(value) {
    this.#hsl_precision = +value;
  }
  
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
   * @typedef {Object} QColorOptions
   * @property {number} [precision=2] - Number of decimal places to use when converting to string formats
   * @property {boolean} [legacy=false] - Whether to use legacy formatting for HSL(A) and RGB(A) output (commas and alpha as decimal)
   */
  
  /**
   * Color manipulation class, works in the sRGB color space with HSL as primary representation.
   *
   * @param {QColor|string|null} color Initial color, can be a QColor instance or a string in HSL(A), RGB(A) or Hex format
   * @param {QColorOptions} options
   */
  constructor(color = null, options = {precision: 2, legacy: true}) {
    if (color instanceof QColor) {
      this.hsla = color.hsla;
      this.#legacy = color.legacy;
      this.#hsl_precision = color.precision;
    } else if (typeof color === 'string') {
      this.parse(color);
    }
    this.#hsl_precision = options.precision;
    this.#legacy = options.legacy;
    
    
  }
  
  
  
  
  
  #to_precision(value) {
    return parseFloat(value.toFixed(this.#hsl_precision));
  }
  
  /**
   *
   * @param [mode = 'hsl']
   * @returns {string|string}
   */
  to_string(mode = 'hsl') {
    mode = mode.toLowerCase();
    mode = mode === 'hsla' ? 'hsl' : mode;
    mode = mode === 'rgba' ? 'rgb' : mode;
    
    const has_alpha = this.a < 1.0;
    
    
    if (mode === 'rgb') {
      const rgb = this.get_rgba();
      if (this.a >= 1.0) {
        return `rgb(${this.#to_precision(rgb.r)}, ${this.#to_precision(rgb.g)}, ${this.#to_precision(rgb.b)})`;
      }
      return `rgba(${this.#to_precision(rgb.r)}, ${this.#to_precision(rgb.g)}, ${this.#to_precision(rgb.b)}, ${parseFloat(rgb.a.toFixed(2))})`;
    } else if (mode === 'hex') {
      const rgb = this.get_rgba();
      return QColor.rgb_to_hex(Math.round(rgb.r), Math.round(rgb.g), Math.round(rgb.b)) + (this.a < 1.0 ? Math.round(this.a * 255).toString(16).padStart(2, '0').toUpperCase() : '');
    } else {
      const parts = [
        this.#to_precision(this.h),
        this.#to_precision(this.s) + "%",
        this.#to_precision(this.l) + "%",
      ];
      if (has_alpha) {
        const tmp = this.#to_precision(this.a);
        parts.push(this.#legacy ? tmp : "/ " + (tmp * 100) + "%");
      }
      if (!this.#legacy) return `hsl(${parts.join(' ')})`;
      
      return (has_alpha ? 'hsla' : 'hsl') + `(${parts.join(', ')})`;
    }
    
  }
  
  clone() {
    return new QColor(this);
  }
  
  toString() {
    return this.to_string('hsl');
  }
  
  equals(other_color) {
    return this.to_string('hsl') === other_color.to_string('hsl');
  }
  
  /**
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
      
      this.#legacy = inferred_mode === 'legacy';
      
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
  blend_with(other_color, weight = 0.5, mode = 'hsl') {
    if (weight < 0) weight = 0;
    if (weight > 1) weight /= 100;
    if (weight > 100) weight = 100;
    
    if(mode === 'hsl') {
      const c1 = this.hsla;
      const c2 = other_color.hsla;

      const h = (c1.h * (1 - weight) + c2.h * weight) % 360;
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
   * Modifies a color to ensure a minimum contrast ratio against a "background" color.
   * Adjusts lightness first, then reduces saturation if lightness alone is insufficient.
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
        return Math.abs(lightened.l - this.l) <= Math.abs(darkened.l - this.l)
          ? lightened
          : darkened;
      }
      if (light_meets) return lightened;
      if (dark_meets) return darkened;
      return null;
    };
    // Phase 1: lightness-only adjustment at current saturation
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
    // Phase 4: absolute fallback — black or white
    let black = this.clone();
    black.hsla = {h: this.h, s: 0, l: 0, a: 1};
    let white = this.clone();
    white.hsla = {h: this.h, s: 0, l: 100, a: 1};
    return black.contrast_ratio(background_color) > white.contrast_ratio(background_color)
      ? black
      : white;
  }
  
  
  /**
   * Calculates the relative luminance of a color.
   * @returns {number}
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
      v /= 100.00;
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
      r = r * 255;
      g = g * 255;
      b = b * 255;
    }
    
    return {r, g, b};
  }
  
  static rgb_to_hsl(r, g, b, normalized = false) {
    if (!normalized) {
      r = r / 255.0;
      g = g / 255.0;
      b = b / 255.0;
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
      h = h * 360;
      s = s * 100;
      l = l * 100;
    }
    return {h: h, s: s, l: l};
  }
  
}

export class QPickerEvent extends Event {
  /** @type {QColor} */
  color = null;
  
  constructor(type, color) {
    super(type);
    this.color = color;
  }
}

export class QSlider extends EventTarget {
  group_container = null;
  
  get show_output() {
    return this._show_output;
  }
  
  set show_output(value) {
    this._show_output = !!value;
    if (this.output_value) {
      if (this._show_output) {
        this.output_value.style.visibility = '';
        this.output_value.style.position = '';
        this.container.style.grid_template_columns = 'auto 1fr 2em';
      } else {
        this.container.style.grid_template_columns = 'auto 1fr';
      }
      
      this.output_value.style.visibility = this._show_output ? '' : 'collapse';
      this.output_value.style.position = this._show_output ? '' : 'absolute';
    }
  }
  
  constructor({
    min = 0, max = 100, step = 1, min_step = 1, value = 50, precision = null,
    label = "", show_output = true, classes = [], group_container = null
  }) {
    super();
    Object.assign(this, {min, max, step, min_step, _label: label, _show_output: show_output, _classes: classes});
    this._precision = precision ?? (String(step).split('.')[1] || '').length;
    this.min_step = 1 / Math.pow(10, this._precision);
    this._value = this._clamp(value);
    this._dragging = false;
    if (group_container) {
      this.group_container = group_container;
      this.container = group_container;
    }
    this._create_elements();
    this._bind_events();
    this._update_ui();
    
  }
  
  
  _create_elements() {
    if (!this.container) this.container = document.createElement('div');
    this.container.classList.add('qp-slider');
    
    this.lbl = document.createElement('div');
    this.lbl.classList.add('qp-slider-label');
    this.lbl.textContent = this._label;
    this.container.append(this.lbl);
    
    this.tracker = document.createElement('span');
    this.tracker.tabIndex = 0;
    this.tracker.classList.add('qp-slider-track', ...this._classes);
    
    this.thumb = document.createElement('div');
    this.thumb.classList.add('qp-slider-thumb');
    this.tracker.append(this.thumb);
    
    this.output_value = document.createElement('span');
    this.output_value.classList.add('qp-slider-output');
    
    this.container.append(this.tracker);
    this.container.append(this.output_value);
  }
  
  _bind_events() {
    this.tracker.addEventListener('keydown', (e) => {
      const key_map = {
        'ArrowLeft':  -1,
        'ArrowDown':  -1,
        'ArrowRight': 1,
        'ArrowUp':    1
      };
      if (key_map[e.key] === undefined) return;
      e.preventDefault();
      this._update_value(this._value + key_map[e.key] * (e.shiftKey ? this.min_step : this.step));
    });
    
    this.tracker.addEventListener('wheel', (e) => {
      e.preventDefault();
      this._update_value(this._value - Math.sign(e.deltaY) * (e.shiftKey ? this.min_step : this.step));
    }, {passive: false});
    
    this.tracker.addEventListener('mousedown', this._handle_tracker_mousedown.bind(this));
    this.tracker.addEventListener('contextmenu', e => e.preventDefault());
    
    this.thumb.addEventListener('mousedown', this._handle_thumb_mousedown.bind(this));
  }
  
  _handle_tracker_mousedown(e) {
    e.preventDefault();
    this._start_drag();
    this._handle_document_mousemove(e);
    this.thumb.classList.remove('no-transition');
  }
  
  _handle_thumb_mousedown(e) {
    e.preventDefault();
    e.stopPropagation();
    this._start_drag();
  }
  
  _start_drag() {
    this._dragging = true;
    this.thumb.classList.add('dragging');
    this.tracker.focus();
    
    this._handle_document_mousemove = this._handle_document_mousemove.bind(this);
    this._handle_document_mouseup = this._handle_document_mouseup.bind(this);
    document.addEventListener('mousemove', this._handle_document_mousemove);
    document.addEventListener('mouseup', this._handle_document_mouseup);
  }
  
  _handle_document_mouseup() {
    this._dragging = false;
    this.thumb.classList.remove('dragging', 'no-transition');
    document.removeEventListener('mousemove', this._handle_document_mousemove);
    document.removeEventListener('mouseup', this._handle_document_mouseup);
  }
  
  _handle_document_mousemove(e) {
    if (!this._dragging) return;
    this.thumb.classList.add('no-transition');
    const rect = this.tracker.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const raw_value = this.min + percent * (this.max - this.min);
    this._update_value(raw_value);
  }
  
  _update_value(new_value, dispatch_event = true) {
    const stepped = Math.round(new_value / this.min_step) * this.min_step;
    const clamped = this._clamp(stepped);
    
    if (this._value.toFixed(this.precision) === clamped.toFixed(this.precision)) return;
    
    this._value = clamped;
    this._update_ui();
    if (dispatch_event) this.dispatchEvent(new Event('input'));
  }
  
  _clamp(value) {
    return Math.max(this.min, Math.min(this.max, value));
  }
  
  _update_ui() {
    const percent = (this._value - this.min) / (this.max - this.min) * 100;
    // this.out.innerText = `${parseFloat(this._value.toFixed(this.precision))}`;
    this.output_value.innerHTML = this._value.toFixed(this.precision).split('.')
      .map((part, index) => {
        if (index === 0) return `${part}`;
        return `<small>.${part}</small>`;
      }).join('');
    this.thumb.style.left = `${percent}%`;
  }
  
  append_to(el) {
    el.append(this.container);
    return this;
  };
  
  get precision() {
    return this._precision;
  }
  
  set precision(new_precision) {
    this._precision = new_precision;
    this.min_step = 1 / Math.pow(10, this._precision);
    
    this._update_ui();
  }
  
  get value() {
    return this._value;
  }
  
  set value(new_value) {
    this._update_value(new_value, false);
  }
  
  /** @param {boolean} show */
  set display(show) {
    if (!this.group_container) {
      this.container.style.display = show ? '' : 'none';
      return;
    }
    [this.lbl, this.tracker, this.output_value].map(el => {
      el.style.display = show ? '' : 'none';
    });
  }
  
}



/**
 * @typedef {Object} QPickerOptions
 * @property {string} [label] - Label for the color picker
 * @property {boolean} [alpha] - Whether to include alpha channel
 * @property {'hsl'|'hex'|'rgb'} [output_mode] - Format for output value
 * @property {boolean} [show_output] - Whether to show the output value
 * @property {boolean} [show_output_mode_selector] - Whether to show the output mode selector
 * @property {boolean} [show_slider_value] - Whether to show the current value on sliders
 * @property {boolean} [legacy_output] - Whether to use legacy output format (with commas)
 * @property {boolean} [disabled] - Whether the picker is disabled
 * @property {number} [precision] - Decimal places for output values
 */
export class QPicker extends EventTarget {
  #previous_color;
  #color;
  #dragging = false;
  
  /** @type {QPickerOptions} */
  #options = {
    label:                     "",
    alpha:                     false,
    output_mode:               'hsl',
    show_output:               true,
    show_output_mode_selector: true,
    show_slider_value:         true,
    legacy_output:             true,
    disabled:                  false,
    precision:                 2,
  };
  
  // ---- Options ----
  
  get label() {
    return this.#options.label;
  }
  
  set label(value) {
    this.#options.label = value;
    this._label.textContent = value;
  }
  
  get show_output() {
    return this.#options.show_output;
  }
  
  set show_output(value) {
    this.#options.show_output = value;
    this.out_container.style.display = value ? '' : 'none';
  }
  
  get show_output_mode_selector() {
    return this.#options.show_output_mode_selector;
  }
  
  set show_output_mode_selector(value) {
    this.#options.show_output_mode_selector = value;
    this.out_mode_selector.style.display = value ? '' : 'none';
  }
  
  get show_slider_value() {
    return this.#options.show_slider_value;
  }
  
  set show_slider_value(value) {
    this.#options.show_slider_value = !!value;
    this.hue_slider.show_output = this.#options.show_slider_value;
    this.saturation_slider.show_output = this.#options.show_slider_value;
    this.lightness_slider.show_output = this.#options.show_slider_value;
    this.alpha_slider.show_output = this.#options.show_slider_value;
  }
  
  /** @returns {'hsla'|'rgba'|'hex'} */
  get output_mode() {
    return this.out_modes.find(r => r.checked).value;
  }
  
  set output_mode(mode) {
    for (let r of this.out_modes) {
      r.checked = (r.value === mode);
    }
    this.#update_ui(false, false);
  }
  
  get precision() {
    return this.#options.precision;
  }
  
  set precision(value) {
    value = Math.max(0, parseInt(value));
    this.#options.precision = value;
    
    this.#previous_color.precision = value;
    this.#color.precision = value;
    
    this.hue_slider.precision = value;
    this.saturation_slider.precision = value;
    this.lightness_slider.precision = value;
    this.#update_ui(false);
  }
  
  get legacy_output() {
    return this.#options.legacy_output;
  }
  
  set legacy_output(value) {
    this.#options.legacy_output = value;
    this.#color.legacy = value;
    this.#previous_color.legacy = value;
    this.#update_ui(true, true);
  }
  
  get alpha_enabled() {
    return this.#options.alpha;
  }
  
  set alpha_enabled(value) {
    this.#options.alpha = value;
    this.#update_ui(false);
  }
  
  
  set disabled(value) {
    this.#options.disabled = value;
    if (value) {
      this.container.classList.add('qp-disabled');
    } else {
      this.container.classList.remove('qp-disabled');
    }
  }
  
  get disabled() {
    return this.#options.disabled;
  }
  
  
  /**
   * Color picker component with HSL color manipulation and multiple output formats.
   * @param {QPickerOptions} options
   */
  constructor(options = {alpha: true, disabled: false}) {
    super();
    this.#options = {...this.#options, ...options};
    
    this.#previous_color = new QColor();
    this.#color = new QColor();
    
    this.#color.legacy = this.#previous_color.legacy = this.#options.legacy_output;
    this.#color.precision = this.#previous_color.precision = this.#options.precision;
    
    
    this.#create_elements();
    this.#bind_events();
    
    
    
    // Set initial options
    this.output_mode = this.#options.output_mode;
    this.show_output = this.#options.show_output;
    this.show_output_mode_selector = this.#options.show_output_mode_selector;
    this.precision = this.#options.precision;
    this.show_slider_value = this.#options.show_slider_value;
    
    this.set_initial_color((new QColor()).randomize());
    
    this.#update_ui();
  }
  
  #create_elements() {
    this.container = document.createElement('div');
    this.container.classList.add('qpicker');
    
    
    this.color_area = document.createElement('div');
    this.color_area.tabIndex = 0;
    this.color_area.classList.add('qp-area');
    
    this.thumb = document.createElement('div');
    this.thumb.classList.add('qp-thumb');
    this.color_area.append(this.thumb);
    
    
    let slider_group = document.createElement('div');
    
    this.hue_slider = new QSlider({
      label:           "H", min: 0, max: 360,
      step:            1,
      value:           this.#color.h,
      classes:         ['qp-hue'],
      group_container: slider_group
    });
    
    
    this.saturation_slider = new QSlider({
      label:           "S", min: 0, max: 100,
      step:            1,
      value:           this.#color.s,
      classes:         ['qp-saturation'],
      group_container: slider_group
    });
    
    
    this.lightness_slider = new QSlider({
      label:           "L", min: 0, max: 100,
      step:            1,
      value:           this.#color.l,
      classes:         ['qp-lightness'],
      group_container: slider_group
    });
    
    
    this.alpha_slider = new QSlider({
      label:           "A", min: 0, max: 1,
      step:            0.01,
      precision:       2, // Fixed to 2 decimal places for alpha, to avoid any issues.
      value:           this.#color.a,
      classes:         ['qp-alpha'],
      group_container: slider_group
    });
    
    
    
    this.preview = document.createElement('div');
    this.preview.classList.add('qp-preview');
    this.preview_before = document.createElement('div');
    this.preview_before.classList.add('qp-preview-before');
    this.preview_after = document.createElement('div');
    this.preview_after.classList.add('qp-preview-after');
    this.preview.append(this.preview_before, this.preview_after);
    
    
    this._label = document.createElement('div');
    this._label.classList.add('qp-label');
    this._label.textContent = this.#options.label;
    this.container.append(this._label);
    
    
    this.out_container = document.createElement('div');
    this.out_container.classList.add('qp-output');
    
    this.out_mode_selector = document.createElement('div');
    this.out_mode_selector.classList.add('qp-output-mode-selector');
    
    this.out_mode_hsla = document.createElement('input');
    this.out_mode_hsla.type = 'radio';
    this.out_mode_hsla.value = 'hsl';
    this.out_mode_hsla.checked = true;
    this.out_mode_hsla_label = document.createElement('label');
    this.out_mode_hsla_label.innerText = 'HSL';
    this.out_mode_hsla_label.prepend(this.out_mode_hsla);
    
    this.out_mode_hex = document.createElement('input');
    this.out_mode_hex.type = 'radio';
    this.out_mode_hex.value = 'hex';
    this.out_mode_hex_label = document.createElement('label');
    this.out_mode_hex_label.innerText = 'HEX';
    this.out_mode_hex_label.prepend(this.out_mode_hex);
    
    this.out_mode_rgba = document.createElement('input');
    this.out_mode_rgba.type = 'radio';
    this.out_mode_rgba.value = 'rgb';
    this.out_mode_rgba_label = document.createElement('label');
    this.out_mode_rgba_label.innerText = 'RGB';
    this.out_mode_rgba_label.prepend(this.out_mode_rgba);
    
    this.out_modes = [this.out_mode_hsla, this.out_mode_hex, this.out_mode_rgba];
    this.out_mode_selector.append(this.out_mode_hsla_label, this.out_mode_hex_label, this.out_mode_rgba_label);
    this.out_container.append(this.out_mode_selector);
    
    this.output_value = document.createElement('div');
    this.output_value.contentEditable = true;
    this.output_value.spellcheck = false;
    this.output_value.classList.add('qp-output-value');
    this.out_container.append(this.output_value);
    
    this.container.append(this.color_area);
    // this.container.append(this.hue_slider.container);
    // this.container.append(this.saturation_slider.container);
    // this.container.append(this.lightness_slider.container);
    // this.container.append(this.alpha_slider.container);
    this.container.append(slider_group);
    this.container.append(this.preview);
    this.container.append(this.out_container);
    
  }
  
  #bind_events() {
    this.color_area.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
    });
    
    
    this.hue_slider.addEventListener('input', (e) => {
      this.#color.h = e.target.value;
      this.#update_ui();
    });
    
    this.saturation_slider.addEventListener('input', (e) => {
      this.#color.s = e.target.value;
      this.#update_ui();
    });
    
    this.lightness_slider.addEventListener('input', (e) => {
      this.#color.l = e.target.value;
      this.#update_ui();
    });
    
    this.alpha_slider.addEventListener('input', (e) => {
      this.#color.a = e.target.value;
      this.#update_ui();
    });
    
    this.color_area.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this._start_drag();
      this._handle_document_mousemove(e);
      this.thumb.classList.remove('no-transition');
    });
    
    this.thumb.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this._start_drag();
    });
    
    for (let mode_radio of this.out_modes) {
      mode_radio.addEventListener('change', (e) => {
        this.out_modes.filter(r => r !== e.target).forEach(r => r.checked = false);
        // e.target.checked = true;
        this.#update_ui(false);
      });
    }
    
    this.preview_before.addEventListener('click', () => {
      this.restore_previous_color();
    });
    
    
    this.output_value.addEventListener('input', this._handle_output_input.bind(this));
  }
  
  /** @param {InputEvent} e */
  _handle_output_input(e) {
    e.preventDefault();
    e.stopPropagation();
    console.log("Parsing color from input:", e.target.innerText);
    const parsed_mode = this.#color.parse(e.target.innerText);
    console.log("Parsed Mode:", parsed_mode);
    if (parsed_mode) {
      this.output_mode = parsed_mode;
      this.output_value.dataset.invalid = "false";
      this.#update_ui(true, false);
    } else {
      console.warn("Failed to parse color from input:", e.target.innerText);
      this.output_value.dataset.invalid = "true";
    }
  }
  
  
  
  _start_drag() {
    this.#dragging = true;
    this.thumb.classList.add('dragging');
    this.color_area.focus();
    
    this._handle_document_mousemove = this._handle_document_mousemove.bind(this);
    this._handle_document_mouseup = this._handle_document_mouseup.bind(this);
    document.addEventListener('mousemove', this._handle_document_mousemove);
    document.addEventListener('mouseup', this._handle_document_mouseup);
  }
  
  _handle_document_mouseup() {
    this.#dragging = false;
    this.thumb.classList.remove('dragging', 'no-transition');
    document.removeEventListener('mousemove', this._handle_document_mousemove);
    document.removeEventListener('mouseup', this._handle_document_mouseup);
  }
  
  _handle_document_mousemove(e) {
    if (!this.#dragging) return;
    this.thumb.classList.add('no-transition');
    let rect = this.color_area.getBoundingClientRect();
    let x = (e.clientX - rect.left) / rect.width * 100;
    let y = (e.clientY - rect.top) / rect.height * 100;
    
    x = Math.min(100, Math.max(0, x));
    y = 100 - Math.min(100, Math.max(0, y));
    this.#color.set_hsva({s: x, v: y});
    
    
    this.#update_ui();
  }
  
  
  #update_ui(emit_event = true, parse_out = true) {
    if (!this.#options.alpha) {
      // this.alpha_slider.container.style.display = 'none';
      this.alpha_slider.display = false;
      this.#color.a = 1.0;
    } else {
      // this.alpha_slider.container.style.display = '';
      this.alpha_slider.display = true;
    }
    
    this.container.style.setProperty('--qp-alpha', this.#color.a.toString());
    this.container.style.setProperty('--qp-h', this.#color.h);
    this.container.style.setProperty('--qp-sl', this.#color.s + '%');
    this.container.style.setProperty('--qp-l', this.#color.l + '%');
    
    let hsv = this.#color.get_hsva();
    this.thumb.style.left = `${hsv.s}%`;
    this.thumb.style.bottom = `${hsv.v}%`;
    
    
    if (parse_out) {
      let text = this.#color.to_string(this.output_mode);
      this.output_value.dataset.invalid = "false";
      if (this.output_value.innerText !== text) {
        this.output_value.innerText = text;
      }
    }
    
    
    this.thumb.style.background = this.#color.to_string('hsl');
    this.hue_slider.value = this.#color.h;
    this.saturation_slider.value = this.#color.s;
    this.lightness_slider.value = this.#color.l;
    this.alpha_slider.value = this.#color.a;
    
    this.preview.style.setProperty('--qp-hsla-previous', this.#previous_color.to_string('hsl'));
    
    
    if (emit_event) {
      this.dispatchEvent(new QPickerEvent('colorchange', this.#color));
    }
  }
  
  get previous_color() {
    return this.#previous_color;
  }
  
  set previous_color(new_color) {
    if (this.#previous_color.equals(new_color)) return;
    this.#previous_color = new_color;
    this.#previous_color.precision = this.#options.precision;
    this.#previous_color.legacy = this.#options.legacy_output;
    this.#update_ui(false);
  }
  
  get color() {
    return this.#color;
  }
  
  set color(new_color) {
    if (this.#color.equals(new_color)) return;
    this.#color = new_color;
    this.#color.precision = this.#options.precision;
    this.#color.legacy = this.#options.legacy_output;
    this.#update_ui(false);
  }
  
  
  restore_previous_color() {
    if (this.#previous_color.equals(this.#color)) return this;
    
    this.#color = this.#previous_color.clone();
    this.#update_ui();
    return this;
  }
  
  set_initial_color(qcolor) {
    this.#previous_color = qcolor.clone();
    this.#color = qcolor.clone();
    
    this.#update_ui(false);
    return this;
  }
  
  select_current(emit_event = true) {
    this.#previous_color = this.#color.clone();
    this.#update_ui(emit_event);
    return this;
  }
  
  
  
  /**
   * @param el
   * @returns {QPicker}
   */
  append_to(el) {
    el.append(this.container);
    return this;
  };
  
}