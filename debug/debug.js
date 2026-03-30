import { QColor } from '../src/core/q_color.js';
import { QPicker } from "../src/core/q_picker.js";


const controls = document.getElementById('controls-container');
const picker_container = document.getElementById('picker-container');

let picker = new QPicker({
  label: 'Test Picker',
  precision: 2
});
picker.append_to(picker_container);


let opt_alpha = document.createElement('input');
opt_alpha.type = 'checkbox';
opt_alpha.checked = picker.alpha_enabled;
opt_alpha.addEventListener('change', () => {
  picker.alpha_enabled = opt_alpha.checked;
});
controls.appendChild(create_label('Alpha', opt_alpha));

let opt_show_output_mode_selector = document.createElement('input');
opt_show_output_mode_selector.type = 'checkbox';
opt_show_output_mode_selector.checked = picker.show_output_mode_selector;
opt_show_output_mode_selector.addEventListener('change', () => {
  picker.show_output_mode_selector = opt_show_output_mode_selector.checked;
});
opt_show_output_mode_selector.disabled = !picker.show_output;
controls.appendChild(create_label('Show Output Mode Selector', opt_show_output_mode_selector));

let opt_show_output = document.createElement('input');
opt_show_output.type = 'checkbox';
opt_show_output.checked = picker.show_output;
opt_show_output.addEventListener('change', () => {
  picker.show_output = opt_show_output.checked;
  opt_show_output_mode_selector.disabled = !picker.show_output;
});
controls.appendChild(create_label('Show Output', opt_show_output));


let opt_show_show_slider_value = document.createElement('input');
opt_show_show_slider_value.type = 'checkbox';
opt_show_show_slider_value.checked = picker.show_slider_value;
opt_show_show_slider_value.addEventListener('change', () => {
  picker.show_slider_value = opt_show_show_slider_value.checked;
});
controls.appendChild(create_label('Show Slider Value', opt_show_show_slider_value));


let opt_legacy = document.createElement('input');
opt_legacy.type = 'checkbox';
opt_legacy.checked = picker.legacy_output;
opt_legacy.addEventListener('change', () => {
  picker.legacy_output = opt_legacy.checked;
});
controls.appendChild(create_label('Legacy', opt_legacy));


let precision_input = document.createElement('input');
precision_input.type = 'number';
precision_input.value = picker.precision;
precision_input.min = 0;
precision_input.addEventListener('change', () => {
  picker.precision = parseInt(precision_input.value);
});
controls.appendChild(create_label('Precision', precision_input));




let btn_restore = document.createElement('button');
btn_restore.textContent = 'Restore Previous Color';
btn_restore.disabled = picker.color.equals(picker.previous_color);
btn_restore.addEventListener('click', () => {
  picker.restore_previous_color()
});
controls.appendChild(btn_restore);


let btn_select = document.createElement('button');
btn_select.textContent = 'Select Current Color';
btn_select.disabled = picker.color.equals(picker.previous_color);
btn_select.addEventListener('click', () => {
  picker.select_current();
});
controls.appendChild(btn_select);


let results = document.getElementById('results');


picker.addEventListener('colorchange',
  /** @param {QPickerEvent} ev */
  (ev) => {
    console.log('color change', ev.color);
    
    results.textContent = `Curr: \n`;
    results.textContent += `${ev.color.to_string('hsl')}\n`;
    results.textContent += `${ev.color.to_string('rgb')}\n`;
    results.textContent += `${ev.color.to_string('hex')}\n\n`;
    results.textContent += `Previous:\n`;
    results.textContent += `${ev.target.previous_color.to_string('hsl')}\n`;
    results.textContent += `${ev.target.previous_color.to_string('rgb')}\n`;
    results.textContent += `${ev.target.previous_color.to_string('hex')}\n\n`;
    results.textContent += `Equals: ${ev.color.equals(ev.target.previous_color)}\n\n`;
    
    precision_input.value = ev.target.precision;
    opt_alpha.checked = ev.target.alpha_enabled;
    opt_show_output.checked = ev.target.show_output;
    
    results.textContent += `JSON:\n${JSON.stringify(ev.color, null, 2)}\n`;
    
    btn_restore.disabled = picker.color.equals(picker.previous_color);
    btn_select.disabled = picker.color.equals(picker.previous_color);
  });


function create_label(label, input) {
  let label_el = document.createElement('label');
  label_el.textContent = label;
  label_el.prepend(input);
  return label_el;
}