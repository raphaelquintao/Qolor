import { QColor } from './q_color.js';
import { QRandomInt } from './q_utils.js';

export class QScheme {
  /** @type {QColor[]} */
  cached = [];
  
  constructor(name = "", id = "") {
    this.id = (id === "") ? QScheme.unique_id() : id;
    this.name = (name === "") ? 'no_name_scheme' : name;
    
    this.locked = false;
    
    /** @type {'normal'|'colorful'|'dual'} */
    this.gen_mode = 'normal';
    this.theme_mode = 'dark';
    this.page_mode = 'dark';
    
    /** @type {QColor} */
    this.panel = new QColor('hsl(220, 9%, 23%)');
    /** @type {QColor} */
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
  
  update_secondary(min_contrast = 5) {
    // if (data.loaded.options.min_contrast) min_contrast = data.loaded.options.min_contrast;
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
      let s = QRandomInt(1, 38) / 100;
      this.text = this.panel.clone();
      this.text = this.text.shade_oklch(`h(+${h}) s(${s}%) l(50%)`).min_contrast_color(this.panel, min_contrast);
    }
    // this.update_secondary();
    return this;
  }
  
  apply() {
    console.info('Apply Theme Scheme', data);
    
    // browser.browserSettings.overrideContentColorScheme
    //   .set({value: this.theme_mode})
    //   .then(value => {
    //     // console.info(`Setting was modified: ${value}`);
    //   });
    
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
   * Set Browser Colors
   * @param {QScheme} scheme
   * @return {QScheme}
   */
  static update_theme(scheme) {
    console.info('Update Theme', scheme);
    
    let {theme_mode, page_mode} = scheme;
    
    if (!scheme.cached || scheme.cached.length < 4) {
      scheme.update_secondary();
    }
    
    let panel = scheme.cached[0] || scheme.panel;
    let text = scheme.cached[1] || scheme.text;
    let toolbar_field = scheme.cached[2] || scheme.text;
    let toolbar_field_text = scheme.cached[3] || scheme.text;
    let icon_color = scheme.cached[4] || scheme.text;
    
    
    
    let hlcolor = scheme.cached[5] || icon_color.shade_oklch("l(+10%)");
    
    // let icon_color = panel.shade(`s(${Math.min(text.s, 45)}) l(${Math.min(text.l, 85)}) `);
    
    // let icon_color = panel.shade_oklch(`c(+20%) l(0%)`).min_contrast_color(panel, 5);
    // let icon_color = panel.shade(`s(+20%) l(0.001)`).min_contrast_color(panel, 5);
    // let icon_color = panel.blend(text, 0.5, 'oklch').shade_oklch('c(0.35) l(0.01)')
    //   .min_contrast_oklch(panel, 5);
    // let icon_color = c3;
    
    
    
    /** @type {_manifest.ThemeType} */
    let theme = {};
    // let theme = await browser.theme.getCurrent();
    
    // console.info('Current Theme', theme);
    
    theme = {
      properties: {
        // "color_scheme":         theme_mode, // Chrome and built-in pages
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
        "ntp_card_background": panel.shade_oklch("l(-10%)").to_string(),
        "ntp_text":            text.to_string(),
        
        "accent_color": 'red',
        "accentcolor":  'blue',
      }
    };
    
    const colors = theme.colors;
    // colors.ntp_text = text.min_contrast_color(panel.shade_oklch("l(-45%)"), 5).to_string();
    // colors.ntp_card_background = 'blue';
    // colors.ntp_text = 'red';
    // let tff = panel.shade_oklch("l(-60%) a(-5%)");
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
    
    
    
    
    // let hl = panel.shade_oklch(`h(${text.get_oklch().h})`);
    // let hl = panel.blend(text, 0.1, 'oklch').shade_oklch(`l${panel.get_oklch().l}`);
    
    // let img = QScheme.gen_gradient([
    //   // panel.to_string(), panel.shade_oklch(`h(${text.get_oklch().h})`).to_string(), panel.to_string()
    //
    //   // panel.shade_oklch('a(0)').to_string(),
    //   hl.to_string(),
    //   panel.to_string(),
    //   hl.to_string(),
    //   panel.to_string(),
    //   // panel.to_string(),
    //
    //   // 'red',
    //   // 'red',
    //   // 'blue',
    //   // 'red',
    //   // 'red'
    // ], 1500, 1500, 45);
    
    // let img1 = QScheme.gen_gradient([
    //   panel.to_string(),
    //   // hl.to_string(),
    //   // 'oklch(0.452 0.313 29.234)',
    //   // 'oklch(0.452 0.313 264.052 / 0)',
    //   panel.shade_oklch('a(0)').to_string(),
    // ], 100, 300, 0);
    // let img2 = QScheme.gen_gradient([
    //   // hl.to_string(),
    //   // 'oklch(0.452 0.313 264.052 / 0)',
    //   panel.shade_oklch('a(0)').to_string(),
    //   panel.to_string(),
    //   // 'oklch(0.452 0.313 29.234)',
    // ], 100, 300, 0);
    // let img3 = QScheme.gen_gradient([
    //   panel.to_string(),
    //   hl.to_string(),
    //   panel.to_string(),
    //   hl.to_string(),
    //   panel.to_string(),
    //
    //   // 'oklch(0.452 0.313 264.052 / 0)',
    //   // 'oklch(0.452 0.313 29.234)',
    //   // hl.to_string(),
    //   // 'oklch(0.452 0.313 264.052 / 0)',
    // ], 4000, 300, 0);
    
    // theme.colors.frame = panel.shade_oklch('a(0.1)').to_string('rgb');
    // theme.colors.frame = 'rgba(53, 56, 63, 0.1)';
    // theme.colors.frame_inactive = panel.shade_oklch('a(0.97)').to_string();
    // theme.colors.frame_inactive = 'oklch(0.6 0.243 358.197 / 0.0)';
    theme.images = {
      // "additional_backgrounds": ["assets/blank.svg"],
      // "theme_frame": "assets/icons/icon.png",
      // "theme_frame": img,
      // "theme_frame": "linear-gradient(to bottom, black, red)",
      additional_backgrounds: [
        // img,
        // img1,
        // img2,
        // img3,
        // "assets/icons/icon.png"
      ]
    };
    // theme.images.additional_backgrounds = [
    //   // QScheme.gen_color_wheel(panel.shade("l(+20%)").to_string()),
    //   QScheme.gen_gradient([
    //     'transparent', panel.shade_oklch('l(+50%)').to_string(), 'transparent'
    //   ], 250, 80),
    //   QScheme.gen_gradient([
    //     'blue', 'green', 'purple', 'green', "blue"
    //   ], 45, 30),
    // ];
    theme.properties.additional_backgrounds_alignment = [
      // 'left bottom',
      // 'right bottom' ,
      'left bottom',
    ];
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
    
    // browser.browserAction.setBadgeText({text: `${panel.contrast_ratio(text)}`.slice(0, 4)});
    
    // let svg = fetch(browser.runtime.getURL('assets/icons/icon2.svg')).then(async resp => {
    //   let garbage = await resp.text().then(text => text);
    //   let parser = new DOMParser();
    //   let doc = parser.parseFromString(garbage, 'image/svg+xml');
    //   let lixo = doc.querySelector('#dynamic-secondary');
    //   let qq = doc.querySelector('#base');
    //   lixo.setAttribute('fill', panel.to_string());
    //   qq.setAttribute('fill', icon_color.to_string());
    //   qq.setAttribute('stroke', icon_color.to_string());
    //   // lixo.children.item(1).setAttribute('stop-color', this.panel.to_string());
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
    
    let apply = new Promise((resolve, reject) => {
      browser.browserSettings.overrideContentColorScheme
      .set({value: scheme.theme_mode})
      .then(value => {
        // console.info(`Setting was modified: ${value}`);
      });
      browser.theme.update(theme);
      resolve();
    });
    
    return scheme;
  }
  
  
  static unique_id() {
    return crypto.randomUUID();
  }
  
}