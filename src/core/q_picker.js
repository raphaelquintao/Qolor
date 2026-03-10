import { QColor } from './q_color.js';

export class QPickerEvent extends Event {
  /** @type {QColor} */
  color = null;
  
  /** @type {QPicker|null} */
  target = null;
  
  /**
   * Creates a new QPickerEvent with the specified type and color.
   * @param {string} type
   * @param {QColor} color
   */
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
    
    this.label = document.createElement('div');
    this.label.classList.add('qp-slider-label');
    this.label.textContent = this._label;
    this.container.append(this.label);
    
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
    const display_value = this._value.toFixed(this.precision).split('.')
      .map((part, index) => {
        if (index === 0) return `${part}`;
        return `<small>.${part}</small>`;
      }).join('');
    this.output_value.innerHTML = display_value;
    // this.thumb.dataset.title = display_value;
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
  
  get hidden() {
    if (!this.group_container) {
      return this.container.style.display === 'none';
    }
    return this.label.style.display === 'none';
  }
  
  /** @param {boolean} hidden */
  set hidden(hidden) {
    if (!this.group_container) {
      this.container.style.display = hidden ? 'none' : '';
      return;
    }
    [this.label, this.tracker, this.output_value].map(el => {
      el.style.display = hidden ? 'none' : '';
    });
  }
  
  set_precision(precision) {
    this.precision = precision;
  }
  
  set_value(value) {
    this.value = value;
  }
  
  set_hidden(hidden) {
    this.hidden = hidden;
  }
  
}



/**
 * @typedef {Object} QPickerOptions
 * @property {string} [label] - Label for the color picker
 * @property {boolean} [alpha] - Whether to include alpha channel
 * @property {number} [area_size] - Size of the color area (in pixels)
 * @property {'hsl'|'hsv'} [picker_mode] - Internal mode for sliders and color manipulation
 * @property {'hsl'|'hex'|'rgb','oklch'} [output_mode] - Format for output value
 * @property {boolean} [show_output] - Whether to show the output value
 * @property {boolean} [show_output_mode_selector] - Whether to show the output mode selector
 * @property {boolean} [show_slider_value] - Whether to show the current value on sliders
 * @property {boolean} [legacy_output] - Whether to use legacy output format (with commas)
 * @property {boolean} [disabled] - Whether the picker is disabled
 * @property {number} [precision] - Decimal places for output values
 */
export class QPicker extends EventTarget {
  /** @type {QColor} */
  #previous_color;
  /** @type {QColor} */
  #color;
  #dragging = false;
  
