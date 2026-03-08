import { QColor } from '../src/core/q_color.js';
import { QPicker, QSlider } from '../src/core/q_picker.js';
import { QCollection, UUID } from "../src/core/q_utils.js";

// -- SETUP ---
const URL_SEARCH_PARAMS = new URLSearchParams(window.location.search);
const VIEW = URL_SEARCH_PARAMS.get('view') || 'popup';
document.documentElement.dataset.view = VIEW;
const MY_ID = UUID();

console.info('Options View Open:', document.documentElement.dataset.view);


// -- HELPERS --

class UI {
  static create_button(label_text = '', options = {}) {
    let button = document.createElement('button');
    button.innerHTML = label_text;
    for (let [key, value] of Object.entries(options)) button[key] = value;
    return button;
  }
  
  static create_checkbox(label_text = '', checked = false, options = {}) {
    options.checked = checked;
    return UI.create_input('checkbox', label_text, options);
  }
  
  static create_input(type = 'checkbox', label_text = '', options = {}) {
    let input = document.createElement('input');
    input.type = type;
    for (let [key, value] of Object.entries(options)) input[key] = value;
    let label = UI.create_label(label_text, input);
    return input;
  }
  
  static create_label(text, input = null) {
    let label = document.createElement('label');
    label.innerHTML = text;
    if (input) label.prepend(input);
    return label;
  }
}


// -- DOM Elements
const prefs_container = document.querySelector('.prefs-container');
const pickers_container = document.querySelector('#pickers-container');
const scheme_selector = document.querySelector('#scheme-selector');
const scheme_container = document.querySelector('#scheme-selector .scheme-container');
const header_actions = document.querySelector('#main-header .actions');
const header_title = document.querySelector('#main-header .main-title');

header_title.innerText = browser.runtime.getManifest().short_name;
document.title = browser.runtime.getManifest().short_name + `- ${VIEW.charAt(0).toUpperCase() + VIEW.slice(1)}`;

// -- Create Options Checkboxes
const options = {
  sync_selected:             UI.create_checkbox('Sync Selected Scheme Across Browser'),
  show_output:               UI.create_checkbox('Show Output'),
  show_output_mode_selector: UI.create_checkbox('Show Output Mode Selector'),
  show_slider_value:         UI.create_checkbox('Show Slider Value Label'),
  alpha:                     UI.create_checkbox('Enable Transparency <em><small>(not recommended)</small></em>'),
};
for (let key in options) prefs_container.append(options[key].parentElement);

const contrast_slider = new QSlider({
  label: 'Minimum Contrast',
  min: 1,
  max: 21,
  step: 0.1,
  value: 5,
  classes: []
});
contrast_slider.append_to(prefs_container);
contrast_slider.addEventListener('input', ev => {
  let value = parseFloat(contrast_slider.value);
  browser.runtime.getBackgroundPage().then(win => {
    let data_loaded = win.data.loaded;
    data_loaded.options.min_contrast = value;
    browser.runtime.sendMessage({key: 'update_scheme_color', origin: MY_ID});
  });
});

// -- Create Header Action Buttons
const btn_open_sidebar = UI.create_button('<i class="fa-solid fa-right-to-bracket fa-flip-horizontal"></i>', {title: 'Toggle Sidebar'});
const btn_open_popout = UI.create_button('<i class="fa-solid fa-up-right-from-square"></i>', {title: 'Open Popout'});
if (VIEW === 'popout') {
  // header_actions.append(btn_open_sidebar);
} else if (VIEW === 'sidebar') {
  header_actions.append(btn_open_popout);
} else {
  header_actions.append(btn_open_sidebar, btn_open_popout);
}
btn_open_popout.addEventListener('click', ev => {
  ev.preventDefault();
  console.log('Open Popout Clicked');
  browser.runtime.sendMessage({key: 'open_popout'});
});

btn_open_sidebar.addEventListener('click', ev => {
  ev.preventDefault();
  browser.sidebarAction.toggle();
});

// -- Other Buttons
let btn_surprise = document.getElementById('btn-surprise');
let btn_reload = document.getElementById('btn-reload');
let btn_save = document.getElementById('btn-save');
let btn_sync = document.getElementById('btn-sync');

let btn_new = document.getElementById('btn-new');

let opt_lock = document.getElementById('opt-lock');
let opt_theme_mode = document.querySelectorAll('input[name="opt-theme-mode"]');
let opt_gen_mode = document.querySelectorAll('input[name="opt-gen-mode"]');


