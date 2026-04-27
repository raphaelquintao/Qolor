import { QColor } from './q_color.js';
import { QRandomInt } from './q_utils.js';

export class QScheme {
  id = "";
  order = 0;
  created = 0;
  /** @type {QColor[]} */
  cached = [];
  cached_theme = null;
  hash_colors = null;
  hash_theme = null;
  tmp = {}
  
  
  get editable() {
    return (!this.locked && !this.default);
  }
  
  get default() {
    return (this.id === '_default');
  }
  
  get virtual_created() {
    return this.default ? 0 : this.created || 0;
  }
  
  get usage() {
    return this?.tmp?.usage || 0;
  }
  
  set usage(usage) {
    if(!this.tmp) this.tmp = {};
    this.tmp.usage = usage;
  }
  
  /**
   * @param id
   * @param {{order?: number, created?: number, gen_mode?: 'normal'|'colorful'|'dual', panel?:string, text?:string}} options
   */
  constructor(id = "", options = {}) {
    this.id = (id === "") ? QScheme.unique_id() : id;
    
    this.order = options?.order !== undefined ? options.order : 0;
    this.created = options?.created !== undefined ? options.created : Date.now();
    
    this.locked = false;
    
    /** @type {'normal'|'colorful'|'dual'} */
    this.gen_mode = options?.gen_mode || 'normal';
    this.theme_mode = 'dark';
    this.page_mode = 'dark';
    
    /** @type {QColor} */
    this.panel = new QColor(options?.panel || 'hsl(220, 9%, 23%)');
    /** @type {QColor} */
    this.text = new QColor(options?.text || 'hsl(214, 2%, 90%)');
    
  }
  
  
  hash() {
    let tmp = `${this.id}|${this.created}|${this.locked}|`;
    tmp += `${this.gen_mode}|${this.theme_mode}|${this.page_mode}|`;
    tmp += `${this.panel.to_string('hsl')}|${this.text.to_string('hsl')}`;
    
    return tmp;
  }
  
  serialize() {
    return JSON.stringify(this, (key, value) => {
      if (['cached', 'cached_theme', 'hash_colors', 'hash_theme', 'tmp'].includes(key)) return undefined;
      return value;
    });
  }
  
  parse(obj) {
    if (typeof obj === 'string') obj = JSON.parse(obj);
    if (obj.id) this.id = obj.id;
    if (obj.cached) this.cached = obj.cached.map(c => {
      if (typeof c === 'string') c = JSON.parse(c);
      return new QColor(c);
    });
    if (obj.cached_theme) this.cached_theme = obj.cached_theme;
    if (obj.hash_colors) this.hash_colors = obj.hash_colors;
    if (obj.hash_theme) this.hash_theme = obj.hash_theme;
    if (obj.order !== undefined) this.order = obj.order;
    if (obj.created !== undefined) this.created = obj.created;
    if (obj.locked !== undefined) this.locked = obj.locked;
    if (obj.gen_mode) this.gen_mode = obj.gen_mode;
    if (obj.theme_mode) this.theme_mode = obj.theme_mode;
    if (obj.page_mode) this.page_mode = obj.page_mode;
    
    if (obj.panel) this.panel = new QColor(obj.panel);
    if (obj.text) this.text = new QColor(obj.text);
    
    return this;
  }
  
  static unserialize(obj) {
    let scheme = new QScheme();
    scheme.parse(obj);
    // scheme.compute_colors();
    return scheme;
  }
  
