class QSVG extends HTMLElement {
  static CACHE = {};
  
  static observedAttributes = ['src', 'width', 'height', 'data-class'];

  
  /**
   *
   */
  constructor() {
    super();
    this.attachShadow({mode: 'open'});
  }
  
  connectedCallback() {
    const src = this.getAttribute('src');
    this.load_svg(src);
  }
  
  
  attributeChangedCallback(name, old_value, new_value) {
    if (old_value !== new_value) {
      const is_src = name === 'src';
      this.load_svg(is_src ? new_value : this.getAttribute('src'), is_src);
    }
  }
  
  async load_svg(src, is_source = true) {
    if (!src) return;
    
    if (QSVG.CACHE[src]) {
      this.shadowRoot.innerHTML = QSVG.CACHE[src];
    } else {
      const svg_text = await (await fetch(src)).text();
      this.shadowRoot.innerHTML = svg_text;
      QSVG.CACHE[src] = svg_text;
    }
    
    
    
    const _w = this.getAttribute('width');
    const _h = this.getAttribute('height');
    const _data_class = this.getAttribute('data-class');
    
    const svg = this.shadowRoot.querySelector('svg');
    if (svg) {
      if (_w) svg.setAttribute('width', _w);
      if (_h) svg.setAttribute('height', _h);
      
      if (_data_class) {
        let _svg_class = svg.getAttribute('class') || '';
        if (svg.hasAttribute('data-class')) {
          _svg_class.replaceAll(svg.getAttribute('data-class'), '');
        }
        svg.setAttribute('data-class', _data_class.trim());
        svg.setAttribute('class', `${_svg_class} ${_data_class}`.trim());
      }
      
      svg.style.display = 'block';
    }
  }
  
  
  
}


export function register_q_svg() {
  if (!customElements.get('q-svg')) {
    customElements.define('q-svg', QSVG);
  }
}