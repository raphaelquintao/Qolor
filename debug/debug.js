import { QPicker } from "../js/QPicker.js";


let picker_ele = document.getElementById('picker');
let text_picker = new QPicker("Text");
text_picker.append_to(picker_ele);


let h_ele = document.getElementById('color_hue');
let s_ele = document.getElementById('color_saturation');
let l_ele = document.getElementById('color_lightness');

h_ele.oninput = s_ele.oninput = l_ele.oninput = () => {
  text_picker.set_hsl(h_ele.value, s_ele.value, l_ele.value);
  // text_picker.update_ui();
  console.log('INPUT CHANGE');
};

text_picker.on_color_change = (h, s, l, a) => {
  h_ele.value = h;
  s_ele.value = s;
  l_ele.value = l;
};