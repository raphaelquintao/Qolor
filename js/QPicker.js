export class QColorUtils {
  _hsl = {h: 0, s: 0, l: 0};
  _alpha = 1.0;
  
  constructor(color) {
    if (color.r !== undefined && color.g !== undefined && color.b !== undefined) {
      this._hsl = QColorUtils.rgb_to_hsl(color.r, color.g, color.b);
    } else if (color.h !== undefined && color.s !== undefined && color.v !== undefined) {
      this._hsl = QColorUtils.hsv_to_hsl(color.h, color.s, color.v);
    } else if (color.h !== undefined && color.s !== undefined && color.l !== undefined) {
      this._hsl = {h: color.h, s: color.s, l: color.l};
    } else {
      this._hsl = {h: 0, s: 0, l: 0};
    }
    if (color.a !== undefined) {
      this._alpha = color.a;
    }
  }
  
  get hsl_color() {
    return this._hsl;
  }
  
  get hsl_h() {
    return this._hsl.h;
  }
  
  get hsl_s() {
    return this._hsl.s;
  }
  
  get hsl_l() {
    return this._hsl.l;
  }
  
  set hsl_color({h, s, l}) {
    this._hsl = {h: h, s: s, l: l};
  }
  
  set hsl_h(hue) {
    this._hsl.h = hue;
  }
  
  set hsl_s(saturation) {
    this._hsl.s = saturation;
  }
  
  set hsl_l(lightness) {
    this._hsl.l = lightness;
  }
  
  
  get hsv_color() {
    return QColorUtils.hsl_to_hsv(this._hsl.h, this._hsl.s, this._hsl.l);
  }
  
  get hsv_h() {
    return this._hsl.h;
  }
  
  get hsv_s() {
    let hsv = QColorUtils.hsl_to_hsv(this._hsl.h, this._hsl.s, this._hsl.l);
    return hsv.s;
  }
  
  get hsv_v() {
    let hsv = QColorUtils.hsl_to_hsv(this._hsl.h, this._hsl.s, this._hsl.l);
    return hsv.v;
  }
  
  set hsv_color({h, s, v}) {
    this._hsl = QColorUtils.hsv_to_hsl(h, s, v);
  }
  
  set hsv_h(hue) {
    this._hsl.h = hue;
  }
  
  set hsv_v(value) {
    let hsv = QColorUtils.hsl_to_hsv(this._hsl.h, this._hsl.s, this._hsl.l);
    hsv.v = value;
    this._hsl = QColorUtils.hsv_to_hsl(hsv.h, hsv.s, hsv.v);
  }
  
  set hsv_s(saturation) {
    let hsv = QColorUtils.hsl_to_hsv(this._hsl.h, this._hsl.s, this._hsl.l);
    hsv.s = saturation;
    this._hsl = QColorUtils.hsv_to_hsl(hsv.h, hsv.s, hsv.v);
  }
  
  get alpha() {
    return this._alpha;
  }
  
  set alpha(a) {
    this._alpha = a;
  }
  
  
  shades(count = 7, mode = 'h') {
    let resp = [];
    const mid = Math.floor((count - 1) / 2);
    
    let part;
    let max;
    if (mode === 'h') {
      part = this.hsl_h;
      max = 360;
    } else if (mode === 's') {
      part = this.hsl_s;
      max = 100;
    } else { // l
      part = this.hsl_l;
      max = 100;
    }
    let step = part / (mid + 1);
    
    // const step = this._hsl.l / (mid + 1);
    
    for (let i = mid; i > 0; i--) {
      let _new = part - step * i;
      _new = Math.max(0, _new);
      if (mode === 'h') _new = {h: _new};
      else if (mode === 's') _new = {s: _new};
      else _new = {l: _new};
      resp.push(new QColorUtils({...this._hsl, a: this.alpha, ..._new}));
    }
    resp.push(new QColorUtils({...this._hsl, a: this.alpha}));
    for (let i = 1; i <= mid; i++) {
      let _new = part + step * i;
      if (mode === 'h') _new = {h: _new};
      else if (mode === 's') _new = {s: _new};
      else _new = {l: _new};
      resp.push(new QColorUtils({...this._hsl, a: this.alpha, ..._new}));
    }
    
    return resp;
  }
  
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
  
  static hsl_to_rgb(h, s, l, normalized = false) {
    if (!normalized) {
      h /= 360.0;
      s /= 100.0;
      l /= 100.0;
    }
    
    const hue_to_rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6.0) return p + (q - p) * 6.0 * t;
      if (t < 1 / 2.0) return q;
      if (t < 2 / 3.0) return p + (q - p) * (2 / 3.0 - t) * 6.0;
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
    
    return {r: r, g: g, b: b};
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
  
  static constrast_ratio(hsl1, hsl2) {
    const luminance = (hsl) => {
      const rgb = QColorUtils.hsl_to_rgb(hsl.h, hsl.s, hsl.l);
      const r = rgb.r / 255.0;
      const g = rgb.g / 255.0;
      const b = rgb.b / 255.0;
      const a = [r, g, b].map((c) => {
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
    };
    
    const L1 = luminance(hsl1);
    const L2 = luminance(hsl2);
    
    const lighter = Math.max(L1, L2);
    const darker = Math.min(L1, L2);
    
    return (lighter + 0.05) / (darker + 0.05);
  }
}

export class QPickerEvent extends Event {
  constructor(type, color) {
    super(type);
    this.color = color;
  }
}

export class QSlider extends EventTarget {
  constructor({min = 0, max = 100, step = 1, value = 50, precision = null, label = "", show_output = true, classes = []}) {
    super();
    Object.assign(this, {min, max, step, _label: label, _show_output: show_output, _classes: classes});
    this.precision = precision ?? (String(step).split('.')[1] || '').length;
    this._value = this._clamp(value);
    this._dragging = false;
    
    this._create_elements();
    this._bind_events();
    this._update_ui();
  }
  
  destroy() {
    this.container.remove();
    document.removeEventListener('mousemove', this._handle_document_mousemove);
    document.removeEventListener('mouseup', this._handle_document_mouseup);
  }
  
  _create_elements() {
    this.container = document.createElement('div');
    this.container.classList.add('qp-slider', ...this._classes);
    
    const lbl = document.createElement('div');
    lbl.classList.add('qp-slider-label');
    lbl.textContent = this._label;
    this.container.append(lbl);
    
    this.tracker = document.createElement('span');
    this.tracker.tabIndex = 0;
    this.tracker.classList.add('qp-slider-track');
    
    this.thumb = document.createElement('div');
    this.thumb.classList.add('qp-slider-thumb');
    this.tracker.append(this.thumb);
    
    this.out = document.createElement('span');
    this.out.classList.add('qp-slider-output');
    
    this.container.append(this.tracker);
    this.container.append(this.out);
  }
  
  _bind_events() {
    this.tracker.addEventListener('keydown', this._handle_keydown.bind(this));
    
    this.tracker.addEventListener('wheel', this._handle_wheel.bind(this), {passive: false});
    this.tracker.addEventListener('mousedown', this._handle_tracker_mousedown.bind(this));
    this.tracker.addEventListener('contextmenu', e => e.preventDefault());
    
    this.thumb.addEventListener('mousedown', this._handle_thumb_mousedown.bind(this));
  }
  
  _handle_keydown(e) {
    const key_map = {
      'ArrowLeft': -1,
      'ArrowDown': -1,
      'ArrowRight': 1,
      'ArrowUp':   1
    };
    if (key_map[e.key] === undefined) return;
    e.preventDefault();
    this._update_value(this._value + key_map[e.key] * this.step);
  }
  
  _handle_wheel(e) {
    e.preventDefault();
    this._update_value(this._value - Math.sign(e.deltaY) * this.step);
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
  
  _update_value(new_value) {
    const stepped = Math.round(new_value / this.step) * this.step;
    const clamped = this._clamp(stepped);
    
    if (this._value.toFixed(this.precision) === clamped.toFixed(this.precision)) return;
    
    this._value = clamped;
    this._update_ui();
    this.dispatchEvent(new Event('input'));
  }
  
  _clamp(value) {
    return Math.max(this.min, Math.min(this.max, value));
  }
  
  _update_ui() {
    const percent = (this._value - this.min) / (this.max - this.min) * 100;
    this.out.value = this._value.toFixed(this.precision);
    this.thumb.style.left = `${percent}%`;
  }
  
  
}



export class QPicker {
  color = new QColorUtils({h: 350, s: 60, l: 50}, 1.0);
  dragging = false;
  options = {alpha: false, label: "", shades: false};
  
  constructor(label = "Lixo", alpha = true, shades = false) {
    this.options = {
      label:  label,
      alpha:  alpha,
      shades: shades
    };
    
    this.container = document.createElement('div');
    this.container.classList.add('qpicker');
    
    
    this.color_area = document.createElement('div');
    this.color_area.tabIndex = 0;
    this.color_area.classList.add('qp-area');
    
    this.thumb = document.createElement('div');
    this.thumb.classList.add('qp-thumb');
    this.color_area.append(this.thumb);
    
    
    this.hue_slider = new QSlider({
      label:     "H",
      min:       0,
      max:       360,
      step:      1,
      precision: 0,
      value:     this.color.hsl_h,
      classes:   ['qp-hue']
    });
    
    
    this.saturation_slider = new QSlider({
      label:   "S",
      min:     0,
      max:     100,
      step:    1,
      value:   this.color.hsl_s,
      classes: ['qp-saturation']
    });
    
    
    this.lightness_slider = new QSlider({
      label:   "L",
      min:     0,
      max:     100,
      step:    1,
      value:   this.color.hsl_l,
      classes: ['qp-lightness']
    });
    
    
    this.alpha_slider = new QSlider({
      label:   "A",
      min:     0,
      max:     1,
      step:    0.01,
      value:   this.color.alpha,
      classes: ['qp-alpha']
    });
    
    
    
    this.shades_container = document.createElement('div');
    this.shades_container.classList.add('qp-shades');
    if (!this.options.shades) {
      this.shades_container.style.display = 'none';
    }
    
    this.preview = document.createElement('div');
    this.preview.classList.add('qp-preview');
    
    if (this.options.label && this.options.label.length > 0) {
      let lbl = document.createElement('div');
      lbl.classList.add('qp-label');
      lbl.innerText = this.options.label;
      this.container.append(lbl);
    }
    
    this.out = document.createElement('input');
    this.out.classList.add('qp-output');
    this.out.type = 'text';
    // this.out.readOnly = true;
    
    this.container.append(this.color_area);
    this.container.append(this.hue_slider.container);
    this.container.append(this.saturation_slider.container);
    this.container.append(this.lightness_slider.container);
    this.container.append(this.alpha_slider.container);
    this.container.append(this.shades_container);
    this.container.append(this.preview);
    this.preview.append(this.out);
    
    
    // Event Listeners
    
    this.color_area.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
    });
    
    
    // this.alpha_slider.onwheel = this.hue_slider.onwheel = this.saturation_slider.onwheel = this.lightness_slider.onwheel = (ev) => {
    //   ev.preventDefault();
    //   let input = ev.target;
    //   let delta = Math.sign(ev.deltaY);
    //   let cur_value = parseFloat(input.value);
    //   let step_value = parseFloat(input.step);
    //   let new_value = cur_value - (delta * step_value);
    //   if (new_value < parseFloat(input.min)) new_value = parseFloat(input.min);
    //   if (new_value > parseFloat(input.max)) new_value = parseFloat(input.max);
    //   input.value = new_value.toString();
    //   input.focus();
    //   input.dispatchEvent(new Event('input'));
    // };
    
    this.hue_slider.addEventListener('input', (e) => {
      this.color.hsv_h = e.target.value;
      this.update_ui();
    });
    
    this.saturation_slider.addEventListener('input', (e) => {
      this.color.hsl_s = e.target.value;
      this.update_ui();
    });
    
    this.lightness_slider.addEventListener('input', (e) => {
      this.color.hsl_l = e.target.value;
      this.update_ui();
    });
    
    this.alpha_slider.addEventListener('input', (e) => {
      this.color.alpha = e.target.value;
      this.update_ui();
    });
    
    this.color_area.addEventListener('mousedown', (e) => {
      this.thumb.dispatchEvent(new MouseEvent('mousedown', e));
      this.thumb.dispatchEvent(new MouseEvent('mousemove', e));
      if (e.target !== this.thumb) this.thumb.classList.remove('no-transition');
    });
    
    this.thumb.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.dragging = true;
      this.thumb.classList.add('dragging');
    });
    
    document.addEventListener('mouseup', (e) => {
      this.dragging = false;
      this.thumb.classList.remove('dragging');
    });
    
    document.addEventListener('mousemove', (e) => {
      if (this.dragging) {
        if (e.target === this.thumb) this.thumb.classList.add('no-transition');
        
        let rect = this.color_area.getBoundingClientRect();
        let x = (e.clientX - rect.left) / rect.width * 100;
        let y = (e.clientY - rect.top) / rect.height * 100;
        
        // if(x > 10 || y > 10) {
        //   this.thumb.classList.add('no-transition');
        // }
        
        x = Math.min(100, Math.max(0, x));
        y = 100 - Math.min(100, Math.max(0, y));
        
        
        this.color.hsv_s = x;
        this.color.hsv_v = y;
        
        this.update_ui();
      }
    });
    
    
    this.update_ui();
  }
  
  update_ui(emit_event = true) {
    if (!this.options.alpha) {
      this.alpha_slider.style.display = 'none';
      this.color.a = 1.0;
    }
    
    this.container.style.setProperty('--qp-alpha', this.color.alpha.toString());
    this.container.style.setProperty('--qp-h', this.color.hsv_h);
    this.container.style.setProperty('--qp-sv', this.color.hsv_s + '%');
    this.container.style.setProperty('--qp-v', this.color.hsv_v + '%');
    
    this.container.style.setProperty('--qp-sl', this.color.hsl_s + '%');
    this.container.style.setProperty('--qp-l', this.color.hsl_l + '%');
    
    this.hue_slider.value = this.color.hsl_h;
    this.saturation_slider.value = this.color.hsl_s;
    this.lightness_slider.value = this.color.hsl_l;
    this.alpha_slider.value = this.color.alpha;
    
    this.shades_container.innerHTML = '';
    for (let shade of [...this.color.shades(7, 'h'), ...this.color.shades(7, 's'), ...this.color.shades(7, 'l')]) {
      let shade_ele = document.createElement('div');
      shade_ele.classList.add('qp-shade');
      shade_ele.style.background = `linear-gradient(hsla(${shade.hsl_h}, ${shade.hsl_s}%, ${shade.hsl_l}%, ${shade.alpha})), var(--qp-bg-checker)`;
      this.shades_container.append(shade_ele);
      
      shade_ele.onclick = () => {
        this.color.hsl_color = {h: shade.hsl_h, s: shade.hsl_s, l: shade.hsl_l};
        this.update_ui();
      };
    }
    
    if (!this.options.alpha) this.out.value = `hsl(${this.color.hsl_h}, ${this.color.hsl_s.toFixed(0)}%, ${this.color.hsl_l.toFixed(0)}%)`;
    else this.out.value = `hsla(${this.color.hsl_h}, ${this.color.hsl_s.toFixed(0)}%, ${this.color.hsl_l.toFixed(0)}%, ${this.color.alpha.toFixed(2)})`;
    
    if (emit_event)
      this.on_color_change(this.color.hsl_h, this.color.hsl_s, this.color.hsl_l, this.color.alpha);
  }
  
  on_color_change = (color) => {
    console.log('Color changed:', color);
  };
  
  set_hsl(h, s, l, a = 1.0) {
    this.color.hsl_color = {h: h, s: s, l: l};
    this.color.alpha = a;
    
    this.update_ui(false);
    return this;
  }
  
  
  append_to(el) {
    el.append(this.container);
    return this;
  };
  
}