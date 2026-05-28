import type { AuthData, ModuleCapability } from '@/types/auth';

export const hasModuleAccess = (
  authData: AuthData | null | undefined,
  module?: ModuleCapability,
): boolean => {
  if (!module) {
    return true;
  }

  if (!authData) {
    return false;
  }

  return authData.capabilities.modules[module];
};