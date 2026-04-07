import { QScheme } from './core/q_scheme.js';
import { BYTES_TO_STRING, QCollection } from "./core/q_utils.js";


// -- RUNTIME SETUP
const STKEY = 'qcolor';

let data = {};
// q.saved = new QCollection();
data.synced = new QCollection();
data.loaded = new QCollection({
  color_wheel:               false,
  show_output:               true,
  output_mode:               'hsl',
  show_output_mode_selector: true,
  show_slider_value:         false,
  show_slider_label:         false,
  apply_colors_popup:        false
});
window.data = data;

/**
 * @returns {{synced: QCollection, loaded: QCollection}}
 */
window.get_data = () => {
  return data;
};




let gray = new QScheme('• Gray', '_default');
gray.gen_mode = 'dual';
gray.compute_colors();

let dark_pink = new QScheme('Dark Pink', 'qdpink');
dark_pink.gen_mode = 'colorful';
dark_pink.panel.parse("hsl(301.2 39.53% 17.92%)")
dark_pink.compute_colors();


let bluish = new QScheme('Bluish', 'bluish');
bluish.gen_mode = 'colorful';
bluish.panel.parse("hsl(228.86 32.05% 25%)");
bluish.compute_colors();

let greenish = new QScheme('Greenish', 'greenish');
greenish.gen_mode = 'colorful';
greenish.panel.parse("hsl(142.58 10.94% 17.23%)");
greenish.compute_colors();



data.loaded.add(gray, true);
data.loaded.add(dark_pink, false);
data.loaded.add(bluish, false);
data.loaded.add(greenish, false);





// -- UI Funcs
function ui_refresh(origin = 'bg', ignore = []) {
  browser.runtime.sendMessage({key: 'refresh', origin: origin, ignore: ignore, to: 'front'});
  save();
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

browser.windows.onFocusChanged.addListener(window_id => {
  // console.info('Window Focus Changed', window_id);
  
  if (popout !== null) {
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
      console.error('Failed to get removed window', reason);
    });
  }
});



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
    if (id === '_default') return;
    data.loaded.remove(data.loaded.find_by_id(id));
    if (data.synced.find_by_id(id)) {
      data.synced.remove(data.synced.find_by_id(id));
      sync_to_storage();
    }
    ui_refresh(message.origin, []);
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
    let clone = new QScheme();
    clone.compute_colors();
    data.loaded.add(clone, true);
    clone.apply();
    
    ui_refresh(message.origin, []);
  }
  
  
  if (message.key === 'open_popout') {
    return open_popout();
  }
  if (message.key === 'restore_popout') {
    return open_popout(true);
  }
  
  
  if (message.key === 'sync') {
    sync_to_storage();
  }
  
});



browser.runtime.onInstalled.addListener(details => {
  console.info('Installed', details);
  
  
  // browser.storage.sync.get(STKEY).then(value => {
  //   console.info('Initial data from sync storage', value);
  // }, reason => {
  //   console.error('Failed to get initial data from sync storage', reason);
  // })
  
  // browser.storage.sync.set({[STKEY]: data.loaded.serialize()}).then(() => {
  //   console.info('Initial data saved to sync storage');
  // }, reason => {
  //   console.error('Failed to save initial data to sync storage', reason);
  // });
  
});



browser.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync') {
    load_from_sync_storage().then(() => {
      ui_refresh();
    });
  }
});



function save() {
  return new Promise((resolve, reject) => {
    browser.storage.local.set({[STKEY]: data.loaded.serialize()}).then(() => {
      // console.info('Data saved to local storage');
    }, reason => {
      console.error('Failed to saved data to local storage', reason);
      reject(reason);
    });
  });
}

function sync_to_storage() {
  return new Promise((resolve, reject) => {
    browser.storage.sync.set({[STKEY]: data.loaded.serialize()}).then(() => {
      console.info('Data synced to sync storage');
      browser.storage.sync.getBytesInUse().then(value => {
        console.log('GET SYNC', BYTES_TO_STRING(value));
        window.usage.sync = value;
        load_from_sync_storage().then(() => {
          resolve();
        });
      });
    }, reason => {
      console.error('Failed to sync data to sync storage', reason);
      reject(reason);
    });
  });
}

window.usage = {
  sync:  0,
  local: 0
};

function load_from_sync_storage() {
  return new Promise((resolve, reject) => {
    browser.storage.sync.get(STKEY).then(value => {
      if (value.hasOwnProperty(STKEY)) {
        let tmp = value[STKEY];
        data.synced = QCollection.unserialize(tmp);
        for (let scheme of data.synced.schemes) {
          if (!data.loaded.find_by_id(scheme.id)) {
            data.loaded.add(scheme, false);
          }
        }
      } else {
        console.info('No initial data in sync storage');
      }
      resolve();
    }, reason => {
      console.error('Failed to get initial data from sync storage', reason);
      reject(reason);
    });
  });
}

function load_from_local_storage() {
  return new Promise((resolve, reject) => {
    browser.storage.local.get(STKEY).then(value => {
      if (value.hasOwnProperty(STKEY)) {
        let tmp = value[STKEY];
        data.loaded = QCollection.unserialize(tmp);
        data.loaded.apply_selected();
      } else {
        browser.storage.local.set({[STKEY]: data.loaded.serialize()}).then(() => {
          data.loaded.apply_selected();
        }, reason => {
          console.error('Failed to save initial data to local storage', reason);
        });
      }
      resolve();
    }, reason => {
      console.error('Failed to get initial data from local storage', reason);
      reject(reason);
    });
  });
}


// -- Main
async function main() {
  // data.loaded.apply_selected();
  
  browser.storage.sync.getBytesInUse().then(value => {
    console.log('GET SYNC', BYTES_TO_STRING(value));
    window.usage.sync = value;
  });
  
  browser.storage.local.getBytesInUse().then(value => {
    console.log('GET LOCAL', BYTES_TO_STRING(value));
    window.usage.local = value;
  });
  
  
  load_from_local_storage().then(() => {
    load_from_sync_storage();
  });
  
  
}

main();

