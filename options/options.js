import { QColor } from '../src/core/q_color.js';
import { register_q_svg } from '../src/core/q_html_elements.js';
import { QPicker } from '../src/core/q_picker.js';
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
const scheme_info = document.querySelector('.scheme-section .info');
const scheme_container = document.querySelector('#scheme-selector .scheme-container');
const header_actions = document.querySelector('#main-header .actions');
const header_logo_container = document.querySelector('#main-header .logo-container');
const header_title = document.querySelector('#main-header .title');
const output_selector = document.querySelector('#output-selector');

header_title.innerText = browser.runtime.getManifest().short_name.slice(1);
document.title = browser.runtime.getManifest().short_name + `- ${VIEW.charAt(0).toUpperCase() + VIEW.slice(1)}`;

// -- Create Options Checkboxes
const options = {
  show_output:        UI.create_checkbox('Show Output/Input', false, {className: 'checkbox-switch'}),
  show_slider_value:  UI.create_checkbox('Show Slider Value', false, {className: 'checkbox-switch'}),
  show_slider_label:  UI.create_checkbox('Show Slider Label', false, {className: 'checkbox-switch'}),
  apply_colors_popup: UI.create_checkbox('Apply Colors to Popup', false, {className: 'checkbox-switch'}),
};
for (let key in options) prefs_container.append(options[key].parentElement);

output_selector.dataset.name = `qp-output-mode-${crypto.randomUUID()}`;

for (let mode of QPicker.OUTPUT_MODES) {
  let radio = document.createElement('input');
  radio.type = 'radio';
  radio.name = output_selector.dataset.name;
  radio.value = mode;
  radio.classList.add('btn');
  radio.checked = false;
  let label = document.createElement('label');
  label.innerText = mode.toUpperCase();
  label.prepend(radio);
  output_selector.append(label);
  // this.out_modes.push(radio);
}


// -- Create Header Action Buttons
const btn_open_sidebar = UI.create_button('<i class="fa-solid fa-right-to-bracket fa-flip-horizontal"></i>', {title: 'Toggle Sidebar'});
const btn_open_popout = UI.create_button('<i class="fa-solid fa-up-right-from-square"></i>', {title: 'Open Popout'});
const btn_restore_popout = UI.create_button('<i class="fa-regular fa-window-restore"></i>', {title: 'Restore Popout Position'});
if (VIEW === 'popout') {
  header_actions.prepend(btn_restore_popout);
} else if (VIEW === 'sidebar') {
  header_actions.prepend(btn_open_popout);
} else {
  header_actions.prepend(btn_open_sidebar, btn_open_popout);
}
btn_restore_popout.addEventListener('click', ev => {
  ev.preventDefault();
  browser.runtime.sendMessage({key: 'restore_popout'});
});

