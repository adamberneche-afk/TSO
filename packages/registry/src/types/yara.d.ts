declare module '@automattic/yara' {
  export interface Rules {
    scanFile(filePath: string, options: any, callback: (error: any, result: any) => void): void;
    scan(options: { buffer: Buffer }, callback: (error: any, result: any) => void): void;
    scanBuffer(buffer: Buffer, callback: (error: any, result: any) => void): void;
  }

  export interface CompileSource {
    filename: string;
    content: string;
  }

  export interface CompileOptions {
    sources: CompileSource[];
  }

  export function compile(options: CompileOptions, callback: (error: any, rules: Rules) => void): void;
}
