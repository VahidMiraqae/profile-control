import {Settings} from "./src/Settings.js"
import { View } from "./src/View.js";
import { ViewModel } from "./src/ViewModel.js";


const root1 = document.getElementById('root1');
root1.style.position = 'relative';
const settings = new Settings();
const vm = new ViewModel();
const v = new View(root1, settings, vm);