btn_surprise.addEventListener('click', ev => {
  browser.runtime.getBackgroundPage().then(win => {
    let data_loaded = win.data.loaded;
    let scheme = data_loaded.get_selected();
    
    scheme.randomize();
    
    scheme.apply();
    
    browser.runtime.sendMessage({
      key:    'surprise_me',
      id:     scheme.id,
      color:  {panel: scheme.panel.toString(), text: scheme.text.toString()},
      origin: MY_ID
    });
  });
});



// -- Create Pickers
const panel_picker = new QPicker({
  label: ''
});
const text_picker = new QPicker({
  label: ''
});
panel_picker.append_to(pickers_container);
text_picker.append_to(pickers_container);

panel_picker.addEventListener('colorchange', evt => {
  console.log('PANEL COLOR CHANGE', evt);
  /** @type {QColor} */
  let color = evt.color.clone();
  
  browser.runtime.getBackgroundPage().then(win => {
    let data_loaded = win.data.loaded;
    let scheme = data_loaded.get_selected();
    scheme.panel = color.clone();
    
    scheme.update_secondary();
    text_picker.color = scheme.text;
    if(!scheme.panel.equals(color)) {
      panel_picker.color = scheme.panel;
    }

    scheme.apply();
    
    browser.runtime.sendMessage({
      key:    'update_scheme_color',
      type:   'panel',
      origin: MY_ID
    });
  });
  
});

text_picker.addEventListener('colorchange', evt => {
  console.log('TEXT COLOR CHANGE', evt);
  /** @type {QColor} */
  let color = evt.color.clone();
  
  browser.runtime.getBackgroundPage().then(win => {
    let data_loaded = win.data.loaded;
    let scheme = data_loaded.get_selected();
    scheme.update_secondary();
    if(!scheme.text.equals(color)) {
      text_picker.color = scheme.text;
    }
    panel_picker.color = scheme.panel;
    scheme.apply();
    
    browser.runtime.sendMessage({
      key:    'update_scheme_color',
      type:   'text',
      origin: MY_ID
    });
  });
});

// -- UI Events
function update_overlays(ele = null) {
  if (!ele) {
    let tmp = document.getElementsByClassName('scheme-selector');
    for (let ele of tmp) {
      update_overlays(ele);
    }
    return;
  }
  
  let ol = ele.querySelector('.overlay.left');
  let or = ele.querySelector('.overlay.right');
  // if(!ol || !or) return;
  
  if (ele.scrollLeft > 0) {
    ol.classList.add('active');
  } else {
    ol.classList.remove('active');
  }
  
  if (ele.scrollLeft + ele.clientWidth < ele.scrollWidth) {
    or.classList.add('active');
  } else {
    or.classList.remove('active');
  }
}

function bind_ui_events() {
  let collapsable = document.querySelectorAll('[data-collapsed]');
  for (let ele of collapsable) {
    ele.querySelector("header").addEventListener('click', ev => {
      ele.dataset.collapsed = ele.dataset.collapsed === 'true' ? 'false' : 'true';
    });
  }
  
  scheme_selector.addEventListener('wheel', ev => {
    ev.preventDefault();
    scheme_selector.scrollBy({
      left:     ev.deltaY > 0 ? 90 : -90,
      behavior: 'smooth'
    });
    
  }, {passive: false});
  scheme_selector.addEventListener('scroll', ev => {
    update_overlays(scheme_selector);
  });
  
  // Simple tooltip.
  document.addEventListener('mouseover', ev => {
    if (ev.target.title && ev.target.title.length > 0) {
      ev.target.dataset.title = ev.target.title;
      ev.target.removeAttribute('title');
    }
    
    if (ev.target.dataset.title) {
      // console.log('Show tooltip for', ev.target, ev.target.dataset.title);
      let tooltip = document.createElement('div');
      tooltip.className = 'tooltip';
      tooltip.innerHTML = ev.target.dataset.title;
      document.body.append(tooltip);
      const timeout = setTimeout(() => {
        tooltip.style.opacity = '1';
      }, 500);
      
      const rect = ev.target.getBoundingClientRect();
      const tooltip_rect = tooltip.getBoundingClientRect();
      
      let top = rect.top - tooltip_rect.height - 5;
      if (top < 0) top = rect.bottom + 5;
      
      let left = rect.left + (rect.width - tooltip_rect.width) / 2;
      if (left < 0) left = 5;
      else if (left + tooltip_rect.width > window.innerWidth) {
        left = window.innerWidth - tooltip_rect.width - 5;
      }
      
      tooltip.style.top = `${top}px`;
      tooltip.style.left = `${left}px`;
      
      ev.target.addEventListener('mouseleave', () => {
        clearTimeout(timeout);
        tooltip.remove();
      }, {once: true});
    }
  });
  
}

