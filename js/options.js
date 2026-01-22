import { QPicker } from './QPicker.js';
import { QCollection, QScheme } from "./QUtil.js";

// console.info('Controls');





let IGNORE_EVENTS = false;
let EDITING_NAME = false;
let TMP = null;

// -- BG Functions
function bg_change_name(id, new_name) {
  browser.runtime.sendMessage({key: 'change_name', id: id, new_name: new_name})
    .then(response => {
      // console.info(response);
    });
}

function bg_set_scheme(id) {
  TMP = null;
  browser.runtime.sendMessage({key: 'set_scheme', value: id})
    .then(response => {
      // console.info(response);
    });
}


// -- HEADER
let scheme_select = document.getElementById('scheme-select');
scheme_select.onchange = ev => {
  let id = ev.target.value;
  // console.log('SELECTED', id);
  bg_set_scheme(id);
};


let scheme_name = document.getElementById('scheme-name');
scheme_name.onkeydown = ev => {
  // console.info(ev.key);
  if (ev.key === 'Enter' || ev.key === 'Tab') {
    ev.preventDefault();
    ev.target.blur();
  }
};

scheme_name.onfocus = ev => {
  // console.log('focus');
  EDITING_NAME = true;
};

scheme_name.onblur = ev => {
  // console.log('unfocus');
  EDITING_NAME = false;
  let id = scheme_select.value;
  let new_name = scheme_name.innerText;
  new_name = new_name.trim();
  bg_change_name(id, new_name);
};


// -- BUTTONS
let btn_del = document.getElementById('btn-del');
let btn_undo = document.getElementById('btn-undo');
let btn_new = document.getElementById('btn-new');

let btn_reload = document.getElementById('btn-reload');
let btn_default = document.getElementById('btn-default');
let btn_save = document.getElementById('btn-save');
let btn_sync = document.getElementById('btn-sync');

let color_mode_buttons = document.querySelectorAll('input[name="color-mode"]');

console.log(color_mode_buttons);


// -- SLIDERS

let contrast_ele = document.getElementById('contrast');

let opt_text = document.getElementById('opt-text');
let opt_panel = document.getElementById('opt-panel');

let text_preview = document.getElementById('text-preview');
// let panel_preview = document.getElementById('panel-preview');

let text_picker = new QPicker("Text");
text_picker.append_to(opt_text);

let panel_picker = new QPicker("Panel");
panel_picker.append_to(opt_panel);



// -- Functions

function can_focus_slider() {
  return !EDITING_NAME;
}

function scheme_select_add(id, name, selected = false) {
  let option = document.createElement('option');
  option.value = id;
  option.innerText = name;
  option.selected = selected;
  
  scheme_select.append(option);
}

/** @param {QCollection} qCollection */
function scheme_select_fill(qCollection) {
  scheme_select.innerHTML = '';
  for (let scheme of qCollection) {
    let selected = (qCollection._selected === scheme.id);
    scheme_select_add(scheme.id, scheme.name, selected);
  }
}

function setPreviewColor(qColor) {
  // text_preview.style.backgroundColor = qColor.getTextPreviewColor();
  // panel_preview.style.backgroundColor = qColor.getPanelPreviewColor();
}

/**
 * @param {QScheme} scheme
 * @param {boolean} ignore
 */
function setColor(scheme, ignore = true) {
  IGNORE_EVENTS = ignore;
  
  console.log('MODE BUTTONS', color_mode_buttons);
  color_mode_buttons.forEach(b => {
    b.checked = (b.value === scheme.mode);
  });
  
  
  setPreviewColor(scheme);
  
  text_picker.set_hsl(scheme.text.hue, scheme.text.sat, scheme.text.bri);
  panel_picker.set_hsl(scheme.panel.hue, scheme.panel.sat, scheme.panel.bri);
  
  contrast_ele.innerHTML = scheme.contrast;
  
  scheme_name.innerText = scheme.name;
  
  IGNORE_EVENTS = false;
}

/** @param {QScheme} scheme */
function updateScheme(scheme) {
  setPreviewColor(scheme);
  
  text_picker.set_hsl(scheme.text.hue, scheme.text.sat, scheme.text.bri);
  panel_picker.set_hsl(scheme.panel.hue, scheme.panel.sat, scheme.panel.bri);
  
  return scheme;
}




btn_del.onclick = ev => {
  ev.preventDefault();
  let id = scheme_select.value;
  browser.runtime.sendMessage({key: 'del', id: id})
    .then(response => {
      // console.info(response);
    });
};

