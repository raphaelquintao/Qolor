import { QCollection } from '../src/core/q_collection.js';
import { QColor } from '../src/core/q_color.js';
import { register_q_svg } from '../src/core/q_html_elements.js';
import { QPicker } from '../src/core/q_picker.js';
import { BYTES_TO_STRING, THROTTLE, UI, UUID } from "../src/core/q_utils.js";

// -- SETUP ---
const MY_ID = UUID();
const URL_SEARCH_PARAMS = new URLSearchParams(window.location.search);
const VIEW = URL_SEARCH_PARAMS.get('view') || 'popup';
document.documentElement.dataset.view = VIEW;

// console.info('Options View Open:', document.documentElement.dataset.view);

function _(message, substitutions = undefined) {
  return browser.i18n.getMessage(message, substitutions) || message;
}

document.body.innerHTML = document.body.innerHTML.replaceAll(/__MSG_(.+)__/g, (substring, args) => {
  // console.debug('Translating message', {substring, args});
  return _(args);
});
register_q_svg();



// -- DOM Elements
const advanced_prefs_section = document.querySelector('.advanced-prefs-section');
const prefs_container = document.querySelector('.prefs-container');
const pickers_container = document.querySelector('#pickers-container');
const scheme_selector = document.querySelector('#scheme-selector');
const scheme_container = document.querySelector('#scheme-selector .scheme-container');
const header_actions = document.querySelector('#main-header .actions');
const header_logo_container = document.querySelector('#main-header .logo-container');
const header_logo = document.querySelector('#main-header .logo-container .logo');
const header_title = document.querySelector('#main-header .title');
const output_selector = document.querySelector('#output-selector');

header_title.innerText = browser.runtime.getManifest().short_name.slice(1);
document.title = browser.runtime.getManifest().short_name + `- ${VIEW.charAt(0).toUpperCase() + VIEW.slice(1)}`;

// -- Create Options Checkboxes
const options = {
  show_output:        UI.create_checkbox(_('Show Output/Input'), false, {className: 'checkbox-switch'}),
  show_slider_value:  UI.create_checkbox(_('Show Slider Value'), false, {className: 'checkbox-switch'}),
  show_slider_label:  UI.create_checkbox(_('Show Slider Label'), false, {className: 'checkbox-switch'}),
  apply_colors_popup: UI.create_checkbox(_('Apply Colors to Popup/Sidebar'), false, {className: 'checkbox-switch'}),
};
for (let key in options) prefs_container.append(options[key].parentElement);

output_selector.dataset.name = `qp-output-mode-${MY_ID}`;

for (let mode of QPicker.OUTPUT_MODES) {
  let radio = UI.create_input('radio', mode.toUpperCase(), {
    name:      output_selector.dataset.name,
    value:     mode,
    checked:   false,
    className: 'btn'
  });
  output_selector.append(radio.parentElement);
}



// -- Create Header Action Buttons
const btn_open_sidebar = UI.create_button('<i class="fa-solid fa-right-to-bracket fa-flip-horizontal"></i>', {dataset: {title: _('Toggle Sidebar')}});
const btn_open_popout = UI.create_button('<i class="fa-solid fa-up-right-from-square"></i>', {dataset: {title: _('Open in Popout')}});
const btn_restore_popout = UI.create_button('<i class="fa-regular fa-window-restore"></i>', {dataset: {title: _('Restore Popout Position')}});
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

// -- DOM Buttons
let btn_new = document.getElementById('btn-new');
let btn_reload = document.getElementById('btn-reload');

let btn_surprise = document.getElementById('btn-surprise');
let btn_sync_load = document.getElementById('btn-sync-load');
let btn_sync_save = document.getElementById('btn-sync-save');

let opt_color_wheel = document.getElementById('opt-color-wheel');
let opt_lock = document.getElementById('opt-lock');
let opt_theme_mode = document.querySelectorAll('input[name="opt-theme-mode"]');
let opt_gen_mode = document.querySelectorAll('input[name="opt-gen-mode"]');
let opt_output_mode = document.querySelectorAll(`input[name="${output_selector.dataset.name}"]`);

