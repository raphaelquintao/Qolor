import { QColor } from './libs/QColor.js';

export function QRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

export function UUID() {
  return crypto.randomUUID();
}

export function BYTES_TO_STRING(_bytes) {
  const sizes = ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB'];
  if (_bytes === 0) return '0 Byte';
  
  let remain = _bytes;
  while (remain >= 1024 && sizes.length > 1) {
    remain /= 1024;
    sizes.shift();
  }
  
  return `${remain.toFixed(2)} ${sizes[0]}`;
}


export class QCollection {
  _options = {};
  
  /** @type {QScheme[]} */
  _schemes = [];
  
  _selected = "";
  
  get options() {
    return this._options;
  }
  
  set options(options) {
    this._options = options;
  }
  
  get schemes() {
    return this._schemes;
  }
  
  set schemes(schemes) {
    this._schemes = schemes;
  }
  
  get selected() {
    return this._selected;
  }
  
  set selected(selected) {
    this._selected = selected;
  }
  
  
  constructor(options = {}) {
    this._options = options;
    this._selected = "";
    this._schemes = [];
    
    this.onSelect = (scheme, id) => {
      // scheme.apply();
    };
    
  }
  
  
  /**
   * Add new Scheme to collection.
   * @param {QScheme} scheme
   * @param {boolean} selected
   */
  add(scheme, selected = false) {
    let found = this.find(scheme);
    if (found === false) {
      this._schemes.push(scheme);
      if (selected) this._selected = scheme.id;
    }
    
    return this;
  }
  
  /**
   * Remove Scheme from collection.
   * @param {QScheme} scheme
   * @param {boolean} select_previous
   * @return {QCollection}
   */
  remove(scheme, select_previous = true) {
    let found_index = this._schemes.findIndex(c => c.id === scheme.id);
    if (found_index !== -1) {
      const id = scheme.id;
      if (this._selected === id && select_previous) {
        this._selected = this._schemes[Math.max(0, found_index - 1)]?.id || "";
        this.apply_selected();
      }
      this._schemes.splice(found_index, 1);
    }
    return this;
  }
  
  /**
   * Find Scheme in collection by ID.
   * @param {string} id
   * @return {QScheme|boolean}
   */
  find_by_id(id) {
    return this._schemes.find(scheme => scheme.id === id) || false;
  }
  
  /**
   * Find Scheme in collection.
   * @param {QScheme} scheme
   * @return {QScheme|boolean}
   */
  find(scheme) {
    return this.find_by_id(scheme.id);
  }
  
  /**
   * Select Scheme by ID.
   * @param {string} id
   * @param {boolean} emit
   */
  select_by_id(id, emit = true) {
    let scheme = this.find_by_id(id);
    if (scheme !== false) {
      this._selected = id;
      if (emit) this.onSelect(scheme, id);
    }
  }
  
  /**
   * Select Scheme.
   * @param {QScheme} scheme
   * @param {boolean} emit
   */
  select(scheme, emit = true) {
    this.select_by_id(scheme.id, emit);
  }
  
  /**
   * Get selected Scheme.
   * @return {QScheme|boolean}
   */
  get_selected() {
    return this.find_by_id(this._selected) || "";
  }
  
  apply_selected(emit = true) {
    let scheme = this.get_selected();
    scheme.apply();
    if (emit) this.onSelect(scheme, scheme.id);
  }
  
  
  
  /** @return {QCollection} */
  clone() {
    let cur = this.serialize();
    return QCollection.unserialize(cur);
  }
  
  
  equals(qcollection) {
    return (JSON.stringify(this) === JSON.stringify(qcollection));
  }
  
  
  serialize() {
    return JSON.stringify(this);
  }
  
  _unserialize(str) {
    let obj = (typeof str === 'string') ? JSON.parse(str) : str;
    if (obj._selected) this._selected = obj._selected;
    if (obj._options) this._options = obj._options;
    this._schemes = [];
    if (obj._schemes) {
      for (let scheme of obj._schemes) {
        let _scheme = new QScheme();
        _scheme.parse(scheme);
        this.add(_scheme);
      }
    }
    return this;
  }
  
  static unserialize(str) {
    let collection = new QCollection();
    return collection._unserialize(str);
  }
  
}

export class QScheme {
  
