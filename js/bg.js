import { QColor } from './QPicker.js';
import { BYTES_TO_STRING, QCollection, QScheme } from "./QUtil.js";


// -- RUNTIME SETUP

let data = {};
// q.saved = new QCollection();
// q.synced = new QCollection();
data.loaded = new QCollection({
  show_output:               true,
  show_output_mode_selector: false,
  show_slider_value:         false,
  sync_selected:             true,
  alpha:                     false,
});
window.data = data;


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

let gray2 = new QScheme('Gray 2', 'gray2');
gray2.panel.hsla = {h: 220, s: 5, l: 25};
gray2.text.hsla = {h: 214, s: 2, l: 90};

let dark_pink = new QScheme('Dark Pink', 'qdpink');
dark_pink.panel.hsla = {h: 325, s: 65, l: 25};
dark_pink.text.hsla = {h: 325, s: 25, l: 75};

let light_pink = new QScheme('Light Pink', 'qlpink');
light_pink.panel.hsla = {h: 343, s: 27, l: 52};
light_pink.text.hsla = {h: 178, s: 31, l: 95};

let light_pink2 = new QScheme('Light Pink', 'qlpink2');
light_pink2.panel.parse("hsla(321, 38%, 47%, 1)");
light_pink2.text.parse("hsla(52, 100%, 81%, 1)");
light_pink2.locked = true;

let red = new QScheme('Red', 'qred');
red.panel.hsla = {h: 352, s: 35, l: 42};
red.text.hsla = {h: 214, s: 2, l: 85};


data.loaded.add(gray, false);
data.loaded.add(gray2, false);
data.loaded.add(dark_pink, false);
data.loaded.add(light_pink, false);
data.loaded.add(light_pink2, false);
data.loaded.add(red, false);

data.loaded.add(new QScheme(), false);
data.loaded.add(new QScheme(), false);
data.loaded.add(new QScheme(), false);
data.loaded.add(new QScheme(), true);
data.loaded.add(new QScheme(), false);
data.loaded.add(new QScheme(), false);

let serialized = data.loaded.serialize();
let temp = QCollection.unserialize(serialized);
console.log('Initial schemes', data.loaded);
console.log('Initial schemes', temp);


// -- UI Funcs
function ui_refresh(origin = 'bg', ignore = []) {
  browser.runtime.sendMessage({key: 'refresh', origin: origin, ignore: ignore, to: 'front'});
}

// -- Functions
// function do_change_name(id, new_name) {
//   let scheme = q.colors.find_by_id(id);
//   if (scheme.name !== new_name) {
//     scheme.name = new_name;
//     q.colors.applySelected();
//     ui_refresh();
//   }
// }

// function do_create_new(name) {
//   let scheme = new QScheme();
//
//   let cur = JSON.parse(JSON.stringify(q.colors.getSelected()));
//   scheme.parse({mode: cur.mode, text: cur.text, panel: cur.panel, name: name});
//
//   // scheme.apply();
//
//   q.colors.add(scheme, true);
//   q.colors.applySelected();
//   ui_refresh();
// }

// function do_delete(id) {
//   if (id === '_default') return;
//   q.colors.remove(q.colors.find_by_id(id));
//   q.colors.selectById('_default');
//   ui_refresh();
// }

// function do_clear() {
//   QStorage.clearLocal();
//   QStorage.clearSync();
//   q.saved = new QCollection();
//   q.synced = new QCollection();
//   q.colors = new QCollection();
//
//   q.colors.add(gray, true);
//   q.colors.add(dark_pink, false);
//   q.colors.add(light_pink, false);
//   q.colors.applySelected();
//   ui_refresh();
// }

/** @type {browser.windows.Window|null} */
let popout = null;

// -- Messages
browser.runtime.onMessage.addListener((message, sender, send_response) => {
  if (message['to'] && message['to'] === 'front') return;
  
  console.log('onMessage BG', message, sender, send_response);
  
  if (message.key === 'get_data') {
    send_response({data});
  }
  
  // if (message.key === 'ui_refresh') {
  //   ui_refresh(message.origin);
  // }
  
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
  
  // if (message.key === 'new') {
  //   do_create_new(message.new_name);
  //
  // } else if (message.key === 'del') {
  //   do_delete(message.id);
  //
  // } else if (message.key === 'set_scheme') {
  //   q.colors.selectById(message.value);
  //   ui_refresh();
  //
  // } else if (message.key === 'change_name') {
  //   do_change_name(message.id, message.new_name);
  //
  // } else if (message.key === 'save') {
  //   QStorage.saveLocal({'qColor': q.colors.getFlat()});
  //   q.saved = q.colors.clone();
  //   ui_refresh();
  //
  // } else if (message.key === 'sync') {
  //   QStorage.saveSync({'qColor': q.colors.getFlat()});
  //   q.synced = q.colors.clone();
  //   ui_refresh();
  // } else if (message.key === 'clear') {
  //   // console.log('click CLEAR');
  //   do_clear();
  // } else if (message.key === 'undo') {
  //   q.colors.getSelected().parse(message.serialized);
  //   q.colors.applySelected();
  //   ui_refresh();
  //   // console.log('click CLEAR');
  // }
  if (message.key === 'open_popout') {
    if (popout !== null) {
      browser.windows.update(popout.id, {focused: true});
      return;
    }
    popout = browser.windows.create({
      url:    browser.runtime.getURL('options.html?view=popout'),
      type:   'panel',
      top:    0,
      left:   1620,
      width:  400,
      height: 600
    }).then(win => {
      return win;
    });
  }
  
});

browser.windows.onRemoved.addListener(windowId => {
  if (popout !== null && windowId === popout.id) {
    popout = null;
  }
});

browser.runtime.onInstalled.addListener(details => {
  
  // console.log('IM installed', q.colors);
  // do_create_new('Try edit me!');
});



browser.storage.onChanged.addListener((changes, area) => {
  console.log("Change in storage area: " + area);
  
  let changed_items = Object.keys(changes);
  
  for (let item of changed_items) {
    console.info(item + " has changed:");
    console.info("Old value: ", changes[item].oldValue);
    console.info("New value: ", changes[item].newValue);
  }
});


const STKEY = 'qcolor';


function lixo(changeInfo) {
  console.log('Vertical Tabs changed:', changeInfo);
}

browser.browserSettings.verticalTabs.onChange.addListener(lixo);


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
  let bg = new QColor('hsl(240, 17%, 11%)');
  console.log('rgb',
    c1.blend_with(c2, 0.3, 'rgb').to_string(),
    c2.blend_with(c1, 0.3, 'rgb').to_string()
  );
  console.log('hsl',
    c1.blend_with(c2, 0.3).to_string(),
    c2.blend_with(c1, 0.3).to_string()
  );
  const n = bg.min_contrast_color(bg, 5.0)
  console.log('contrast',
    n.to_string(),
    bg.contrast_ratio(n)
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