bind_ui_events();

function create_scheme_card(scheme, selected = false) {
  
  let scheme_card = document.createElement('div');
  scheme_card.className = 'scheme-card';
  scheme_card.id = scheme.id;
  scheme_card.style.setProperty('--bg', scheme.panel.toString());
  scheme_card.style.setProperty('--fg', scheme.text.toString());
  
  let actions = document.createElement('span');
  actions.className = 'actions';
  scheme_card.append(actions);
  
  let button_clone = document.createElement('button');
  button_clone.className = 'btn-icon clone';
  actions.append(button_clone);
  
  let button_delete = document.createElement('button');
  button_delete.className = 'btn-icon delete';
  actions.append(button_delete);
  
  const default_indicator = document.createElement('button');
  default_indicator.className = 'btn-icon default';
  actions.append(default_indicator);
  
  let modes = document.createElement('span');
  modes.className = 'modes';
  scheme_card.append(modes);
  
  let gen_mode = document.createElement('span');
  gen_mode.className = 'mode gen-mode';
  modes.append(gen_mode);
  
  // let theme_mode = document.createElement('span');
  // theme_mode.className = 'mode theme-mode';
  // modes.append(theme_mode);
  //
  // let page_mode = document.createElement('span');
  // page_mode.className = 'mode page-mode';
  // modes.append(page_mode);
  
  let contrast_mode = document.createElement('span');
  contrast_mode.className = 'contrast';
  scheme_card.append(contrast_mode);
  
  
  button_clone.addEventListener('click', ev => {
    ev.stopPropagation();
    browser.runtime.sendMessage({key: 'clone_scheme', id: scheme.id, origin: MY_ID});
  });
  
  button_delete.addEventListener('click', ev => {
    ev.stopPropagation();
    if (scheme.locked) return;
    let sure = confirm("Are you sure you want to delete this scheme?");
    if (sure) {
      browser.runtime.sendMessage({key: 'delete_scheme', id: scheme.id, origin: MY_ID});
    }
  });
  
  scheme_card.addEventListener('click', ev => {
    browser.runtime.sendMessage({key: 'set_scheme', id: scheme.id, origin: MY_ID});
  });
  
  
  return scheme_card;
}


/** @param {QCollection} data
 * @param {string} origin
 * @param {string[]} ignore
 */
