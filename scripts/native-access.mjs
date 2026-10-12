import {androidExecute} from './android-native-rpc.mjs';
import {iosExecute} from './ios-native-rpc.mjs';
export async function nativeExecute(driver,kind,web,fn,arg){if(kind==='ios')return iosExecute(fn,arg);return androidExecute(fn,arg);}
