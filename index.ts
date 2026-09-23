import React from 'react';
import { registerRootComponent } from 'expo';
import App from './src/App';
import {ThemeProvider} from'./src/theme/ThemeContext';
function Root(){return React.createElement(ThemeProvider,null,React.createElement(App))}
registerRootComponent(Root);
