import {getSettings} from './settings-ui.js';
export function mountRegisteredAgents(services){getSettings().bindAgents(services);}