function update_ui(data, origin = 'bg', ignore = []) {
  const is_origin = (origin === MY_ID);
  console.log('Updating UI', {origin, ignore, is_origin});
  
  const loaded = data;
  
  const selected_scheme = loaded.get_selected();
  
  options.show_output.checked = loaded.options.show_output;
  options.show_output_mode_selector.checked = loaded.options.show_output_mode_selector;
  options.show_slider_value.checked = loaded.options.show_slider_value;
  options.sync_selected.checked = loaded.options.sync_selected;
  options.alpha.checked = loaded.options.alpha;
  
  let scheme_cards = scheme_container.querySelectorAll('.scheme-card');
  if (scheme_cards.length !== loaded.schemes.length) {
    if (scheme_cards.length === 0) scheme_container.innerHTML = '';
    for (let scheme of loaded.schemes) {
      if (!scheme_cards || ![...scheme_cards].find(c => c.id === scheme.id)) {
        let card = create_scheme_card(scheme, false);
        scheme_container.append(card);
      }
    }
  }
  scheme_cards = scheme_container.querySelectorAll('.scheme-card');
  for (let card of scheme_cards) {
    let scheme = loaded.find_by_id(card.id);
    if (scheme) {
      card.style.setProperty('--bg', scheme.panel.toString());
      card.style.setProperty('--fg', scheme.text.toString());
      card.style.setProperty('--theme-mode', scheme.theme_mode);
      
      let gen_mode = card.querySelector('.modes .gen-mode');
      gen_mode.dataset.title = 'Generation Mode:';
      gen_mode.innerHTML = '';
      if (scheme.gen_mode === 'dual') {
        gen_mode.innerHTML = '<i class="fas fa-palette"></i>';
        gen_mode.dataset.title += ' Dual Tone';
      } else if (scheme.gen_mode === 'colorful') {
        gen_mode.innerHTML = '<i class="fas fa-swatchbook"></i>';
        gen_mode.dataset.title += ' Colorful';
      } else {
        gen_mode.innerHTML = '<i class="fas fa-fill"></i>';
        gen_mode.dataset.title += ' Single Tone';
      }
      
      // let theme_mode = card.querySelector('.modes .theme-mode');
      // theme_mode.title = 'Theme Mode: ' + scheme.theme_mode;
      // theme_mode.innerHTML = scheme.theme_mode === 'dark' ? '<i class="fa-solid fa-moon"></i>' : '<i class="fa-solid fa-sun"></i>';
      //
      // let page_mode = card.querySelector('.modes .page-mode');
      // page_mode.title = 'Page Mode: ' + scheme.page_mode;
      // page_mode.innerHTML = scheme.page_mode === 'dark' ? '<i class="fa-solid fa-moon"></i>' : '<i class="fa-solid fa-sun"></i>';
      // if (scheme.theme_mode === scheme.page_mode) {
      //   page_mode.style.display = 'none';
      // } else {
      //   page_mode.style.display = '';
      // }
      
      let contrast_mode = card.querySelector('.contrast');
      contrast_mode.innerHTML = scheme.text.contrast_ratio(scheme.panel).toFixed(2);
      contrast_mode.title = 'Contrast Ratio: ' + contrast_mode.innerText;
      
      let button_clone = card.querySelector('.actions .clone');
      button_clone.title = 'Clone Scheme';
      button_clone.innerHTML = '<i class="fa-solid fa-clone"></i>';
      
      let button_delete = card.querySelector('.actions .delete');
      if (scheme.locked) {
        button_delete.classList.add('always-visible');
        button_delete.disabled = true;
        button_delete.title = 'Locked Scheme (Cannot be Deleted)';
        button_delete.innerHTML = '<i class="fa-solid fa-lock"></i>';
      } else {
        button_delete.classList.remove('always-visible');
        button_delete.disabled = false;
        button_delete.title = 'Delete Scheme';
        button_delete.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
      }
      
      let default_indicator = card.querySelector('.actions .default');
      default_indicator.title = 'Default Scheme';
      default_indicator.innerHTML = '<i class="fa-solid fa-star"></i>';
      if (scheme.default) {
        default_indicator.style.display = '';
        button_delete.style.display = 'none';
      } else {
        default_indicator.style.display = 'none';
        button_delete.style.display = '';
      }
      
    } else {
      console.warn('Scheme not found for card', card.id);
      card.style.transform = 'scale(0)';
      card.style.width = '0px';
      setTimeout(() => {
        card.remove();
      }, 305);
    }
  }
  
  
  
  
  const selected_card = scheme_container.querySelector('.scheme-card[data-selected="true"]');
  if (selected_card?.id !== selected_scheme.id) {
    if (selected_card) selected_card.dataset.selected = 'false';
    let new_selected = scheme_container.querySelector(`.scheme-card[id="${selected_scheme.id}"]`);
    new_selected.dataset.selected = 'true';
    scheme_selector.scrollTo({
      left:     new_selected.offsetLeft - scheme_selector.clientWidth / 2 + new_selected.clientWidth / 2,
      behavior: 'smooth'
    });
  }
  
  if (!ignore.includes('colors') || !is_origin) {
    if (!ignore.includes('initial')) {
      panel_picker.set_initial_color(selected_scheme.panel);
      text_picker.set_initial_color(selected_scheme.text);
    } else {
      panel_picker.color = selected_scheme.panel;
      text_picker.color = selected_scheme.text;
    }
  }
  
  text_picker.show_output = panel_picker.show_output = loaded.options.show_output;
  text_picker.show_output_mode_selector = panel_picker.show_output_mode_selector = loaded.options.show_output_mode_selector;
  text_picker.show_slider_value = panel_picker.show_slider_value = loaded.options.show_slider_value;
  text_picker.alpha_enabled = panel_picker.alpha_enabled = loaded.options.alpha;
  
  panel_picker.disabled = text_picker.disabled = !selected_scheme.editable;
  btn_surprise.disabled = !selected_scheme.editable;
  opt_lock.disabled = selected_scheme.default;
  opt_lock.checked = selected_scheme.locked || selected_scheme.default;
  
  opt_theme_mode.forEach(radio => {
    radio.checked = (radio.value === selected_scheme.theme_mode);
    radio.disabled = !selected_scheme.editable;
  });
  
  opt_gen_mode.forEach(radio => {
    radio.checked = (radio.value === selected_scheme.gen_mode);
    radio.disabled = !selected_scheme.editable;
  });
  
  if (selected_scheme.gen_mode === 'dual') {
    text_picker.container.style.display = '';
  } else {
    text_picker.container.style.display = 'none';
  }
  
}