btn_open_popout.addEventListener('click', ev => {
  ev.preventDefault();
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

let opt_color_wheel = document.getElementById('opt-color-wheel');
let opt_lock = document.getElementById('opt-lock');
let opt_theme_mode = document.querySelectorAll('input[name="opt-theme-mode"]');
let opt_gen_mode = document.querySelectorAll('input[name="opt-gen-mode"]');
let opt_output_mode = document.querySelectorAll(`input[name="${output_selector.dataset.name}"]`);



btn_new.addEventListener('click', ev => {
  browser.runtime.sendMessage({key: 'new_scheme', origin: MY_ID});
});

btn_sync.addEventListener('click', ev => {
  browser.runtime.sendMessage({key: 'sync', origin: MY_ID});
});

btn_reload.addEventListener('click', ev => {
  browser.runtime.reload();
});


btn_surprise.addEventListener('click', ev => {
  get_updated_data().then(data => {
    let data_loaded = data.loaded;
    let scheme = data_loaded.get_selected();
    
    scheme.randomize();
    scheme.compute_colors();
    
    
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
  label:                     '',
  show_output_mode_selector: false,
});
const text_picker = new QPicker({
  label:                     '',
  show_output_mode_selector: false,
});
panel_picker.append_to(pickers_container);
text_picker.append_to(pickers_container);

panel_picker.addEventListener('colorchange', evt => {
  console.log('PANEL COLOR CHANGE', evt);
  /** @type {QColor} */
  let color = evt.color.clone();
  
  get_updated_data().then(data => {
    console.info('Got data response from background page:', data);
    let data_loaded = data.loaded;
    let scheme = data_loaded.get_selected();
    scheme.panel = color;
    
    scheme.compute_colors();
    
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
  
  get_updated_data().then(data => {
    let data_loaded = data.loaded;
    let scheme = data_loaded.get_selected();
    scheme.text = color;
    scheme.compute_colors();
    
    scheme.apply();
    
    browser.runtime.sendMessage({
      key:    'update_scheme_color',
      type:   'text',
      origin: MY_ID
    });
  });
});





// -- UI Events
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
  
  let card_inner = document.createElement('div');
  card_inner.className = 'card-inner';
  scheme_card.append(card_inner);
  
  
  let card_front = document.createElement('div');
  card_front.className = 'card-front';
  let card_back = document.createElement('div');
  card_back.className = 'card-back';
  
  card_inner.append(card_front, card_back);
  
  let modes = document.createElement('span');
  modes.className = 'modes';
  card_front.append(modes);
  
  let gen_mode = document.createElement('span');
  gen_mode.className = 'mode gen-mode';
  modes.append(gen_mode);
  
  
  let actions_left = document.createElement('span');
  actions_left.className = 'actions left';
  card_front.append(actions_left);
  
  let actions_right = document.createElement('span');
  actions_right.className = 'actions';
  card_front.append(actions_right);
  
  
  let button_sync = document.createElement('button');
  button_sync.className = 'btn-icon sync';
  actions_left.append(button_sync);
  
  
  const default_indicator = document.createElement('button');
  default_indicator.className = 'btn-icon default';
  actions_right.append(default_indicator);
  
  let button_delete = document.createElement('button');
  button_delete.className = 'btn-icon delete';
  actions_right.append(button_delete);
  
  let button_clone = document.createElement('button');
  button_clone.className = 'btn-icon clone';
  actions_right.append(button_clone);
  
  // let button_flip = document.createElement('button');
  // button_flip.className = 'btn-icon flip';
  // button_flip.innerHTML = '<i class="fa-solid fa-right-left"></i>';
  // actions_right.append(button_flip);
  //
  // button_flip.addEventListener('click', ev => {
  //   ev.preventDefault();
  //   ev.stopPropagation();
  //   scheme_card.classList.toggle('flip');
  // });
  
  button_sync.addEventListener('click', ev => {
    ev.stopPropagation();
    if (button_sync.style.cursor !== 'pointer') return;
    browser.runtime.sendMessage({key: 'restore_scheme', id: scheme.id, origin: MY_ID});
  });
  
  
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
  
  card_front.addEventListener('click', ev => {
    if (scheme_card.dataset.selected === 'true') return;
    browser.runtime.sendMessage({key: 'set_scheme', id: scheme.id, origin: MY_ID});
  });
  
  
  return scheme_card;
}


/**
 * @param {{synced: QCollection, loaded: QCollection}} data
 * @param {string} origin
 * @param {string[]} ignore
 */
function update_ui(data, origin = 'bg', ignore = []) {
  const is_origin = (origin === MY_ID);
  // console.log('Updating UI', {origin, ignore, is_origin});
  
  const loaded = data.loaded;
  
  const selected_scheme = loaded.get_selected();
  
  if (data.loaded.equals(data.synced)) {
    btn_sync.disabled = true;
  } else {
    btn_sync.disabled = false;
  }
  
  
  for (let key in options) {
    options[key].checked = loaded.options[key];
  }
  
  scheme_info.innerHTML = `<small>(${loaded._schemes.length})</small>`;
  
  // header_logo_container.style.setProperty('--primary', selected_scheme.cached[1].to_string());
  // header_logo_container.style.setProperty('--secondary', selected_scheme.cached[4].to_string());
  // header_logo_container.style.setProperty('--tertiary', selected_scheme.cached[5].to_string());
  
  // header_logo_container.querySelectorAll('q-svg').forEach(el => {
  //   el.setAttribute('data-class', `gen-${selected_scheme.gen_mode}`);
  // });
  
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
      if (!scheme.cached || scheme.cached.length < 6) {
        scheme.compute_colors();
      }
      
      card.style.setProperty('--bg', scheme.cached[0].to_string());
      card.style.setProperty('--fg', scheme.cached[1].to_string());
      
      let gen_mode = card.querySelector('.modes .gen-mode');
      gen_mode.dataset.title = 'Generation Mode:';
      
      let qsvg = gen_mode.querySelector('q-svg');
      if (!qsvg) {
        qsvg = document.createElement('q-svg');
        gen_mode.append(qsvg);
      }
      qsvg.style.setProperty('--primary', scheme.cached[1].to_string());
      qsvg.style.setProperty('--secondary', scheme.cached[4].to_string());
      qsvg.style.setProperty('--tertiary', scheme.cached[5].to_string());
      qsvg.setAttribute('width', '2.5em');
      qsvg.setAttribute('height', '2.5em');
      
      
      
      if (scheme.gen_mode === 'normal') {
        gen_mode.dataset.title += ' Single Tone';
        qsvg.setAttribute('src', '../assets/icons/droplet.svg');
      } else if (scheme.gen_mode === 'colorful') {
        gen_mode.dataset.title += ' Colorful';
        qsvg.setAttribute('src', '../assets/icons/triadic.svg');
      } else if (scheme.gen_mode === 'dual') {
        gen_mode.dataset.title += ' Dual Tone';
        qsvg.setAttribute('src', '../assets/icons/dual.svg');
      }
      
      let sync = card.querySelector('.actions .sync');
      sync.classList.add('always-visible');
      sync.style.cursor = 'default';
      
      let synced = data.synced;
      
      let found = synced.find_by_id(scheme.id);
      
      if (found && scheme.equals(found)) {
        sync.dataset.title = 'Scheme is Synced Across Devices';
        sync.innerHTML = ' <i class="fa-solid fa-cloud"></i>';
      } else if (found) {
        sync.dataset.title = 'Scheme has Local Changes (Click to Restore)';
        sync.innerHTML = '<i class="fa-solid fa-download"></i>';
        sync.style.cursor = 'pointer';
      } else {
        sync.dataset.title = 'Local Scheme';
        sync.innerHTML = ' <i class="fa-regular fa-cloud"></i>';
      }
      
      
      
      let actions = card.querySelector('.actions');
      
      let modes = card.querySelector('.modes');
      modes.style.color = scheme.cached[4].to_string();
      
      
      
      
      
      let button_clone = card.querySelector('.actions .clone');
      button_clone.title = 'Clone Scheme';
      button_clone.innerHTML = '<i class="fa-solid fa-clone"></i>';
      // button_clone.style.color = scheme.cached[1].to_string();
      
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
  
  text_picker.picker_mode = panel_picker.picker_mode = loaded.options.color_wheel ? 'hsl' : 'hsv';
  text_picker.show_output = panel_picker.show_output = loaded.options.show_output;
  text_picker.show_slider_value = panel_picker.show_slider_value = loaded.options.show_slider_value;
  text_picker.show_slider_label = panel_picker.show_slider_label = loaded.options.show_slider_label;
  
  browser.theme.getCurrent().then(theme => {
    set_theme_colors(theme);
  });
  
  panel_picker.disabled = text_picker.disabled = !selected_scheme.editable;
  btn_surprise.disabled = !selected_scheme.editable;
  opt_lock.disabled = selected_scheme.default;
  opt_lock.checked = selected_scheme.locked || selected_scheme.default;
  opt_lock.parentElement.querySelector('i').className = opt_lock.checked ? 'fa-solid fa-lock' : 'fa-solid fa-lock-open';
  
  
  opt_color_wheel.checked = loaded.options.color_wheel;
  
  
  opt_theme_mode.forEach(radio => {
    radio.checked = (radio.value === selected_scheme.theme_mode);
    radio.disabled = !selected_scheme.editable;
  });
  
  opt_gen_mode.forEach(radio => {
    radio.checked = (radio.value === selected_scheme.gen_mode);
    radio.disabled = !selected_scheme.editable;
  });
  
  if (!loaded.options?.output_mode) loaded.options.output_mode = 'hsl';
  opt_output_mode.forEach(radio => {
    radio.checked = (radio.value === loaded.options.output_mode);
  });
  text_picker.output_mode = loaded.options.output_mode;
  panel_picker.output_mode = loaded.options.output_mode;
  
  if (selected_scheme.gen_mode === 'dual') {
    text_picker.container.style.display = '';
  } else {
    text_picker.container.style.display = 'none';
  }
  
}


browser.runtime.onMessage.addListener((message, sender, send_response) => {
  if (!message['to'] || message['to'] !== 'front') return;
  
  // console.log('onMessage OPTIONS', message, MY_ID);
  
  if (message.key === 'refresh') {
    get_updated_data().then(data => {
      try {
        update_ui(data, message.origin, message.ignore);
      } catch (err) {
        console.error('Failed to update UI', err, data);
      }
    });
  }
  
  if (message.key === 'resize') {
    resize();
  }
  
});



function set_theme_colors(theme) {
  if (theme.colors) {
    const url = new URL(window.location.href);
    const view = url.searchParams.get('view');
    console.info('View param:', view);
    if (view === 'sidebar') {
      // document.body.parentElement.style.setProperty('--q-base', theme.colors.sidebar);
      // document.body.parentElement.style.setProperty('--q-fg-color', theme.colors.sidebar_text);
    } else if (view === 'popup') {
      if (options.apply_colors_popup.checked) {
        document.body.parentElement.style.setProperty('--q-base', theme.colors.popup);
        document.body.parentElement.style.setProperty('--q-fg-color', theme.colors.popup_text);
      } else {
        document.body.parentElement.style.removeProperty('--q-base');
        document.body.parentElement.style.removeProperty('--q-fg-color');
      }
    } else {
      // document.body.parentElement.style.setProperty('--q-base', theme.colors.popup);
      // document.body.parentElement.style.setProperty('--q-fg-color', theme.colors.popup_text);
    }
  }
}

browser.theme.onUpdated.addListener((info) => {
  if (info.theme.colors) {
    set_theme_colors(info.theme);
  }
});

browser.theme.getCurrent().then(theme => {
  set_theme_colors(theme);
});




// -- Initialize UI
function get_updated_data() {
  return new Promise((resolve, reject) => {
    const bg = browser.runtime.getBackgroundPage();
    bg.then(win => {
      if (win) {
        resolve(win.get_data());
      } else {
        browser.runtime.sendMessage({key: 'get_data', origin: MY_ID}).then(response => {
          
          if (response && response.loaded && response.synced) {
            resolve({
              loaded: QCollection.unserialize(response.loaded),
              synced: QCollection.unserialize(response.synced)
            });
          } else {
            reject('Invalid data response');
          }
        }).catch(err => {
          reject('Failed to get data from background page: ' + err);
        });
      }
    }).catch(err => {
      reject('Failed to get background page: ' + err);
    });
  });
}


/**
 * @param {{synced: QCollection, loaded: QCollection}} data
 */
function init(data) {
  let data_loaded = data.loaded;
  
  text_picker.picker_mode = panel_picker.picker_mode = data_loaded.options.color_wheel ? 'hsl' : 'hsv';
  panel_picker.show_output = text_picker.show_output = data_loaded.options.show_output;
  panel_picker.show_slider_value = text_picker.show_slider_value = data_loaded.options.show_slider_value;
  panel_picker.show_slider_label = text_picker.show_slider_label = !!data_loaded.options.show_slider_label;
  
  panel_picker.output_mode = text_picker.output_mode = data_loaded.options.output_mode || 'hsl';
  
  // opt_color_wheel.checked = data_loaded.options.color_wheel === 'hsl';
  
  opt_color_wheel.addEventListener('change', (e) => {
    data_loaded.options.color_wheel = opt_color_wheel.checked;
    
    browser.runtime.sendMessage({key: 'update_options', origin: MY_ID});
  });
  
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
        data_loaded.get_selected().compute_colors();
        data_loaded.get_selected().apply();
        browser.runtime.sendMessage({key: 'update_options', origin: MY_ID});
      }
    });
  });
  
  opt_gen_mode.forEach(radio => {
    radio.addEventListener('change', ev => {
      if (radio.checked) {
        data_loaded.get_selected().gen_mode = radio.value;
        data_loaded.get_selected().compute_colors();
        data_loaded.get_selected().apply();
        browser.runtime.sendMessage({key: 'update_options', origin: MY_ID});
      }
    });
  });
  
  opt_output_mode.forEach(radio => {
    radio.addEventListener('change', ev => {
      if (radio.checked) {
        data_loaded.options.output_mode = radio.value;
        browser.runtime.sendMessage({key: 'update_options', origin: MY_ID});
      }
    });
  });
  
  
  update_ui(data, MY_ID);
  
  document.addEventListener('DOMContentLoaded', () => {
    resize(true);
  });
  
}

function resize(loop = true) {
  if (VIEW === 'popout') {
    browser.windows.getCurrent().then(win => {
      if (win) {
        let offset = win.height - window.innerHeight;
        const html = document.documentElement;
        const width = html.scrollWidth;
        let height = html.offsetHeight + offset;
        
        // console.log('POPOUT', width, html.scrollHeight, html.scrollTopMax, html.offsetHeight, html.clientHeight, html, win.height, window.innerHeight);
        
        browser.windows.update(win.id, {height}).then(() => {
          if (loop) {
            setTimeout(() => {
              resize(false);
            }, 50);
          }
        });
      }
    });
  }
}

get_updated_data().then(data => {
  init(data);
});



register_q_svg();














