import { registerRootComponent } from 'expo';

// Define background tasks before the React tree mounts.
import './src/services/backgroundAutomation';

import App from './App';

registerRootComponent(App);