// -- Initialize UI
const bg = browser.runtime.getBackgroundPage();
bg.then(win => {
  console.log('curr_id', MY_ID, win);
  
  /**@type {QCollection} */
  let data_loaded = win.get_data_loaded();
  
  options.show_output.checked = data_loaded.options.show_output;
  options.show_output_mode_selector.checked = data_loaded.options.show_output_mode_selector;
  options.show_slider_value.checked = data_loaded.options.show_slider_value;
  options.sync_selected.checked = data_loaded.options.sync_selected;
  options.alpha.checked = data_loaded.options.alpha;
  
  panel_picker.show_output = text_picker.show_output = data_loaded.options.show_output;
  panel_picker.show_output_mode_selector = text_picker.show_output_mode_selector = data_loaded.options.show_output_mode_selector;
  panel_picker.show_slider_value = text_picker.show_slider_value = data_loaded.options.show_slider_value;
  panel_picker.alpha_enabled = text_picker.alpha_enabled = data_loaded.options.alpha;
  
  
  for (let key in options) {
    options[key].addEventListener('change', ev => {
      data_loaded.options[key] = options[key].checked;
      browser.runtime.sendMessage({key: 'update_options', origin: MY_ID});
    });
  }
  
  
  opt_lock.addEventListener('change', ev => {
    data_loaded.get_selected().locked = opt_lock.checked;
    browser.runtime.sendMessage({key: 'update_options', origin: MY_ID});
  });
  
  opt_theme_mode.forEach(radio => {
    radio.addEventListener('change', ev => {
      if (radio.checked) {
        data_loaded.get_selected().theme_mode = radio.value;
        data_loaded.get_selected().page_mode = radio.value;
        data_loaded.get_selected().apply();
        browser.runtime.sendMessage({key: 'update_options', origin: MY_ID});
      }
    });
  });
  
  opt_gen_mode.forEach(radio => {
    radio.addEventListener('change', ev => {
      if (radio.checked) {
        data_loaded.get_selected().gen_mode = radio.value;
        data_loaded.get_selected().update_secondary();
        data_loaded.get_selected().apply();
        browser.runtime.sendMessage({key: 'update_options', origin: MY_ID});
      }
    });
  });
  
  
  update_ui(data_loaded, MY_ID);
  
  update_overlays(scheme_selector);
});

browser.runtime.onMessage.addListener((message, sender, send_response) => {
  if (!message['to'] || message['to'] !== 'front') return;
  
  console.log('onMessage OPTIONS', message, MY_ID);
  
  if (message.key === 'refresh') {
    const bg = browser.runtime.getBackgroundPage();
    bg.then(win => {
      let data_loaded = win.get_data_loaded();
      try {
        update_ui(data_loaded, message.origin, message.ignore);
      } catch (err) {
        console.error('Failed to update UI', err, data_loaded);
      }
    });
  }
  
});




function set_theme_colors(theme) {
  if (theme.colors) {
    const url = new URL(window.location.href);
    const view = url.searchParams.get('view');
    console.info('View param:', view);
    if (view === 'sidebar') {
      document.body.parentElement.style.setProperty('--q-base', theme.colors.sidebar);
      // document.body.parentElement.style.setProperty('--q-fg-color', theme.colors.sidebar_text);
    } else if (view === 'popup') {
      document.body.parentElement.style.setProperty('--q-base', theme.colors.popup);
      // document.body.parentElement.style.setProperty('--q-fg-color', theme.colors.popup_text);
    } else {
      document.body.parentElement.style.setProperty('--q-base', theme.colors.popup);
      // document.body.parentElement.style.setProperty('--q-fg-color', theme.colors.popup_text);
    }
  }
}

browser.theme.onUpdated.addListener((info) => {
  // console.log('Theme updated', info);
  if (info.theme.colors) {
    set_theme_colors(info.theme);
  }
});

browser.theme.getCurrent().then(theme => {
  console.log('Current theme', theme);
  set_theme_colors(theme);
});


















