interface ImportMeta {
  glob<T>(pattern: string, options: { eager: true; query: string; import: string }): Record<string, T>;
}