  compute_colors(min_contrast = 5) {
    const hash = this.hash();
    // console.info('Computing colors for', this.id, 'with hash', hash);
    
    if (this.hash_colors === hash && this.cached.length >= 6) {
      // console.log('Using cached colors for', this.name);
      return this;
    }
    this.hash_colors = hash;
    
    this.cached = [
      this.panel.clone(),
      this.text.clone(),
    ];
    
    const black = new QColor('hsl(0, 0%, 0%)');
    const white = new QColor('hsl(0, 0%, 100%)');
    
    if (this.theme_mode === 'dark') {
      this.cached[0] = this.cached[0].min_contrast_oklch(white, min_contrast);
    } else if (this.theme_mode === 'light') {
      this.cached[0] = this.cached[0].min_contrast_oklch(black, min_contrast);
    } else {
      this.cached[0].l = Math.max(this.cached[0].l, 10);
    }
    
    if (this.gen_mode === 'normal') {
      this.cached[1] = this.panel.shade_oklch('c(+20%)').min_contrast_oklch(this.cached[0], min_contrast);
      this.cached[4] = this.panel.shade_oklch(`c(+10%) l(50%)`).min_contrast_color(this.cached[0], min_contrast);
      this.cached[5] = this.cached[4].shade_oklch(`l(+10%)`).min_contrast_color(this.cached[0], min_contrast);
    } else if (this.gen_mode === 'colorful') {
      this.cached[1] = this.panel.shade_oklch("h(-90) c(90%) l(50%)").min_contrast_oklch(this.cached[0], min_contrast);
      this.cached[4] = this.panel.shade_oklch(`h(-180) c(90%) l(50%)`).min_contrast_oklch(this.cached[0], min_contrast);
      this.cached[5] = this.panel.shade_oklch(`h(-270) c(90%) l(50%)`).min_contrast_oklch(this.cached[0], min_contrast);
    } else if (this.gen_mode === 'dual') {
      this.cached[1] = this.text.min_contrast_oklch(this.cached[0], min_contrast);
      this.cached[4] = this.cached[1].shade_oklch(`c(+10%) l(50%)`).min_contrast_color(this.cached[0], 4.5);
      this.cached[5] = this.cached[0].blend(this.cached[4], 0.5, 'oklch').min_contrast_color(this.cached[0], 4.5);
    }
    
    this.cached[2] = this.cached[0].shade_oklch("l(-45%)");
    this.cached[3] = this.cached[1].shade_oklch("l(-5%)").min_contrast_oklch(this.cached[2], min_contrast);
    
    
    
    if (this.text.contrast_ratio(this.cached[1]) < min_contrast) {
    
    } else { // White mode
      // if (this.theme_mode === 'dark') {
      //   this.cached[0] = this.cached[0].min_contrast_oklch(this.text, min_contrast);
      // }
      // this.cached[2] = this.cached[0].shade_oklch("l(+15%)");
    }
    
    
    return this;
  }
  
  randomize() {
    const min_contrast = 5.0;
    this.panel = this.panel.clone().randomize();
    this.panel.l = Math.max(this.panel.l, 25);
    if (this.gen_mode === 'dual') {
      let tones = 5;
      let h = 360 / tones * QRandomInt(1, tones);
      let s = QRandomInt(1, 4) / 100;
      this.text = this.panel.clone();
      this.text = this.text.shade_oklch(`h(+${h}) `).min_contrast_oklch(this.panel, min_contrast);
    }
    // this.compute_colors();
    return this;
  }
  
  apply() {
    QScheme.update_theme(this);
  }
  
  /** @return {QScheme} */
  clone(full = false) {
    if (full) {
      return new QScheme().parse(this.serialize());
    }
    let cur = JSON.parse(JSON.stringify(this));
    cur.id = QScheme.unique_id();
    cur.created = Date.now();
    cur.tmp = {};
    return new QScheme().parse(cur);
  }
  
  
  equals(other) {
    return (other instanceof QScheme && this.hash() === other.hash());
  }
  
  static gen_gradient(colors = ['red', 'blue'], width = 1980, height = 100, angle = 45) {
    const canvas = document.createElement('canvas');
    canvas.classList.add('wheel');
    canvas.width = width;
    canvas.height = height;
    
    // const canvas = new OffscreenCanvas(width, height);
    
    const ctx = canvas.getContext('2d', {});
    ctx.imageSmoothingEnabled = true;
    
    const rad = angle * Math.PI / 180;
    const x2 = width * Math.cos(rad);
    const y2 = height * Math.sin(rad);
    
    const gradient = ctx.createLinearGradient(0, height, width, 0); // Diagonal gradient
    // const gradient = ctx.createLinearGradient(0, 0, x2, y2);
    
    const stops = colors.length;
    const step = 1.0 / (stops - 1);
    for (let i = 0; i < stops; i++) {
      if (i === stops - 1) {
        // gradient.addColorStop(1, `oklch(from ${colors[i]} l c h)`);
        gradient.addColorStop(1, colors[i]);
      } else {
        // gradient.addColorStop(i * step, `oklch(from ${colors[i]} l c h)`);
        gradient.addColorStop(i * step, colors[i]);
      }
    }
    
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    return canvas.toDataURL('image/png');
  }
  
