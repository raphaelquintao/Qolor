import { QScheme } from './core/q_scheme.js';
import { BYTES_TO_STRING, QCollection } from "./core/q_utils.js";


// -- RUNTIME SETUP
const STKEY = 'qcolor';

let data = {};
// q.saved = new QCollection();
data.synced = new QCollection();
data.loaded = new QCollection({
  color_wheel:               true,
  show_output:               true,
  output_mode:               'hsl',
  show_output_mode_selector: true,
  show_slider_value:         false,
  show_slider_label:         false,
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
gray.update_secondary();

let gray2 = new QScheme('Gray 2', 'gray2');
gray2.gen_mode = 'dual';
gray2.panel.hsla = {h: 220, s: 5, l: 25};
gray2.text.hsla = {h: 214, s: 2, l: 90};
gray2.update_secondary();

let dark_pink = new QScheme('Dark Pink', 'qdpink');
dark_pink.gen_mode = 'normal';
dark_pink.panel.hsla = {h: 325, s: 65, l: 25};
dark_pink.update_secondary();

let light_pink = new QScheme('Light Pink', 'qlpink');
light_pink.gen_mode = 'normal';
light_pink.panel.parse("hsla(321, 38%, 47%, 1)");
light_pink.update_secondary();

let light_pink2 = new QScheme('Light Pink', 'qlpink2');
light_pink2.gen_mode = 'colorful';
light_pink2.panel.hsla = {h: 343, s: 27, l: 52};
light_pink2.locked = true;
light_pink2.update_secondary();

let purple = new QScheme('Purple', 'qpurple');
purple.gen_mode = 'colorful';
purple.panel.parse("hsl(285 60% 22%)");
// purple.panel.hsla = {h: 280, s: 50, l: 30};
purple.update_secondary();

let red = new QScheme('Red', 'qred');
red.panel.hsla = {h: 352, s: 35, l: 42};
red.update_secondary();

let broken = new QScheme('Temp', 'temp');
broken.panel.parse('hsl(312.53 83.36% 52%)');
broken.update_secondary();


data.loaded.add(gray, false);
data.loaded.add(gray2, true);
data.loaded.add(dark_pink, false);
data.loaded.add(light_pink, false);
data.loaded.add(light_pink2, false);
data.loaded.add(purple, false);
data.loaded.add(red, false);

// data.loaded.add(new QScheme().update_secondary(), false);
// data.loaded.add(new QScheme().update_secondary(), false);
// data.loaded.add(new QScheme().update_secondary(), false);
// data.loaded.add(broken, false);
// data.loaded.add(new QScheme().update_secondary(), true);
// data.loaded.add(new QScheme().update_secondary(), false);



// -- UI Funcs
function ui_refresh(origin = 'bg', ignore = []) {
  browser.runtime.sendMessage({key: 'refresh', origin: origin, ignore: ignore, to: 'front'});
  save();
}



/** @type {browser.windows.Window|null} */
let popout = null;

async function open_popout(debug = false) {
  if (popout !== null) {
    browser.windows.update(popout.id, {focused: true});
    return;
  }
  
  const margin = {top: 120, left: 20};
  let position = {
    width:  400,
    height: 600,
    top:    margin.top,
    left:   margin.left,
  };
  position.left -= position.width;
  
  let saved = await browser.storage.local.get('popout_position').then(value => {
    return value?.popout_position || undefined;
  });
  if (saved) {
    position = saved;
  } else {
    await browser.windows.getLastFocused().then(last => {
      position.top += last.top;
      position.left += last.left + last.width;
    });
  }
  
  
  
  browser.windows.create({
    url:                 browser.runtime.getURL('options/options.html?view=popout'),
    type:                'popup',
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
  
  console.log('onMessage BG', message, sender, send_response);
  
  if (message.key === 'get_data') {
    // send_response(data);
    return Promise.resolve({
      loaded: data.loaded.serialize()
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
    // let current_index = data.loaded.find_index_by_id(message.id);
    let synced = data.synced.find_by_id(message.id);
    // let current = data.loaded.schemes[current_index];
    let current = data.loaded.find_by_id(message.id);
    
    current.parse(synced);
    current.update_secondary();
    current.apply();
    
    
    ui_refresh(message.origin, []);
  }
  
  if (message.key === 'new_scheme') {
    let clone = new QScheme();
    clone.update_secondary();
    data.loaded.add(clone, true);
    clone.apply();
    
    ui_refresh(message.origin, []);
  }
  
  
  if (message.key === 'open_popout') {
    open_popout();
  }
  
  if (message.key === 'save') {
    save();
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
  console.info("Change in storage area: " + area);
  
  let changed_items = Object.keys(changes);
  
  for (let item of changed_items) {
    // console.info(item + " has changed:");
    // console.info("Old value: ", changes[item].oldValue);
    // console.info("New value: ", changes[item].newValue);
  }
});



function save() {
  return new Promise((resolve, reject) => {
    browser.storage.local.set({[STKEY]: data.loaded.serialize()}).then(() => {
      console.info('Data saved to local storage');
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
        resolve();
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

function sync_from_storage() {
  return new Promise((resolve, reject) => {
    browser.storage.sync.get(STKEY).then(value => {
      if (value.hasOwnProperty(STKEY)) {
        let tmp = value[STKEY];
        data.synced = QCollection.unserialize(tmp);
        
        
      } else {
        console.info('No initial data in sync storage');
        // browser.storage.local.set({[STKEY]: data.loaded.serialize()}).then(() => {
        //   console.info('Initial data saved to sync storage');
        //   data.loaded.apply_selected();
        // }, reason => {
        //   console.error('Failed to save initial data to sync storage', reason);
        // });
      }
      console.info('Initial data from sync storage', value);
      resolve();
    }, reason => {
      console.error('Failed to get initial data from sync storage', reason);
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
  });
  
  browser.storage.local.get(STKEY).then(value => {
    if (value.hasOwnProperty(STKEY)) {
      let tmp = value[STKEY];
      data.loaded = QCollection.unserialize(tmp);
      data.loaded.apply_selected();
      sync_from_storage();
    } else {
      console.info('No initial data in sync storage');
      browser.storage.local.set({[STKEY]: data.loaded.serialize()}).then(() => {
        console.info('Initial data saved to sync storage');
        data.loaded.apply_selected();
      }, reason => {
        console.error('Failed to save initial data to sync storage', reason);
      });
    }
    console.info('Initial data from sync storage', value);
  }, reason => {
    console.error('Failed to get initial data from sync storage', reason);
  });
  
  
  
}

main();

