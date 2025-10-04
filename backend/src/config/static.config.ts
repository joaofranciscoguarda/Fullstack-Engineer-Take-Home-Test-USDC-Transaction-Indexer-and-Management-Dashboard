import { ConfigModule } from '@nestjs/config';

export default async () => {
  // For now this configs don't depend on process.env, if needed, uncomment next line
  await ConfigModule.envVariablesLoaded;

  return {
    // Nothing here because it is a template
  };
};