btn_undo.onclick = ev => {
  ev.preventDefault();
  // let id = scheme_select.value;
  if (TMP !== null) {
    browser.runtime.sendMessage({key: 'undo', serialized: TMP.getStr()})
      .then(response => {
        // console.info(response);
      });
  }
};

btn_new.onclick = ev => {
  ev.preventDefault();
  browser.runtime.sendMessage({key: 'new', name: ''})
    .then(response => {
      // console.info(response);
    });
};


btn_reload.onclick = ev => {
  ev.preventDefault();
  // QStorage.clearLocal();
  // QStorage.clearSync();
  browser.runtime.reload();
};

btn_default.onclick = ev => {
  ev.preventDefault();
  
  // bg_set_scheme('_default');
  let sure = confirm("Are you sure you want to reset?\nAll saved schemes will be lost forever.");
  if (sure) {
    // QStorage.clearLocal();
    // QStorage.clearSync();
    browser.runtime.sendMessage({key: 'clear'})
      .then(response => {
        // console.info(response);
      });
  }
  
};

btn_sync.onclick = ev => {
  ev.preventDefault();
  browser.runtime.sendMessage({key: 'sync'})
    .then(response => {
      // console.info(response);
    });
};

btn_save.onclick = ev => {
  ev.preventDefault();
  browser.runtime.sendMessage({key: 'save'})
    .then(response => {
      // console.info(response);
    });
};





// -- MESSAGES
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('onMessage Options', message, sender);
  // console.log('onMessage Options', message);
  
  if (message.key === 'refresh') {
    main();
  } else if (message.key === 'scheme_changed') {
    main();
  } else if (message.key === 'update_others') {
    // console.log('UPDATE UI');
    updateSliders();
  }
  
});


function updateSliders() {
  let bg = browser.runtime.getBackgroundPage();
  bg.then(page => {
    let qsynced = page.q.synced;
    let qsaved = page.q.saved;
    let qcolors = page.q.colors;
    let scheme = qcolors.getSelected();
    
    setColor(scheme);
    setState(qcolors, qsynced, qsaved);
  });
}

function setState(qcolors, qsynced, qsaved) {
  
  // console.log('TMP', TMP);
  
  let can_undo = false;
  if (TMP !== null) {
    can_undo = (!qcolors.getSelected().equals(TMP));
  }
  
  btn_sync.disabled = (qcolors.equals(qsynced));
  
  
  let editable = qcolors.getSelected().editable;
  btn_save.disabled = (qcolors.equals(qsaved));
  
  
  btn_undo.style.display = (editable && can_undo) ? '' : 'none';
  
  btn_del.style.display = (editable) ? '' : 'none';
  scheme_name.contentEditable = (editable) ? 'true' : 'false';
  
  
}


// -- MAIN
function main() {
  let bg = browser.runtime.getBackgroundPage();
  bg.then(page => {
    // console.log('Options MAIN: ', page.browser.);
    // page.debug();
    
    // console.log('SCHEMEs', page.q);
    let qsynced = page.q.synced;
    let qsaved = page.q.saved;
    let qcolors = page.q.colors;
    // console.log('SAME', qsaved.equals(qsynced));
    
    let scheme = qcolors.getSelected();
    if (TMP === null) TMP = scheme.clone();
    
    scheme_select_fill(qcolors);
    setColor(scheme, true);
    setState(qcolors, qsynced, qsaved);
    
    // console.log('TMP1', TMP);
    
    panel_picker.on_color_change = (h, s, l, a) => {
      if (IGNORE_EVENTS) return;
      
      let  q_scheme = qcolors.getSelected();
      q_scheme.panel.hue = h;
      q_scheme.panel.sat = s;
      q_scheme.panel.bri = l;
      q_scheme.apply();
      setState(qcolors, qsynced, qsaved);
      
      browser.runtime.sendMessage({key: 'update_others'});
    };
    
    text_picker.on_color_change = (h, s, l, a) => {
      // if (IGNORE_EVENTS) return;
      let q_scheme = qcolors.getSelected();
      q_scheme.text.hue = h;
      q_scheme.text.sat = s;
      q_scheme.text.bri = l;
      q_scheme.apply();
      setState(qcolors, qsynced, qsaved);
      
      browser.runtime.sendMessage({key: 'update_others'});
    };
    
    
    
    
    color_mode_buttons.forEach(button => {
      button.onchange = ev => {
        if (IGNORE_EVENTS) return;
        let qColor = updateScheme(qcolors.getSelected());
        qColor.mode = ev.target.value;
        qColor.apply();
        setState(qcolors, qsynced, qsaved);
        
        browser.runtime.sendMessage({key: 'update_others'});
      };
      
    });
    
    
    
  });
}

main();















