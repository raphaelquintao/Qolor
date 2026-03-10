import { QColor } from './core/q_color.js';
import { QScheme } from './core/q_scheme.js';
import { BYTES_TO_STRING, QCollection } from "./core/q_utils.js";


// -- RUNTIME SETUP

let data = {};
// q.saved = new QCollection();
// q.synced = new QCollection();
data.loaded = new QCollection({
  show_output:               true,
  show_output_mode_selector: true,
  show_slider_value:         false,
  sync_selected:             true,
  alpha:                     false,
  min_contrast:              5
});
window.data = data;

window.get_data_loaded = () => {
  return data.loaded;
};


// q.colors.onSelect = scheme => {
//   scheme.apply();
//
//   // let title = `Photophobia - ${scheme.name}`;
//   // browser.browserAction.setTitle({title: title});
//
//   // browser.browserAction.setBadgeText({text: scheme.name});
//
//   // browser.browserAction.setBadgeBackgroundColor({color: scheme.getTextPreviewColor()});
// };

let gray = new QScheme('• Gray', '_default');
gray.gen_mode = 'dual';

let gray2 = new QScheme('Gray 2', 'gray2');
gray2.gen_mode = 'dual';
gray2.panel.hsla = {h: 220, s: 5, l: 25};
gray2.text.hsla = {h: 214, s: 2, l: 90};

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
data.loaded.add(gray2, false);
data.loaded.add(dark_pink, false);
data.loaded.add(light_pink, false);
data.loaded.add(light_pink2, false);
data.loaded.add(purple, false);
data.loaded.add(red, false);

data.loaded.add(new QScheme().update_secondary(), false);
data.loaded.add(new QScheme().update_secondary(), false);
data.loaded.add(new QScheme().update_secondary(), false);
data.loaded.add(broken, false);
data.loaded.add(new QScheme().update_secondary(), true);
data.loaded.add(new QScheme().update_secondary(), false);

let serialized = data.loaded.serialize();
let temp = QCollection.unserialize(serialized);
console.log('Initial schemes', data.loaded);
console.log('Initial schemes', temp);


// -- UI Funcs
function ui_refresh(origin = 'bg', ignore = []) {
  browser.runtime.sendMessage({key: 'refresh', origin: origin, ignore: ignore, to: 'front'});
}



/** @type {browser.windows.Window|null} */
let popout = null;

function open_popout() {
  if (popout !== null) {
    browser.windows.update(popout.id, {focused: true});
    return;
  }
  browser.windows.getLastFocused().then(last => {
    // console.info('Last Focused Window', last);
    browser.windows.create({
      url:                 browser.runtime.getURL('options/options.html?view=popout'),
      type:                'popup',
      focused:             true,
      allowScriptsToClose: true,
      top:                 last.top + 120,
      left:                last.left + last.width - 420,
      width:               400,
      height:              600
    }).then(win => {
      popout = win;
    }, reason => {
      console.error('Failed to create Popout', reason);
    });
    
  });
};

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
  
  if(message.key === 'set_data') {
    data.loaded = QCollection.unserialize(message.loaded);
    data.loaded.apply_selected();
    ui_refresh(message.origin, []);
    return;
  }
  
  if(message.key === 'get_options') {
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
  
  
  if (message.key === 'open_popout') {
    if (popout !== null) {
      browser.windows.update(popout.id, {focused: true});
      return;
    }
    browser.windows.getLastFocused().then(last => {
      // console.info('Last Focused Window', last);
      browser.windows.create({
        url:                 browser.runtime.getURL('options/options.html?view=popout'),
        type:                'popup',
        focused:             true,
        allowScriptsToClose: true,
        top:                 last.top + 120,
        left:                last.left + last.width - 420,
        width:               400,
        height:              600
      }).then(win => {
        popout = win;
      }, reason => {
        console.error('Failed to create Popout', reason);
      });
      
    });
    
  }
  
});

browser.windows.onRemoved.addListener(window_id => {
  console.info('Window Removed', window_id);
  
  if (popout !== null && window_id === popout.id) {
    popout = null;
  }
});

browser.runtime.onInstalled.addListener(details => {
  console.info('Installed', details);
});



browser.storage.onChanged.addListener((changes, area) => {
  console.info("Change in storage area: " + area);
  
  let changed_items = Object.keys(changes);
  
  for (let item of changed_items) {
    console.info(item + " has changed:");
    console.info("Old value: ", changes[item].oldValue);
    console.info("New value: ", changes[item].newValue);
  }
});


const STKEY = 'qcolor';


function lixo(changeInfo) {
  console.info('Vertical Tabs changed:', changeInfo);
}

browser.browserSettings.verticalTabs.onChange.addListener(lixo);

browser.browserSettings.overrideContentColorScheme
  .set({ value: "auto" })
  .then(value => {
    console.info(`Setting was modified: ${value}`);
  });




// -- Main
async function main() {
  data.loaded.apply_selected();
  
  let vertical_tabs = await browser.browserSettings.verticalTabs.get({incognito: true});
  console.log('Vertical Tabs:', vertical_tabs);
  
  // browser.storage.sync.
  
  browser.storage.sync.getBytesInUse(STKEY).then(value => {
    console.log('GET SYNC', BYTES_TO_STRING(value));
  });
  
  let c1 = new QColor('hsl(240, 15%, 50%)');
  let c2 = new QColor('hsl(325, 50%, 30%)');
  let bg = new QColor('hsl(240, 17%, 0%)');
  console.log('rgb',
    c1.blend(c2, 0.3, 'rgb').to_string(),
    c2.blend(c1, 0.3, 'rgb').to_string()
  );
  console.log('hsl',
    c1.blend(c2, 0.3).to_string(),
    c2.blend(c1, 0.3).to_string()
  );
  const n = new QColor('#B5835A80');
  console.log('contrast',
    bg.contrast_ratio(n).toFixed(2)
  );
  
  
  // QStorage.getLocal(STKEY)
  //     .then(value => {
  //         // console.log('GET LOCAL', value);
  //         if (value.hasOwnProperty(STKEY)) {
  //             let tmp = value[STKEY];
  //             q.colors.clear();
  //             // q.colors = new QCollection();
  //             q.colors.parse(tmp);
  //             // q.colors.getSelected().apply();
  //             q.colors.applySelected();
  //
  //             q.saved = q.colors.clone();
  //         } else {
  //             HAS_LOCAL = false;
  //         }
  //     }, reason => {
  //         // console.log('GET LOCAL - FAIL', reason);
  //     });
  
  // await get_synced();
  
  
  // let info = browser.runtime.getBrowserInfo();
  // info.then(value => {
  //     console.log(value);
  // });
  
  // debug();
}

main();

