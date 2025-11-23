// Type declaration for ajv to support default import in Vite
// This allows '@hypercerts-org/sdk' to import ajv correctly
declare module 'ajv' {
  class Ajv {
    constructor(options?: any);
    validate(schema: any, data: any): boolean;
    compile(schema: any): any;
    [key: string]: any;
  }
  export default Ajv;
  export { Ajv };
}

declare module 'ajv/dist/ajv' {
  class Ajv {
    constructor(options?: any);
    validate(schema: any, data: any): boolean;
    compile(schema: any): any;
    [key: string]: any;
  }
  export default Ajv;
  export { Ajv };
}

declare module 'ajv/dist/ajv.js' {
  class Ajv {
    constructor(options?: any);
    validate(schema: any, data: any): boolean;
    compile(schema: any): any;
    [key: string]: any;
  }
  export default Ajv;
  export { Ajv };
}

