import { registerRootComponent } from 'expo';
import App from './src/App';
import {ThemeProvider} from'./src/theme/ThemeContext';
function Root(){return <ThemeProvider><App/></ThemeProvider>}
registerRootComponent(Root);
