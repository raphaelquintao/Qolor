import { QScheme } from './q_scheme.js';

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

