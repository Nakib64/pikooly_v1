declare module 'next-pwa' {
  import { NextConfig } from 'next';
  function withPWA(config: NextConfig): (config: NextConfig) => NextConfig;
  export default withPWA;
}
