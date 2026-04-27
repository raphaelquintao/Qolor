import { QCollection } from './core/q_collection.js';
import { QScheme } from './core/q_scheme.js';
import { BYTES_TO_STRING } from "./core/q_utils.js";


// -- RUNTIME SETUP
const STKEY = 'qcolor';

let data = {};
data.synced = new QCollection();
data.loaded = new QCollection({
  color_wheel:               true,
  show_output:               true,
  output_mode:               'oklch',
  show_output_mode_selector: true,
  show_slider_value:         false,
  show_slider_label:         false,
  apply_colors_popup:        false
});
window.data = data;

window.data.usage = {
  sync:  0,
  local: 0
};


/**
 * @returns {{synced: QCollection, loaded: QCollection, usage: {sync: number, local: number}}}
 */
window.get_data = () => {
  return data;
};



function initial_schemes() {
  let schemes = [];
  
  schemes.push(new QScheme('_default', {
    created: 0, gen_mode: 'dual'
  }));
  schemes.push(new QScheme('qdpink', {
    created: 1, gen_mode: 'colorful',
    panel:   'hsl(301.2 39.53% 17.92%)'
  }));
  schemes.push(new QScheme('greenish', {
    created: 2, gen_mode: 'colorful',
    panel:   'hsl(142.58 10.94% 17.23%)'
  }));
  
  return schemes;
}




// -- UI Funcs
function ui_refresh(origin = 'bg', ignore = []) {
  browser.runtime.sendMessage({key: 'refresh', origin: origin, ignore: ignore, to: 'front'});
  save_to_local_storage().then(() => {
    get_local_storage_usage();
  });
}



/** @type {browser.windows.Window|null} */
let popout = null;
let popout_open_by = null;

async function open_popout(restore = false) {
  if (popout !== null && !restore) {
    browser.windows.update(popout.id, {focused: true});
    return;
  }
  
  
  
  if (restore) {
    await browser.storage.local.remove('popout_position');
  } else {
    await browser.windows.getLastFocused().then(win => {
      popout_open_by = win.id;
    });
  }
  
  const margin = {top: 120, left: 20};
  let position = {
    width:  400,
    height: 600,
    top:    margin.top,
    left:   -margin.left,
  };
  position.left -= position.width;
  
  let saved = await browser.storage.local.get('popout_position').then(value => {
    return value?.popout_position || undefined;
  });
  if (saved) {
    position = saved;
    position.height = 600;
  } else {
    await browser.windows.get(popout_open_by).then(last => {
      position.top += last.top;
      position.left += last.left + last.width;
    });
  }
  
  if (restore) {
    browser.windows.update(popout.id, {
      focused: true,
      top:     position.top,
      left:    position.left,
      width:   position.width,
      height:  position.height,
    }).then(() => {
      browser.runtime.sendMessage({key: 'resize', origin: origin, to: 'front'});
    });
  } else {
    
    browser.windows.create({
      url:                 browser.runtime.getURL('options/options.html?view=popout'),
      type:                'panel',
      focused:             true,
      allowScriptsToClose: true,
      top:                 position.top,
      left:                position.left,
      width:               position.width,
      height:              position.height,
    }).then(win => {
      popout = win;
    }, reason => {
      console.error('Failed to create Popout', reason);
    });
  }
  
  
}

browser.windows.onRemoved.addListener(window_id => {
  console.info('Window Removed', window_id);
  
  if (popout !== null && window_id === popout.id) {
    popout = null;
  }
});

let _popout_save_timer = null;

browser.windows.onFocusChanged.addListener(window_id => {
  // console.info('Window Focus Changed', window_id);
  
  if (popout !== null) {
    // Debounce: save position at most once per 500ms
    clearTimeout(_popout_save_timer);
    _popout_save_timer = setTimeout(() => {
      browser.windows.get(popout.id).then(win => {
        const position = {
          top:    win.top,
          left:   win.left,
          width:  win.width,
          height: win.height,
        };
        
        browser.storage.local.get('popout_position').then(value => {
          const last = value?.popout_position || undefined;
          if (!last || JSON.stringify(last) !== JSON.stringify(position)) {
            browser.storage.local.set({'popout_position': position}).then(() => {}, reason => {
              console.error('Failed to save Popout position to local storage', reason);
            });
          }
        });
        
      }, reason => {
        // Popout may have been removed between debounce delay
      });
    }, 500);
  }
});


// -- Local Storage

async function get_local_storage_usage() {
  try {
    let usage = await browser.storage.local.getBytesInUse();
    window.data.usage.local = usage;
    for (const scheme of data.loaded.schemes) {
      scheme.usage = await browser.storage.local.getBytesInUse(scheme.id) || 0;
    }
    console.info('Local Storage', usage, BYTES_TO_STRING(usage));
    return BYTES_TO_STRING(usage);
  } catch (reason) {
    throw reason;
  }
}

async function save_to_local_storage() {
  try {
    await browser.storage.local.set({[STKEY]: data.loaded.serialize()});
    return data.loaded;
  } catch (reason) {
    console.error('Failed to saved data to local storage', reason);
    throw reason;
  }
}

async function load_from_local_storage() {
  try {
    let storage_data = await browser.storage.local.get(STKEY);
    if (storage_data && storage_data.hasOwnProperty(STKEY)) {
      let value = storage_data[STKEY];
      data.loaded = QCollection.unserialize(value);
    } else {
      for (const scheme of initial_schemes()) {
        data.loaded.add(scheme.compute_colors(), false);
      }
      await browser.storage.local.set({[STKEY]: data.loaded.serialize()});
    }
    return data.loaded;
    
  } catch (reason) {
    console.error('Storage operation failed', reason);
    throw reason;
  }
}

// -- Sync Storage
async function get_sync_storage_usage() {
  try {
    let usage = await browser.storage.sync.getBytesInUse();
    window.data.usage.sync = usage;
    for (const scheme of data.synced.schemes) {
      scheme.usage = await browser.storage.sync.getBytesInUse(scheme.id) || 0;
    }
    console.info('Sync Storage', usage, BYTES_TO_STRING(usage));
    return BYTES_TO_STRING(usage);
  } catch (reason) {
    throw reason;
  }
}

async function save_to_sync_storage(id = undefined) {
  try {
    if (data.synced.equals(data.loaded)) {
      return data.synced;
    }
    
    let to_sync = {};
    
    if (!id) {
      // if (data.synced.options && JSON.stringify(data.synced.options) !== JSON.stringify(data.loaded.options)) {
      to_sync['options'] = JSON.stringify(data.loaded.options);
      // }
      
      // if (data.synced.selected !== data.loaded.selected) {
      to_sync['selected'] = data.loaded.selected;
      // }
      
      for (const scheme of data.loaded.schemes) {
        to_sync[scheme.id] = scheme.serialize();
      }
    } else {
      to_sync[id] = data.loaded.find_by_id(id).serialize();
    }
    if (Object.keys(to_sync).length === 0) {
      return data.synced;
    }
    
    await browser.storage.sync.set(to_sync);
    
    return data.synced;
  } catch (reason) {
    console.error('Failed to sync data to sync storage', reason);
    throw reason;
  }
  
}

async function process_sync_storage_changes(key, old_value, new_value, replace_local = false) {
  const loaded = data.loaded;
  const synced = data.synced;
  
  
  if (key === STKEY) {
    if (!new_value) return data.synced;
    console.info('Old Value Found on Sync Storage', key);
    await browser.storage.sync.remove(key);
    return data.synced;
  }
  
  if (key === 'options') {
    const parsed = JSON.parse(new_value || '{}');
    synced.options = {...synced.options, ...parsed};
    loaded.options = {...synced.options, ...parsed};
  } else if (key === 'selected') {
    synced.selected = new_value;
  } else {
    if (!new_value) {
      let scheme = QScheme.unserialize(old_value);
      if (scheme.id === '_default') return data.synced;
      synced.remove(synced.find_by_id(scheme.id));
      if (replace_local) loaded.remove(loaded.find_by_id(scheme.id));
      return data.synced;
    }
    let scheme = QScheme.unserialize(new_value);
    let found_synced = synced.find_by_id(scheme.id);
    let found_loaded = loaded.find_by_id(scheme.id);
    
    if (found_synced) found_synced.parse(new_value);
    else synced.schemes.push(scheme);
    
    if (replace_local) {
      if (found_loaded) found_loaded.parse(new_value);
      else loaded.schemes.push(QScheme.unserialize(new_value));
    }
  }
  
  return data.synced;
}

async function load_from_sync_storage() {
  try {
    const values = await browser.storage.sync.get(null);
    console.log('Keys in sync storage', Object.keys(values));
    // console.log('Values in sync storage', values);
    if (Object.keys(values).length === 0) return data.synced;
    
    for (const [key, value] of Object.entries(values)) {
      await process_sync_storage_changes(key, null, value);
    }
    data.synced.schemes.sort((a, b) => a.virtual_created - b.virtual_created);
    data.loaded.schemes.sort((a, b) => a.virtual_created - b.virtual_created);
    
  } catch (reason) {
    console.error('Failed to load sync storage', reason);
    throw reason;
  }
  
  return data.synced;
}

async function delete_scheme(id, from = ['sync', 'local'], origin) {
  try {
    if (from.includes('sync')) {
      let found = data.synced.find_by_id(id);
      if (found) {
        data.synced.remove(found);
        await browser.storage.sync.remove(id);
      }
    }
    if (from.includes('local')) {
      data.loaded.remove(data.loaded.find_by_id(id));
      ui_refresh(origin, []);
    }
  } catch (reason) {
    console.error('Failed to delete scheme', reason);
    throw reason;
  }
  
}


// -- Messages
browser.runtime.onMessage.addListener((message, sender, send_response) => {
  if (message['to'] && message['to'] === 'front') return;
  
  // console.log('onMessage BG', message, sender, send_response);
  
  if (message.key === 'get_data') {
    // send_response(data);
    return Promise.resolve({
      loaded: data.loaded.serialize(),
      synced: data.synced.serialize(),
    });
  }
  
  if (message.key === 'set_data') {
    data.loaded = QCollection.unserialize(message.loaded);
    data.loaded.apply_selected();
    ui_refresh(message.origin, []);
    return;
  }
  
  if (message.key === 'get_options') {
    return Promise.resolve({
      options: data.loaded.options
    });
  }
  
  if (message.key === 'set_scheme') {
    data.loaded.select_by_id(message.id);
    data.loaded.apply_selected();
    ui_refresh(message.origin, []);
  }
  
  if (message.key === 'update_options') {
    ui_refresh(message.origin, ['colors', 'initial']);
  }
  
  if (message.key === 'update_scheme_color') {
    ui_refresh(message.origin, ['colors', 'initial']);
  }
  
  if (message.key === 'surprise_me') {
    ui_refresh(message.origin, ['initial']);
  }
  
  if (message.key === 'delete_scheme') {
    const id = message.id;
    const from = message.from || ['sync', 'local'];
    if (id === '_default') return;
    return delete_scheme(id, from, message.origin);
  }
  
  if (message.key === 'clone_scheme') {
    let current = data.loaded.find_by_id(message.id);
    let clone = current.clone();
    data.loaded.add(clone, true);
    clone.apply();
    
    ui_refresh(message.origin, []);
  }
  
  if (message.key === 'restore_scheme') {
    let synced = data.synced.find_by_id(message.id);
    let current = data.loaded.find_by_id(message.id);
    
    current.parse(synced);
    current.compute_colors();
    current.apply();
    
    
    ui_refresh(message.origin, []);
  }
  
  if (message.key === 'new_scheme') {
    let scheme = new QScheme().compute_colors();
    data.loaded.add(scheme, true);
    scheme.apply();
    
    ui_refresh(message.origin, []);
  }
  
  
  if (message.key === 'open_popout') {
    return open_popout();
  }
  if (message.key === 'restore_popout') {
    return open_popout(true);
  }
  
  
  if (message.key === 'sync-save') {
    return save_to_sync_storage(message?.id).then((value) => {
      get_sync_storage_usage();
      return value;
    });
  }
  
  if (message.key === 'sync-load') {
    load_from_sync_storage().then(() => {
      data.loaded.apply_selected();
      get_sync_storage_usage().then(() => {
        ui_refresh();
      });
    });
  }
  
});


browser.runtime.onInstalled.addListener(details => {
  console.info('Installed', details);
});


browser.storage.sync.onChanged.addListener((changes) => {
  // console.info('Sync Storage Changed', changes);
  let promisses = [];
  for (const key of Object.keys(changes)) {
    const change = changes[key];
    const old_value = change.oldValue || null;
    const new_value = change.newValue || null;
    console.info(`Key: ${key}, Old Value: ${old_value}, New Value: ${new_value}`);
    promisses.push(process_sync_storage_changes(key, old_value, new_value));
  }
  Promise.all(promisses).then(() => {
    get_sync_storage_usage().then(() => {
      // data.loaded.apply_selected();
      ui_refresh();
    });
  });
  
  
});





// -- Main
async function main() {
  
  load_from_local_storage().then(() => {
    get_local_storage_usage();
    load_from_sync_storage().then(() => {
      get_sync_storage_usage().then(() => {
        data.loaded.apply_selected();
      });
    });
  });
  
  
}

main();

