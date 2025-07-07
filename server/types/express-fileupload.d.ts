declare module 'express-fileupload' {
    import { RequestHandler } from 'express';
  
    namespace fileUpload {
      interface Options {
        createParentPath?: boolean;
        uriDecodeFileNames?: boolean;
        safeFileNames?: boolean | RegExp;
        preserveExtension?: boolean | number;
        abortOnLimit?: boolean;
        responseOnLimit?: string;
        limitHandler?: boolean | RequestHandler;
        useTempFiles?: boolean;
        tempFileDir?: string;
        parseNested?: boolean;
        debug?: boolean;
        uploadTimeout?: number;
        limits?: {
          fileSize?: number;
          files?: number;
          fields?: number;
          fieldNameSize?: number;
          fieldSize?: number;
          parts?: number;
          headerPairs?: number;
        };
      }
  
      interface UploadedFile {
        name: string;
        mv: (path: string, callback?: (err: any) => void) => Promise<void>;
        mimetype: string;
        data: Buffer;
        tempFilePath?: string;
        truncated: boolean;
        size: number;
        md5: string;
        encoding: string;
      }
   
      interface FileArray {
        [fieldName: string]: UploadedFile | UploadedFile[];
      }
    }
  
    function fileUpload(options?: fileUpload.Options): RequestHandler;
  
    export = fileUpload;
  }
  
  declare global {
    namespace Express {
      interface Request {
        files?: fileUpload.FileArray | null | undefined;
      }
    }
  }