btn_new.addEventListener('click', ev => {
  browser.runtime.sendMessage({key: 'new_scheme', origin: MY_ID});
});

let sync_load_confirm_timeout = null;
let sync_load_restore = () => {
  btn_sync_load.classList.remove('show-confirm', 'btn-danger');
  sync_load_confirm_timeout = null;
};
btn_sync_load.addEventListener('click', ev => {
  ev.preventDefault();
  if (!sync_load_confirm_timeout) {
    ev.currentTarget.classList.add('show-confirm', 'btn-danger');
    sync_load_confirm_timeout = setTimeout(sync_load_restore, 2000);
    return;
  }
  clearTimeout(sync_load_confirm_timeout);
  sync_load_restore();
  browser.runtime.sendMessage({key: 'sync-load', origin: MY_ID});
});

btn_sync_save.addEventListener('click', ev => {
  browser.runtime.sendMessage({key: 'sync-save', origin: MY_ID});
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
const panel_picker = new QPicker({show_output_mode_selector: false});
const text_picker = new QPicker({show_output_mode_selector: false});
panel_picker.append_to(pickers_container);
text_picker.append_to(pickers_container);

panel_picker.addEventListener('colorchange', THROTTLE(evt => {
  /** @type {QColor} */
  let color = evt.color.clone();
  
  get_updated_data().then(data => {
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
  
}, 32));

text_picker.addEventListener('colorchange', THROTTLE(evt => {
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
}, 32));





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
    // console.debug('Wheel event on scheme selector', {deltaX: ev.deltaX, deltaY: ev.deltaY});
    scheme_selector.scrollBy({
      left:     ev.deltaY > 0 ? 90 : -90,
      behavior: 'smooth'
    });
    scheme_selector.querySelectorAll('.flip').forEach((el, i) => {
      el.classList.remove('flip');
    });
    
  }, {passive: false});
  
  
  document.addEventListener('click', ev => {
    for (let el of collapsable) {
      if (el.dataset.collapsed === 'false' && !el.contains(ev.target)) {
        el.dataset.collapsed = 'true';
      }
    }
    scheme_selector.querySelectorAll('.flip').forEach((el, i) => {
      if (el.contains(ev.target)) return;
      el.classList.remove('flip');
    });
  });
  
  // Tooltip
  let _active_tooltip = null;
  let _active_tooltip_timeout = null;
  
  function _clear_tooltip() {
    clearTimeout(_active_tooltip_timeout);
    _active_tooltip_timeout = null;
    if (_active_tooltip) {
      _active_tooltip.remove();
      _active_tooltip = null;
    }
  }
  
  document.documentElement.addEventListener('mousemove', ev => {
    // console.log('Move event', ev.target, ev.clientX, ev.clientY);
    document.documentElement.style.setProperty('--mouse-x', `${ev.clientX}px`);
    document.documentElement.style.setProperty('--mouse-y', `${ev.clientY}px`);
  });
  
  document.addEventListener('mouseover', ev => {
    if (ev.target.title && ev.target.title.length > 0) {
      ev.target.dataset.title = _(ev.target.title);
      ev.target.removeAttribute('title');
    }
    
    if (ev.target.dataset.title) {
      _clear_tooltip();
      
      let tooltip = document.createElement('div');
      tooltip.className = 'tooltip';
      tooltip.innerHTML = ev.target.dataset.title;
      document.body.append(tooltip);
      _active_tooltip = tooltip;
      
      _active_tooltip_timeout = setTimeout(() => {
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
      
      ev.target.addEventListener('mouseleave', _clear_tooltip, {once: true});
    }
  });
  
}

bind_ui_events();

function create_scheme_card(scheme, selected = false) {
  
  let scheme_card_holder = UI.create_element('div', {
    className: 'scheme-card-holder'
  });
  
  let scheme_card = UI.create_element('div', {className: 'scheme-card', id: scheme.id});
  
  scheme_card_holder.append(scheme_card);
  
  
  let card_inner = UI.create_element('div', {className: 'card-inner'});
  scheme_card.append(card_inner);
  
  let card_front = UI.create_element('div', {className: 'card-front'});
  let card_back = UI.create_element('div', {className: 'card-back'});
  
  card_inner.append(card_front, card_back);
  
  let modes = UI.create_element('span', {className: 'modes'});
  card_front.append(modes);
  
  let gen_mode = UI.create_element('span', {className: 'mode gen-mode'});
  modes.append(gen_mode);
  
  let actions_left = UI.create_element('span', {className: 'actions left'});
  let actions_right = UI.create_element('span', {className: 'actions'});
  card_front.append(actions_left, actions_right);
  
  
  // Buttons
  
  let button_sync = UI.create_element('button', {className: 'btn-icon sync'});
  let default_indicator = UI.create_element('button', {className: 'btn-icon default'});
  let button_delete = UI.create_element('button', {className: 'btn-icon delete'});
  let button_clone = UI.create_element('button', {className: 'btn-icon clone'});
  
  
  // let button_export = document.createElement('button');
  // button_export.className = 'btn-icon';
  // button_export.innerHTML = '<i class="fa-solid fa-file-export"></i>';
  
  
  actions_left.append(button_sync);
  actions_right.append(default_indicator, button_delete, button_clone);
  
  let delete_view = UI.create_element('div', {className: 'delete-view alert danger'});
  let delete_dismiss = UI.create_element('button', {
    className: 'btn-icon dismiss',
    innerHTML: '<i class="fa-solid fa-xmark"></i>'
  });
  
  let delete_header = UI.create_element('header', {
    innerHTML: `<span class="title">${_('Delete Scheme')}</span>`,
  });
  
  let delete_message = UI.create_element('div', {
    className: 'content',
    innerHTML: _('delete_message'),
  });
  
  let delete_cancel = UI.create_element('button', {
    className: 'cancel',
    dataset:   {title: _('Cancel')},
    innerHTML: _('Cancel'),
  });
  
  let delete_confirm = UI.create_element('button', {
    className: 'btn-info',
    dataset:   {title: _('Delete')},
    innerHTML: '<i class="fa-solid fa-trash-can"></i> ' + _('Delete'),
  });
  
  
  let delete_footer = UI.create_element('footer');
  delete_footer.append(delete_cancel, delete_confirm);
  
  delete_view.append(delete_header, delete_dismiss, delete_message, delete_footer);
  
  card_back.append(delete_view);
  
  
  let sync_view = UI.create_element('div', {className: 'sync-view alert info hide'});
  let sync_dismiss = UI.create_element('button', {
    className: 'btn-icon dismiss',
    innerHTML: '<i class="fa-solid fa-xmark"></i>'
  });
  let sync_header = UI.create_element('header', {
    innerHTML: `<span class="title">${_('Cloud Sync')}</span>`,
  });
  
  let sync_message = UI.create_element('div', {
    className: 'content sync-message',
  });
  sync_message.innerHTML = `<span>${_('sync_message')}</span>`;
  sync_message.innerHTML += `<i class="fa fa-exclamation"></i><small>${_('sync_warning')}</small>`;
  
  let btn_restore_cloud = UI.create_element('button', {
    className: 'btn-restore-from-cloud btn-info',
    dataset:   {title: _('Restore from Cloud')},
    innerHTML: '<i class="fa-solid fa-cloud-arrow-down"></i> ' + _('Restore'),
  });
  
  let btn_remove_cloud = UI.create_element('button', {
    className: 'btn-remove-from-cloud btn-danger',
    dataset:   {title: _('Remove from Cloud')},
    innerHTML: '<i class="fa-solid fa-trash"></i> ' + _('Delete'),
  });
  
  let btn_save_cloud = UI.create_element('button', {
    className: 'btn-save-to-cloud btn-success',
    dataset:   {title: _('Save to Cloud')},
    innerHTML: '<i class="fa-solid fa-cloud-arrow-up"></i> ' + _('Save'),
  });
  
  let sync_footer = UI.create_element('footer');
  sync_footer.append(btn_restore_cloud, btn_remove_cloud, btn_save_cloud);
  
  sync_view.append(sync_header, sync_dismiss, sync_message, sync_footer);
  
  card_back.append(sync_view);
  
  
  [delete_cancel, delete_dismiss, sync_dismiss].forEach(value => {
    value.addEventListener('click', ev => {
      ev.stopPropagation();
      scheme_card.classList.remove('flip');
    });
  });
  
  btn_restore_cloud.addEventListener('click', ev => {
    browser.runtime.sendMessage({key: 'restore_scheme', id: scheme.id, origin: MY_ID}).then(() => {
      scheme_card.classList.remove('flip');
    });
  });
  
  btn_remove_cloud.addEventListener('click', ev => {
    browser.runtime.sendMessage({key: 'delete_scheme', id: scheme.id, from: ['sync'], origin: MY_ID});
  });
  
  btn_save_cloud.addEventListener('click', ev => {
    browser.runtime.sendMessage({key: 'sync-save', id: scheme.id, origin: MY_ID}).then(() => {
      scheme_card.classList.remove('flip');
    });
  });
  
  delete_confirm.addEventListener('click', ev => {
    browser.runtime.sendMessage({key: 'delete_scheme', id: scheme.id, from: ['local', 'sync'], origin: MY_ID});
  });
  
  button_sync.addEventListener('click', ev => {
    ev.stopPropagation();
    if (button_sync.style.cursor !== 'pointer') return;
    scheme_card.classList.add('flip');
    delete_view.classList.add('hide');
    sync_view.classList.remove('hide');
  });
  
  
  button_clone.addEventListener('click', ev => {
    ev.stopPropagation();
    browser.runtime.sendMessage({key: 'clone_scheme', id: scheme.id, origin: MY_ID});
  });
  
  button_delete.addEventListener('click', ev => {
    ev.stopPropagation();
    scheme_card.classList.add('flip');
    sync_view.classList.add('hide');
    delete_view.classList.remove('hide');
  });
  
  card_front.addEventListener('click', ev => {
    if (scheme_card.dataset.selected === 'true') return;
    browser.runtime.sendMessage({key: 'set_scheme', id: scheme.id, origin: MY_ID});
  });
  
  
  return scheme_card_holder;
}


/**
 * @param {{synced: QCollection, loaded: QCollection, usage: {sync: number, local: number}}} data
 * @param {string} origin
 * @param {string[]} ignore
 */
function update_ui(data, origin = 'bg', ignore = []) {
  const is_origin = (origin === MY_ID);
  // console.log('Updating UI', {origin, ignore, is_origin});
  
  const loaded = data.loaded;
  
  const selected_scheme = loaded.get_selected();
  
  if (data.loaded.equals(data.synced)) {
    btn_sync_save.disabled = true;
    btn_sync_load.disabled = true;
  } else {
    console.debug('Unsynced changes detected, enabling sync buttons', data.usage);
    btn_sync_save.disabled = false;
    btn_sync_load.disabled = data.usage.sync === 0;
  }
  
  
  for (let key in options) {
    options[key].checked = loaded.options[key];
  }
  
  
  let loading_card = scheme_container.querySelector('.scheme-card.loading');
  if (loading_card) loading_card.remove();
  let scheme_cards = scheme_container.querySelectorAll('.scheme-card');
  for (let scheme of loaded.schemes) {
    if (!scheme_cards || ![...scheme_cards].find(c => c.id === scheme.id)) {
      let card = create_scheme_card(scheme, false);
      scheme_container.append(card);
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
      card.style.setProperty('--primary', scheme.cached[1].to_string());
      card.style.setProperty('--secondary', scheme.cached[4].to_string());
      card.style.setProperty('--tertiary', scheme.cached[5].to_string());
      
      let gen_mode = card.querySelector('.gen-mode');
      gen_mode.dataset.title = _('Generation Mode') + ': ';
      
      let qsvg = gen_mode.querySelector('q-svg');
      if (!qsvg) {
        qsvg = document.createElement('q-svg');
        gen_mode.append(qsvg);
      }
      qsvg.setAttribute('width', '2.3em');
      qsvg.setAttribute('height', '2.3em');
      
      
      
      if (scheme.gen_mode === 'normal') {
        gen_mode.dataset.title += _('Single Tone');
        qsvg.setAttribute('src', '../assets/icons/droplet.svg');
      } else if (scheme.gen_mode === 'colorful') {
        gen_mode.dataset.title += _('Colorful');
        qsvg.setAttribute('src', '../assets/icons/triadic.svg');
      } else if (scheme.gen_mode === 'dual') {
        gen_mode.dataset.title += _('Dual Tone');
        qsvg.setAttribute('src', '../assets/icons/dual.svg');
      }
      
      let sync = card.querySelector('.actions .sync');
      // sync.classList.add('always-visible');
      sync.style.cursor = 'pointer';
      
      let synced = data.synced;
      
      let found = synced.find_by_id(scheme.id);
      
      let sync_view_header = card.querySelector('.sync-view header');
      let sync_view_content = card.querySelector('.sync-view .content');
      
      let btn_restore_from_cloud = card.querySelector('.sync-view .btn-restore-from-cloud');
      let btn_remove_from_cloud = card.querySelector('.sync-view .btn-remove-from-cloud');
      let btn_save_to_cloud = card.querySelector('.sync-view .btn-save-to-cloud');
      btn_restore_from_cloud.disabled = true;
      btn_remove_from_cloud.disabled = false;
      btn_save_to_cloud.disabled = true;
      
      const usage_curr = BYTES_TO_STRING(found ? found.usage : 0);
      let usage_tooltip = `<span style='display: flex; flex-direction: column; gap: 0.15em;'>`;
      usage_tooltip += `<span><b>${_('Total Usage')}</b>: ${BYTES_TO_STRING(data.usage.sync)} / ${BYTES_TO_STRING(102400, 0)}</span>`;
      usage_tooltip += `<span><b>${_('Item Usage')}</b>: ${usage_curr} / ${BYTES_TO_STRING(8192, 0)}</span>`;
      usage_tooltip += `</span>`;
      
      
      const usage_header = `<small data-title="${usage_tooltip}">${usage_curr}</small>`;
      
      
      sync_view_header.innerHTML = `<span class="title">${_('Cloud Sync')}</span> · ${usage_header}`;
      
      // sync_view_content.innerHTML = `${BYTES_TO_STRING(data.usage.sync)} / ${BYTES_TO_STRING(102400, 0)}`;
      
      
      if (found && scheme.equals(found) && synced.selected === scheme.id) {
        sync.dataset.title = _('Scheme is Synced and Selected Across Devices');
        sync.innerHTML = ' <i class="fa-solid fa-cloud"></i>';
      } else if (found && scheme.equals(found)) {
        sync.dataset.title = _('Scheme is Synced');
        sync.innerHTML = ' <i class="fa-regular fa-cloud"></i>';
      } else if (found) {
        sync.dataset.title = _('Scheme has unsaved changes') + ` (${_('Click for options')})`;
        sync.innerHTML = '<i class="fa-solid fa-not-equal"></i>';
        sync.style.cursor = 'pointer';
        btn_restore_from_cloud.disabled = false;
        btn_save_to_cloud.disabled = false;
      } else {
        sync.dataset.title = _('Local Scheme') + ` (${_('Click for options')})`;
        sync.innerHTML = ' <i class="fa-solid fa-sync"></i>';
        sync.style.cursor = 'pointer';
        btn_restore_from_cloud.disabled = true;
        btn_remove_from_cloud.disabled = true;
        btn_save_to_cloud.disabled = false;
      }
      
      
      let modes = card.querySelector('.modes');
      modes.style.color = scheme.cached[4].to_string();
      
      
      let button_clone = card.querySelector('.actions .clone');
      button_clone.dataset.title = _('Clone Scheme');
      button_clone.innerHTML = '<i class="fa-solid fa-clone"></i>';
      // button_clone.style.color = scheme.cached[1].to_string();
      
      let button_delete = card.querySelector('.actions .delete');
      if (scheme.locked) {
        button_delete.classList.add('always-visible');
        button_delete.disabled = true;
        button_delete.dataset.title = _('Locked Scheme');
        button_delete.innerHTML = '<i class="fa-solid fa-lock"></i>';
      } else {
        button_delete.classList.remove('always-visible');
        button_delete.disabled = false;
        button_delete.dataset.title = _('Delete Scheme');
        button_delete.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
      }
      
      let default_indicator = card.querySelector('.actions .default');
      default_indicator.dataset.title = _('Default Scheme');
      default_indicator.innerHTML = '<i class="fa-solid fa-star"></i>';
      if (scheme.default) {
        default_indicator.style.display = '';
        button_delete.style.display = 'none';
      } else {
        default_indicator.style.display = 'none';
        button_delete.style.display = '';
      }
      
    } else {
      console.warn('Scheme not found for card', card, scheme);
      card.classList.remove('flip');
      card.style.width = '0px';
      card.style.height = '0px';
      setTimeout(() => {
        card.parentElement.remove();
      }, 305);
    }
  }
  
  
  
  
  const selected_card = scheme_container.querySelector('.scheme-card[data-selected="true"]');
  if (selected_card?.id !== selected_scheme.id) {
    if (selected_card) {
      selected_card.dataset.selected = 'false';
      selected_card.parentElement.classList.remove('selected');
    }
    let new_selected = scheme_container.querySelector(`.scheme-card[id="${selected_scheme.id}"]`);
    new_selected.dataset.selected = 'true';
    new_selected.parentElement.classList.add('selected');
    scheme_selector.scrollTo({
      left:     new_selected.parentElement.offsetLeft - scheme_selector.clientWidth / 2 + new_selected.clientWidth / 2,
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
  if (theme && theme.colors && options.apply_colors_popup.checked) {
    const url = new URL(window.location.href);
    const view = url.searchParams.get('view');
    if (view === 'sidebar') {
      document.body.parentElement.style.setProperty('--q-base', theme.colors.sidebar);
      document.body.parentElement.style.setProperty('--q-fg-color', theme.colors.sidebar_text);
    } else if (view === 'popup') {
      
      document.body.parentElement.style.setProperty('--q-base', theme.colors.popup);
      document.body.parentElement.style.setProperty('--q-fg-color', theme.colors.popup_text);
      
    } else {
      document.body.parentElement.style.setProperty('--q-base', theme.colors.popup);
      document.body.parentElement.style.setProperty('--q-fg-color', theme.colors.popup_text);
    }
  } else {
    document.body.parentElement.style.removeProperty('--q-base');
    document.body.parentElement.style.removeProperty('--q-fg-color');
  }
}

browser.theme.onUpdated.addListener((info) => {
  if (info.theme) {
    set_theme_colors(info.theme);
  }
});





// -- Initialize UI
async function get_updated_data() {
  try {
    const bg = await browser.runtime.getBackgroundPage();
    if (bg) return bg.get_data();
    const response = await browser.runtime.sendMessage({key: 'get_data', origin: MY_ID});
    if (response && response.loaded && response.synced) {
      return {
        loaded: QCollection.unserialize(response.loaded),
        synced: QCollection.unserialize(response.synced),
        usage:  response.usage,
      };
    }
  } catch (reason) {
    throw reason;
  }
  
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
  
  if (options.apply_colors_popup.checked) {
    browser.theme.getCurrent().then(theme => {
      set_theme_colors(theme);
    });
  }
  
  const advanced = {timeout: null, count: 0};
  header_logo.addEventListener('click', ev => {
    if (advanced.timeout) clearTimeout(advanced.timeout);
    advanced.count++;
    if (advanced.count >= 10) {
      advanced_prefs_section.classList.toggle('hide');
    }
    advanced.timeout = setTimeout(() => {
      advanced.count = 0;
    }, 500);
    
  });
  
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
















