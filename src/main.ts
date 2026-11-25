/**
 * Point d'entrée de l'application : styles globaux, puis montage de la racine Svelte.
 * Ordre des styles : polices, tokens de la phase 3, compléments du socle, base commune.
 */
import { mount } from 'svelte';
import './styles/fonts.css';
import './styles/tokens.css';
import './styles/tokens-socle.css';
import './styles/base.css';
import App from './App.svelte';

const cible = document.getElementById('app');
if (!cible) throw new Error('Élément #app introuvable dans index.html');

export default mount(App, { target: cible });
