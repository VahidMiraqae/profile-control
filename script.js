import {Settings} from "./Settings.js"
import { View } from "./View.js";
import { ViewModel } from "./ViewModel.js";


const root1 = document.getElementById('root1');
root1.style.position = 'relative';
const settings = new Settings();
const vm = new ViewModel();
const v = new View(root1, settings, vm);