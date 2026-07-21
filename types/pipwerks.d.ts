declare module "pipwerks-scorm-api-wrapper" {
  const SCORM: {
    version: string;
    handleCompletionOnInitialize: boolean;
    init(): boolean;
    quit(): boolean;
    save(): boolean;
    get(key: string): string;
    set(key: string, value: string): boolean;
    status(action: "get" | "set", status?: string): string | boolean;
  };
  export default SCORM;
}
