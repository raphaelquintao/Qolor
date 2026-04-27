export function QRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

export function UUID() {
  return crypto.randomUUID();
}

export function FASTHASH(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash >>> 0;
}

export function BYTES_TO_STRING(_bytes, fixed = 2) {
  const sizes = ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB'];
  if (_bytes === 0) return '0 Byte';
  
  let remain = _bytes;
  while (remain >= 1024 && sizes.length > 1) {
    remain /= 1024;
    sizes.shift();
  }
  
  return `${remain.toFixed(fixed)} ${sizes[0]}`;
}

/**
 * Throttle a function to fire at most once per interval.
 * Trailing call is guaranteed so the final value is always applied.
 * @param {Function} fn
 * @param {number} delay_ms
 * @returns {Function}
 */
export function THROTTLE(fn, delay_ms) {
  let last_call = 0;
  let pending_timer = null;
  return function (...args) {
    const now = performance.now();
    const remaining = delay_ms - (now - last_call);
    if (remaining <= 0) {
      clearTimeout(pending_timer);
      pending_timer = null;
      last_call = now;
      fn.apply(this, args);
    } else if (!pending_timer) {
      pending_timer = setTimeout(() => {
        pending_timer = null;
        last_call = performance.now();
        fn.apply(this, args);
      }, remaining);
    }
  };
}

export class UI {
  /**
   * @param {string} label
   * @param {Partial<HTMLElementTagNameMap['button']>} [options]
   * @returns {HTMLButtonElement}
   */
  static create_button(label, options = {}) {
    return UI.create_element('button', {innerHTML: label, ...options});
  }
  
  /**
   * Create a checkbox appeded to label.
   * @param {string} label
   * @param {boolean} checked
   * @param {Partial<HTMLElementTagNameMap['input']>} [options]
   * @returns {HTMLInputElement}
   */
  static create_checkbox(label, checked = false, options = {}) {
    options.checked = checked;
    return UI.create_input('checkbox', label, options);
  }
  
  /**
   * Create an input appeded to label.
   * @param {string} type
   * @param {string} label
   * @param {Partial<HTMLElementTagNameMap['input']>} [options]
   * @returns {HTMLInputElement}
   */
  static create_input(type, label, options = {}) {
    let input = UI.create_element('input', {type: type, ...options});
    UI.create_element('label', {innerHTML: label}).prepend(input);
    return input;
  }
  
  /**
   * @template {keyof HTMLElementTagNameMap} T
   * @param {T} tag_name
   * @param {Partial<HTMLElementTagNameMap[T]>} [options]
   * @returns {HTMLElementTagNameMap[T]}
   */
  static create_element(tag_name, options = undefined) {
    let el = document.createElement(tag_name);
    for (let [key, value] of Object.entries(options || {})) {
      if(['dataset', 'style'].includes(key)) {
        for (let [sub_key, sub_value] of Object.entries(value)) {
          el[key][sub_key] = sub_value;
        }
      } else {
        el[key] = value;
      }
    }
    return el;
  }
}


