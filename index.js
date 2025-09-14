import {AppRegistry} from 'react-native';
import App from './App.tsx';   // force JS entry
import {name as appName} from './app.json';

AppRegistry.registerComponent(appName, () => App);
