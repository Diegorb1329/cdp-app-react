declare module '@mapbox/mapbox-gl-draw' {
  import type { Map, IControl, ControlPosition } from 'mapbox-gl';
  
  export interface DrawOptions {
    displayControlsDefault?: boolean;
    controls?: {
      polygon?: boolean;
      trash?: boolean;
    };
    defaultMode?: string;
  }
  
  export default class MapboxDraw implements IControl {
    constructor(options?: DrawOptions);
    getAll(): { features: any[] };
    onAdd(map: Map): HTMLElement;
    onRemove(map: Map): void;
    getDefaultPosition?: () => ControlPosition;
  }
}