  constructor(name = "", id = "") {
    this.id = (id === "") ? QScheme.unique_id() : id;
    this.name = (name === "") ? 'no_name_scheme' : name;
    
    this.locked = false;
    this.saved = false;
    this.synced = false;
    
    /** @type {'normal'|'colorful'|'dual'} */
    this.gen_mode = 'normal';
    this.theme_mode = 'dark';
    this.page_mode = 'dark';
    
    this.panel = new QColor('hsl(220, 9%, 23%)');
    this.text = new QColor('hsl(214, 2%, 90%)');
    
    
    return this;
  }
  
  
  get editable() {
    return (!this.locked && !this.default);
  }
  
  get default() {
    return (this.id === '_default');
  }
  
  
  parse(obj) {
    if (obj.id) this.id = obj.id;
    if (obj.name) this.name = obj.name;
    if (obj.locked) this.locked = obj.locked;
    if (obj.saved) this.saved = obj.saved;
    if (obj.synced) this.synced = obj.synced;
    if (obj.gen_mode) this.gen_mode = obj.gen_mode;
    if (obj.theme_mode) this.theme_mode = obj.theme_mode;
    if (obj.page_mode) this.page_mode = obj.page_mode;
    
    if (obj.panel) {
      this.panel.h = parseFloat(obj.panel.h);
      this.panel.s = parseFloat(obj.panel.s);
      this.panel.l = parseFloat(obj.panel.l);
      this.panel.a = parseFloat(obj.panel.a);
    }
    if (obj.text) {
      this.text.h = parseFloat(obj.text.h);
      this.text.s = parseFloat(obj.text.s);
      this.text.l = parseFloat(obj.text.l);
      this.text.a = parseFloat(obj.text.a);
    }
    
    
    return this;
  }
  
  update_secondary(min_contrast = 5.0) {
    if (data.loaded.options.min_contrast) min_contrast = data.loaded.options.min_contrast;
    if (this.gen_mode === 'normal') {
      this.text = this.panel.shade('s(+20%) l(50%)').min_contrast_color(this.panel, min_contrast);
    } else if (this.gen_mode === 'colorful') {
      this.text = this.panel.shade("h(+60) s(+80%) l(50%)").min_contrast_color(this.panel, min_contrast);
    } else if (this.gen_mode === 'dual') {
      this.text = this.text.min_contrast_color(this.panel, min_contrast);
    }
    if (this.panel.contrast_ratio(this.text) < min_contrast) {
      this.panel = this.panel.min_contrast_color(this.text, min_contrast);
    }
    return this;
  }
  
  randomize() {
    const min_contrast = data.loaded.options.min_contrast || 5.0;
    this.panel = this.panel.randomize();
    this.panel.l = Math.max(Math.min(this.panel.l, 25), 10);
    if (this.gen_mode === 'dual') {
      let tones = 5;
      let h = 360 / tones * QRandomInt(1, tones);
      let s = QRandomInt(30, 100);
      this.text = this.panel.clone();
      this.text = this.text.shade(`h(+${h}) s(${s}%) l(50%)`).min_contrast_color(this.panel, min_contrast);
    } else {
      this.update_secondary();
    }
    return this;
  }
  
  apply() {
    console.info('Apply Theme Scheme', data);
    // let svg = fetch(browser.runtime.getURL('assets/icon.svg')).then(async resp => {
    //   let garbage = await resp.text().then(text => text);
    //   let parser = new DOMParser();
    //   let doc = parser.parseFromString(garbage, 'image/svg+xml');
    //   let lixo = doc.querySelector('#lixo');
    //   lixo.children.item(0).setAttribute('stop-color', this.text.to_string());
    //   lixo.children.item(1).setAttribute('stop-color', this.panel.to_string());
    //
    //   const serializer = new XMLSerializer();
    //   const svg_string = serializer.serializeToString(doc);
    //   const svg_blob = new Blob([svg_string], {type: 'image/svg+xml'});
    //   const svg_url = URL.createObjectURL(svg_blob);
    //
    //   browser.browserAction.setIcon({
    //     path: svg_url,
    //   });
    //   browser.sidebarAction.setIcon({
    //     path: svg_url,
    //   })
    //
    //   console.info('SVG Loaded', svg_url);
    // });
    
    function updateDynamicIcon(color1, color2) {
      // Use 32x32 for high-density (Retina) support
      const canvas = new OffscreenCanvas(32, 32);
      const ctx = canvas.getContext('2d');
      
      // Draw Background (Color 1)
      ctx.fillStyle = color2;
      ctx.beginPath();
      ctx.roundRect(0, 0, 32, 32, 8); // Modern rounded corners
      ctx.fill();
      
      // Draw Accent Triangle (Color 2)
      ctx.fillStyle = color1;
      ctx.beginPath();
      ctx.moveTo(32, 0);
      ctx.lineTo(32, 32);
      ctx.lineTo(0, 32);
      ctx.closePath();
      ctx.fill();
      
      browser.browserAction.setIcon({
        imageData: ctx.getImageData(0, 0, 32, 32)
      });
      
      browser.sidebarAction.setIcon({
        imageData: ctx.getImageData(0, 0, 32, 32)
      });
    }
    
    updateDynamicIcon(this.panel.to_string(), this.text.to_string());
    
    QScheme.update_theme(this);
  }
  
