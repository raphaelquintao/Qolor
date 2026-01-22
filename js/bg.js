import { QCollection, QScheme, QStorage } from "./QUtil.js";

// -- GLOBAL
let HAS_LOCAL = true;

let q = {};
q.saved = new QCollection();
q.synced = new QCollection();
q.colors = new QCollection();
window.q = q;

q.colors.onSelect = scheme => {
  scheme.apply();
  
  // let title = `Photophobia - ${scheme.name}`;
  // browser.browserAction.setTitle({title: title});
  
  // browser.browserAction.setBadgeText({text: scheme.name});
  
  // browser.browserAction.setBadgeBackgroundColor({color: scheme.getTextPreviewColor()});
};


let dark_pink = new QScheme('Dark Pink', 'qdpink');
dark_pink.text.hue = 325;
dark_pink.text.sat = 25;
dark_pink.text.bri = 75;
dark_pink.panel.hue = 325;
dark_pink.panel.sat = 65;

let light_pink = new QScheme('Light Pink', 'qlpink');
light_pink.text.hue = 178;
light_pink.text.sat = 31;
light_pink.text.bri = 95;
light_pink.panel.hue = 343;
light_pink.panel.sat = 64;
light_pink.panel.bri = 81;

let gray = new QScheme('• Gray', '_default');

q.colors.add(gray, false);
q.colors.add(dark_pink, false);
q.colors.add(light_pink, false);

q.colors.add(new QScheme('Perfect Gray'), true);




function debug() {
  console.log('DEBUG', q);
}



// -- UI Funcs
function ui_refresh() {
  browser.runtime.sendMessage({key: 'refresh'});
}

// -- Functions
function do_change_name(id, new_name) {
  let scheme = q.colors.findByID(id);
  if (scheme.name !== new_name) {
    scheme.name = new_name;
    q.colors.applySelected();
    ui_refresh();
  }
}

function do_create_new(name) {
  let scheme = new QScheme();
  
  let cur = JSON.parse(JSON.stringify(q.colors.getSelected()));
  scheme.parse({mode: cur.mode, text: cur.text, panel: cur.panel, name: name});
  
  // scheme.apply();
  
  q.colors.add(scheme, true);
  q.colors.applySelected();
  ui_refresh();
}

function do_delete(id) {
  if (id === '_default') return;
  q.colors.remove(q.colors.findByID(id));
  q.colors.selectById('_default');
  ui_refresh();
}

function do_clear() {
  QStorage.clearLocal();
  QStorage.clearSync();
  q.saved = new QCollection();
  q.synced = new QCollection();
  q.colors = new QCollection();
  
  q.colors.add(gray, true);
  q.colors.add(dark_pink, false);
  q.colors.add(light_pink, false);
  q.colors.applySelected();
  ui_refresh();
}



// -- Messages
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // console.log('onMessage BG', message, sender, sendResponse);
  
  if (message.key === 'new') {
    do_create_new(message.new_name);
    
  } else if (message.key === 'del') {
    do_delete(message.id);
    
  } else if (message.key === 'set_scheme') {
    q.colors.selectById(message.value);
    ui_refresh();
    
  } else if (message.key === 'change_name') {
    do_change_name(message.id, message.new_name);
    
  } else if (message.key === 'save') {
    QStorage.saveLocal({'qColor': q.colors.getFlat()});
    q.saved = q.colors.clone();
    ui_refresh();
    
  } else if (message.key === 'sync') {
    QStorage.saveSync({'qColor': q.colors.getFlat()});
    q.synced = q.colors.clone();
    ui_refresh();
  } else if (message.key === 'clear') {
    // console.log('click CLEAR');
    do_clear();
  } else if (message.key === 'undo') {
    q.colors.getSelected().parse(message.serialized);
    q.colors.applySelected();
    ui_refresh();
    // console.log('click CLEAR');
  }
  
});

browser.runtime.onInstalled.addListener(details => {
  
  // console.log('IM installed', q.colors);
  // do_create_new('Try edit me!');
});



browser.storage.onChanged.addListener((changes, area) => {
  console.log("Change in storage area: " + area);
  
  let changedItems = Object.keys(changes);
  
  for (let item of changedItems) {
    console.log(item + " has changed:");
    console.log("Old value: ");
    console.log(changes[item].oldValue);
    console.log("New value: ");
    console.log(changes[item].newValue);
  }
});


const STKEY = 'qColor';

async function get_synced() {
  await QStorage.getSync('qColor')
    .then(value => {
      console.log('GET SYNC', value);
      if (value.hasOwnProperty(STKEY)) {
        let tmp = value[STKEY];
        q.synced.parse(tmp);
        // if (!HAS_LOCAL) {
        q.colors.clear();
        // q.colors = new QCollection();
        q.colors = q.colors.parse(tmp);
        // q.colors.getSelected().apply();
        q.colors.applySelected(false);
        // QStorage.saveLocal({'qColor': q.colors.getFlat()});
        // q.saved = q.synced.clone();
        // }
      }
    }, reason => {
      // console.log('FAIL GET SYNC', reason);
    });
}

function lixo(changeInfo) {
  console.log('Vertical Tabs changed:', changeInfo);
}

browser.browserSettings.verticalTabs.onChange.addListener(lixo);

// -- Main
async function main() {
  // q.colors.getSelected().apply();
  q.colors.applySelected(false);
  
  let vertical_tabs = await browser.browserSettings.verticalTabs.get({incognito: true});
  console.log('Vertical Tabs:', vertical_tabs);
  

  // browser.browserSettings.verticalTabs.set({value: true});
  
  
  
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
  
  await get_synced();
  
  
  // let info = browser.runtime.getBrowserInfo();
  // info.then(value => {
  //     console.log(value);
  // });
  
  // debug();
}

main();