  /**
   * @param {QColor} p
   * @param {QColor} s
   * @param {QColor} t
   * @param gen_mode
   * @returns {Promise<void>}
   */
  static async set_icon(p, s, t, gen_mode) {
    if (!QScheme.svg_icon) {
      QScheme.svg_icon = await fetch(browser.runtime.getURL('assets/icons/icon_flat.svg')).then(resp => {
        return resp.text();
      });
    }
    
    const svg_string = QScheme.svg_icon
      .replaceAll(/--p:.+;/ig, `--primary: ${p.to_string()};`)
      .replaceAll(/--s:.+;/ig, `--secondary: ${s.to_string()};`)
      .replaceAll(/--t:.+;/ig, `--tertiary: ${t.to_string()};`)
      .replaceAll(/class="colors"/ig, `class="colors gen-${gen_mode}"`);
    
    const svg_url = `data:image/svg+xml,${encodeURIComponent(svg_string)}`;
    
    
    let promisses = [
      browser.browserAction.setIcon({path: svg_url}),
      browser.sidebarAction.setIcon({path: svg_url})
    ];
    
    await Promise.all(promisses).catch(reason => console.error('Failed to set icon:', reason));
  }
  
  /**
   * Set Browser Colors
   * @param {QScheme} scheme
   * @return {theme}
   */
  static update_theme(scheme) {
    let {theme_mode} = scheme;
    
    scheme.compute_colors();
    
    
    let panel = scheme.cached[0] || scheme.panel;
    let text = scheme.cached[1] || scheme.text;
    let toolbar_field = scheme.cached[2] || scheme.text;
    let toolbar_field_text = scheme.cached[3] || scheme.text;
    let icon_color = scheme.cached[4] || scheme.text;
    let hlcolor = scheme.cached[5] || scheme.text;
    
    QScheme.set_icon(text, icon_color, hlcolor, scheme.gen_mode);
    
    if (scheme.cached_theme && scheme.hash_theme === scheme.hash()) {
      console.log('Theme is up to date for', `${scheme?.id}`);
    } else {
      
      
      /** @type {_manifest.ThemeType} */
      let theme = {};
      
      theme = {
        properties: {
          "color_scheme":         theme_mode, // Chrome and built-in pages
          "content_color_scheme": theme_mode, // Built-in pages, overides color_scheme
          // "additional_backgrounds_alignment": ['left top'],
          // "additional_backgrounds_tiling":    ['repeat'],
          // "focus_outline": "--focus-outline-color"
          // "space_large": "yellow",
        },
        colors:     {
          // -- General
          "frame":          panel.to_string(),
          "frame_inactive": panel.to_string(),
          // "button_background_hover":  text.shade('a(0.15)').to_string(),
          // "button_background_hover":  text.blend(panel, 0.50, 'rgb').to_string(),
          // "button_background_active": text.blend(panel, 0.50, 'hsl').to_string(),
          "button_background_hover":  text.shade_oklch('a(0.15)').to_string(),
          "button_background_active": text.shade_oklch('a(0.25)').to_string(),
          "icons":                    icon_color.to_string(),
          "icons_attention":          hlcolor.to_string(),
          
          
          // -- Tabs
          "tab_background_text":      text.to_string(),
          "tab_text":                 text.to_string(),
          "tab_background_separator": `transparent`,
          // "tab_line":                 panel.min_contrast_oklch(panel, 2.5).to_string(),
          "tab_line":     text.shade_oklch('a(0)').to_string(),
          "tab_selected": text.shade_oklch('a(0.35)').to_string(),
          "tab_loading":  hlcolor.to_string(),
          
          
          
          // -- Toolbar
          "toolbar":                    panel.shade_oklch('a(0)').to_string(),
          "toolbar_text":               text.to_string(),
          "toolbar_vertical_separator": text.shade_oklch('a(0.15)').to_string(),
          "toolbar_field_separator":    text.shade_oklch("a(0.15)").to_string(),
          // "toolbar_top_separator":      panel.shade_oklch("a(0)").to_string(),
          "toolbar_top_separator":    'transparent',
          "toolbar_bottom_separator": panel.shade_oklch("l(+8%)").to_string(),
          // "bookmark_text":              "pink", // Alias for toolbar_text
          
          // -- URL Bar
          // "toolbar_field":        panel.shade_oklch("l(-50%) a(-10%)").to_string(),
          // "toolbar_field_border": panel.shade_oklch("l(+15%) a(-10%)").to_string(),
          // "toolbar_field_text":   text.shade_oklch("l(-10%)").to_string(),
          //
          // "toolbar_field_focus":        panel.shade_oklch("l(-60%) a(-5%)").to_string(),
          // "toolbar_field_border_focus": panel.shade_oklch("l(-60%) a(-5%)").to_string(),
          // "toolbar_field_text_focus":   text.to_string(),
          
          // "toolbar_field_highlight":      text.to_string(),
          // "toolbar_field_highlight_text": text.min_contrast_oklch(text, 7).to_string(),
          
          
          
          // -- Popup
          // "popup":                panel.shade_oklch("l(-10%) a(-4%)").to_string(),
          // "popup_border":         panel.shade_oklch("l(+10%) a(-4%)").to_string(),
          // "popup_text":           text.to_string(),
          // "popup_highlight":      panel.shade_oklch("l(-80%)").to_string(),
          // "popup_highlight_text": text.to_string(),
          
          
          // -- Sidebar
          "sidebar":                panel.shade_oklch('l(-20%)').to_string(),
          "sidebar_border":         panel.shade_oklch('l(-50%)').to_string(),
          "sidebar_text":           text.to_string(),
          "sidebar_highlight":      panel.shade_oklch('l(-50%)').to_string(),
          "sidebar_highlight_text": text.to_string(),
          
          
          
          // -- New Tab
          "ntp_background":      panel.shade_oklch("l(-35%)").to_string(),
          "ntp_card_background": panel.shade_oklch("l(-10%) a(-5%)").to_string(),
          "ntp_text":            text.to_string(),
          
          "accent_color": 'red',
          "accentcolor":  'blue',
        }
      };
      
      const colors = theme.colors;
      
      let tf = toolbar_field.shade_oklch("a(-9%)");
      let tft = toolbar_field_text;
      colors.toolbar_field = tf.to_string();
      colors.toolbar_field_border = panel.shade_oklch('l(+12%)').to_string();
      colors.toolbar_field_text = tft.to_string();
      
      colors.toolbar_field_focus = tf.to_string();
      colors.toolbar_field_border_focus = tf.to_string();
      colors.toolbar_field_text_focus = tft.to_string();
      
      colors.toolbar_field_highlight = tft.shade_oklch("a(-15%)").to_string();
      colors.toolbar_field_highlight_text = tft.min_contrast_oklch(tft, 7).to_string();
      
      let pp = panel.shade_oklch('l(-20%) a(-4%)');
      let pphl = pp.shade_oklch('l(-80%)');
      colors.popup = pp.to_string();
      // colors.popup_text = text.min_contrast_oklch(pp, 5).to_string();
      colors.popup_text = text.to_string();
      colors.popup_border = pp.shade_oklch('l(+25%)').to_string();
      colors.popup_highlight = pphl.to_string();
      colors.popup_highlight_text = pphl.min_contrast_oklch(pphl, 5).to_string();
      colors.focus_outline = panel.shade_oklch('l(+20%) a(0.9)').to_string();
      
      scheme.cached_theme = theme;
      scheme.hash_theme = scheme.hash();
      
    }
    
    
    
    
    let applyed = QScheme.#apply_theme(scheme.cached_theme);
    
    
    return scheme;
  }
  
  static #apply_theme(theme) {
    browser.browserSettings.overrideContentColorScheme
      .set({value: theme.properties.color_scheme})
      .catch(reason => console.error('Failed to set overrideContentColorScheme:', reason));
    
    return new Promise((resolve, reject) => {
      try {
        browser.theme.update(theme);
        resolve(theme);
      } catch (e) {
        reject(e);
      }
    });
  }
  
  
  static unique_id() {
    return crypto.randomUUID();
  }
  
}