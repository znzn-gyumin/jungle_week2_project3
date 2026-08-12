/// <reference types="vite/client" />

declare module 'virtual:script' {
  import type { ScriptData } from './core/types';
  const data: ScriptData;
  export default data;
}