  /** @type {QPickerOptions} */
  #options = {
    label:                     "",
    alpha:                     false,
    area_size:                 140,
    picker_mode:               'hsv',
    output_mode:               'hsl',
    show_output:               true,
    show_output_mode_selector: true,
    show_slider_value:         true,
    legacy_output:             false,
    disabled:                  false,
    precision:                 2,
  };
  
  static #OUTPUT_MODES = Object.keys(QColor.modes);
  
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
    if(!QPicker.#OUTPUT_MODES.includes(mode)) {
      console.warn(`Invalid output mode: ${mode}`);
      return;
    }
    this.#options.output_mode = mode;
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
  constructor(options = {alpha: false, disabled: false}) {
    super();
    this.#options = {...this.#options, ...options};
    
    this.#previous_color = new QColor();
    this.#color = new QColor();
    
    
    
    this.#create_elements();
    this.#bind_events();
    
    
    
    // Set initial options
    this.output_mode = this.#options.output_mode;
    this.show_output = this.#options.show_output;
    this.show_output_mode_selector = this.#options.show_output_mode_selector;
    this.precision = this.#options.precision;
    this.show_slider_value = this.#options.show_slider_value;
    
    this.set_initial_color((new QColor()).randomize());
    
    this.#setup_color_area();
    
    this.#update_ui();
  }
  
  
  
  
  
  #setup_color_area() {
    if (this.#options.picker_mode === 'hsl') {
      this.color_area.classList.add('hsl-mode');
      // let bg = `url(${this.#gen_color_wheel()}) center / auto no-repeat, var(--qp-bg-checker)`;
      // this.color_area.style.background = bg;
    } else {
      this.color_area.classList.remove('hsl-mode');
      // this.color_area.style.background = ``;
    }
  }
  
  #create_elements() {
    this.container = document.createElement('div');
    this.container.classList.add('qpicker');
    this.container.style.setProperty('--qp-area-size', this.#options.area_size + 'px');
    
    
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
    this.preview_before.title = "Previous Color (Click to Restore)";
    this.preview_after = document.createElement('div');
    this.preview_after.classList.add('qp-preview-after');
    this.preview.append(this.preview_before, this.preview_after);
    
    
    this._label = document.createElement('div');
    this._label.classList.add('qp-label');
    this._label.textContent = this.#options.label;
    this.container.append(this._label);
    if (this.#options.label) {
      this._label.style.display = '';
    } else {
      this._label.style.display = 'none';
      this.preview.style.gridColumn = 'auto / span 2';
    }
    
    
    this.out_container = document.createElement('div');
    this.out_container.classList.add('qp-output');
    this.out_mode_selector = document.createElement('div');
    this.out_mode_selector.classList.add('qp-output-mode-selector' , 'button-toolbar');
    
    /** @type {HTMLInputElement[]} */
    this.out_modes = [];
    
    for (let mode of QPicker.#OUTPUT_MODES) {
      let radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = `qp-output-mode-${crypto.randomUUID()}`;
      radio.value = mode;
      radio.classList.add('btn');
      radio.checked = false;
      let label = document.createElement('label');
      label.innerText = mode.toUpperCase();
      label.prepend(radio);
      this.out_mode_selector.append(label);
      this.out_modes.push(radio);
    }
    
    
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
      // e.preventDefault();
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
      this.output_value.dataset.invalid = "true";
    }
  }
  
  
  
  _start_drag() {
    this.#dragging = true;
    this.thumb.classList.add('dragging');
    // this.dispatchEvent(new CustomEvent('pointerup', {}));
    
    // const result = this.color_area.requestPointerLock();
    // console.log("Pointer lock result:", result);
    
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
    // document.exitPointerLock();
  }
  
  _handle_document_mousemove(e) {
    if (!this.#dragging) return;
    this.thumb.classList.add('no-transition');
    console.log("Mouse move:", e.movementX, e.movementY, this.thumb);
    
    let rect = this.color_area.getBoundingClientRect();
    let x = (e.clientX - rect.left) / rect.width * 100;
    let y = (e.clientY - rect.top) / rect.height * 100;
    
    // if (document.pointerLockElement === this.color_area) {
    //   x = (this.thumb.clientLeft + e.movementX) / rect.width * 100;
    //   y = (this.thumb.clientTop + e.movementY) / rect.height * 100;
    // }
    
    if (this.#options.picker_mode === 'hsl') {
      const radius = 50;
      x -= 50;
      y -= 50;
      let dist = Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));
      let rad = Math.atan2(y, x);
      let hue = rad * 180 / Math.PI + 90;
      if (hue < 0) hue += 360;
      if (hue > 360) hue -= 360;
      const sat = (dist > radius) ? 100 : (dist / radius) * 100;
      
      this.#color.h = hue;
      this.#color.s = sat;
      
    } else {
      x = Math.min(100, Math.max(0, x));
      y = 100 - Math.min(100, Math.max(0, y));
      this.#color.set_hsva({s: x, v: y});
    }
    
    
    this.#update_ui();
  }
  
  
  #update_ui(emit_event = true, parse_out = true) {
    this.alpha_slider.hidden = !this.#options.alpha;
    if (!this.#options.alpha) {
      this.#color.a = 1.0;
    }
    
    this.container.style.setProperty('--qp-alpha', this.#color.a + '');
    this.container.style.setProperty('--qp-h', this.#color.h + '');
    this.container.style.setProperty('--qp-sl', this.#color.s + '%');
    this.container.style.setProperty('--qp-l', this.#color.l + '%');
    
    if (this.#options.picker_mode === 'hsl') {
      const radius = 50;
      const rad = (this.#color.h - 90) * (Math.PI / 180);
      let x = radius * this.#color.s / 100 * Math.cos(rad);
      let y = radius * this.#color.s / 100 * Math.sin(rad);
      
      this.thumb.style.left = `${50 + x}%`;
      this.thumb.style.top = `${50 + y}%`;
    } else {
      let hsv = this.#color.get_hsva();
      this.thumb.style.left = `${hsv.s}%`;
      this.thumb.style.top = `${100 - hsv.v}%`;
    }
    
    if (parse_out) {
      let text = this.#color.to_string(this.output_mode, this.#options.precision, this.#options.legacy_output);
      this.output_value.dataset.invalid = "false";
      if (this.output_value.innerText !== text) {
        this.output_value.innerText = text;
      }
    }
    
    
    this.thumb.style.background = this.#color.to_string('hsl', this.#options.precision);
    this.hue_slider.value = this.#color.h;
    this.saturation_slider.value = this.#color.s;
    this.lightness_slider.value = this.#color.l;
    this.alpha_slider.value = this.#color.a;
    
    this.preview.style.setProperty('--qp-hsla-previous', this.#previous_color.to_string('hsl', this.#options.precision));
    
    
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
    this.#update_ui(false);
  }
  
  get color() {
    return this.#color;
  }
  
  set color(new_color) {
    if (this.#color.equals(new_color)) return;
    this.#color = new_color;
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