  /** @return {QScheme} */
  clone() {
    let cur = JSON.parse(JSON.stringify(this));
    cur.id = QScheme.unique_id();
    return new QScheme().parse(cur);
  }
  
  
  equals(qcolor) {
    return (JSON.stringify(this) === JSON.stringify(qcolor));
  }
  
  static gen_gradient(colors = ['red', 'blue'], width = 1980, height = 100) {
    const canvas = document.createElement('canvas');
    canvas.classList.add('wheel');
    canvas.width = width;
    canvas.height = height;
    
    // const canvas = new OffscreenCanvas(width, height);
    
    const ctx = canvas.getContext('2d', {});
    ctx.imageSmoothingEnabled = true;
    
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    
    const stops = colors.length;
    const step = 1.0 / (stops - 1);
    for (let i = 0; i < stops; i++) {
      if (i === stops - 1) {
        gradient.addColorStop(1, colors[i]);
      } else {
        gradient.addColorStop(i * step, colors[i]);
      }
    }
    
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    return canvas.toDataURL('image/png');
  }
  
  /**
   * Set Browser Colors
   * @param {QScheme} scheme
   * @return {QScheme}
   */
  static update_theme(scheme) {
    console.info('Update Theme', scheme);
    let {theme_mode, page_mode, panel, text} = scheme;
    
    const black = new QColor('hsl(0, 0%, 0%)');
    const white = new QColor('hsl(0, 0%, 100%)');
    
    let hlcolor = panel.shade("h(+20%) s(80) l(50)");
    
    let icon_color = panel.shade(`s(${Math.min(text.s, 45)}) l(${Math.min(text.l, 85)}) `);
    
    if (theme_mode === 'dark') {
      panel = panel.min_contrast_color(white, 3);
      icon_color = icon_color.min_contrast_color(panel, 3);
    }
    
    /** @type {_manifest.ThemeType} */
    let theme = {};
    // let theme = await browser.theme.getCurrent();
    
    // console.info('Current Theme', theme);
    
    theme = {
      properties: {
        "color_scheme":         theme_mode, // Chrome and built-in pages
        "content_color_scheme": page_mode, // Built-in pages, overides color_scheme
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
        "button_background_hover":  text.shade('a(0.15)').to_string(),
        "button_background_active": text.shade('a(0.3)').to_string(),
        "icons":                    icon_color.to_string(),
        "icons_attention":          icon_color.shade("l(+10%)").to_string(),
        
        
        // -- Tabs
        "tab_background_text":      text.to_string(),
        "tab_text":                 text.to_string(),
        "tab_background_separator": `yellow`,
        "tab_line":                 panel.shade('l(-55%)').to_string(),
        "tab_selected":             text.shade('a(0.3)').to_string(),
        "tab_loading":              hlcolor.toString(),
        
        
        // -- Toolbar
        "toolbar":                    panel.shade("a(0.0)").to_string(),
        "toolbar_text":               text.to_string(),
        "toolbar_vertical_separator": text.shade('a(0.15)').to_string(),
        "toolbar_top_separator":      panel.shade("a(0)").to_string(),
        "toolbar_bottom_separator":   panel.shade("l(+8%)").to_string(),
        // "bookmark_text":              "pink", // Alias for toolbar_text
        
        
        // -- URL Bar
        "toolbar_field":        panel.shade("l(-50%) a(-10%)").to_string(),
        "toolbar_field_border": panel.shade("l(+35%) a(-10%)").to_string(),
        "toolbar_field_text":   text.shade("l(-10%)").to_string(),
        
        "toolbar_field_focus":        panel.shade("l(-60%) a(-5%)").to_string(),
        "toolbar_field_border_focus": panel.shade("l(-60%) a(-5%)").to_string(),
        "toolbar_field_text_focus":   text.to_string(),
        
        "toolbar_field_highlight":      text.shade("a(0.15)").toString(),
        "toolbar_field_highlight_text": "pink",
        
        
        
        // -- Popup
        "popup":                panel.shade("l(-10%) a(-5%)").to_string(),
        "popup_border":         panel.shade("l(+30%) a(-5%)").to_string(),
        "popup_text":           text.to_string(),
        "popup_highlight":      panel.shade("l(-80%)").toString(),
        "popup_highlight_text": text.toString(),
        
        
        // -- Sidebar
        "sidebar":                panel.shade('l(-20%) s(-2%)').to_string(),
        "sidebar_border":         panel.shade('l(-50%)').to_string(),
        "sidebar_text":           text.to_string(),
        "sidebar_highlight":      panel.shade('l(-50%)').to_string(),
        "sidebar_highlight_text": text.toString(),
        
        
        
        // -- New Tab
        "ntp_background":      panel.shade("l(-45%)").to_string(),
        "ntp_card_background": panel.shade("l(-10%)").to_string(),
        "ntp_text":            text.to_string(),
      }
    };
    
    const colors = theme.colors;
    
    
    if (theme_mode === 'light') {
      colors.toolbar_field = panel.shade("l(-10%)").to_string();
      colors.toolbar_field_border = theme.colors.toolbar_field;
      // theme.colors.toolbar_field_text = text.shade(`l(${100 - text.l})`).shade("l(+10%)").to_string();
      theme.colors.toolbar_field_focus = panel.shade("l(+5%) s(-5%) a(-5%)").to_string();
      theme.colors.toolbar_field_border_focus = theme.colors.toolbar_field_focus;
      theme.colors.toolbar_field_text_focus = theme.colors.toolbar_field_text;
      // theme.colors.toolbar_field_highlight = panel.shade("l(-80%) a(0.15)").toString();
    }
    
    
    
    theme.images = {
      // "additional_backgrounds": ["assets/blank.svg"],
      // "theme_frame": "assets/blank.svg",
      // "theme_frame": QScheme.gen_color_wheel(),
      // "theme_frame": "linear-gradient(to bottom, black, red)",
    };
    theme.images.additional_backgrounds = [
      // QScheme.gen_color_wheel(panel.shade("l(+20%)").to_string()),
      QScheme.gen_gradient([
        'red', 'orange', 'pink'
      ], 250, 35),
      QScheme.gen_gradient([
        'blue', 'green', 'purple', 'green', "blue"
      ], 45, 45),
    ];
    theme.properties.additional_backgrounds_alignment = ['right center', 'left center'];
    theme.properties.additional_backgrounds_tiling = ['no-repeat'];
    
    
    
    
    
    // let icon_path = QScheme.gen_gradient([
    //   text.shade("l(+20%)").to_string(),
    //   text.to_string(),
    //   text.shade("l(-20%)").to_string(),
    // ], 45, 45);
    //
    // browser.sidebarAction.setIcon({
    //   path: icon_path,
    // });
    //
    // browser.browserAction.setIcon({
    //   path: icon_path
    // });
    
    
    browser.theme.update(theme);
    
    return scheme;
  }
  
  
  static unique_id() {
    return crypto.randomUUID();
  }
  
}

export class QStorage {
  
  static saveLocal(data) {
    let p = browser.storage.local.set(data);
  }
  
  static getLocal(data) {
    let p = browser.storage.local.get(data);
    return p;
  }
  
  static clearLocal() {
    let p = browser.storage.local.clear();
    return p;
  }
  
  static saveSync(data) {
    let p = browser.storage.sync.set(data);
  }
  
  static getSync(data) {
    let p = browser.storage.sync.get(data);
    return p;
  }
  
  static clearSync() {
    let p = browser.storage.sync.clear();
    return p;
  }
  
  static inUseLocal() {
    
    let p = browser.storage.local.toString();
    console.info('Storage', p);
    // p.then(value => {
    //     console.info('Storage', value);
    // });
    
    // let resp = browser.storage.sync.get('colors');
    
    // resp.then(value => {
    //     console.log(value);
    //
    // });
    
    
    // browser.storage.local.getBytesInUse(function (bytes) {
    //     var total_kb = 5242880 / 1024;
    //     var kb = bytes / 1024;
    //     var percent = (bytes * 100) / 5242880;
    //     console.log(kb + " kb of " + total_kb + " kb - " + percent + " %");
    // });
  }
}

