declare module 'bcrypt' {
  export function hash(data: string, saltOrRounds: string | number): Promise<string>;
}
