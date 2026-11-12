import '@mystravil/hardpoint/fonts.css';
import '@mystravil/hardpoint/tokens.css';
import '@mystravil/hardpoint/base.css';
import './app.css';
import { mount } from 'svelte';
import App from './App.svelte';

// ?theme=light|dark|system sets the theme. Set from script, never from markup.
const theme = new URLSearchParams(location.search).get('theme');
if (theme) document.documentElement.dataset.theme = theme;

mount(App, { target: document.getElementById('app')! });
