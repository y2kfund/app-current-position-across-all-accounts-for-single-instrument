interface ImportMetaEnv {
    readonly VITE_SUPA_URL: string;
    readonly VITE_SUPA_ANON: string;
  }
  
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }