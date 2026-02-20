import { QColor } from './QPicker.js';

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
    return new QCollection().unserialize(cur);
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
  
  // [Symbol.iterator]() {
  //   let data = Object.values(this.schemes);
  //   let index = -1;
  //
  //   return {
  //     next: () => ({value: data[++index], done: !(index in data)})
  //   };
  // };
}

export class QScheme {
  
  constructor(name = "", id = "") {
    this.id = (id === "") ? QScheme.unique_id() : id;
    this.name = (name === "") ? 'no_name_scheme' : name;
    
    this.locked = false;
    this.saved = false;
    this.synced = false;
    this.shadow = false;
    
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
    if (obj.shadow) this.shadow = obj.shadow;
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
  
  async apply() {
    // let title = `Photophobia - ${this.name}`;
    // browser.browserAction.setTitle({title: title});
    
    let vertical_tabs = await browser.browserSettings.verticalTabs.get({incognito: true}).then(res => res.value);
    console.log('Vertical Tabs:', vertical_tabs);
    
    
    return QScheme.update_theme(this, this.shadow, vertical_tabs);
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
  
  /**
   * Set Browser Colors
   * @param {QScheme} qcolor
   * @param {Boolean} shadow
   */
  static async update_theme(qcolor, shadow = false, vertical_tabs = false) {
    let {theme_mode, page_mode, panel, text} = qcolor;
    
    
    let hlcolor = panel.shade("h(+20%) s(80) l(50)");
    
    const icon_color = panel.shade(`s(${Math.min(text.s, 45)}) l(${Math.min(text.l, 85)}) `);
    
    
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
        "frame":                    panel.to_string(),
        "frame_inactive":           panel.to_string(),
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
        "toolbar_field":        panel.shade("l(-40%)").to_string(),
        "toolbar_field_border": panel.shade("l(-40%)").to_string(),
        "toolbar_field_text":   text.shade("l(-10%)").to_string(),

        "toolbar_field_focus":        panel.shade("l(-60%) a(-5%)").to_string(),
        "toolbar_field_border_focus": panel.shade("l(-60%) a(-5%)").to_string(),
        "toolbar_field_text_focus":   text.to_string(),

        "toolbar_field_highlight":      text.shade("a(0.15)").toString(),
        "toolbar_field_highlight_text": "pink",



        // -- Popup
        "popup":                panel.shade("l(-10%) a(-5%)").to_string(),
        "popup_border":         panel.shade("l(-50%) a(-5%)").to_string(),
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
    
    
    
    // if (shadow) {
    theme.images = {
      // "additional_backgrounds": ["assets/blank.svg"],
      // "theme_frame": "assets/blank.svg",
      // "theme_frame": "linear-gradient(to bottom, black, red)",
    };
    // }
    
    
    browser.theme.update(theme);
    
    return qcolor;
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

