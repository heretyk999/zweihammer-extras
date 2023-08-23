import {QuickProfileTray} from "./quick-profile.mjs";

console.log('starting module Zweihammer');

const MODULE_ID = 'zweihammer-extras';

Hooks.on('init', () => {
    console.log('zweihammer | register combat panel settings and and keybindings');
    game.profileTray = new QuickProfileTray(MODULE_ID);
});

Hooks.on('ready', () => {
    console.log('zweihammer | setup the panel and add it to display');
    game.profileTray.init();
});
